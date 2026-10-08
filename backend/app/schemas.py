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
