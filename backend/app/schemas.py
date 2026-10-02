from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# Attack Schemas
# ==========================================

class AttackBase(BaseModel):
    """Base schema with common attributes for attacks."""

    attack_type: str = Field(
        ...,
        max_length=100,
        description="Type or classification of attack (e.g. SQL Injection, SYN Flood)",
    )
    source_ip: str | None = Field(
        default=None,
        max_length=45,
        description="Source IP address of attacker",
    )
    destination_ip: str | None = Field(
        default=None,
        max_length=45,
        description="Destination or target IP address",
    )
    protocol: str | None = Field(
        default=None,
        max_length=20,
        description="Network protocol used (e.g. TCP, UDP, HTTP)",
    )
    severity: str = Field(
        default="low",
        max_length=20,
        description="Severity level of attack (e.g. low, medium, high, critical)",
    )
    risk_score: float = Field(
        default=0.0,
        ge=0.0,
        description="Calculated risk score for the attack",
    )
    status: str = Field(
        default="detected",
        max_length=30,
        description="Current attack status (e.g. detected, investigating, mitigated, closed)",
    )


class AttackCreate(AttackBase):
    """Schema for creating a new attack record."""

    detected_at: datetime | None = Field(
        default=None,
        description="Timestamp when the attack was detected; defaults to current time if omitted",
    )


class AttackResponse(AttackBase):
    """Schema for serializing attack data returned from the API."""

    id: int = Field(description="Unique database identifier for the attack")
    detected_at: datetime = Field(
        description="Timestamp when the attack was recorded as detected"
    )

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Attack Event Schemas (Module 2.1)
# ==========================================

class AttackEventBase(BaseModel):
    """Base schema for security attack events."""

    event_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Type or classification of event (e.g. ssh_login_failed)",
    )
    source_ip: str | None = Field(
        default=None,
        max_length=45,
        description="Source IP address of event (IPv4 or IPv6)",
    )
    message: str | None = Field(
        default=None,
        description="Log message or event details",
    )
    event_time: datetime | None = Field(
        default=None,
        description="Timestamp of event occurrence; defaults to current time if omitted",
    )


class AttackEventCreate(AttackEventBase):
    """Schema for ingesting an incoming security event."""

    attack_id: int | None = Field(
        default=None,
        description="Optional ID of existing attack to associate this event with",
    )


class AttackEventResponse(AttackEventBase):
    """Schema for returning ingested attack event data."""

    id: int = Field(description="Unique database identifier for the attack event")
    attack_id: int = Field(description="Associated attack ID")
    event_time: datetime = Field(description="Timestamp when event occurred")

    model_config = ConfigDict(from_attributes=True)


SecurityEventCreate = AttackEventCreate
SecurityEventResponse = AttackEventResponse


# ==========================================
# Detection Engine Schemas (Module 2.2)
# ==========================================

class DetectionResult(BaseModel):
    """Structured detection result contract for Module 2.2."""

    detected: bool = Field(description="Whether a suspicious pattern was detected")
    detection_type: str | None = Field(
        default=None,
        description="Identifier of the detection rule triggered",
    )
    severity: str | None = Field(
        default=None,
        description="Assigned severity level (e.g. high)",
    )
    risk_score: float | None = Field(
        default=None,
        description="Suggested deterministic risk score (e.g. 8.0)",
    )
    evidence_count: int = Field(
        description="Number of matching evidence events within the window"
    )
    source_ip: str | None = Field(
        default=None,
        description="Correlated attacker source IP, if available",
    )
    attack_id: int = Field(description="ID of the analyzed attack")
    message: str = Field(
        description="Human-readable explanation of detection finding"
    )

    model_config = ConfigDict(from_attributes=True)


DetectionResultResponse = DetectionResult

