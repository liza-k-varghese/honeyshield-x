"""Operator & System Audit API Router for HoneyShield X (Module 3.3)."""

import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.audit.service import get_audit_events
from app.database import get_db
from app.schemas import AuditEventItem, AuditEventsResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/audit",
    tags=["Operator Audit Trail"],
)


@router.get(
    "/events",
    response_model=AuditEventsResponse,
    status_code=status.HTTP_200_OK,
    summary="Query operator actions, replay records, and system security events",
)
def get_audit_events_endpoint(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Maximum audit events to return (1-200)",
    ),
    source: str | None = Query(
        default=None,
        description="Filter by originating subsystem or operator component",
    ),
    event_type: str | None = Query(
        default=None,
        description="Filter by event classification (e.g. 'operator_replay_executed')",
    ),
    db: Session = Depends(get_db),
) -> AuditEventsResponse:
    """Retrieve chronologically ordered audit logs from the persistent SystemEvent table."""
    # Normalize for direct function calls in test suites
    s_clean = source if isinstance(source, str) else None
    et_clean = event_type if isinstance(event_type, str) else None
    lim_clean = limit if isinstance(limit, int) else 50

    raw_events = get_audit_events(
        db=db,
        limit=lim_clean,
        source=s_clean,
        event_type=et_clean,
    )
    serialized = [
        AuditEventItem(
            id=ev.id,
            event_type=ev.event_type,
            source=ev.source,
            severity=ev.severity,
            message=ev.message,
            created_at=ev.created_at,
        )
        for ev in raw_events
    ]
    return AuditEventsResponse(
        total_events=len(serialized),
        events=serialized,
    )
