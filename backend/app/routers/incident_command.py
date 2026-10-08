"""Incident Command API Router for HoneyShield-X (Module 3.4).

Provides:
- GET /api/v1/incident-command/stream: Server-Sent Events (SSE) telemetry stream.
- POST /api/v1/incident-command/execute: Governed incident command execution with row locks.
- POST /api/v1/incident-command/preview: Pre-flight Governor policy validation and approval token issuance.
- GET /api/v1/incident-command/governor/status: Live Governor health, rate limits, and circuit breaker metrics.
- POST /api/v1/incident-command/governor/lockout: Emergency outbound lockout toggle.
- GET /api/v1/incident-command/actions: Allowlisted action catalog.
- GET /api/v1/incident-command/incidents: Virtual incident collection query.
"""

import logging
from typing import Any
import uuid

from fastapi import APIRouter, Depends, Header, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import default_governor
from app.incident_command.service import (
    execute_incident_command,
    get_allowlisted_actions_catalog,
    get_virtual_incidents,
)
from app.schemas import (
    ActionCatalogResponse,
    ApprovalTokenResponse,
    GovernorStatusResponse,
    IncidentCommandRequest,
    IncidentCommandResponse,
    LockoutToggleRequest,
    VirtualIncidentsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/incident-command",
    tags=["Incident Command & Governance"],
)


@router.get(
    "/stream",
    summary="Real-time Server-Sent Events (SSE) incident telemetry stream",
    response_class=StreamingResponse,
)
async def incident_telemetry_stream() -> StreamingResponse:
    """Subscribe to the low-latency SSE telemetry feed backed by Redis Pub/Sub and in-memory queue.

    Yields real-time events for alert triggers, status updates, circuit breaker state changes,
    and periodic keepalive heartbeats.
    """
    return StreamingResponse(
        default_event_bus.subscribe_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/execute",
    response_model=IncidentCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute a governed incident command with row-locks and audit trails",
)
def execute_command_endpoint(
    request: IncidentCommandRequest,
    x_idempotency_key: str = Header(..., alias="X-Idempotency-Key", description="Mandatory UUID v4 idempotency key"),
    x_operator_id: str | None = Header(default="default_operator", alias="X-Operator-Id"),
    db: Session = Depends(get_db),
) -> IncidentCommandResponse:
    """Execute a defensive action under deterministic Governor policy enforcement.

    - Validates action against strict allowlist.
    - Enforces operator rate limits and entity cooldowns.
    - Prevents duplicate execution using mandatory X-Idempotency-Key.
    - Records immutable SystemEvent audit logs.
    """
    operator_id = x_operator_id or "default_operator"

    return execute_incident_command(
        db=db,
        request=request,
        idempotency_key=x_idempotency_key,
        operator_id=operator_id,
    )


@router.post(
    "/preview",
    response_model=ApprovalTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Pre-flight Governor policy check and approval token issuance",
)
def preview_command_endpoint(
    request: IncidentCommandRequest,
    x_operator_id: str | None = Header(default="default_operator", alias="X-Operator-Id"),
) -> ApprovalTokenResponse:
    """Validate Governor policy constraints and issue a 60-second ephemeral approval token."""
    operator_id = x_operator_id or "default_operator"

    default_governor.evaluate_command_policy(
        action=request.action,
        target_id=request.target_id,
        operator_id=operator_id,
        justification=request.justification,
    )

    token_data = default_governor.create_approval_token(
        action=request.action,
        target_id=request.target_id,
        operator_id=operator_id,
    )
    return ApprovalTokenResponse(**token_data)


@router.get(
    "/governor/status",
    response_model=GovernorStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get live Governor metrics, cooldowns, and Circuit Breaker state",
)
def get_governor_status_endpoint(
    operator_id: str = Query(default="default_operator", description="Operator identifier"),
) -> GovernorStatusResponse:
    """Retrieve current operational status of the Governor, token bucket, and notification circuit breaker."""
    status_dict = default_governor.get_status_dict(operator_id=operator_id)
    return GovernorStatusResponse(**status_dict)


@router.post(
    "/governor/lockout",
    response_model=IncidentCommandResponse,
    status_code=status.HTTP_200_OK,
    summary="Engage or release emergency system-wide outbound lockout",
)
def toggle_governor_lockout_endpoint(
    request: LockoutToggleRequest,
    x_operator_id: str | None = Header(default="default_operator", alias="X-Operator-Id"),
    x_idempotency_key: str | None = Header(default=None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
) -> IncidentCommandResponse:
    """Emergency kill-switch to immediately freeze or restore outbound notification dispatching."""
    operator_id = x_operator_id or "default_operator"
    idem_key = x_idempotency_key or str(uuid.uuid4())

    action = "GOVERNOR_LOCKOUT_ENGAGE" if request.engaged else "GOVERNOR_LOCKOUT_RELEASE"
    cmd_req = IncidentCommandRequest(
        action=action,
        target_id=0,
        justification=request.justification,
    )

    return execute_incident_command(
        db=db,
        request=cmd_req,
        idempotency_key=idem_key,
        operator_id=operator_id,
    )


@router.get(
    "/actions",
    response_model=ActionCatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="List all allowlisted incident command actions and safety constraints",
)
def list_actions_endpoint() -> ActionCatalogResponse:
    """Retrieve catalog of all permissible defensive actions, blast radius tiers, and cooldown windows."""
    return get_allowlisted_actions_catalog()


@router.get(
    "/incidents",
    response_model=VirtualIncidentsResponse,
    status_code=status.HTTP_200_OK,
    summary="Query virtual incidents projected over Alert and Attack records",
)
def list_virtual_incidents_endpoint(
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by lifecycle status (open, acknowledged, resolved)",
    ),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum items to return (1-200)"),
    db: Session = Depends(get_db),
) -> VirtualIncidentsResponse:
    """Retrieve virtual incident records without requiring database schema migrations."""
    return get_virtual_incidents(db=db, status_filter=status_filter, limit=limit)
