"""Dual-Mode Persistence & Dead-Letter Queue (DLQ) Storage (Module 3.9).

Provides:
- Dual-mode Redis + Thread-Safe In-Memory Fallback.
- Bounded endpoint registry.
- Strictly bounded DLQ (Maximum 500 entries with FIFO eviction).
- Per-endpoint circuit breaker state tracking.
- Secret masking and protection.
- High-performance delivery metrics.
"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import logging
import os
import secrets
import threading
import time
from typing import Any

import redis

logger = logging.getLogger(__name__)

REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

# Maximum capacities
MAX_ENDPOINTS: int = 200
MAX_DLQ_CAPACITY: int = 500
CIRCUIT_BREAKER_THRESHOLD: int = 5
CIRCUIT_BREAKER_COOLDOWN_SECONDS: float = 60.0

# Redis key prefixes
KEY_ENDPOINTS: str = "hsx:integrations:endpoints"
KEY_DLQ_LIST: str = "hsx:integrations:dlq:list"
KEY_DLQ_ITEMS: str = "hsx:integrations:dlq:items"
KEY_METRICS: str = "hsx:integrations:metrics"
KEY_CIRCUIT_PREFIX: str = "hsx:integrations:circuit:"


def generate_endpoint_secret() -> str:
    """Generate cryptographically secure 256-bit webhook signing secret."""
    return f"hsx_whsec_{secrets.token_hex(32)}"


def mask_secret(secret: str | None) -> str:
    """Mask webhook secret for secure API display and logging."""
    if not secret:
        return "hsx_whsec_••••••••"
    return "hsx_whsec_••••••••"


class IntegrationStorage:
    """Dual-mode persistence engine for enterprise webhook endpoints and DLQ."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._redis_client: redis.Redis | None = None
        # In-memory storage structures
        self._mem_endpoints: dict[str, dict[str, Any]] = {}
        self._mem_dlq: deque[dict[str, Any]] = deque(maxlen=MAX_DLQ_CAPACITY)
        self._mem_circuits: dict[str, dict[str, Any]] = {}
        self._mem_metrics: dict[str, float] = {
            "total_dispatched": 0,
            "total_delivered": 0,
            "total_failed": 0,
            "latency_sum_ms": 0.0,
            "latency_count": 0,
        }
        self._init_redis()

    def _init_redis(self) -> None:
        """Attempt connection to Redis, falling back to memory store on failure."""
        if os.getenv("HONEYSHIELD_DISABLE_REDIS", "").strip().lower() in ("true", "1"):
            self._redis_client = None
            return
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
            logger.info("IntegrationStorage connected to Redis at %s:%s", REDIS_HOST, REDIS_PORT)
        except Exception as e:
            logger.warning("IntegrationStorage Redis unavailable (%s); using in-memory store", e)
            self._redis_client = None

    # =========================================================================
    # Endpoint Management
    # =========================================================================

    def save_endpoint(self, endpoint_data: dict[str, Any]) -> dict[str, Any]:
        """Save a new or updated endpoint."""
        endpoint_id = endpoint_data["id"]
        with self._lock:
            # Memory store
            self._mem_endpoints[endpoint_id] = dict(endpoint_data)

            # Redis store
            if self._redis_client:
                try:
                    self._redis_client.hset(KEY_ENDPOINTS, endpoint_id, json.dumps(endpoint_data))
                except Exception as e:
                    logger.warning("Failed saving endpoint to Redis: %s", e)

        return endpoint_data

    def get_endpoint(self, endpoint_id: str, mask: bool = True) -> dict[str, Any] | None:
        """Retrieve an endpoint by ID, optionally masking the secret."""
        with self._lock:
            ep = self._mem_endpoints.get(endpoint_id)

            if not ep and self._redis_client:
                try:
                    raw = self._redis_client.hget(KEY_ENDPOINTS, endpoint_id)
                    if raw:
                        ep = json.loads(raw)
                        self._mem_endpoints[endpoint_id] = ep
                except Exception as e:
                    logger.warning("Failed getting endpoint from Redis: %s", e)

            if not ep:
                return None

            result = dict(ep)
            # Attach live circuit breaker status
            circuit_info = self.get_circuit_status(endpoint_id)
            result["circuit_state"] = circuit_info["state"]
            result["consecutive_failures"] = circuit_info["consecutive_failures"]

            if mask:
                result["secret"] = mask_secret(result.get("secret"))
            return result

    def list_endpoints(self, mask: bool = True) -> list[dict[str, Any]]:
        """List all registered webhook endpoints."""
        with self._lock:
            endpoints: dict[str, dict[str, Any]] = dict(self._mem_endpoints)

            if self._redis_client:
                try:
                    all_raw = self._redis_client.hgetall(KEY_ENDPOINTS)
                    for ep_id, raw in all_raw.items():
                        endpoints[ep_id] = json.loads(raw)
                    self._mem_endpoints.update(endpoints)
                except Exception as e:
                    logger.warning("Failed listing endpoints from Redis: %s", e)

            results: list[dict[str, Any]] = []
            for ep_id, ep in endpoints.items():
                item = dict(ep)
                circuit_info = self.get_circuit_status(ep_id)
                item["circuit_state"] = circuit_info["state"]
                item["consecutive_failures"] = circuit_info["consecutive_failures"]
                if mask:
                    item["secret"] = mask_secret(item.get("secret"))
                results.append(item)

            results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return results

    def delete_endpoint(self, endpoint_id: str) -> bool:
        """Delete an endpoint by ID."""
        with self._lock:
            removed = self._mem_endpoints.pop(endpoint_id, None) is not None
            self._mem_circuits.pop(endpoint_id, None)

            if self._redis_client:
                try:
                    r_del = self._redis_client.hdel(KEY_ENDPOINTS, endpoint_id)
                    if r_del:
                        removed = True
                    self._redis_client.delete(f"{KEY_CIRCUIT_PREFIX}{endpoint_id}")
                except Exception as e:
                    logger.warning("Failed deleting endpoint from Redis: %s", e)

            return removed

    # =========================================================================
    # Circuit Breaker per Endpoint
    # =========================================================================

    def record_circuit_failure(self, endpoint_id: str) -> tuple[str, bool]:
        """Record a delivery failure for the endpoint. Returns (new_state, tripped_now)."""
        now = time.time()
        with self._lock:
            circuit = self._mem_circuits.setdefault(
                endpoint_id,
                {"consecutive_failures": 0, "state": "closed", "tripped_at": None},
            )
            circuit["consecutive_failures"] += 1

            tripped_now = False
            if circuit["consecutive_failures"] >= CIRCUIT_BREAKER_THRESHOLD:
                if circuit["state"] != "open":
                    circuit["state"] = "open"
                    circuit["tripped_at"] = now
                    tripped_now = True

            # Sync to Redis if active
            if self._redis_client:
                try:
                    self._redis_client.set(
                        f"{KEY_CIRCUIT_PREFIX}{endpoint_id}",
                        json.dumps(circuit),
                        ex=int(CIRCUIT_BREAKER_COOLDOWN_SECONDS * 2),
                    )
                except Exception:
                    pass

            return circuit["state"], tripped_now

    def record_circuit_success(self, endpoint_id: str) -> None:
        """Reset consecutive failures and close the circuit upon success."""
        with self._lock:
            circuit = self._mem_circuits.setdefault(
                endpoint_id,
                {"consecutive_failures": 0, "state": "closed", "tripped_at": None},
            )
            circuit["consecutive_failures"] = 0
            circuit["state"] = "closed"
            circuit["tripped_at"] = None

            if self._redis_client:
                try:
                    self._redis_client.delete(f"{KEY_CIRCUIT_PREFIX}{endpoint_id}")
                except Exception:
                    pass

    def get_circuit_status(self, endpoint_id: str) -> dict[str, Any]:
        """Get live circuit status with half-open cooldown evaluation."""
        now = time.time()
        with self._lock:
            circuit = self._mem_circuits.setdefault(
                endpoint_id,
                {"consecutive_failures": 0, "state": "closed", "tripped_at": None},
            )

            # Check if open circuit has exceeded cooldown
            if circuit["state"] == "open" and circuit["tripped_at"] is not None:
                elapsed = now - circuit["tripped_at"]
                if elapsed >= CIRCUIT_BREAKER_COOLDOWN_SECONDS:
                    circuit["state"] = "half_open"

            return dict(circuit)

    def is_delivery_permitted(self, endpoint_id: str) -> tuple[bool, str]:
        """Check if delivery is currently permitted by the endpoint's circuit breaker."""
        status = self.get_circuit_status(endpoint_id)
        state = status["state"]
        if state == "open":
            return False, f"Circuit breaker for endpoint '{endpoint_id}' is OPEN (cooldown active)."
        return True, ""

    # =========================================================================
    # Dead-Letter Queue (DLQ)
    # =========================================================================

    def enqueue_dlq(self, dlq_record: dict[str, Any]) -> None:
        """Enqueue failed delivery record into DLQ, capped strictly at MAX_DLQ_CAPACITY."""
        delivery_id = dlq_record["delivery_id"]
        with self._lock:
            # Memory capped deque
            self._mem_dlq.append(dlq_record)

            if self._redis_client:
                try:
                    record_json = json.dumps(dlq_record)
                    self._redis_client.hset(KEY_DLQ_ITEMS, delivery_id, record_json)
                    self._redis_client.lpush(KEY_DLQ_LIST, delivery_id)
                    # Enforce strict bounded capacity
                    self._redis_client.ltrim(KEY_DLQ_LIST, 0, MAX_DLQ_CAPACITY - 1)
                except Exception as e:
                    logger.warning("Failed enqueuing to Redis DLQ: %s", e)

    def list_dlq(self, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
        """List dead-letter queue records with pagination."""
        with self._lock:
            items: list[dict[str, Any]] = list(self._mem_dlq)
            items.reverse()  # Newest first
            total = len(items)
            paginated = items[offset : offset + limit]
            return paginated, total

    def get_dlq_item(self, delivery_id: str) -> dict[str, Any] | None:
        """Get single DLQ item by delivery_id."""
        with self._lock:
            for item in self._mem_dlq:
                if item["delivery_id"] == delivery_id:
                    return dict(item)

            if self._redis_client:
                try:
                    raw = self._redis_client.hget(KEY_DLQ_ITEMS, delivery_id)
                    if raw:
                        return json.loads(raw)
                except Exception:
                    pass

            return None

    def remove_dlq_item(self, delivery_id: str) -> bool:
        """Remove item from DLQ."""
        removed = False
        with self._lock:
            new_deque: deque[dict[str, Any]] = deque(maxlen=MAX_DLQ_CAPACITY)
            for item in self._mem_dlq:
                if item["delivery_id"] == delivery_id:
                    removed = True
                else:
                    new_deque.append(item)
            self._mem_dlq = new_deque

            if self._redis_client:
                try:
                    self._redis_client.hdel(KEY_DLQ_ITEMS, delivery_id)
                    self._redis_client.lrem(KEY_DLQ_LIST, 0, delivery_id)
                    removed = True
                except Exception:
                    pass

        return removed

    # =========================================================================
    # Metrics
    # =========================================================================

    def record_metric(self, success: bool, latency_ms: float) -> None:
        """Record delivery outcome and roundtrip latency."""
        with self._lock:
            self._mem_metrics["total_dispatched"] += 1
            if success:
                self._mem_metrics["total_delivered"] += 1
                self._mem_metrics["latency_sum_ms"] += latency_ms
                self._mem_metrics["latency_count"] += 1
            else:
                self._mem_metrics["total_failed"] += 1

            if self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    pipe.hincrby(KEY_METRICS, "total_dispatched", 1)
                    if success:
                        pipe.hincrby(KEY_METRICS, "total_delivered", 1)
                        pipe.hincrbyfloat(KEY_METRICS, "latency_sum_ms", latency_ms)
                        pipe.hincrby(KEY_METRICS, "latency_count", 1)
                    else:
                        pipe.hincrby(KEY_METRICS, "total_failed", 1)
                    pipe.execute()
                except Exception:
                    pass

    def get_metrics(self) -> dict[str, Any]:
        """Aggregate live delivery metrics."""
        with self._lock:
            endpoints = list(self._mem_endpoints.values())
            active_count = sum(1 for ep in endpoints if ep.get("enabled", True))
            circuits_open = sum(1 for ep_id in self._mem_endpoints if self.get_circuit_status(ep_id)["state"] == "open")

            m = dict(self._mem_metrics)
            avg_latency = (
                m["latency_sum_ms"] / m["latency_count"]
                if m["latency_count"] > 0
                else 0.0
            )

            return {
                "total_endpoints": len(endpoints),
                "active_endpoints": active_count,
                "total_dispatched": int(m["total_dispatched"]),
                "total_delivered": int(m["total_delivered"]),
                "total_failed": int(m["total_failed"]),
                "dlq_count": len(self._mem_dlq),
                "average_latency_ms": round(avg_latency, 2),
                "circuits_open": circuits_open,
            }

    def clear_all(self) -> None:
        """Clear all in-memory and Redis test state (Used by test suites)."""
        with self._lock:
            self._mem_endpoints.clear()
            self._mem_dlq.clear()
            self._mem_circuits.clear()
            self._mem_metrics = {
                "total_dispatched": 0,
                "total_delivered": 0,
                "total_failed": 0,
                "latency_sum_ms": 0.0,
                "latency_count": 0,
            }

            if self._redis_client:
                try:
                    self._redis_client.delete(KEY_ENDPOINTS)
                    self._redis_client.delete(KEY_DLQ_LIST)
                    self._redis_client.delete(KEY_DLQ_ITEMS)
                    self._redis_client.delete(KEY_METRICS)
                except Exception:
                    pass


# Singleton default storage instance
default_integration_storage = IntegrationStorage()
