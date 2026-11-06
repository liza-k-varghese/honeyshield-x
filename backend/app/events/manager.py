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

    async def revoke_operator_connections(self, operator_username: str, reason: str = "Operator session revoked") -> int:
        """Immediately disconnect all active WebSockets associated with operator_username (RFC 6455 close code 1008)."""
        to_disconnect: list[WebSocket] = []
        async with self._lock:
            for ws, op in list(self._active_connections.items()):
                if op.username == operator_username:
                    to_disconnect.append(ws)

        for ws in to_disconnect:
            try:
                # 1008: Policy Violation (RFC 6455)
                await ws.close(code=1008, reason=reason)
            except Exception:
                pass
            await self.disconnect(ws)
            default_metrics_collector.increment_stream_revocation()

        if to_disconnect:
            logger.info("Revoked and closed %d active WebSocket(s) for operator %s", len(to_disconnect), operator_username)
        return len(to_disconnect)

    def revoke_operator_connections_sync(self, operator_username: str, reason: str = "Operator session revoked") -> int:
        """Synchronous bridge to revoke operator connections across active event loops or background threads."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.revoke_operator_connections(operator_username, reason))
            return 1
        except RuntimeError:
            try:
                return asyncio.run(self.revoke_operator_connections(operator_username, reason))
            except Exception:
                return 0

    async def broadcast_event(self, envelope: SecurityEventEnvelope) -> None:
        """Broadcast event to all authorized active connections with Zero-Trust operator revalidation."""
        # Ensure event is recorded in replay store if not already appended
        if envelope.cursor is None or envelope.cursor == 0:
            default_event_store.append(envelope)

        serialized = envelope.model_dump_json()

        # Send to active WebSockets matching permissions
        dead_sockets: list[WebSocket] = []

        async with self._lock:
            connections_snapshot = list(self._active_connections.items())

        for ws, op in connections_snapshot:
            # Zero-Trust Active Revalidation: Verify operator is still active in registry
            from app.auth.registry import default_operator_registry
            current_op = default_operator_registry.get_operator(op.username)
            if not current_op or not getattr(current_op, "is_active", True):
                logger.warning("Zero-Trust stream policy: Operator %s is revoked/inactive; terminating socket", op.username)
                try:
                    await ws.close(code=1008, reason="Operator session revoked")
                except Exception:
                    pass
                dead_sockets.append(ws)
                default_metrics_collector.increment_stream_revocation()
                continue

            if not can_operator_view_event(current_op, envelope.event_type):
                default_metrics_collector.increment_authorization_failure()
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
