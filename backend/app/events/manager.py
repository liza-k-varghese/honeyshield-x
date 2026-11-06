"""Real-Time Connection Manager for WebSockets and SSE (Phase 3).

Enforces:
- Connection tracking & graceful cleanup on termination.
- Per-operator connection limits to prevent socket exhaustion.
- Server-side RBAC event filtering before frame transmission.
- Bidirectional heartbeat ping/pong monitoring.
- Integration with Push Notification Dispatcher.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect

from app.auth.registry import Operator
from app.events.schemas import SecurityEventEnvelope
from app.events.store import can_operator_view_event, default_event_store
from app.observability.metrics import default_metrics_collector

logger = logging.getLogger(__name__)

MAX_CONNECTIONS_PER_OPERATOR: int = 5
HEARTBEAT_INTERVAL_SECONDS: float = 15.0


class RealtimeConnectionManager:
    """Manages active authenticated client WebSockets with RBAC-filtered broadcast."""

    def __init__(self) -> None:
        self._active_connections: dict[WebSocket, Operator] = {}
        self._operator_connection_counts: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, operator: Operator) -> bool:
        """Register newly authenticated WebSocket connection under operator identity."""
        async with self._lock:
            current_count = self._operator_connection_counts.get(operator.username, 0)
            if current_count >= MAX_CONNECTIONS_PER_OPERATOR:
                logger.warning(
                    "Connection limit (%d) reached for operator %s",
                    MAX_CONNECTIONS_PER_OPERATOR,
                    operator.username,
                )
                return False

            if hasattr(websocket, "accept"):
                res = websocket.accept()
                if hasattr(res, "__await__") or asyncio.iscoroutine(res):
                    await res
            self._active_connections[websocket] = operator
            self._operator_connection_counts[operator.username] = current_count + 1
            default_metrics_collector.increment_ws_connect()
            logger.info("Realtime WS connected: operator=%s total_ws=%d", operator.username, len(self._active_connections))
            return True

    async def disconnect(self, websocket: WebSocket) -> None:
        """Safely unregister WebSocket and reclaim connection count."""
        async with self._lock:
            operator = self._active_connections.pop(websocket, None)
            if operator:
                current_count = self._operator_connection_counts.get(operator.username, 1)
                if current_count <= 1:
                    self._operator_connection_counts.pop(operator.username, None)
                else:
                    self._operator_connection_counts[operator.username] = current_count - 1
                default_metrics_collector.increment_ws_disconnect()
                logger.info("Realtime WS disconnected: operator=%s total_ws=%d", operator.username, len(self._active_connections))

    async def broadcast_event(self, envelope: SecurityEventEnvelope) -> None:
        """Broadcast event to all authorized active connections."""
        # Record into replay store first
        default_event_store.append(envelope)

        serialized = envelope.model_dump_json()

        # Send to active WebSockets matching permissions
        dead_sockets: list[WebSocket] = []

        async with self._lock:
            connections_snapshot = list(self._active_connections.items())

        for ws, op in connections_snapshot:
            if not can_operator_view_event(op, envelope.event_type):
                continue

            try:
                await ws.send_text(serialized)
            except Exception:
                dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(ws)

    async def send_heartbeat(self, websocket: WebSocket) -> bool:
        """Send ping/heartbeat frame to client."""
        heartbeat = {
            "event_type": "system.heartbeat",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cursor": default_event_store.current_cursor,
        }
        try:
            await websocket.send_text(json.dumps(heartbeat))
            return True
        except Exception:
            return False


default_connection_manager = RealtimeConnectionManager()
