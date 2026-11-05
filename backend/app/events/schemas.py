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

    # Milestone 2 Digital Agent Universe Transfer Lifecycle Contract fields
    transfer_id: str | None = None
    workflow_id: str | None = None
    agent: str | None = None  # SCOUT, NEXUS, ORACLE, SENTINEL
    stage: str | None = None  # collection, ingestion, normalization, persistence, intelligence, alert, notification, containment
    status: str | None = None  # started, in_transit, waiting, completed, failed
    source: str | None = None
    destination: str | None = None
    failure_reason: str | None = None


class TransferLifecycleEvent(BaseModel):
    """Typed Digital Agent Universe transfer lifecycle schema (Milestone 2 Contract)."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transfer_id: str = Field(..., description="Unique transfer identifier e.g. tr_123")
    workflow_id: str = Field(..., description="Associated workflow or attack container e.g. wf_123")
    source: str = Field(..., description="Origin node identifier")
    destination: str = Field(..., description="Destination node identifier")
    agent: Literal["SCOUT", "NEXUS", "ORACLE", "SENTINEL"] = Field(..., description="Assigned digital agent")
    stage: str = Field(..., description="Processing stage e.g. ingestion, persistence, intelligence, alert")
    status: Literal["started", "in_transit", "waiting", "completed", "failed"] = Field(..., description="Execution status")
    severity: SecurityEventSeverity = "info"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resource_id: str = Field(..., description="Primary resource ID e.g. attack_123")
    schema_version: int = 1
    failure_reason: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict, description="Sanitized operational metadata")


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

