from datetime import datetime
from enum import Enum
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


# ==========================================
# Multi-Vector Detection Schemas (Module 2.9)
# ==========================================

class TriggeredRuleEvidence(BaseModel):
    """Evidence details for a triggered detection rule."""

    rule_id: str = Field(description="Unique identifier of the rule")
    rule_name: str = Field(description="Human-readable rule name")
    vector: str = Field(description="Attack vector category ('auth', 'web', 'network')")
    severity: str = Field(description="Assigned severity level")
    risk_score: float = Field(description="Base risk score contribution")
    evidence_count: int = Field(
        description="Number of matching evidence events or distinct probes"
    )
    matched_patterns: list[str] = Field(
        default_factory=list,
        description="Sanitized matched signature patterns or tokens",
    )
    description: str = Field(description="Description of the rule and finding")

    model_config = ConfigDict(from_attributes=True)


class MultiVectorDetectionResponse(BaseModel):
    """Structured response for extended multi-vector rule evaluation."""

    detected: bool = Field(description="Whether any detection rule was triggered")
    is_multi_vector: bool = Field(
        description="Whether triggered rules span >= 2 distinct vector categories"
    )
    vectors_detected: list[str] = Field(
        default_factory=list,
        description="List of distinct vector categories triggered (e.g. ['auth', 'web'])",
    )
    rules_triggered: list[TriggeredRuleEvidence] = Field(
        default_factory=list,
        description="List of triggered detection rules with evidence",
    )
    suggested_risk_score: float = Field(
        ge=0.0,
        le=10.0,
        description="Recommended deterministic risk score between 0.0 and 10.0",
    )
    severity: str = Field(
        description="Highest severity level observed ('low', 'medium', 'high', 'critical')"
    )
    analyzed_event_count: int = Field(
        description="Number of events inspected in payload scan + aggregated"
    )
    total_event_count: int = Field(
        description="Total events available in time window"
    )
    truncated: bool = Field(
        description="Whether payload analysis was capped at maximum query limit"
    )
    message: str = Field(
        description="Human-readable explanation of detection finding"
    )
    attack_id: int | None = Field(
        default=None,
        description="Evaluated attack container ID, if applicable",
    )
    source_ip: str | None = Field(
        default=None,
        description="Evaluated source IP address, if applicable",
    )
    window_minutes: int = Field(
        description="Sliding evaluation window in minutes"
    )
    attack_ids: list[int] = Field(
        default_factory=list,
        description="List of attack container IDs included in evaluation",
    )

    model_config = ConfigDict(from_attributes=True)



# ==========================================
# Unified Orchestrator Schemas (Module 2.10)
# ==========================================

class CompositeRiskProvenance(BaseModel):
    """Provenance and factor breakdown for composite operational risk."""

    baseline_risk: float = Field(description="Baseline risk score from Module 2.4 (0-100)")
    detection_risk: float = Field(description="Scaled detection risk from Module 2.9 (0-100)")
    correlation_boost: float = Field(description="Correlation boost points from Module 2.8 (0-10)")
    operational_risk: float = Field(description="Authoritative composite operational risk score (0-100)")
    operational_severity: str = Field(description="Standardized severity band ('low', 'medium', 'high', 'critical')")
    rules_triggered_count: int = Field(description="Total count of detection rules triggered")
    correlation_type: str = Field(description="Behavioral correlation directive from Module 2.8")
    correlation_confidence: float = Field(description="Confidence level of behavioral correlation directive")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageDetectionSSH(BaseModel):
    """Results from Module 2.2 SSH detection."""

    detected: bool = Field(description="Whether SSH brute-force pattern was detected")
    detection_type: str | None = Field(default=None, description="Detection rule type classification")
    severity: str | None = Field(default=None, description="Severity classification from detection rule")
    risk_score: float | None = Field(default=None, description="Base risk score from detection rule")
    evidence_count: int = Field(default=0, description="Count of matching failed SSH login events")
    message: str | None = Field(default=None, description="Human-readable explanation of detection result")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageDetectionMultiVector(BaseModel):
    """Results from Module 2.9 Multi-Vector detection."""

    detected: bool = Field(description="Whether any vector-specific detection rule triggered")
    is_multi_vector: bool = Field(description="Whether triggered rules span >= 2 vectors")
    vectors_detected: list[str] = Field(default_factory=list, description="Triggered vector categories")
    rules_triggered: list[TriggeredRuleEvidence] = Field(default_factory=list, description="Triggered detection rules with evidence")
    suggested_risk_score: float = Field(description="Recommended risk score from rule registry (0-10)")
    severity: str = Field(description="Highest severity observed among triggered rules")
    message: str = Field(description="Human-readable detection summary")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageThreatIntel(BaseModel):
    """Results from Module 2.3 Threat Intelligence enrichment."""

    found: bool = Field(description="Whether the attacker indicator exists in TI database")
    indicator_value: str | None = Field(default=None, description="Queried indicator string")
    threat_level: str | None = Field(default=None, description="Known threat severity level")
    confidence: float | None = Field(default=None, description="Threat intelligence confidence score")
    source: str | None = Field(default=None, description="Intelligence source feed identifier")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageCorrelation(BaseModel):
    """Results from Module 2.8 Cross-Attack Behavioral Correlation."""

    correlated: bool = Field(description="Whether behavioral correlation criteria were met")
    correlation_type: str = Field(description="Directive: 'multi_vector', 'distributed_burst', 'persistent_attacker', 'none'")
    confidence: float = Field(description="Confidence score for correlation directive (0.0 to 1.0)")
    total_attacks: int = Field(description="Count of attack containers associated with source IP")
    total_events: int = Field(description="Count of events associated with source IP")
    reason: str = Field(description="Human-readable explanation of correlation finding")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageRiskComposition(BaseModel):
    """Results from Module 2.10 Risk Composition."""

    baseline_risk: float = Field(description="Baseline risk from Module 2.4")
    detection_risk: float = Field(description="Detection risk from Module 2.9")
    correlation_boost: float = Field(description="Correlation boost from Module 2.8")
    operational_risk: float = Field(description="Final composite operational risk")
    severity: str = Field(description="Operational severity band")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageAlert(BaseModel):
    """Results from Module 2.5 Alert Manager evaluation."""

    alert_created: bool = Field(description="Whether a new alert was created")
    alert_id: int | None = Field(default=None, description="ID of created or active reused alert")
    severity: str | None = Field(default=None, description="Alert severity level")
    status: str | None = Field(default=None, description="Alert status ('open', 'acknowledged', 'resolved')")
    reason: str = Field(default="", description="Reason for alert action or suppression")

    model_config = ConfigDict(from_attributes=True)


class UnifiedStageNotification(BaseModel):
    """Results from Module 2.6 Notification Dispatch."""

    attempted: bool = Field(description="Whether notification dispatch was attempted")
    alert_id: int | None = Field(default=None, description="Target alert ID")
    provider: str | None = Field(default=None, description="Active notification provider name")
    sent: bool = Field(description="Whether notification was successfully sent")
    message: str = Field(default="", description="Dispatch status or reason message")

    model_config = ConfigDict(from_attributes=True)


class UnifiedSecurityProcessingResponse(BaseModel):
    """Structured response for unified security processing pipeline (Module 2.10)."""

    attack_id: int = Field(description="Target attack container ID")
    pipeline_status: str = Field(description="Overall pipeline status ('completed' or 'failed')")
    source_ip: str | None = Field(default=None, description="Attacker source IP address")
    attack_type: str = Field(description="Primary attack classification")
    provenance: CompositeRiskProvenance = Field(description="Provenance breakdown of synthesized risk")
    detection_ssh: UnifiedStageDetectionSSH = Field(description="SSH brute force detection stage")
    detection_multi_vector: UnifiedStageDetectionMultiVector = Field(description="Multi-vector detection stage")
    threat_intelligence: UnifiedStageThreatIntel = Field(description="Threat intelligence stage")
    correlation: UnifiedStageCorrelation = Field(description="Cross-attack behavioral correlation stage")
    risk_composition: UnifiedStageRiskComposition = Field(description="Operational risk composition stage")
    alert: UnifiedStageAlert = Field(description="Alert evaluation stage")
    notification: UnifiedStageNotification = Field(description="Notification dispatch stage")
    execution_time_ms: float = Field(description="Total pipeline execution duration in milliseconds")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Dashboard Schemas (Module 3.1)
# ==========================================

class AlertSeverityCounts(BaseModel):
    """Breakdown of active/open alerts by severity band."""

    critical: int = Field(default=0, ge=0, description="Count of open critical alerts")
    high: int = Field(default=0, ge=0, description="Count of open high alerts")
    medium: int = Field(default=0, ge=0, description="Count of open medium alerts")
    low: int = Field(default=0, ge=0, description="Count of open low alerts")


class SystemHealthSummary(BaseModel):
    """Health status of platform core services."""

    api: str = Field(default="healthy", description="API operational status")
    postgresql: str = Field(description="PostgreSQL database connectivity status")
    redis: str = Field(description="Redis server connectivity status")


class DashboardStatsResponse(BaseModel):
    """Aggregated operational security metrics for SOC Dashboard."""

    total_attacks: int = Field(ge=0, description="Total count of attack containers recorded")
    active_alerts: int = Field(ge=0, description="Total count of open alerts")
    active_alerts_by_severity: AlertSeverityCounts = Field(description="Breakdown of open alerts by severity")
    unique_attacker_ips_24h: int = Field(ge=0, description="Count of distinct attacker IPs detected in last 24h")
    system_health: SystemHealthSummary = Field(description="Platform component health indicators")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Investigation & Attack-Chain Schemas (Module 3.2)
# ==========================================

class MitreTechniqueMapping(BaseModel):
    """Mapping of an event or rule to MITRE ATT&CK taxonomy."""

    tactic_id: str = Field(description="MITRE Tactic ID (e.g. TA0043, TA0001)")
    tactic_name: str = Field(description="MITRE Tactic name (e.g. Reconnaissance)")
    technique_id: str = Field(description="MITRE Technique ID (e.g. T1046, T1190)")
    technique_name: str = Field(description="MITRE Technique name (e.g. Network Service Discovery)")
    confidence: float = Field(ge=0.0, le=1.0, description="Mapping confidence score (0.0 - 1.0)")
    source: str = Field(description="Provenance source of mapping (rule ID or event type)")
    evidence_ids: list[int] = Field(default_factory=list, description="IDs of matching evidence events")

    model_config = ConfigDict(from_attributes=True)


class MitreCatalogEntry(BaseModel):
    """Entry in declarative MITRE ATT&CK catalog."""

    rule_or_event_id: str = Field(description="Rule ID, event type, or wildcard")
    mapping_type: str = Field(description="'rule', 'event_fallback', or 'unknown'")
    tactic_id: str = Field(description="Target MITRE tactic identifier")
    tactic_name: str = Field(description="Target MITRE tactic name")
    technique_id: str = Field(description="Target MITRE technique identifier")
    technique_name: str = Field(description="Target MITRE technique name")
    confidence: float = Field(description="Confidence weight of mapping")
    description: str = Field(description="Taxonomy explanation")

    model_config = ConfigDict(from_attributes=True)


class MitreCatalogResponse(BaseModel):
    """Complete declarative MITRE ATT&CK catalog response."""

    catalog: list[MitreCatalogEntry]
    total_entries: int

    model_config = ConfigDict(from_attributes=True)


class GraphNode(BaseModel):
    """Node in the derived Attack-Chain DAG."""

    id: str = Field(description="Unique node identifier in graph")
    type: str = Field(description="Node type: 'entity', 'tactic_stage', or 'alert'")
    label: str = Field(description="Human-readable node label")
    stage: str = Field(description="Stage or lifecycle phase represented")
    tactic_id: str | None = Field(default=None, description="MITRE Tactic ID if stage node")
    technique_id: str | None = Field(default=None, description="MITRE Technique ID if stage node")
    technique_name: str | None = Field(default=None, description="MITRE Technique name if stage node")
    severity: str = Field(default="low", description="Severity level for node")
    risk_score: float | None = Field(default=None, description="Risk score if applicable")
    event_count: int = Field(default=0, description="Evidence events represented by this node")
    evidence_ids: list[int] = Field(default_factory=list, description="Representative event IDs")
    first_seen: datetime | None = Field(default=None, description="Earliest event timestamp")
    last_seen: datetime | None = Field(default=None, description="Latest event timestamp")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional context metadata")

    model_config = ConfigDict(from_attributes=True)


class GraphEdge(BaseModel):
    """Directed transition edge in the derived Attack-Chain DAG."""

    id: str = Field(description="Unique edge identifier")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    label: str = Field(description="Transition description label")
    transition_type: str = Field(description="'chronological', 'escalation', or 'impact'")

    model_config = ConfigDict(from_attributes=True)


class GraphSummary(BaseModel):
    """Summary metrics for the derived Attack-Chain DAG."""

    stages_observed: int = Field(description="Count of distinct active tactic stages")
    total_events: int = Field(description="Total event count represented")
    highest_severity: str = Field(description="Highest severity observed in graph")
    has_execution: bool = Field(description="Whether execution tactic (TA0002) was reached")
    risk_score: float = Field(default=0.0, description="Associated overall risk score")

    model_config = ConfigDict(from_attributes=True)


class AttackGraphResponse(BaseModel):
    """Response contract for derived Attack-Chain DAG."""

    entity_id: str = Field(description="Queried attack ID or source IP")
    entity_type: str = Field(description="'attack' or 'source_ip'")
    nodes: list[GraphNode] = Field(description="Graph nodes representing stages and entities")
    edges: list[GraphEdge] = Field(description="Directed transition edges")
    summary: GraphSummary = Field(description="Summary metrics of attack progression")

    model_config = ConfigDict(from_attributes=True)


class CrossAttackEventResponse(BaseModel):
    """Chronological security event with attached MITRE taxonomy."""

    id: int = Field(description="Unique database identifier for the attack event")
    attack_id: int = Field(description="Associated attack container ID")
    event_type: str = Field(description="Type or classification of event")
    source_ip: str | None = Field(default=None, description="Source IP address")
    message: str | None = Field(default=None, description="Log message or event payload")
    event_time: datetime = Field(description="Timestamp when event occurred")
    mitre: MitreTechniqueMapping | None = Field(default=None, description="Deterministic MITRE ATT&CK taxonomy mapping")

    model_config = ConfigDict(from_attributes=True)


class IpDossierResponse(BaseModel):
    """Aggregated Attacker Entity Dossier for SOC deep-dive investigation."""

    source_ip: str = Field(description="Investigated source IP address")
    first_seen: datetime | None = Field(default=None, description="Earliest detection timestamp")
    last_seen: datetime | None = Field(default=None, description="Most recent detection timestamp")
    total_attacks: int = Field(default=0, ge=0, description="Total attack containers for this IP")
    total_events: int = Field(default=0, ge=0, description="Total security events for this IP")
    attack_ids: list[int] = Field(default_factory=list, description="IDs of attack containers")
    attack_types: list[str] = Field(default_factory=list, description="Observed attack classifications")
    highest_severity: str = Field(default="low", description="Highest severity observed")
    highest_risk_score: float = Field(default=0.0, description="Highest risk score observed")
    threat_intelligence: ThreatIntelligenceResult = Field(description="Threat intelligence context (Module 2.3)")
    correlation: CorrelationResult = Field(description="Behavioral correlation context (Module 2.8)")
    multi_vector: MultiVectorDetectionResponse = Field(description="Multi-vector rule results (Module 2.9)")
    active_alerts_count: int = Field(default=0, ge=0, description="Count of open or acknowledged alerts")
    alerts: list[AlertResponse] = Field(default_factory=list, description="Recent alerts for this attacker")

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# Detection Rule Management, Replay & Simulation Schemas (Module 3.3)
# =============================================================================

class DetectionRuleSummary(BaseModel):
    """Declarative detection rule summary and criteria (Module 3.3)."""

    rule_id: str = Field(description="Unique rule identifier")
    name: str = Field(description="Human-readable rule name")
    vector: str = Field(description="Canonical vector category (auth, web, network)")
    description: str = Field(description="Rule description and rationale")
    severity: str = Field(description="Severity classification (critical, high, medium, low)")
    base_risk_score: float = Field(ge=0.0, le=10.0, description="Base risk score contribution")
    rule_type: str = Field(description="Rule evaluation mechanism ('threshold' or 'signature')")
    target_event_types: list[str] = Field(description="Telemetry event types evaluated by this rule")
    window_minutes: int = Field(ge=1, le=60, description="Sliding evaluation window in minutes")
    threshold_count: int = Field(ge=1, description="Minimum events or matches required to trigger")
    match_tokens: list[str] = Field(default_factory=list, description="Sanitized substring tokens for fast matching")
    regex_patterns: list[str] = Field(default_factory=list, description="Compiled regex pattern strings")
    is_active: bool = Field(default=True, description="Whether the rule is active in production")
    is_immutable: bool = Field(default=True, description="Whether the rule definition is immutable in code")

    model_config = ConfigDict(from_attributes=True)


class RuleCatalogResponse(BaseModel):
    """Active declarative detection rules catalog."""

    total_rules: int = Field(ge=0, description="Total active registered detection rules")
    rules: list[DetectionRuleSummary] = Field(description="List of registered detection rules")


class TopAttackerStat(BaseModel):
    """Attacking source IP and trigger count statistic."""

    source_ip: str = Field(description="Source IP address")
    trigger_count: int = Field(ge=0, description="Number of times rule triggered for this IP")


class RuleEfficacyResponse(BaseModel):
    """Empirical performance metrics and trigger telemetry for a detection rule."""

    rule_id: str = Field(description="Unique rule identifier")
    rule_name: str = Field(description="Human-readable rule name")
    time_range_hours: int = Field(ge=1, le=168, description="Historical analysis window in hours")
    total_triggers: int = Field(ge=0, description="Total times rule has triggered in window")
    unique_attackers: int = Field(ge=0, description="Distinct attacker IPs that triggered rule")
    correlated_multi_vector_triggers: int = Field(ge=0, description="Triggers occurring alongside other vector rules")
    isolated_triggers: int = Field(ge=0, description="Triggers where this was the sole rule triggered")
    correlated_rate_pct: float = Field(ge=0.0, le=100.0, description="Percentage of triggers correlated with multi-vector activity")
    avg_associated_risk_score: float = Field(ge=0.0, le=10.0, description="Average risk score of attacks triggering rule")
    last_triggered_at: datetime | None = Field(default=None, description="Timestamp of most recent trigger")
    false_positive_indicator: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Heuristic false-positive indicator percentage based on un-escalated single-event occurrences",
    )
    false_positive_indicator_note: str = Field(
        default="Heuristic indicator derived from available telemetry; not an authoritative ground-truth classification.",
        description="Methodological note regarding the false-positive indicator",
    )
    top_attacking_ips: list[TopAttackerStat] = Field(default_factory=list, description="Top IPs triggering this rule")


class ReplayRequest(BaseModel):
    """Request payload for deterministic historical event replay."""

    window_minutes: int = Field(default=15, ge=1, le=60, description="Sliding evaluation window in minutes")
    max_events: int = Field(default=200, ge=1, le=200, description="Maximum historical events to evaluate (cap 200)")
    record_audit: bool = Field(default=True, description="Whether to log an operator audit record in SystemEvent")
    start_time: datetime | None = Field(default=None, description="Optional start timestamp filter")
    end_time: datetime | None = Field(default=None, description="Optional end timestamp filter")


class ReplayTimelineEvent(BaseModel):
    """Chronological event representation in replay timeline."""

    event_id: int = Field(description="Primary key of AttackEvent")
    event_time: datetime = Field(description="Event timestamp")
    event_type: str = Field(description="Event classification type")
    source_ip: str = Field(description="Attacker source IP")
    payload_preview: str = Field(description="Sanitized and truncated payload preview")
    cumulative_rules_triggered: list[str] = Field(default_factory=list, description="Rules triggered up to this event")


class ReplayDetectionSummary(BaseModel):
    """Detection findings summary for baseline and replayed evaluation."""

    detected: bool = Field(description="Whether any rule triggered")
    is_multi_vector: bool = Field(description="Whether triggers span >= 2 vectors")
    vectors_detected: list[str] = Field(default_factory=list, description="Distinct vectors triggered")
    rules_triggered: list[str] = Field(default_factory=list, description="List of rule IDs triggered")
    suggested_risk_score: float = Field(ge=0.0, le=10.0, description="Computed risk score")
    severity: str = Field(description="Highest severity observed")


class DetectionDiff(BaseModel):
    """Comparison delta between baseline findings and replayed findings."""

    match_status: str = Field(
        description="Comparison outcome: 'identical', 'expanded_coverage', 'reduced_coverage', or 'drift_detected'"
    )
    historical_rules_triggered: list[str] = Field(default_factory=list, description="Rules originally triggered")
    replayed_rules_triggered: list[str] = Field(default_factory=list, description="Rules triggered during replay")
    new_rules_triggered: list[str] = Field(default_factory=list, description="Rules triggered during replay but not baseline")
    suppressed_rules: list[str] = Field(default_factory=list, description="Rules in baseline that did not trigger in replay")
    risk_score_delta: float = Field(description="Difference in risk score (replayed - baseline)")
    severity_changed: bool = Field(description="Whether severity level differs between baseline and replay")


class ReplayExecutionResponse(BaseModel):
    """Structured response for deterministic historical event replay."""

    replay_id: str = Field(description="Unique deterministic replay execution ID")
    scope: str = Field(description="Replay scope: 'attack' or 'ip'")
    target_identifier: str = Field(description="Target attack ID or source IP")
    total_events_evaluated: int = Field(ge=0, description="Total events processed in replay sandbox")
    execution_duration_ms: float = Field(ge=0.0, description="Replay execution duration in milliseconds")
    deterministic_pass: bool = Field(description="Whether replay completed deterministically")
    match_status: str = Field(description="Comparison outcome against baseline findings")
    baseline_detection: ReplayDetectionSummary | None = Field(default=None, description="Original persisted detection findings")
    replayed_detection: ReplayDetectionSummary = Field(description="Detection findings derived from replay evaluation")
    detection_diff: DetectionDiff = Field(description="Side-by-side detection delta")
    event_timeline: list[ReplayTimelineEvent] = Field(default_factory=list, description="Chronological event progression")


class CandidateRuleSpec(BaseModel):
    """Candidate rule specification for dry-run simulation testing."""

    rule_id: str = Field(description="Candidate rule identifier", min_length=2, max_length=64)
    name: str = Field(description="Candidate rule name", min_length=2, max_length=128)
    vector: str = Field(description="Canonical vector: 'auth', 'web', or 'network'")
    rule_type: str = Field(description="Rule evaluation type: 'threshold' or 'signature'")
    target_event_types: list[str] = Field(description="Target telemetry event types")
    window_minutes: int = Field(default=15, ge=1, le=60, description="Sliding evaluation window in minutes")
    threshold_count: int = Field(default=1, ge=1, le=1000, description="Minimum count to trigger")
    severity: str = Field(default="medium", description="Severity classification")
    base_risk_score: float = Field(default=5.0, ge=0.0, le=10.0, description="Base risk score contribution")
    match_tokens: list[str] = Field(default_factory=list, description="Tokens to match against payload")
    regex_patterns: list[str] = Field(default_factory=list, description="Regex pattern strings")


class SimulationRequest(BaseModel):
    """Request payload for dry-run rule simulation against historical events."""

    target_scope: str = Field(default="attack", description="Simulation target scope: 'attack' or 'ip'")
    target_identifier: str = Field(description="Target attack ID (int as str) or source IP")
    window_minutes: int = Field(default=15, ge=1, le=60, description="Historical event window in minutes")
    candidate_rule: CandidateRuleSpec = Field(description="Candidate rule specification to evaluate")


class SimulationExecutionResponse(BaseModel):
    """Structured response for candidate rule dry-run simulation."""

    simulation_id: str = Field(description="Unique simulation execution identifier")
    target_scope: str = Field(description="Target scope evaluated ('attack' or 'ip')")
    target_identifier: str = Field(description="Target attack ID or source IP")
    events_evaluated: int = Field(ge=0, description="Total historical events evaluated in simulation sandbox")
    execution_duration_ms: float = Field(ge=0.0, description="Simulation sandbox execution duration in milliseconds")
    candidate_rule_triggered: bool = Field(description="Whether the candidate rule triggered on historical events")
    candidate_evidence_count: int = Field(ge=0, description="Evidence events matching candidate rule criteria")
    baseline_rules_triggered: list[str] = Field(default_factory=list, description="Production rules triggered on same events")
    simulation_rules_triggered: list[str] = Field(default_factory=list, description="Rules triggered including candidate")
    new_detections_count: int = Field(ge=0, description="Count of new detections introduced by candidate rule")
    comparison_summary: str = Field(description="Analytical comparison between candidate and baseline")
    matched_payload_samples: list[str] = Field(default_factory=list, description="Sanitized samples of matching event payloads")


class AuditEventItem(BaseModel):
    """Audit log event record from SystemEvent table."""

    id: int = Field(description="System event record ID")
    event_type: str = Field(description="Event classification type")
    source: str = Field(description="Originating subsystem or operator console")
    severity: str = Field(description="Severity classification")
    message: str = Field(description="Event description and audit payload")
    created_at: datetime = Field(description="Timestamp when event was logged")

    model_config = ConfigDict(from_attributes=True)


class AuditEventsResponse(BaseModel):
    """Query response for operator and system audit logs."""

    total_events: int = Field(ge=0, description="Total matching audit events returned")
    events: list[AuditEventItem] = Field(description="Chronological audit records")


# ==========================================
# Module 3.4 Incident Command Schemas
# ==========================================

class IncidentCommandRequest(BaseModel):
    """Payload for submitting a governed incident command."""

    action: str = Field(description="Allowlisted command action name")
    target_id: int = Field(default=0, description="Target entity ID (e.g. alert_id)")
    justification: str | None = Field(default=None, description="Operator justification for Level 2/3 actions")
    approval_token: str | None = Field(default=None, description="Ephemeral approval token from pre-flight preview")


class IncidentCommandResponse(BaseModel):
    """Structured response for governed command execution."""

    command_id: str = Field(description="Unique execution identifier")
    success: bool = Field(description="Whether the command executed successfully")
    action: str = Field(description="Executed action name")
    target_id: int = Field(description="Target entity ID")
    new_status: str | None = Field(default=None, description="Updated entity lifecycle status")
    message: str = Field(description="Execution summary message")
    governor_status: str = Field(description="Governor policy verdict")
    audit_event_id: int | None = Field(default=None, description="Associated SystemEvent audit row ID")
    execution_duration_ms: float = Field(description="Execution latency in milliseconds")


class ApprovalTokenResponse(BaseModel):
    """Two-phase pre-flight approval token response."""

    approval_token: str = Field(description="Ephemeral approval token (UUID v4)")
    action: str = Field(description="Target allowlisted action")
    target_id: int = Field(description="Target entity ID")
    operator_id: str = Field(default="default_operator", description="Operator identifier bound to token")
    expires_in_seconds: int = Field(description="Token validity window in seconds")
    expires_at: str = Field(description="ISO timestamp of token expiry")


class CircuitBreakerStatus(BaseModel):
    """Metrics and state for outbound notification circuit breaker."""

    state: str = Field(description="Breaker state: CLOSED, OPEN, or HALF_OPEN")
    consecutive_failures: int = Field(description="Current consecutive error count")
    failure_threshold: int = Field(description="Trip threshold count")
    cooldown_remaining_seconds: float = Field(description="Remaining seconds until HALF_OPEN probe")
    total_successes: int = Field(description="Lifetime successful dispatches")
    total_failures: int = Field(description="Lifetime failed dispatches")
    tripped_count: int = Field(description="Total times breaker has tripped to OPEN")


class GovernorStatusResponse(BaseModel):
    """Comprehensive status for Deterministic Governor."""

    lockout_engaged: bool = Field(description="Whether emergency outbound lockout is active")
    operator_id: str = Field(description="Queried operator identifier")
    operator_actions_last_minute: int = Field(description="Actions issued by this operator in the last 60s")
    operator_rate_limit_max: int = Field(description="Allowed actions per 60s")
    active_cooldowns_count: int = Field(description="Number of target entities currently in cooldown")
    circuit_breaker: CircuitBreakerStatus = Field(description="Outbound notification circuit breaker status")
    allowlisted_actions: list[str] = Field(description="List of all allowlisted actions")


class LockoutToggleRequest(BaseModel):
    """Payload to engage or release emergency system-wide lockout."""

    engaged: bool = Field(description="True to engage emergency lockout; False to release")
    justification: str = Field(min_length=5, description="Mandatory operator justification for lockout toggle")


class VirtualIncidentItem(BaseModel):
    """Virtual incident projection aggregated from Alert and Attack."""

    incident_id: str = Field(description="Virtual incident identifier, e.g. 'INC-42'")
    alert_id: int = Field(description="Associated alert primary key")
    attack_id: int | None = Field(default=None, description="Associated attack primary key")
    source_ip: str = Field(description="Attacker source IP address")
    attack_type: str = Field(description="Classification of attack or alert")
    severity: str = Field(description="Severity classification")
    status: str = Field(description="Current lifecycle status (open, acknowledged, resolved)")
    risk_score: float = Field(description="Calculated risk score 0.0-100.0")
    notification_status: str = Field(description="Notification delivery status")
    event_count: int = Field(description="Total correlated attack telemetry events")
    created_at: datetime = Field(description="Timestamp when incident was created")


class VirtualIncidentsResponse(BaseModel):
    """Query response for virtual incident collection."""

    total_incidents: int = Field(description="Total virtual incidents matching criteria")
    incidents: list[VirtualIncidentItem] = Field(description="List of virtual incidents")


class AllowlistedActionItem(BaseModel):
    """Specification of an allowlisted incident command action."""

    action: str = Field(description="Action name")
    blast_tier: int = Field(description="Blast radius tier (1=low, 2=medium, 3=high)")
    requires_justification: bool = Field(description="Whether non-empty justification is required")
    cooldown_seconds: float = Field(description="Cooldown window in seconds")
    description: str = Field(description="Human-readable description of action effect")


class ActionCatalogResponse(BaseModel):
    """Catalog of all allowlisted incident command actions."""

    total_actions: int = Field(description="Total allowlisted actions")
    actions: list[AllowlistedActionItem] = Field(description="Catalog of allowlisted actions")


# ==========================================
# Operator Authentication & RBAC Schemas (Module 3.5)
# ==========================================

class LoginRequest(BaseModel):
    """Credentials payload for operator authentication."""

    username: str = Field(..., min_length=1, max_length=100, description="Operator username")
    password: str = Field(..., min_length=1, description="Operator plaintext password")


class OperatorProfile(BaseModel):
    """Public operator profile with assigned RBAC permissions."""

    username: str = Field(description="Unique operator username")
    role: str = Field(description="Assigned SOC operational role tier")
    email: str = Field(description="Operator email address")
    permissions: list[str] = Field(description="List of deterministic RBAC permission strings")
    is_active: bool = Field(description="Whether the account is active")


class LoginResponse(BaseModel):
    """Successful authentication response with bearer session token."""

    token: str = Field(description="Opaque CSPRNG bearer session token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(description="Session lifetime remaining in seconds")
    operator: OperatorProfile = Field(description="Operator identity profile")


class LogoutResponse(BaseModel):
    """Response payload for session termination."""

    success: bool = Field(description="Whether session was terminated")
    message: str = Field(description="Status confirmation message")


class BreakGlassRequest(BaseModel):
    """Emergency break-glass procedure request."""

    passphrase: str = Field(..., min_length=1, description="Emergency break-glass passphrase")
    justification: str = Field(
        ...,
        min_length=20,
        max_length=512,
        description="Mandatory operational justification (minimum 20 characters)",
    )


class BreakGlassResponse(BaseModel):
    """Emergency session response."""

    token: str = Field(description="Opaque CSPRNG bearer session token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(description="Session lifetime remaining in seconds (max 1800s)")
    operator: OperatorProfile = Field(description="Emergency Security Administrator profile")
    warning: str = Field(description="Operational emergency warning")


# ============================================================================
# MODULE 3.6 — SOC INCIDENT CASE MANAGEMENT & INTERACTIVE RESPONSE PLAYBOOKS
# ============================================================================


class PlaybookTask(BaseModel):
    """Deterministic SOP task within an incident response playbook."""

    task_id: str = Field(description="Unique task identifier, e.g. task_1")
    stage: str = Field(
        description="SANS/NIST incident response stage: identification, containment, eradication, recovery, lessons_learned"
    )
    title: str = Field(description="Short title of the SOP task")
    description: str = Field(description="Operational description and verification criteria")
    action_type: str = Field(
        default="manual_check",
        description="Task action category: manual_check, governor_command, evidence_collection, notification",
    )
    suggested_command: str | None = Field(
        default=None,
        description="Optional Module 3.4 Governor action name, e.g. CONTAINMENT_STAGING_REQUEST",
    )
    is_mandatory: bool = Field(default=True, description="Whether completing this task is required for case resolution")
    status: str = Field(default="pending", description="Task state: pending, in_progress, completed, skipped")
    completed_by: str | None = Field(default=None, description="Username of operator who completed the task")
    completed_at: str | None = Field(default=None, description="ISO timestamp of task completion")
    command_execution_id: str | None = Field(
        default=None, description="Governor command execution ID associated with this task"
    )
    notes: str | None = Field(default=None, description="Operator notes entered upon task completion")


class CaseNote(BaseModel):
    """Forensic investigation journal note."""

    note_id: str = Field(description="Unique note identifier")
    operator_id: str = Field(description="Author operator username")
    role: str = Field(description="Author operator SOC role tier")
    message: str = Field(description="Investigation findings or forensic notes")
    created_at: str = Field(description="ISO timestamp of note creation")


class IncidentCase(BaseModel):
    """SOC Incident Case model uniting alerts, playbook SOPs, and forensic notes."""

    case_id: str = Field(description="Unique incident case identifier, e.g. CASE-2026-0001")
    title: str = Field(description="Descriptive incident title")
    description: str | None = Field(default=None, description="Detailed incident narrative or scope")
    severity: str = Field(description="Incident severity tier: low, medium, high, critical")
    status: str = Field(
        description="Case lifecycle state: new, investigating, containment_in_progress, contained, resolved, closed"
    )
    assigned_to: str | None = Field(default=None, description="Assigned operator username")
    source_ip: str | None = Field(default=None, description="Primary adversary source IP address")
    target_id: int | None = Field(default=None, description="Primary target attack ID or alert ID")
    alert_ids: list[int] = Field(default_factory=list, description="IDs of linked alerts")
    playbook_template: str = Field(
        default="GENERIC_INCIDENT_SOP",
        description="Active playbook SOP template name",
    )
    tasks: list[PlaybookTask] = Field(default_factory=list, description="Checklist of playbook tasks")
    notes: list[CaseNote] = Field(default_factory=list, description="Journal of forensic notes")
    created_by: str = Field(description="Creator operator username")
    created_at: str = Field(description="ISO timestamp of case creation")
    updated_at: str = Field(description="ISO timestamp of latest update")
    closed_at: str | None = Field(default=None, description="ISO timestamp of case closure")
    closed_by: str | None = Field(default=None, description="Operator username who signed off on closure")
    playbook_progress: float = Field(default=0.0, description="Completion ratio from 0.0 to 1.0")
    advisory_summary: str | None = Field(default=None, description="Advisory threat contextualization summary")


class CaseCreateRequest(BaseModel):
    """Payload for creating a new incident case or promoting an alert."""

    title: str = Field(..., min_length=3, max_length=200, description="Incident case title")
    description: str | None = Field(default=None, max_length=2000, description="Optional incident description")
    severity: str = Field(default="medium", description="Severity: low, medium, high, critical")
    source_ip: str | None = Field(default=None, max_length=128, description="Primary adversary source IP")
    target_id: int | None = Field(default=None, description="Primary target ID")
    initial_alert_ids: list[int] = Field(default_factory=list, description="Alert IDs to bind to this case")
    playbook_template: str = Field(
        default="GENERIC_INCIDENT_SOP",
        description="Playbook template: SSH_BRUTE_FORCE_SOP, WEB_EXPLOIT_SOP, PORT_SCAN_RECON_SOP, GENERIC_INCIDENT_SOP",
    )
    assigned_to: str | None = Field(default=None, description="Initial assignee username")
    initial_note: str | None = Field(default=None, max_length=2000, description="Optional initial triage note")


class CaseUpdateRequest(BaseModel):
    """Payload for updating case metadata, status, or assignee."""

    title: str | None = Field(default=None, min_length=3, max_length=200, description="Updated title")
    severity: str | None = Field(default=None, description="Updated severity")
    status: str | None = Field(default=None, description="Target lifecycle state")
    assigned_to: str | None = Field(default=None, description="Updated assignee username")


class CaseTaskCompleteRequest(BaseModel):
    """Payload for marking a playbook task complete or skipped."""

    notes: str | None = Field(default=None, max_length=1000, description="Verification notes for this task")
    command_execution_id: str | None = Field(
        default=None, max_length=128, description="Governor command execution ID if applicable"
    )
    status: str = Field(default="completed", description="Target task status: completed or skipped")


class CaseNoteCreateRequest(BaseModel):
    """Payload for appending an investigation note to a case."""

    message: str = Field(..., min_length=1, max_length=5000, description="Forensic investigation note message")


class CaseListResponse(BaseModel):
    """Paginated list of incident cases."""

    cases: list[IncidentCase] = Field(description="List of matching incident cases")
    total: int = Field(description="Total count of matching cases")


class PostIncidentReportResponse(BaseModel):
    """Structured Post-Incident Review (PIR) executive closure report."""

    case_id: str = Field(description="Case ID")
    title: str = Field(description="Incident title")
    severity: str = Field(description="Incident severity")
    status: str = Field(description="Incident lifecycle status")
    executive_summary: str = Field(description="Executive narrative summary")
    incident_timeline: list[dict[str, Any]] = Field(description="Key milestones and chronological evidence timeline")
    playbook_adherence: str = Field(description="Calculated playbook task adherence percentage")
    remediation_actions: list[str] = Field(description="List of executed defensive remediation actions")
    root_cause_analysis: str = Field(description="Synthesized root cause analysis")
    assigned_operator: str | None = Field(default=None, description="Assigned incident handler")
    signoff_operator: str = Field(description="Operator username who signed off on the PIR")
    generated_at: str = Field(description="ISO timestamp of PIR generation")


# ==========================================
# Active Deception Grid & Canary Schemas (Module 3.7)
# ==========================================

class CanaryToken(BaseModel):
    """Canary Honeytoken record representing a high-confidence / presumptive-compromise defensive tripwire.

    Security Contract:
    - Canary tokens are high-confidence security signals, not mathematically guaranteed compromises.
    - Decoy values are permanently inert and never grant functional access.
    """

    canary_id: str = Field(description="Unique canary identifier (e.g. CANARY-2026-1234)")
    name: str = Field(min_length=3, max_length=100, description="Descriptive label for this canary token")
    canary_type: str = Field(
        description="Asset class: AWS_API_KEY, DATABASE_CREDENTIAL, SERVICE_API_TOKEN, WEB_TRIPWIRE_ENDPOINT, CANARY_FILE_BEACON"
    )
    status: str = Field(default="active", description="Lifecycle state: active or revoked")
    token_hash: str = Field(description="SHA-256 hash of the secret decoy token identifier")
    token_id: str = Field(description="Public lookup identifier or tripwire slug")
    environment: str = Field(default="production", max_length=50, description="Deployment environment tag")
    placement_hint: str | None = Field(default=None, max_length=200, description="Operational deployment location hint")
    decoy_payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Inert decoy credentials or artifact payload presented to operators",
    )
    hit_count: int = Field(default=0, description="Total number of recorded tripwire hits")
    last_hit_at: str | None = Field(default=None, description="ISO timestamp of most recent tripwire interaction")
    created_by: str = Field(description="Operator username who minted the canary")
    created_at: str = Field(description="ISO timestamp of creation")
    updated_at: str = Field(description="ISO timestamp of last update")
    revoked_at: str | None = Field(default=None, description="ISO timestamp of decommissioning if revoked")
    revoked_by: str | None = Field(default=None, description="Operator username who revoked the canary")

    model_config = ConfigDict(from_attributes=True)


class CanaryCreateRequest(BaseModel):
    """Payload for minting a new canary honeytoken."""

    name: str = Field(..., min_length=3, max_length=100, description="Descriptive label for this canary token")
    canary_type: str = Field(
        ...,
        description="Asset class: AWS_API_KEY, DATABASE_CREDENTIAL, SERVICE_API_TOKEN, WEB_TRIPWIRE_ENDPOINT, CANARY_FILE_BEACON",
    )
    environment: str = Field(default="production", max_length=50, description="Deployment environment tag")
    placement_hint: str | None = Field(default=None, max_length=200, description="Deployment location hint")
    custom_labels: dict[str, str] = Field(default_factory=dict, description="Optional custom key-value metadata tags")


class CanaryUpdateRequest(BaseModel):
    """Payload for updating canary metadata or decommissioning state."""

    name: str | None = Field(default=None, min_length=3, max_length=100, description="Updated name")
    environment: str | None = Field(default=None, max_length=50, description="Updated environment")
    placement_hint: str | None = Field(default=None, max_length=200, description="Updated placement hint")
    status: str | None = Field(default=None, description="Target lifecycle state: active or revoked")


class CanaryHitEvent(BaseModel):
    """Forensic interaction telemetry recorded when an adversary trips a canary honeytoken."""

    hit_id: str = Field(description="Unique hit interaction identifier")
    canary_id: str = Field(description="Canary token identifier")
    canary_type: str = Field(description="Canary asset class")
    source_ip: str = Field(description="Client IP address that interacted with the tripwire")
    user_agent: str | None = Field(default=None, description="Sanitized client User-Agent")
    request_method: str = Field(default="GET", description="HTTP request method")
    headers_captured: dict[str, str] = Field(default_factory=dict, description="Sanitized, bounded headers")
    payload_preview: str | None = Field(default=None, description="Sanitized preview of request payload")
    alert_id: int | None = Field(default=None, description="Associated high-fidelity Alert ID if generated")
    case_id: str | None = Field(default=None, description="Associated Incident Case ID if provisioned")
    timestamp: str = Field(description="ISO timestamp of interaction")

    model_config = ConfigDict(from_attributes=True)


class CanaryListResponse(BaseModel):
    """List of registered canary tokens."""

    canaries: list[CanaryToken] = Field(description="List of canary tokens")
    total: int = Field(description="Total count of canary tokens")


class CanaryHitListResponse(BaseModel):
    """List of canary interaction hit events."""

    hits: list[CanaryHitEvent] = Field(description="List of recorded hit events")
    total: int = Field(description="Total count of recorded hit events")


class CanaryValidationResponse(BaseModel):
    """Decoy response returned to adversary upon hitting the public trap listener."""

    status: str = Field(description="Decoy status message")
    message: str = Field(description="Decoy error or response message")
    code: int = Field(default=401, description="Decoy status code")


# ==========================================
# Module 3.8 Threat Intelligence & IOC Fusion Schemas
# ==========================================

class IndicatorType(str, Enum):
    IP = "ip"
    CIDR = "cidr"
    DOMAIN = "domain"
    HASH = "hash"
    USER_AGENT = "user_agent"
    CANARY_TOKEN = "canary_token"


class IndicatorStatus(str, Enum):
    ACTIVE = "active"
    DECAYING = "decaying"
    RETIRED = "retired"
    REVOKED = "revoked"
    WHITELISTED = "whitelisted"


class ThreatIndicatorCreate(BaseModel):
    """Schema for creating a new threat indicator."""

    indicator_type: IndicatorType = Field(description="Indicator type (ip, cidr, domain, hash, user_agent, canary_token)")
    indicator_value: str = Field(min_length=1, max_length=255, description="Indicator value")
    threat_level: str = Field(default="high", pattern="^(low|medium|high|critical)$", description="Threat level")
    source: str = Field(default="manual_analyst", max_length=100, description="Intelligence source")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Initial base confidence")
    half_life_days: int = Field(default=14, ge=1, le=365, description="Decay half-life in days")
    campaign: str | None = Field(default=None, max_length=100, description="Campaign identifier")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")
    description: str | None = Field(default=None, max_length=1000, description="Analyst context or notes")


class ThreatIndicatorUpdate(BaseModel):
    """Schema for updating an existing threat indicator."""

    threat_level: str | None = Field(default=None, pattern="^(low|medium|high|critical)$", description="Updated threat level")
    campaign: str | None = Field(default=None, max_length=100, description="Updated campaign")
    tags: list[str] | None = Field(default=None, description="Updated tags")
    description: str | None = Field(default=None, max_length=1000, description="Updated notes")
    half_life_days: int | None = Field(default=None, ge=1, le=365, description="Updated decay half-life")
    status: str | None = Field(default=None, pattern="^(active|decaying|retired|revoked|whitelisted)$", description="Target status")


class ThreatIndicatorResponse(BaseModel):
    """Detailed response model for a threat intelligence indicator."""

    id: int = Field(description="Unique indicator record ID")
    indicator_type: str = Field(description="Indicator type")
    indicator_value: str = Field(description="Normalized indicator value")
    threat_level: str = Field(description="Current effective threat level")
    source: str | None = Field(default=None, description="Reporting source")
    base_confidence: float = Field(description="Initial base confidence before decay")
    decayed_confidence: float = Field(description="Current calculated decayed confidence")
    status: str = Field(description="Lifecycle status: active, decaying, retired, revoked, whitelisted")
    half_life_days: int = Field(description="Decay half life in days")
    hit_count: int = Field(description="Number of recorded adversary observations")
    first_seen: str = Field(description="ISO timestamp when first observed")
    last_seen: str = Field(description="ISO timestamp when most recently observed")
    campaign: str | None = Field(default=None, description="Associated threat campaign")
    tags: list[str] = Field(default_factory=list, description="Associated tags")
    description: str | None = Field(default=None, description="Analyst notes")
    created_at: str = Field(description="ISO timestamp of record creation")

    model_config = ConfigDict(from_attributes=True)


class ThreatIndicatorListResponse(BaseModel):
    """Paginated response containing threat indicators."""

    indicators: list[ThreatIndicatorResponse] = Field(description="List of indicators")
    total: int = Field(description="Total count of matching indicators")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=50, description="Items per page")


class PromoteCaseObservableRequest(BaseModel):
    """Payload to promote an observable from an incident case to threat intelligence."""

    case_id: str = Field(description="Case identifier to link provenance")
    observable_type: IndicatorType = Field(description="Indicator type")
    observable_value: str = Field(min_length=1, max_length=255, description="Observable value")
    threat_level: str = Field(default="high", pattern="^(low|medium|high|critical)$", description="Threat level")
    campaign: str | None = Field(default=None, max_length=100, description="Optional campaign tag")
    tags: list[str] = Field(default_factory=list, description="Optional tags")
    notes: str | None = Field(default=None, max_length=1000, description="Forensic notes")


class PromoteCanaryHitRequest(BaseModel):
    """Payload to promote a canary tripwire hit to threat intelligence."""

    canary_id: str = Field(description="Canary token identifier")
    source_ip: str = Field(description="Attacker source IP")
    campaign: str | None = Field(default=None, max_length=100, description="Optional campaign")
    tags: list[str] = Field(default_factory=list, description="Optional tags")


class CampaignCluster(BaseModel):
    """Aggregated campaign information and infrastructure attribution."""

    campaign_id: str = Field(description="Unique campaign identifier")
    name: str = Field(description="Campaign display name")
    indicator_count: int = Field(description="Number of indicators in this campaign")
    highest_severity: str = Field(description="Highest threat level in campaign")
    highest_confidence: float = Field(description="Peak indicator confidence")
    indicator_types: list[str] = Field(description="List of indicator types observed")
    first_seen: str = Field(description="Earliest observation timestamp")
    last_seen: str = Field(description="Most recent observation timestamp")


class CampaignListResponse(BaseModel):
    """List of tracked threat campaigns."""

    campaigns: list[CampaignCluster] = Field(description="Tracked campaigns")
    total: int = Field(description="Total campaign count")


class DefensiveFeedResponse(BaseModel):
    """Defensive blocklist feed metadata and payload."""

    feed_name: str = Field(description="Feed title")
    generated_at: str = Field(description="ISO timestamp of generation")
    count: int = Field(description="Total indicators included")
    indicators: list[dict[str, Any]] = Field(description="Exported indicator objects")


# ==========================================
# Module 3.9 Enterprise Defensive Integration & SIEM-SOAR Webhook Gateway Schemas
# ==========================================

class WebhookFormat(str, Enum):
    HONEYSHIELD_JSON = "honeyshield_json"
    CEF = "cef"
    LEEF = "leef"
    SYSLOG_JSON = "syslog_json"


class WebhookEndpointCreate(BaseModel):
    """Schema for registering a new webhook endpoint."""

    name: str = Field(min_length=1, max_length=100, description="Endpoint display name")
    target_url: str = Field(min_length=8, max_length=2048, description="Target destination URL")
    description: str | None = Field(default=None, max_length=1000, description="Optional description")
    enabled: bool = Field(default=True, description="Whether endpoint is active")
    events: list[str] = Field(
        default_factory=lambda: ["alert.triggered"],
        description="Event types to subscribe to (e.g. alert.triggered, canary.tripped, case.escalated, *)",
    )
    format: str = Field(
        default="honeyshield_json",
        pattern="^(honeyshield_json|cef|leef|syslog_json)$",
        description="Payload format serializer preset",
    )
    custom_headers: dict[str, str] = Field(
        default_factory=dict,
        description="Optional custom HTTP headers to include in dispatches",
    )


class WebhookEndpointUpdate(BaseModel):
    """Schema for updating an existing webhook endpoint."""

    name: str | None = Field(default=None, min_length=1, max_length=100, description="Updated name")
    target_url: str | None = Field(default=None, min_length=8, max_length=2048, description="Updated URL")
    description: str | None = Field(default=None, max_length=1000, description="Updated description")
    enabled: bool | None = Field(default=None, description="Updated enabled state")
    events: list[str] | None = Field(default=None, description="Updated subscribed events")
    format: str | None = Field(
        default=None,
        pattern="^(honeyshield_json|cef|leef|syslog_json)$",
        description="Updated payload format",
    )
    custom_headers: dict[str, str] | None = Field(default=None, description="Updated custom headers")


class WebhookEndpointResponse(BaseModel):
    """Schema for webhook endpoint details with masked secret."""

    id: str = Field(description="Unique endpoint identifier")
    name: str = Field(description="Endpoint name")
    target_url: str = Field(description="Target destination URL")
    description: str | None = Field(default=None, description="Description")
    enabled: bool = Field(description="Whether endpoint is enabled")
    events: list[str] = Field(description="Subscribed event types")
    format: str = Field(description="Payload format serializer preset")
    custom_headers: dict[str, str] = Field(default_factory=dict, description="Custom headers")
    secret: str = Field(description="Masked webhook secret")
    created_at: str = Field(description="ISO creation timestamp")
    updated_at: str = Field(description="ISO update timestamp")
    circuit_state: str = Field(default="closed", description="Circuit breaker state (closed, open, half_open)")
    consecutive_failures: int = Field(default=0, description="Consecutive failure count")
    total_sent: int = Field(default=0, description="Total successful deliveries")
    total_failed: int = Field(default=0, description="Total failed deliveries")
    last_delivery_at: str | None = Field(default=None, description="Last delivery timestamp")
    last_status_code: int | None = Field(default=None, description="Last HTTP status code")


class WebhookEndpointCreateResponse(WebhookEndpointResponse):
    """Schema returned strictly upon endpoint creation containing plaintext secret."""

    secret: str = Field(description="Plaintext secret (returned strictly once on creation)")


class DlqRecord(BaseModel):
    """Dead-Letter Queue record for permanently failed deliveries."""

    delivery_id: str = Field(description="Unique delivery UUID")
    endpoint_id: str = Field(description="Destination endpoint ID")
    endpoint_name: str = Field(description="Destination endpoint name")
    target_url: str = Field(description="Target destination URL")
    event_type: str = Field(description="Event type")
    payload: dict[str, Any] = Field(description="Original event payload")
    attempts: int = Field(description="Delivery attempt count")
    last_error: str = Field(description="Last error explanation")
    status_code: int | None = Field(default=None, description="Last HTTP status code received")
    created_at: str = Field(description="ISO failure timestamp")


class DlqListResponse(BaseModel):
    """List of dead-letter queue entries."""

    items: list[DlqRecord] = Field(description="DLQ records")
    total: int = Field(description="Total count in DLQ")


class IntegrationMetricsResponse(BaseModel):
    """Aggregated gateway metrics."""

    total_endpoints: int = Field(description="Total registered endpoints")
    active_endpoints: int = Field(description="Active/enabled endpoints")
    total_dispatched: int = Field(description="Total dispatched payloads")
    total_delivered: int = Field(description="Total successfully delivered payloads")
    total_failed: int = Field(description="Total failed deliveries")
    dlq_count: int = Field(description="Total items currently in DLQ")
    average_latency_ms: float = Field(description="Average delivery latency in ms")
    circuits_open: int = Field(description="Number of tripped circuit breakers")


class TestPingRequest(BaseModel):
    """Request payload to trigger a test ping to an endpoint."""

    event_type: str = Field(default="test.ping", max_length=100, description="Event type for test")
    sample_data: dict[str, Any] | None = Field(default=None, description="Optional custom test payload")


class TestPingResponse(BaseModel):
    """Result of a test ping dispatch."""

    delivery_id: str = Field(description="Test delivery UUID")
    status: str = Field(description="Delivery status (success/failed)")
    status_code: int | None = Field(default=None, description="HTTP status code received")
    latency_ms: float = Field(description="Roundtrip latency in milliseconds")
    response_preview: str | None = Field(default=None, description="Preview of remote response")
    error: str | None = Field(default=None, description="Error message if delivery failed")


class SoarBlockRequest(BaseModel):
    """Governor-guarded request to dispatch external containment via SOAR."""

    target_entity_id: str = Field(min_length=1, max_length=255, description="Target entity to contain (IP, domain, hash)")
    justification: str = Field(min_length=10, max_length=1000, description="Mandatory operational justification (min 10 chars)")
    approval_token: str = Field(description="Single-use Level-3 Governor preview approval token")
    parameters: dict[str, Any] | None = Field(default=None, description="Optional containment parameters")


# ==========================================
# Module 3.10 Cross-Module Attack Campaign Intelligence & Multi-Entity Correlation Graph Schemas
# ==========================================

class CampaignSummary(BaseModel):
    """Aggregated campaign overview for list views and telemetry ribbons."""

    campaign_id: str = Field(description="Unique deterministic campaign ID")
    name: str = Field(description="Campaign display name")
    status: str = Field(description="Lifecycle status: active, dormant, resolved, archived")
    severity: str = Field(description="Peak campaign severity: low, medium, high, critical")
    confidence: float = Field(description="Peak confidence score (0.0 - 1.0)")
    entity_count: int = Field(description="Total unique entities linked to campaign")
    attack_count: int = Field(description="Total attacks linked")
    alert_count: int = Field(description="Total alerts linked")
    canary_count: int = Field(description="Total canary tripwires linked")
    ioc_count: int = Field(description="Total threat intel IOCs linked")
    case_count: int = Field(description="Total incident cases linked")
    mitre_tactics: list[str] = Field(default_factory=list, description="Observed MITRE ATT&CK tactics")
    first_seen: str = Field(description="Earliest observation timestamp (ISO 8601)")
    last_seen: str = Field(description="Latest observation timestamp (ISO 8601)")
    tags: list[str] = Field(default_factory=list, description="Operator or auto-assigned tags")


class CampaignDossier(BaseModel):
    """Complete multi-entity attack campaign dossier."""

    campaign_id: str = Field(description="Unique deterministic campaign ID")
    name: str = Field(description="Campaign display name")
    status: str = Field(description="Lifecycle status: active, dormant, resolved, archived")
    severity: str = Field(description="Peak campaign severity: low, medium, high, critical")
    confidence: float = Field(description="Peak confidence score (0.0 - 1.0)")
    first_seen: str = Field(description="Earliest observation timestamp (ISO 8601)")
    last_seen: str = Field(description="Latest observation timestamp (ISO 8601)")
    notes: str | None = Field(default=None, description="Operator notes and rationale")
    tags: list[str] = Field(default_factory=list, description="Assigned campaign tags")
    source_ips: list[str] = Field(default_factory=list, description="Attacker source IPs")
    destination_ips: list[str] = Field(default_factory=list, description="Targeted internal IPs")
    attack_ids: list[int] = Field(default_factory=list, description="Associated Attack IDs")
    alert_ids: list[int] = Field(default_factory=list, description="Associated Alert IDs")
    canary_ids: list[str] = Field(default_factory=list, description="Associated Canary token IDs")
    ioc_ids: list[str] = Field(default_factory=list, description="Associated Threat Intel IOC values")
    case_ids: list[str] = Field(default_factory=list, description="Associated Incident Case IDs")
    mitre_tactics: list[str] = Field(default_factory=list, description="Observed MITRE tactics")
    mitre_techniques: list[str] = Field(default_factory=list, description="Observed MITRE techniques")
    anchor_type: str | None = Field(default=None, description="Anchor feature type that seeded campaign")
    merged_into: str | None = Field(default=None, description="Target campaign ID if merged and archived")
    created_at: str = Field(description="Campaign creation timestamp (ISO 8601)")
    updated_at: str = Field(description="Last update timestamp (ISO 8601)")


class CampaignListResponse(BaseModel):
    """Paginated campaign query response."""

    campaigns: list[CampaignSummary] = Field(description="List of campaigns matching filters")
    total: int = Field(description="Total campaigns matching query")
    limit: int = Field(description="Pagination limit")
    offset: int = Field(description="Pagination offset")


class GraphNode(BaseModel):
    """Derived multi-entity DAG graph node."""

    id: str = Field(description="Unique node identifier")
    type: str = Field(description="Node type: campaign, source_ip, destination_ip, attack, attack_event, alert, canary, ioc, case, detection_rule, mitre_tactic, integration_delivery")
    label: str = Field(description="Display label")
    stage: str | None = Field(default=None, description="Killchain stage or category")
    severity: str | None = Field(default=None, description="Severity if applicable")
    confidence: float | None = Field(default=None, description="Confidence score if applicable")
    first_seen: str | None = Field(default=None, description="Earliest timestamp")
    last_seen: str | None = Field(default=None, description="Latest timestamp")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Safe sanitized node attributes")


class GraphEdge(BaseModel):
    """Derived DAG graph edge."""

    id: str = Field(description="Unique edge identifier")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    label: str = Field(description="Display relationship label")
    edge_type: str = Field(description="Semantic edge type")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Edge metadata")


class GraphSummary(BaseModel):
    """Topological graph summary metrics."""

    total_nodes: int = Field(description="Rendered node count")
    total_edges: int = Field(description="Rendered edge count")
    stages_observed: int = Field(description="Count of distinct MITRE stages")
    highest_severity: str = Field(description="Peak severity in graph")
    has_canary: bool = Field(description="Whether graph contains deception tripwire")
    has_ioc: bool = Field(description="Whether graph contains threat intel IOC")
    has_cases: bool = Field(description="Whether graph contains linked incident cases")


class TruncationMeta(BaseModel):
    """Explicit deterministic graph truncation report."""

    is_truncated: bool = Field(description="True if node or edge caps were exceeded")
    total_nodes_discovered: int = Field(description="Unpruned node count")
    rendered_nodes: int = Field(description="Nodes included in payload")
    pruned_nodes_count: int = Field(description="Count of nodes pruned to satisfy bounds")
    pruned_by_type: dict[str, int] = Field(default_factory=dict, description="Breakdown of pruned nodes by type")


class CampaignGraphResponse(BaseModel):
    """Complete derived multi-entity DAG graph payload."""

    campaign_id: str = Field(description="Campaign ID")
    nodes: list[GraphNode] = Field(description="Graph nodes")
    edges: list[GraphEdge] = Field(description="Directed edges")
    summary: GraphSummary = Field(description="Graph summary")
    truncation: TruncationMeta = Field(description="Truncation metadata")


class TimelineItem(BaseModel):
    """Chronological event in campaign attack narrative."""

    id: str = Field(description="Timeline item ID")
    timestamp: str = Field(description="ISO 8601 event time")
    event_type: str = Field(description="Event type: attack, alert, canary, case, ioc")
    title: str = Field(description="Event headline")
    severity: str = Field(description="Event severity")
    source_ip: str | None = Field(default=None, description="Associated source IP")
    stage: str | None = Field(default=None, description="MITRE tactic or lifecycle stage")
    details: dict[str, Any] = Field(default_factory=dict, description="Sanitized event details")


class CampaignTimelineResponse(BaseModel):
    """Campaign chronological timeline response."""

    campaign_id: str = Field(description="Campaign ID")
    events: list[TimelineItem] = Field(description="Chronologically sorted timeline events")
    total: int = Field(description="Total event count")


class CampaignClusterRequest(BaseModel):
    """Optional parameters for manual re-clustering trigger."""

    lookback_hours: int | None = Field(default=168, ge=1, le=168, description="Temporal lookback window (max 168h / 7d)")


class CampaignClusterResponse(BaseModel):
    """Result of re-clustering execution."""

    status: str = Field(description="Clustering status")
    campaigns_created: int = Field(description="Newly synthesized campaigns")
    campaigns_updated: int = Field(description="Existing campaigns updated with new events")
    total_active_campaigns: int = Field(description="Current count of active campaigns")
    duration_ms: float = Field(description="Clustering execution duration in ms")


class CampaignUpdateRequest(BaseModel):
    """Request payload to update campaign metadata or lifecycle status."""

    name: str | None = Field(default=None, max_length=150, description="Optional updated campaign name")
    status: str | None = Field(default=None, description="Optional status change (active, dormant, resolved)")
    notes: str | None = Field(default=None, max_length=2000, description="Optional analyst notes")
    tags: list[str] | None = Field(default=None, description="Optional updated tags")
    justification: str | None = Field(default=None, max_length=500, description="Required justification for status changes")


class CampaignMergeRequest(BaseModel):
    """Request payload to merge two campaigns."""

    primary_campaign_id: str = Field(min_length=1, max_length=50, description="Surviving target campaign ID")
    secondary_campaign_id: str = Field(min_length=1, max_length=50, description="Campaign to be absorbed and archived")
    justification: str = Field(min_length=5, max_length=1000, description="Mandatory operator justification (min 5 chars)")


class CampaignContainmentRequest(BaseModel):
    """Governor-guarded request to dispatch bulk containment across campaign entities."""

    approval_token: str = Field(min_length=1, description="Single-use Level-3 Governor preview approval token")
    justification: str = Field(min_length=10, max_length=1000, description="Mandatory operational justification (min 10 chars)")
    containment_type: str = Field(default="network_isolate", description="Containment action: network_isolate, block_ip, revoke_creds")
    parameters: dict[str, Any] | None = Field(default=None, description="Optional containment parameters")


class CampaignContainmentResponse(BaseModel):
    """Outcome of bulk campaign containment execution."""

    status: str = Field(description="Containment execution status")
    campaign_id: str = Field(description="Campaign ID")
    contained_entities: list[str] = Field(description="List of contained entities")
    governor_eval: dict[str, Any] = Field(description="Governor safety policy audit payload")
    dispatched_at: str = Field(description="ISO 8601 dispatch timestamp")


class CampaignMetricsResponse(BaseModel):
    """Aggregated campaign metrics for SOC dashboard KPI ribbon."""

    active_campaigns: int = Field(description="Count of currently active campaigns")
    critical_campaigns: int = Field(description="Count of active critical campaigns")
    high_campaigns: int = Field(description="Count of active high campaigns")
    dormant_campaigns: int = Field(description="Count of dormant campaigns")
    resolved_campaigns: int = Field(description="Count of resolved campaigns")
    mean_dwell_time_hours: float = Field(description="Average campaign duration in hours")
    top_mitre_tactics: list[dict[str, Any]] = Field(default_factory=list, description="Most frequent MITRE tactics observed")


# ==========================================
# Module 3.11 Retrospective Threat Hunting & Adversary Hypothesis Engine Schemas
# ==========================================

class HuntQuerySpec(BaseModel):
    """Filter specifications for deterministic retrospective historical scan."""

    time_range_start: str | None = Field(default=None, description="ISO 8601 UTC start timestamp")
    time_range_end: str | None = Field(default=None, description="ISO 8601 UTC end timestamp")
    source_ips: list[str] = Field(default_factory=list, description="Target attacker source IPs or subnets")
    destination_ips: list[str] = Field(default_factory=list, description="Target destination/decoy IPs")
    attack_types: list[str] = Field(default_factory=list, description="Attack classification types")
    severities: list[str] = Field(default_factory=list, description="Severity bands (low, medium, high, critical)")
    alert_statuses: list[str] = Field(default_factory=list, description="Alert statuses (open, acknowledged, resolved)")
    payload_substring: str | None = Field(default=None, max_length=255, description="Case-insensitive substring match")
    ioc_values: list[str] = Field(default_factory=list, description="Specific threat indicator values")
    canary_ids: list[str] = Field(default_factory=list, description="Deception canary identifiers")
    campaign_ids: list[str] = Field(default_factory=list, description="Campaign identifiers")
    regex_pattern: str | None = Field(default=None, max_length=64, description="Safe AST-validated regex pattern")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum evidence records to return (cap 200)")


class HuntEvidenceRecord(BaseModel):
    """Structured evidence item discovered during retrospective hunt."""

    evidence_id: str = Field(description="Deterministic ID: ev-[12 hex]")
    entity_type: str = Field(description="attack, alert, attack_event, canary_hit, ioc_match, campaign")
    entity_id: str = Field(description="Underlying entity identifier")
    timestamp: str = Field(description="ISO 8601 UTC observation timestamp")
    summary: str = Field(max_length=255, description="Brief narrative of evidence")
    source_ip: str | None = Field(default=None, max_length=45)
    destination_ip: str | None = Field(default=None, max_length=45)
    technique: str | None = Field(default=None, max_length=50)
    attributes: dict[str, Any] = Field(default_factory=dict, description="Sanitized key-value attributes")


class HuntNote(BaseModel):
    """Forensic journal entry added to hunt dossier."""

    note_id: str = Field(description="Unique note identifier")
    operator_id: str = Field(description="Author operator username")
    role: str = Field(description="Author operator SOC role")
    message: str = Field(min_length=1, max_length=2000, description="Analyst investigative note")
    created_at: str = Field(description="ISO 8601 timestamp")


class HuntDossier(BaseModel):
    """Complete investigative threat hunt dossier."""

    hunt_id: str = Field(description="Format: hunt-[12 hex]")
    title: str = Field(min_length=10, max_length=150, description="Hypothesis title")
    description: str = Field(max_length=2000, description="Hypothesis narrative")
    status: str = Field(description="draft, scheduled, running, completed, concluded, archived")
    severity: str = Field(default="medium", description="low, medium, high, critical")
    mitre_tactics: list[str] = Field(default_factory=list)
    mitre_techniques: list[str] = Field(default_factory=list)
    query_spec: HuntQuerySpec = Field(default_factory=HuntQuerySpec)
    evidence: list[HuntEvidenceRecord] = Field(default_factory=list)
    forensic_notes: list[HuntNote] = Field(default_factory=list)
    conclusion_summary: str | None = Field(default=None, max_length=1000)
    verdict: str | None = Field(default=None, description="malicious_confirmed, benign_activity, inconclusive")
    promoted_rule_ids: list[str] = Field(default_factory=list)
    promoted_case_ids: list[str] = Field(default_factory=list)
    execution_count: int = Field(default=0)
    last_executed_at: str | None = Field(default=None)
    is_automated_suggestion: bool = Field(default=False)
    created_by: str = Field(description="Operator username")
    created_at: str = Field(description="ISO 8601 creation timestamp")
    updated_at: str = Field(description="ISO 8601 update timestamp")


class HuntCreateRequest(BaseModel):
    """Payload for creating a new threat hunt hypothesis."""

    title: str = Field(min_length=10, max_length=150, description="Hypothesis title")
    description: str = Field(max_length=2000, description="Hypothesis narrative description")
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    mitre_tactics: list[str] = Field(default_factory=list)
    mitre_techniques: list[str] = Field(default_factory=list)
    query_spec: HuntQuerySpec | None = Field(default=None)


class HuntUpdateRequest(BaseModel):
    """Payload for updating hunt metadata, hypothesis, or concluding verdict."""

    title: str | None = Field(default=None, min_length=10, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    severity: str | None = Field(default=None, pattern="^(low|medium|high|critical)$")
    mitre_tactics: list[str] | None = Field(default=None)
    mitre_techniques: list[str] | None = Field(default=None)
    query_spec: HuntQuerySpec | None = Field(default=None)
    conclusion_summary: str | None = Field(default=None, max_length=1000)
    verdict: str | None = Field(default=None, pattern="^(malicious_confirmed|benign_activity|inconclusive)$")
    note: str | None = Field(default=None, max_length=2000, description="Optional note to append")


class HuntExecutionResponse(BaseModel):
    """Response payload for retrospective hunt query execution."""

    hunt_id: str = Field(description="Hunt identifier")
    status: str = Field(description="Status after execution")
    matched_count: int = Field(ge=0, description="Number of evidence records matched")
    duration_ms: float = Field(ge=0.0, description="Execution duration in milliseconds")
    evidence: list[HuntEvidenceRecord] = Field(default_factory=list)
    execution_count: int = Field(ge=1)
    executed_at: str = Field(description="ISO 8601 execution timestamp")


class HuntPromotionRequest(BaseModel):
    """Request payload for promoting hunt findings to Rule or Case."""

    justification: str = Field(min_length=10, max_length=1000, description="Mandatory operator justification (min 10 chars)")
    approval_token: str | None = Field(default=None, description="Optional pre-flight token")


class HuntPromotionResponse(BaseModel):
    """Response payload following successful hunt promotion."""

    hunt_id: str = Field(description="Originating hunt identifier")
    promotion_type: str = Field(description="rule or case")
    target_id: str = Field(description="Minted detection rule ID or incident case ID")
    message: str = Field(description="Summary message")
    promoted_at: str = Field(description="ISO 8601 timestamp")


class HuntSummary(BaseModel):
    """Lightweight projection of a hunt for table listing."""

    hunt_id: str = Field(description="Format: hunt-[12 hex]")
    title: str = Field(description="Hypothesis title")
    status: str = Field(description="Lifecycle status")
    severity: str = Field(description="Severity classification")
    mitre_tactics: list[str] = Field(default_factory=list)
    evidence_count: int = Field(default=0)
    verdict: str | None = Field(default=None)
    created_by: str = Field(description="Operator username")
    created_at: str = Field(description="ISO 8601 timestamp")
    updated_at: str = Field(description="ISO 8601 timestamp")
    last_executed_at: str | None = Field(default=None)
    is_automated_suggestion: bool = Field(default=False)


class ListHuntResponse(BaseModel):
    """Paginated list of threat hunts."""

    hunts: list[HuntSummary] = Field(description="Collection of hunt summaries")
    total: int = Field(ge=0, description="Total matching hunts")
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


class HuntMetricsResponse(BaseModel):
    """Operational KPI metrics for threat hunting console ribbon."""

    total_hunts: int = Field(ge=0)
    active_hunts: int = Field(ge=0)
    concluded_hunts: int = Field(ge=0)
    archived_hunts: int = Field(ge=0)
    malicious_confirmed: int = Field(ge=0)
    benign_activity: int = Field(ge=0)
    inconclusive: int = Field(ge=0)
    promoted_rules_count: int = Field(ge=0)
    promoted_cases_count: int = Field(ge=0)
