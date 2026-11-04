"""Typed Security Event Envelopes and Schemas for HoneyShield-X (Phase 3).

Standardizes real-time event distribution across SOC Command Center,
Web Console, and Dedicated Android Mobile Application.
"""

from datetime import datetime, timezone
from typing import Any, Literal
import uuid
from pydantic import BaseModel, Field


SecurityEventSeverity = Literal["critical", "high", "medium", "low", "info"]


class SecurityEventEnvelope(BaseModel):
    """Authoritative, typed event envelope for all HoneyShield-X real-time events."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = Field(..., description="Qualified event identifier (e.g. alert.created)")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    schema_version: str = "1.0"
    resource_id: str = Field(..., description="Primary identifier of resource affected")
    severity: SecurityEventSeverity = "info"
    payload: dict[str, Any] = Field(default_factory=dict, description="Sanitized authorized payload")
    correlation_id: str | None = None
    cursor: int | None = None


class ConnectionTicketResponse(BaseModel):
    """Response containing single-use short-lived ticket for WebSocket connection."""

    ticket: str
    expires_in: int = 60
    ws_endpoint: str = "/api/v1/events/ws"


class EventReplayResponse(BaseModel):
    """Response containing paginated historical events for offline catch-up."""

    events: list[SecurityEventEnvelope]
    next_cursor: int | None
    total: int
    has_more: bool

