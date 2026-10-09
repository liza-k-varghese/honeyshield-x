"""Real-Time Event Bus for HoneyShield-X (Module 3.4).

Provides:
- Redis Pub/Sub publishing on channel `hsx:events:broadcast`.
- Resilient in-process memory bus fallback if Redis is unavailable.
- Deterministic, bounded, sanitized event schemas.
- Async subscriber queue for Server-Sent Events (SSE) streaming.
- Telemetry isolation: Redis failures never crash command execution or weaken safety.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
import threading
from typing import Any, AsyncGenerator
import uuid

import redis

logger = logging.getLogger(__name__)

EVENT_CHANNEL: str = "hsx:events:broadcast"
MAX_STRING_LENGTH: int = 1024
REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))


def _sanitize_payload(obj: Any) -> Any:
    """Recursively sanitize and bound payload fields to prevent data leakage and unbounded buffers."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            # Filter sensitive keys
            if any(secret in k.lower() for secret in ("password", "secret", "token", "auth", "key")):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = _sanitize_payload(v)
        return sanitized
    elif isinstance(obj, list):
        return [_sanitize_payload(item) for item in obj[:50]]  # Bound lists
    elif isinstance(obj, str):
        return obj[:MAX_STRING_LENGTH]
    elif isinstance(obj, (int, float, bool)) or obj is None:
        return obj
    elif hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)[:MAX_STRING_LENGTH]


class EventBus:
    """Dual-mode event bus: Redis Pub/Sub with in-memory subscriber queue fallback."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # Set of active in-process async subscriber queues
        self._subscribers: set[asyncio.Queue[str]] = set()
        # Set of synchronous in-process callbacks
        self._listeners: set[Any] = set()
        self._redis_client: redis.Redis | None = None
        self._init_redis()

    def _init_redis(self) -> None:
        try:
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            client.ping()
            self._redis_client = client
            logger.info("EventBus connected to Redis Pub/Sub on %s:%s", REDIS_HOST, REDIS_PORT)
        except Exception as e:
            logger.warning("EventBus Redis connection failed (%s); operating in in-memory mode", e)
            self._redis_client = None

    def publish_event(
        self,
        event_type: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Publish a structured event synchronously to Redis Pub/Sub and in-memory subscribers.

        Guaranteed non-blocking and safe: failures in bus publishing are logged and never propagate.
        """
        event_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        clean_payload = _sanitize_payload(payload)

        event_data = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": now_iso,
            "payload": clean_payload,
        }

        serialized = json.dumps(event_data)

        # 1. Publish to Redis Pub/Sub
        if self._redis_client:
            try:
                self._redis_client.publish(EVENT_CHANNEL, serialized)
            except Exception as e:
                logger.warning("Failed to publish to Redis Pub/Sub (%s); falling back to in-memory", e)

        # 2. Fan-out to all registered in-process async queues
        with self._lock:
            dead_queues = []
            for q in self._subscribers:
                try:
                    q.put_nowait(serialized)
                except asyncio.QueueFull:
                    # Drop oldest if queue is full to prevent memory exhaustion
                    try:
                        q.get_nowait()
                        q.put_nowait(serialized)
                    except Exception:
                        dead_queues.append(q)
                except Exception:
                    dead_queues.append(q)

            for dead in dead_queues:
                self._subscribers.discard(dead)

        # 3. Fan-out to registered synchronous in-process callbacks
        with self._lock:
            listeners = list(self._listeners)
        for listener in listeners:
            try:
                listener(event_type, clean_payload)
            except Exception as e:
                logger.warning("Listener callback failed for event %s: %s", event_type, e)

        return event_data

    def register_listener(self, callback: Any) -> None:
        """Register a synchronous callback for event bus dispatches."""
        with self._lock:
            self._listeners.add(callback)

    def unregister_listener(self, callback: Any) -> None:
        """Remove a synchronous callback."""
        with self._lock:
            self._listeners.discard(callback)

    def publish(self, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Publish event alias to maintain consistent interface across modules."""
        return self.publish_event(event_type, payload)

    def register_subscriber(self, queue: asyncio.Queue[str]) -> None:
        """Register an async queue for in-process telemetry fan-out."""
        with self._lock:
            self._subscribers.add(queue)

    def unregister_subscriber(self, queue: asyncio.Queue[str]) -> None:
        """Remove a subscriber queue when SSE connection terminates."""
        with self._lock:
            self._subscribers.discard(queue)

    async def subscribe_stream(self) -> AsyncGenerator[str, None]:
        """Async generator yielding formatted SSE frames from the event bus."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        self.register_subscriber(queue)

        # Also attempt Redis pubsub listener task if Redis is active
        redis_sub_task: asyncio.Task | None = None
        redis_pubsub = None

        if self._redis_client:
            try:
                redis_pubsub = self._redis_client.pubsub()
                redis_pubsub.subscribe(EVENT_CHANNEL)
            except Exception as e:
                logger.warning("Could not create Redis pubsub subscriber: %s", e)
                redis_pubsub = None

        try:
            # Yield initial connect frame
            init_frame = json.dumps({
                "event_type": "system.connected",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {"message": "HoneyShield-X Live Incident Command Stream Connected"},
            })
            yield f"event: system.connected\ndata: {init_frame}\n\n"

            while True:
                try:
                    # Wait up to 15 seconds for an event; if timeout, emit heartbeat
                    event_str = await asyncio.wait_for(queue.get(), timeout=15.0)
                    try:
                        parsed = json.loads(event_str)
                        ev_type = parsed.get("event_type", "message")
                    except Exception:
                        ev_type = "message"

                    yield f"event: {ev_type}\ndata: {event_str}\n\n"
                except asyncio.TimeoutError:
                    # Emit periodic keepalive heartbeat
                    heartbeat_payload = json.dumps({
                        "event_type": "heartbeat",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "payload": {"status": "alive"},
                    })
                    yield f"event: heartbeat\ndata: {heartbeat_payload}\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            self.unregister_subscriber(queue)
            if redis_pubsub:
                try:
                    redis_pubsub.unsubscribe(EVENT_CHANNEL)
                    redis_pubsub.close()
                except Exception:
                    pass


# Singleton EventBus instance
default_event_bus = EventBus()
