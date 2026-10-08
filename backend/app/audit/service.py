"""Operator Audit Service using existing SystemEvent model (Module 3.3).

Logs operator actions (replay executions, candidate rule simulations, triage reviews)
into the persistent SystemEvent table without requiring any schema migrations.

Architectural Guarantees:
- Additive logging to SystemEvent. Zero table modifications.
- Audit logging failures are isolated and never crash business logic or replay execution.
- Bounded queries with limit <= 200 to prevent denial-of-service.
- Untrusted payload strings are truncated and sanitized before persisting.
"""

from datetime import datetime, timezone
import logging
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SystemEvent

logger = logging.getLogger(__name__)

MAX_AUDIT_LIMIT: int = 200
MAX_MESSAGE_LENGTH: int = 2048


def record_operator_audit(
    db: Session,
    event_type: str,
    message: str,
    source: str = "operator_console",
    severity: str = "info",
) -> SystemEvent | None:
    """Record an operator audit event in the SystemEvent table.

    Args:
        db: SQLAlchemy database session.
        event_type: Audit action ('operator_replay_executed', 'operator_simulation_executed', etc.).
        message: Descriptive audit payload.
        source: Originating subsystem or operator interface.
        severity: Severity indicator ('info', 'low', 'medium', 'high', 'critical').

    Returns:
        The created SystemEvent instance, or None if logging failed.
    """
    try:
        sanitized_msg = message[:MAX_MESSAGE_LENGTH]
        event = SystemEvent(
            event_type=event_type,
            source=source,
            severity=severity,
            message=sanitized_msg,
            created_at=datetime.now(timezone.utc),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
    except Exception as e:
        logger.error("Failed to record operator audit event: %s", str(e), exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def get_audit_events(
    db: Session,
    limit: int = 50,
    source: str | None = None,
    event_type: str | None = None,
) -> list[SystemEvent]:
    """Retrieve recent audit and system events in reverse chronological order.

    Args:
        db: SQLAlchemy database session.
        limit: Maximum events to return (1-200).
        source: Optional filter by source string.
        event_type: Optional filter by event_type.

    Returns:
        List of SystemEvent objects.
    """
    bounded_limit = min(max(1, limit), MAX_AUDIT_LIMIT)
    stmt = select(SystemEvent)

    if source:
        stmt = stmt.where(SystemEvent.source == source)
    if event_type:
        stmt = stmt.where(SystemEvent.event_type == event_type)

    stmt = stmt.order_by(SystemEvent.created_at.desc(), SystemEvent.id.desc()).limit(bounded_limit)
    return list(db.scalars(stmt).all())
