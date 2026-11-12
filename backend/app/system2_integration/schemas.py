"""System 2 Integration Schemas and Versioned Telemetry Contracts.

HoneyShield X Architecture:
- SYSTEM 1: Central SOC Platform and Security Operations Engine (Current Physical Machine)
- SYSTEM 2: Integrated Honeypot, Network Monitoring and Threat Intelligence Engine (Future Physical Machine)

Defines authoritative versioned data contracts for:
A. Sensor Event Ingestion (Cowrie, OpenCanary, Zeek, Suricata)
B. Sensor Authentication and Identity
C. Threat Intelligence Queries and Responses (GeoIP, ASN, IOC, Reputation)
D. Forensic Network Evidence Records (PCAP metadata and SHA-256 integrity)
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class System2SensorType(str, Enum):
    COWRIE = "cowrie"
    OPENCANARY = "opencanary"
    ZEEK = "zeek"
    SURICATA = "suricata"
    DIONAEA = "dionaea"
    CUSTOM = "custom"


class System2AttackCategory(str, Enum):
    BRUTE_FORCE = "brute_force"
    PORT_SCAN = "port_scan"
    RECONNAISSANCE = "reconnaissance"
    EXPLOITATION = "exploitation"
    COMMAND_INJECTION = "command_injection"
    MALWARE_DROP = "malware_drop"
    ANOMALOUS_TRAFFIC = "anomalous_traffic"
    SUSPICIOUS_PROBE = "suspicious_probe"


class System2DataProvenance(str, Enum):
    OPERATIONAL_SENSOR = "operational_sensor"
    SYNTHETIC_VERIFICATION_PROBE = "synthetic_verification_probe"
    INTEGRATION_HARNESS = "integration_harness"


# =============================================================================
# A. Sensor Telemetry Ingestion Contract
# =============================================================================

class System2SensorTelemetryEvent(BaseModel):
    """Authoritative System 2 Sensor Ingestion Payload.

    Represents raw, normalized telemetry emitted by a remote System 2 sensor.
    """
    sensor_id: str = Field(
        ...,
        min_length=3,
        max_length=64,
        description="Unique identifier of the sending sensor instance (e.g. 'cowrie-edge-01')",
        examples=["cowrie-edge-01"],
    )
    sensor_type: System2SensorType = Field(
        ...,
        description="Sensor technology classification (cowrie, opencanary, zeek, suricata, dionaea)",
    )
    event_id: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="Globally unique UUID or sensor sequence ID for idempotency and deduplication",
        examples=["evt-550e8400-e29b-41d4-a716-446655440000"],
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of event occurrence in UTC ISO 8601",
    )
    source_ip: str = Field(
        ...,
        min_length=7,
        max_length=45,
        description="Source IP address of the attacking or interacting entity",
        examples=["198.51.100.42"],
    )
    destination_ip: str | None = Field(
        default=None,
        max_length=45,
        description="Target destination or honeypot listener IP address",
        examples=["10.0.10.5"],
    )
    protocol: str = Field(
        default="tcp",
        max_length=16,
        description="Transport or network protocol (e.g. 'tcp', 'udp', 'icmp')",
    )
    service: str = Field(
        default="ssh",
        max_length=32,
        description="Targeted decoy service (e.g. 'ssh', 'telnet', 'http', 'smb')",
    )
    attack_category: System2AttackCategory = Field(
        default=System2AttackCategory.SUSPICIOUS_PROBE,
        description="High-level attack taxonomy category",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Normalized human-readable log summary or telemetry description",
    )
    session_id: str | None = Field(
        default=None,
        max_length=64,
        description="Sensor-level interactive session identifier for correlating multi-step attempts",
    )
    correlation_id: str | None = Field(
        default=None,
        max_length=64,
        description="Cross-system correlation trace ID linking events, alerts, and investigations",
    )
    raw_evidence_ref: str | None = Field(
        default=None,
        max_length=128,
        description="Optional reference to PCAP or forensic artifact digest stored on System 2",
    )
    data_provenance: System2DataProvenance = Field(
        default=System2DataProvenance.OPERATIONAL_SENSOR,
        description="Provenance classification: synthetic probe vs operational sensor",
    )
    raw_payload: dict[str, Any] | None = Field(
        default=None,
        description="Optional raw sensor JSON telemetry dict for deep forensic indexing",
    )

    model_config = ConfigDict(from_attributes=True)


class System2TelemetryIngestResponse(BaseModel):
    """Response returned upon successful validation and ingestion into System 1."""
    status: str = Field(default="accepted", description="Processing status: 'accepted' or 'deduplicated'")
    event_id: str = Field(description="Unique event ID matching the request")
    attack_id: int = Field(description="System 1 attack container primary key")
    attack_event_id: int = Field(description="System 1 attack_events database record ID")
    normalized_type: str = Field(description="Normalized attack event type classification")
    correlation_id: str = Field(description="Assigned or preserved cross-system correlation trace ID")
    pipeline_triggered: bool = Field(description="Whether the unified SOC detection pipeline was invoked")
    alert_generated: bool = Field(description="Whether a security alert was produced by detection rules")
    alert_id: int | None = Field(default=None, description="System 1 Alert ID if generated")
    provenance: str = Field(description="Tagged data provenance")
    ingested_at: datetime = Field(description="Timestamp when System 1 processed the event")

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# B. Threat Intelligence Request and Response Contracts
# =============================================================================

class System2ThreatIntelRequest(BaseModel):
    """Authoritative System 2 Threat Intelligence Query Contract.

    Emitted by System 1 or System 2 to request deep adversary infrastructure intelligence.
    """
    event_ref: str = Field(
        ...,
        description="Reference event or attack container identifier initiating the lookup",
        examples=["atk-1042"],
    )
    indicator_value: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Indicator value to enrich (e.g. IPv4, IPv6, domain, SHA-256 hash)",
        examples=["198.51.100.42"],
    )
    indicator_type: str = Field(
        default="ip",
        description="Classification of indicator: 'ip', 'domain', 'hash', 'url'",
    )
    requested_analysis: list[str] = Field(
        default_factory=lambda: ["reputation", "geoip", "asn", "ioc_match", "threat_profile"],
        description="List of intelligence enrichment modules requested",
    )
    correlation_id: str | None = Field(
        default=None,
        description="End-to-end trace correlation ID",
    )


class System2GeoIPContext(BaseModel):
    country_code: str | None = None
    country_name: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class System2ASNContext(BaseModel):
    asn: int | None = None
    as_org: str | None = None
    network_cidr: str | None = None


class System2ReputationContext(BaseModel):
    verdict: str = Field(default="unknown", description="benign, suspicious, malicious, unknown")
    reputation_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Normalized score 0.0 to 1.0")
    reported_abuse_count: int = 0
    last_reported_at: str | None = None


class System2ThreatIntelResponse(BaseModel):
    """Authoritative System 2 Threat Intelligence Response Contract."""
    status: str = Field(description="Status: 'completed', 'timeout', 'failed', 'not_found'")
    event_ref: str = Field(description="Matching event reference from request")
    indicator_value: str = Field(description="Normalized indicator value")
    indicator_type: str = Field(default="ip")
    reputation: System2ReputationContext = Field(default_factory=System2ReputationContext)
    geoip: System2GeoIPContext = Field(default_factory=System2GeoIPContext)
    asn: System2ASNContext = Field(default_factory=System2ASNContext)
    ioc_matches: list[dict[str, Any]] = Field(default_factory=list)
    threat_profile: dict[str, Any] = Field(default_factory=dict)
    risk_assessment: dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    sources: list[str] = Field(default_factory=list)
    correlation_id: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# C. Forensic Network Evidence (PCAP) Metadata Contract
# =============================================================================

class System2NetworkEvidenceRecord(BaseModel):
    """Authoritative System 2 Network Evidence (PCAP) Metadata Contract.

    Prevents raw untrusted file uploads to System 1 while establishing
    cryptographically verified references to capture buffers on System 2.
    """
    pcap_ref_id: str = Field(
        ...,
        min_length=12,
        max_length=64,
        description="Immutable evidence reference identifier (e.g. 'pcap-cowrie-20261109-001')",
    )
    sensor_id: str = Field(
        ...,
        description="Sensor capturing the network trace",
    )
    session_id: str | None = Field(
        default=None,
        description="Associated interactive honeypot session ID",
    )
    correlation_id: str | None = Field(
        default=None,
        description="Cross-system correlation trace ID",
    )
    capture_start: datetime = Field(
        description="Timestamp of first captured packet in UTC",
    )
    capture_end: datetime = Field(
        description="Timestamp of last captured packet in UTC",
    )
    packet_count: int = Field(
        ge=1,
        description="Total packet count in capture file",
    )
    byte_size: int = Field(
        ge=1,
        description="File size in bytes on System 2 storage",
    )
    sha256_digest: str = Field(
        min_length=64,
        max_length=64,
        description="Cryptographic SHA-256 digest of the PCAP file for tamper-evident verification",
    )
    source_ip: str = Field(
        description="Attacker IP address captured",
    )
    destination_ip: str = Field(
        description="Sensor IP address captured",
    )
    protocol_summary: dict[str, int] = Field(
        default_factory=dict,
        description="Summary packet count per protocol (e.g. {'TCP': 42, 'TLS': 12})",
    )
    retrieval_endpoint: str = Field(
        ...,
        description="Authorized REST endpoint path on System 2 for authenticated operator download",
        examples=["/api/v1/sensor/evidence/pcap/pcap-cowrie-20261109-001.pcap"],
    )
    access_classification: str = Field(
        default="restricted",
        description="Data classification level ('restricted', 'confidential')",
    )

    model_config = ConfigDict(from_attributes=True)
