"""Real-Time Streaming Gateway and Event Replay Router for HoneyShield-X (Phase 3).

Endpoints:
- POST /api/v1/events/ticket: Acquire short-lived single-use WebSocket connection ticket.
- WS /api/v1/events/ws: Authenticated bidirectional real-time event streaming WebSocket.
- GET /api/v1/events/replay: Cursor-based event log recovery for offline and reconnecting clients.
- GET /api/v1/events/stream: Authenticated Server-Sent Events (SSE) stream for web clients.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_operator
from app.auth.registry import Operator, default_operator_registry
from app.auth.session import default_session_store
from app.database import get_db
from app.events.manager import default_connection_manager
from app.events.schemas import (
    ConnectionTicketResponse,
    EventReplayResponse,
    SecurityEventEnvelope,
    TransferLifecycleEvent,
)
from app.events.service import publish_lifecycle_event, publish_handoff_event
from app.events.store import can_operator_view_event, default_event_store
from app.events.tickets import default_ticket_service
from app.observability.metrics import default_metrics_collector

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/events",
    tags=["Real-Time Streaming & Replay Gateway"],
)


@router.post(
    "/lifecycle",
    response_model=SecurityEventEnvelope,
    status_code=status.HTTP_201_CREATED,
    summary="Publish a verified digital agent transfer lifecycle event",
)
def emit_lifecycle_event(
    event_in: TransferLifecycleEvent,
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> SecurityEventEnvelope:
    """Publish an authoritative Digital Agent Universe lifecycle event.

    Enforces operator authentication, outbox persistence with sequential cursor,
    and real-time distribution across active WebSockets and mobile clients.
    """
    return publish_lifecycle_event(
        agent=event_in.agent,
        stage=event_in.stage,
        status=event_in.status,
        source=event_in.source,
        destination=event_in.destination,
        resource_id=event_in.resource_id,
        workflow_id=event_in.workflow_id,
        transfer_id=event_in.transfer_id,
        severity=event_in.severity,
        payload=event_in.payload,
        failure_reason=event_in.failure_reason,
        db=db,
    )


@router.get(
    "/lifecycle/journey/{identifier}",
    response_model=list[SecurityEventEnvelope],
    status_code=status.HTTP_200_OK,
    summary="Fetch chronologically ordered lifecycle events for a specific attack, workflow, or event ID",
)
def get_event_journey(
    identifier: str,
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> list[SecurityEventEnvelope]:
    """Retrieve full recorded lifecycle progression for a given event, workflow, or attack ID."""
    return default_event_store.get_journey_events(identifier=identifier, operator=operator, db=db)


@router.get(
    "/lifecycle/workload",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Aggregate live operational workload metrics per digital agent",
)
def get_agent_workload(
    operator: Operator = Depends(get_current_operator),
) -> dict[str, Any]:
    """Return authentic live workload metrics (active, pending, completed, failed, queue depth) for SCOUT, NEXUS, ORACLE, and SENTINEL."""
    return default_event_store.get_agent_workloads(operator=operator)


@router.post(
    "/ticket",
    response_model=ConnectionTicketResponse,
    status_code=status.HTTP_200_OK,
    summary="Acquire short-lived, single-use WebSocket connection ticket",
)
def create_connection_ticket(
    operator: Operator = Depends(get_current_operator),
) -> ConnectionTicketResponse:
    """Issue a 60-second single-use ticket bound to authenticated operator.

    Prevents sensitive session token transmission via URL query parameters.
    """
    ticket = default_ticket_service.issue_ticket(operator=operator, ttl_seconds=60)
    return ConnectionTicketResponse(
        ticket=ticket,
        expires_in=60,
        ws_endpoint="/api/v1/events/ws",
    )


@router.websocket("/ws")
async def websocket_event_stream(
    websocket: WebSocket,
    ticket: str | None = Query(default=None, description="Single-use connection ticket"),
) -> None:
    """Authenticated real-time bidirectional WebSocket event stream.

    Validates and claims the single-use ticket, enforces per-operator connection bounds,
    filters events through RBAC guards, and maintains heartbeat keepalive.
    """
    if not ticket:
        default_metrics_collector.increment_ws_auth_failure()
        await websocket.close(code=4401, reason="Missing connection ticket")
        return

    operator = default_ticket_service.consume_ticket(ticket)
    if operator is None:
        default_metrics_collector.increment_ws_auth_failure()
        await websocket.close(code=4403, reason="Invalid, expired, or already-consumed ticket")
        return

    connected = await default_connection_manager.connect(websocket, operator)
    if not connected:
        await websocket.close(code=4429, reason="Maximum concurrent connections reached")
        return

    # Send initial welcome frame
    welcome_frame = {
        "event_type": "system.connected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "operator": operator.username,
        "role": operator.role,
        "current_cursor": default_event_store.current_cursor,
    }
    await websocket.send_text(json.dumps(welcome_frame))

    # Keepalive & receive task
    try:
        while True:
            try:
                # Wait for client input (e.g. ping, ack, filter subscription)
                data_text = await asyncio.wait_for(websocket.receive_text(), timeout=20.0)
                try:
                    msg = json.loads(data_text)
                    msg_type = msg.get("type", "").lower()
                    if msg_type == "ping":
                        await websocket.send_text(json.dumps({
                            "event_type": "system.pong",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "cursor": default_event_store.current_cursor,
                        }))
                except Exception:
                    pass
            except asyncio.TimeoutError:
                # Send server heartbeat ping
                sent = await default_connection_manager.send_heartbeat(websocket)
                if not sent:
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("WS connection terminated: %s", e)
    finally:
        await default_connection_manager.disconnect(websocket)


@router.get(
    "/replay",
    response_model=EventReplayResponse,
    status_code=status.HTTP_200_OK,
    summary="Cursor-based event recovery for offline and reconnecting clients",
)
def replay_events(
    since_cursor: int | None = Query(default=None, description="Last successfully processed event cursor"),
    cursor: int | None = Query(default=None, description="Backward-compatible alias for since_cursor"),
    last_id: int | None = Query(default=None, description="Backward-compatible alias for since_cursor"),
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of historical events to return"),
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> EventReplayResponse:
    """Retrieve historical security events occurring since the specified cursor.

    Applies strict server-side RBAC filtering so operators only receive authorized events.
    Supports `since_cursor`, `cursor`, and `last_id` for backward-compatible client integration.
    """
    effective_cursor = since_cursor if since_cursor is not None else (cursor if cursor is not None else last_id)
    clean_cursor = effective_cursor if isinstance(effective_cursor, int) else None
    clean_limit = limit if isinstance(limit, int) else 50
    events, next_cursor, has_more = default_event_store.replay(
        since_cursor=clean_cursor,
        limit=clean_limit,
        operator=operator,
        db=db,
    )
    return EventReplayResponse(
        events=events,
        next_cursor=next_cursor,
        total=len(events),
        has_more=has_more,
    )


def resolve_sse_operator(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    ticket: str | None = Query(default=None),
) -> Operator:
    """Resolve operator for SSE stream securely from Authorization header or single-use ticket.

    SECURITY HARDENING (Milestone 6.1):
    Ordinary bearer tokens MUST NOT be passed via URL query parameters.
    Only Authorization: Bearer <token> headers or short-lived single-use tickets are accepted.
    """
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok = parts[1].strip()
            session_data = default_session_store.get_session(tok)
            if session_data:
                if session_data.operator_id == "emergency_breakglass":
                    return Operator(
                        username="emergency_breakglass",
                        role="security_administrator",
                        email="breakglass@honeyshield.local",
                        password_hash="",
                        is_active=True,
                    )
                op = default_operator_registry.get_operator(session_data.operator_id)
                if op and op.is_active:
                    return op

    if ticket:
        op = default_ticket_service.consume_ticket(ticket)
        if op and op.is_active:
            return op

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication for SSE stream. Authorization header or single-use ticket required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get(
    "/stream",
    summary="Authenticated Server-Sent Events (SSE) telemetry stream",
    response_class=StreamingResponse,
)
async def sse_event_stream(
    operator: Operator = Depends(resolve_sse_operator),
) -> StreamingResponse:
    """Subscribe to real-time events via Server-Sent Events with Bearer token authentication."""

    async def sse_generator():
        # Start from current cursor
        start_cursor = default_event_store.current_cursor
        welcome = {
            "event_type": "system.connected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operator": operator.username,
            "cursor": start_cursor,
        }
        yield f"event: system.connected\ndata: {json.dumps(welcome)}\n\n"

        last_seen = start_cursor
        while True:
            try:
                events, next_cursor, _ = default_event_store.replay(
                    since_cursor=last_seen,
                    limit=20,
                    operator=operator,
                )
                if events:
                    for ev in events:
                        yield f"event: {ev.event_type}\ndata: {ev.model_dump_json()}\n\n"
                        last_seen = ev.cursor or last_seen
                else:
                    # Heartbeat
                    hb = {
                        "event_type": "system.heartbeat",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "cursor": last_seen,
                    }
                    yield f"event: heartbeat\ndata: {json.dumps(hb)}\n\n"

                await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.debug("SSE stream error: %s", e)
                break

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

