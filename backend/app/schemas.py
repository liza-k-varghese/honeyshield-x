from datetime import datetime
from typing import Any
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


# ==========================================
# Threat Intelligence Schemas (Module 2.3)
# ==========================================

class ThreatIntelligenceResult(BaseModel):
    """Threat intelligence lookup and enrichment result contract."""

    found: bool = Field(description="Whether matching threat intelligence was found")
    indicator_type: str = Field(
        description="Indicator type (e.g. ip, domain, hash)"
    )
    indicator_value: str = Field(description="Normalized indicator value queried")
    threat_level: str | None = Field(
        default=None,
        description="Threat level if known (e.g. low, medium, high, critical)",
    )
    source: str | None = Field(
        default=None,
        description="Intelligence feed or reporting source",
    )
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0",
    )
    description: str | None = Field(
        default=None,
        description="Context or details regarding the indicator",
    )

    model_config = ConfigDict(from_attributes=True)


ThreatIntelligenceResponse = ThreatIntelligenceResult


# ==========================================
# Risk Scoring Schemas (Module 2.4)
# ==========================================

class RiskFactor(BaseModel):
    """Explanation of an individual factor contributing to the risk score."""

    factor: str = Field(description="Name/identifier of the contributing factor")
    contribution: float = Field(
        description="Numerical point contribution to the total risk score"
    )
    reason: str = Field(
        description="Human-readable explanation of why this factor contributed"
    )

    model_config = ConfigDict(from_attributes=True)


class RiskAnalysisResult(BaseModel):
    """Result contract for attack risk scoring."""

    attack_id: int = Field(description="ID of the analyzed attack")
    risk_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Deterministic calculated risk score bounded between 0 and 100",
    )
    severity: str = Field(
        description="Severity band classification (low, medium, high, critical)"
    )
    factors: list[RiskFactor] = Field(
        default_factory=list,
        description="Breakdown of individual factors contributing to the score",
    )

    model_config = ConfigDict(from_attributes=True)


RiskAnalysisResponse = RiskAnalysisResult


# ==========================================
# Alert Schemas (Module 2.5)
# ==========================================

class AlertBase(BaseModel):
    """Base schema for security alerts."""

    attack_id: int | None = Field(
        default=None,
        description="Associated attack ID",
    )
    alert_type: str = Field(
        description="Classification or type of alert (e.g. Brute Force SSH)",
    )
    severity: str = Field(
        default="low",
        description="Severity level (low, medium, high, critical)",
    )
    message: str = Field(description="Alert explanation message")
    status: str = Field(
        default="open",
        description="Lifecycle status (open, acknowledged, resolved)",
    )


class AlertResponse(AlertBase):
    """Schema for serializing alert records returned by the API."""

    id: int = Field(description="Unique database identifier for the alert")
    created_at: datetime = Field(description="Timestamp when alert was created")

    model_config = ConfigDict(from_attributes=True)


class AlertStatusUpdate(BaseModel):
    """Schema for updating an alert's lifecycle status."""

    status: str = Field(
        description="New lifecycle status (open, acknowledged, resolved)",
    )


class AlertEvaluationResult(BaseModel):
    """Response contract for alert evaluation on an attack container."""

    attack_id: int = Field(description="ID of the evaluated attack")
    alert_created: bool = Field(
        description="Whether a new alert was created or an existing one reused"
    )
    alert_id: int | None = Field(
        default=None,
        description="ID of the created or reused alert, if applicable",
    )
    risk_score: float = Field(
        description="Evaluated risk score of the attack (0-100)"
    )
    severity: str = Field(
        description="Evaluated severity band of the attack (low, medium, high, critical)"
    )
    status: str | None = Field(
        default=None,
        description="Lifecycle status of the alert (e.g. open), if alert exists",
    )
    reason: str = Field(
        description="Reasoning behind alert creation, reuse, or suppression"
    )

    model_config = ConfigDict(from_attributes=True)


AlertEvaluationResponse = AlertEvaluationResult


# ==========================================
# Notification Schemas (Module 2.6)
# ==========================================

class NotificationDispatchResult(BaseModel):
    """Response schema for alert notification dispatch."""

    alert_id: int = Field(description="ID of the dispatched alert")
    provider: str = Field(
        description="Notification provider used (e.g. webhook, none)",
    )
    sent: bool = Field(
        description="Whether the notification was successfully dispatched",
    )
    message: str = Field(
        description="Human-readable dispatch status or failure explanation",
    )

    model_config = ConfigDict(from_attributes=True)


NotificationDispatchResponse = NotificationDispatchResult


# ==========================================
# Pipeline Orchestration Schemas (Module 2.7)
# ==========================================

class PipelineStageDetection(BaseModel):
    """Detection stage summary."""

    detected: bool = Field(description="Whether detection pattern was triggered")
    detection_type: str = Field(description="Name/identifier of the detection rule")
    severity: str | None = Field(default=None, description="Severity assigned by detection")
    risk_score: float | None = Field(default=None, description="Base score from detection")
    evidence_count: int = Field(default=0, description="Number of correlated evidence events")
    message: str | None = Field(default=None, description="Detection finding message")


class PipelineStageThreatIntel(BaseModel):
    """Threat intelligence enrichment stage summary."""

    found: bool = Field(description="Whether indicator was found in threat intel database")
    indicator_value: str | None = Field(default=None, description="Queried indicator (e.g. source IP)")
    threat_level: str | None = Field(default=None, description="Assigned threat level if matched")
    confidence: float | None = Field(default=None, description="Confidence score if matched")
    source: str | None = Field(default=None, description="Threat intel source")


class PipelineStageRisk(BaseModel):
    """Risk scoring stage summary."""

    risk_score: float = Field(description="Calculated bounded 0-100 risk score")
    severity: str = Field(description="Severity classification band")
    factors: list[dict[str, Any]] = Field(default_factory=list, description="Scoring factor contributions")


class PipelineStageAlert(BaseModel):
    """Alert Manager stage summary."""

    alert_created: bool = Field(description="Whether a new alert was created")
    alert_id: int | None = Field(default=None, description="ID of generated or reused alert")
    severity: str | None = Field(default=None, description="Alert severity")
    status: str | None = Field(default=None, description="Alert status (open, acknowledged, resolved)")
    reason: str = Field(description="Explanation of alert generation or threshold gating decision")


class PipelineStageNotification(BaseModel):
    """Notification dispatch stage summary."""

    attempted: bool = Field(description="Whether notification delivery was attempted")
    alert_id: int | None = Field(default=None, description="Target alert ID if attempted")
    provider: str | None = Field(default=None, description="Notification provider used")
    sent: bool = Field(default=False, description="Whether notification was successfully delivered")
    message: str = Field(description="Delivery result or reason for skipping")


class PipelineExecutionResult(BaseModel):
    """Complete end-to-end pipeline execution result."""

    attack_id: int = Field(description="Target attack ID processed by the pipeline")
    pipeline_status: str = Field(description="Status of pipeline execution ('completed' or 'failed')")
    detection: PipelineStageDetection
    threat_intelligence: PipelineStageThreatIntel
    risk_scoring: PipelineStageRisk
    alert: PipelineStageAlert
    notification: PipelineStageNotification
    execution_time_ms: float = Field(description="Total pipeline execution duration in milliseconds")

    model_config = ConfigDict(from_attributes=True)


PipelineExecutionResponse = PipelineExecutionResult


# ==========================================
# Security Event Correlation Schemas (Module 2.8)
# ==========================================

class CorrelationResult(BaseModel):
    """Structured response for security event correlation across attack containers."""

    source_ip: str = Field(description="Analyzed source IP address")
    window_hours: int = Field(description="Sliding correlation window in hours")
    total_attacks: int = Field(
        description="Total attack containers associated with source IP in window"
    )
    total_events: int = Field(
        description="Total attack events associated with source IP in window"
    )
    attack_types: list[str] = Field(
        default_factory=list,
        description="Distinct attack types / vectors observed",
    )
    correlated: bool = Field(
        description="Whether correlation criteria were satisfied"
    )
    correlation_type: str = Field(
        description="Directive matched: 'multi_vector', 'distributed_burst', 'persistent_attacker', or 'none'"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Correlation confidence score between 0.0 and 1.0",
    )
    correlated_attack_ids: list[int] = Field(
        default_factory=list,
        description="List of Attack container IDs included in correlation",
    )
    reason: str = Field(
        description="Human-readable explanation of correlation finding"
    )

    model_config = ConfigDict(from_attributes=True)


CorrelationResultResponse = CorrelationResult

