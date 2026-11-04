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
from app.auth.registry import Operator
from app.database import get_db
from app.events.manager import default_connection_manager
from app.events.schemas import (
    ConnectionTicketResponse,
    EventReplayResponse,
    SecurityEventEnvelope,
)
from app.events.store import can_operator_view_event, default_event_store
from app.events.tickets import default_ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/events",
    tags=["Real-Time Streaming & Replay Gateway"],
)


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
        await websocket.close(code=4401, reason="Missing connection ticket")
        return

    operator = default_ticket_service.consume_ticket(ticket)
    if operator is None:
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
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of historical events to return"),
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> EventReplayResponse:
    """Retrieve historical security events occurring since the specified cursor.

    Applies strict server-side RBAC filtering so operators only receive authorized events.
    """
    clean_cursor = since_cursor if isinstance(since_cursor, int) else None
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


@router.get(
    "/stream",
    summary="Authenticated Server-Sent Events (SSE) telemetry stream",
    response_class=StreamingResponse,
)
async def sse_event_stream(
    operator: Operator = Depends(get_current_operator),
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

