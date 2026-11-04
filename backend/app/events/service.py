"""Authoritative Security Event Publisher and Pipeline Bridge (Phase 3).

Coordinates:
- Structured event construction & sanitization into SecurityEventEnvelope.
- Appending into durable EventStore (cursor assignment).
- Broadcasting across active WebSockets & SSE streams via RealtimeConnectionManager.
- Dispatching to mobile push notification engine via PushDispatcher.
- Publishing to Redis Pub/Sub for multi-worker scaling.
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any
import uuid

from app.events.manager import default_connection_manager
from app.events.schemas import SecurityEventEnvelope, SecurityEventSeverity
from app.events.store import default_event_store
from app.incident_command.bus import _sanitize_payload, default_event_bus
from app.notifications.push_dispatcher import default_push_dispatcher

logger = logging.getLogger(__name__)


def publish_security_event(
    event_type: str,
    resource_id: str,
    payload: dict[str, Any],
    severity: SecurityEventSeverity = "info",
    correlation_id: str | None = None,
    db: Any = None,
) -> SecurityEventEnvelope:
    """Construct, record, and distribute an authoritative security event."""
    clean_payload = _sanitize_payload(payload)

    envelope = SecurityEventEnvelope(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        schema_version="1.0",
        resource_id=str(resource_id),
        severity=severity,
        payload=clean_payload,
        correlation_id=correlation_id,
    )

    # 1. Record into durable outbox & ring buffer store
    default_event_store.append(envelope, db=db)

    # 2. Publish to legacy event bus for backwards compatibility
    legacy_payload = dict(clean_payload)
    legacy_payload.update({
        "_resource_id": str(resource_id),
        "_severity": severity,
        "_cursor": envelope.cursor,
    })
    try:
        default_event_bus.publish_event(event_type, legacy_payload)
    except Exception as e:
        logger.warning("Legacy event bus publish failed: %s", e)

    # 3. Broadcast to active WebSockets in event loop if running
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(default_connection_manager.broadcast_event(envelope))
    except RuntimeError:
        # No running asyncio loop in current thread; execute in synchronous wrapper or worker
        try:
            asyncio.run(default_connection_manager.broadcast_event(envelope))
        except Exception as e:
            logger.debug("Async broadcast skipped (no event loop): %s", e)

    # 4. Dispatch to push notification engine
    try:
        default_push_dispatcher.dispatch_event(envelope)
    except Exception as e:
        logger.warning("Push notification dispatch failed: %s", e)

    return envelope


def _on_legacy_bus_event(event_type: str, payload: dict[str, Any]) -> None:
    """Listener bridging events emitted to default_event_bus into SecurityEventEnvelope."""
    # Prevent infinite loop if already processed
    if "_resource_id" in payload:
        return

    resource_id = str(
        payload.get("resource_id")
        or payload.get("id")
        or payload.get("alert_id")
        or payload.get("attack_id")
        or payload.get("case_id")
        or payload.get("canary_id")
        or payload.get("indicator_id")
        or payload.get("service")
        or "system"
    )

    raw_sev = str(payload.get("severity", "info")).lower()
    severity: SecurityEventSeverity = (
        raw_sev if raw_sev in ("critical", "high", "medium", "low", "info") else "info"
    )

    envelope = SecurityEventEnvelope(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        schema_version="1.0",
        resource_id=resource_id,
        severity=severity,
        payload=payload,
    )

    default_event_store.append(envelope)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(default_connection_manager.broadcast_event(envelope))
    except RuntimeError:
        pass

    try:
        default_push_dispatcher.dispatch_event(envelope)
    except Exception:
        pass


# Register automatic listener on default_event_bus
default_event_bus.register_listener(_on_legacy_bus_event)

