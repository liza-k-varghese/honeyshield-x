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
from app.observability.metrics import default_metrics_collector

logger = logging.getLogger(__name__)


def publish_security_event(
    event_type: str,
    resource_id: str,
    payload: dict[str, Any],
    severity: SecurityEventSeverity = "info",
    correlation_id: str | None = None,
    db: Any = None,
    transfer_id: str | None = None,
    workflow_id: str | None = None,
    agent: str | None = None,
    stage: str | None = None,
    status: str | None = None,
    source: str | None = None,
    destination: str | None = None,
    failure_reason: str | None = None,
) -> SecurityEventEnvelope:
    """Construct, record, and distribute an authoritative security event."""
    clean_payload = _sanitize_payload(payload)

    # Derive agent & stage if omitted for canonical event types
    derived_agent = agent
    derived_stage = stage
    derived_source = source
    derived_dest = destination

    if not derived_agent:
        if event_type.startswith("sensor.") or event_type.startswith("canary.") or "probe" in event_type:
            derived_agent = "SCOUT"
            derived_stage = derived_stage or "collection"
            derived_source = derived_source or "sensor:honeypot"
            derived_dest = derived_dest or "ingestion_api"
        elif event_type.startswith("ingest.") or event_type.startswith("queue.") or event_type.startswith("attack.") or "outbox" in event_type:
            derived_agent = "NEXUS"
            derived_stage = derived_stage or "normalization"
            derived_source = derived_source or "ingestion_api"
            derived_dest = derived_dest or "outbox_db"
        elif event_type.startswith("intel.") or event_type.startswith("ioc.") or "reputation" in event_type:
            derived_agent = "ORACLE"
            derived_stage = derived_stage or "intelligence"
            derived_source = derived_source or "detection_engine"
            derived_dest = derived_dest or "threat_intel_store"
        elif event_type.startswith("alert.") or event_type.startswith("governor.") or event_type.startswith("notification."):
            derived_agent = "SENTINEL"
            derived_stage = derived_stage or "alert"
            derived_source = derived_source or "alert_manager"
            derived_dest = derived_dest or "soc_console"

    envelope = SecurityEventEnvelope(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        schema_version="1.0",
        resource_id=str(resource_id),
        severity=severity,
        payload=clean_payload,
        correlation_id=correlation_id,
        transfer_id=transfer_id or (f"tr_{derived_agent.lower()}_{resource_id}" if derived_agent else None),
        workflow_id=workflow_id or f"wf_{resource_id}",
        agent=derived_agent,
        stage=derived_stage or "processing",
        status=status or ("failed" if "failed" in event_type or failure_reason else "completed"),
        source=derived_source or "system",
        destination=derived_dest or "soc_console",
        failure_reason=failure_reason,
    )

    # 1. Record into durable outbox & ring buffer store
    default_event_store.append(envelope, db=db)
    default_metrics_collector.record_outbox(cursor=envelope.cursor)

    # 2. Publish to legacy event bus for backwards compatibility
    legacy_payload = dict(clean_payload)
    legacy_payload.update({
        "_resource_id": str(resource_id),
        "_severity": severity,
        "_cursor": envelope.cursor,
        "_transfer_id": envelope.transfer_id,
        "_workflow_id": envelope.workflow_id,
        "_agent": envelope.agent,
        "_stage": envelope.stage,
        "_status": envelope.status,
        "_source": envelope.source,
        "_destination": envelope.destination,
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


def publish_lifecycle_event(
    agent: str,  # "SCOUT", "NEXUS", "ORACLE", "SENTINEL"
    stage: str,
    status: str,  # "started", "in_transit", "waiting", "completed", "failed"
    source: str,
    destination: str,
    resource_id: str,
    workflow_id: str | None = None,
    transfer_id: str | None = None,
    severity: SecurityEventSeverity = "info",
    payload: dict[str, Any] | None = None,
    failure_reason: str | None = None,
    event_type: str | None = None,
    db: Any = None,
) -> SecurityEventEnvelope:
    """Authoritative publisher for Milestone 2 Digital Agent Universe lifecycle events."""
    clean_agent = agent.upper()
    if event_type is None:
        event_type = f"{clean_agent.lower()}.{stage}_{status}"

    actual_payload = dict(payload or {})
    actual_payload.update({
        "agent": clean_agent,
        "stage": stage,
        "status": status,
        "source": source,
        "destination": destination,
        "resource_id": str(resource_id),
    })
    if failure_reason:
        actual_payload["failure_reason"] = failure_reason

    return publish_security_event(
        event_type=event_type,
        resource_id=str(resource_id),
        payload=actual_payload,
        severity=severity,
        db=db,
        transfer_id=transfer_id or f"tr_{clean_agent.lower()}_{resource_id}",
        workflow_id=workflow_id or f"wf_{resource_id}",
        agent=clean_agent,
        stage=stage,
        status=status,
        source=source,
        destination=destination,
        failure_reason=failure_reason,
    )


def publish_handoff_event(
    from_agent: str,
    to_agent: str,
    resource_id: str,
    workflow_id: str,
    context_message: str,
    task_type: str,
    transfer_id: str | None = None,
    severity: SecurityEventSeverity = "info",
    db: Any = None,
) -> SecurityEventEnvelope:
    """Publish an authoritative agent-to-agent handoff event."""
    from_clean = from_agent.upper()
    to_clean = to_agent.upper()
    event_type = f"handoff.{from_clean.lower()}_to_{to_clean.lower()}"

    payload = {
        "from_agent": from_clean,
        "to_agent": to_clean,
        "workflow_id": workflow_id,
        "task_type": task_type,
        "context_message": context_message,
        "resource_id": str(resource_id),
    }

    return publish_security_event(
        event_type=event_type,
        resource_id=str(resource_id),
        payload=payload,
        severity=severity,
        db=db,
        transfer_id=transfer_id or f"tr_ho_{from_clean.lower()}_{to_clean.lower()}_{resource_id}",
        workflow_id=workflow_id,
        agent=from_clean,
        stage="handoff",
        status="completed",
        source=f"agent:{from_clean}",
        destination=f"agent:{to_clean}",
    )


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

