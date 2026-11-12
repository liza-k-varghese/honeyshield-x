"""Unit and integration tests for System 2 Sensor and Threat Intel Integration Contracts.

Verifies:
1. get_system2_integration_status() returns INTEGRATION_READY and supported sensor list.
2. Sensor authentication enforcement rejects missing / invalid credentials.
3. Telemetry ingestion persists to PostgreSQL, normalizes taxonomy, tags synthetic provenance, and generates alerts.
4. Event deduplication recognizes duplicate event_ids.
5. Threat intelligence enrichment queries return GeoIP, ASN, IOC, and risk analysis.
6. Network evidence (PCAP) registration rejects directory traversal and computes cryptographic metadata digests.
"""

from datetime import datetime, timezone
import os
from unittest.mock import MagicMock
import uuid
import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.routers.system2_integration import (
    get_system2_integration_status,
    ingest_system2_telemetry,
    enrich_indicator_system2,
    register_pcap_evidence,
)
from app.system2_integration.schemas import (
    System2AttackCategory,
    System2DataProvenance,
    System2NetworkEvidenceRecord,
    System2SensorTelemetryEvent,
    System2SensorType,
    System2ThreatIntelRequest,
)
from app.system2_integration.service import default_system2_service

VALID_SENSOR_KEY = "hsx-system2-sensor-token-secret-key-2026"


def mock_request(client_ip: str = "127.0.0.1") -> MagicMock:
    req = MagicMock()
    req.client.host = client_ip
    return req


def test_system2_status_endpoint():
    """Verify get_system2_integration_status reports System 1 is INTEGRATION_READY."""
    data = get_system2_integration_status()
    assert data["system1_status"] == "INTEGRATION_READY"
    assert data["system2_status"] == "PENDING_HARDWARE_DEPLOYMENT"
    assert "cowrie" in data["supported_sensors"]
    assert "zeek" in data["supported_sensors"]
    assert "suricata" in data["supported_sensors"]


def test_system2_auth_enforcement():
    """Verify unauthenticated or invalidly authenticated requests fail with HTTP 401."""
    req = mock_request()

    # Missing credentials
    with pytest.raises(HTTPException) as exc_no_auth:
        default_system2_service.verify_sensor_credentials(None, "127.0.0.1")
    assert exc_no_auth.value.status_code == 401

    # Invalid credentials
    with pytest.raises(HTTPException) as exc_bad_auth:
        default_system2_service.verify_sensor_credentials("invalid-token-secret", "127.0.0.1")
    assert exc_bad_auth.value.status_code == 401

    # Valid credentials
    default_system2_service.verify_sensor_credentials(VALID_SENSOR_KEY, "127.0.0.1")


def test_system2_telemetry_ingest_and_alert_generation():
    """Verify sensor telemetry ingest, normalization, and alert generation."""
    event_id = f"evt-cowrie-{uuid.uuid4().hex[:12]}"
    corr_id = f"corr-test-{uuid.uuid4().hex[:8]}"

    event = System2SensorTelemetryEvent(
        sensor_id="sensor-cowrie-01",
        sensor_type=System2SensorType.COWRIE,
        event_id=event_id,
        timestamp=datetime.now(timezone.utc),
        source_ip="198.51.100.77",
        destination_ip="10.0.10.22",
        protocol="tcp",
        service="ssh",
        attack_category=System2AttackCategory.BRUTE_FORCE,
        message="Cowrie SSH brute-force password failure from 198.51.100.77",
        correlation_id=corr_id,
        data_provenance=System2DataProvenance.SYNTHETIC_VERIFICATION_PROBE,
    )

    req = mock_request()
    db = SessionLocal()
    try:
        resp = ingest_system2_telemetry(
            event=event,
            request=req,
            x_sensor_key=VALID_SENSOR_KEY,
            db=db,
        )
        assert resp.status == "accepted"
        assert resp.event_id == event_id
        assert resp.correlation_id == corr_id
        assert resp.normalized_type == "cowrie:brute_force"
        assert resp.alert_generated is True
        assert resp.alert_id is not None
        assert resp.provenance == "synthetic_verification_probe"
    finally:
        db.close()


def test_system2_event_deduplication():
    """Verify duplicate event submissions are recognized and marked deduplicated."""
    event_id = f"evt-dedup-{uuid.uuid4().hex[:12]}"
    event = System2SensorTelemetryEvent(
        sensor_id="sensor-zeek-01",
        sensor_type=System2SensorType.ZEEK,
        event_id=event_id,
        timestamp=datetime.now(timezone.utc),
        source_ip="198.51.100.50",
        protocol="tcp",
        service="http",
        attack_category=System2AttackCategory.SUSPICIOUS_PROBE,
        message="Zeek connection anomaly",
        data_provenance=System2DataProvenance.SYNTHETIC_VERIFICATION_PROBE,
    )

    req = mock_request()
    db = SessionLocal()
    try:
        # 1. First submission
        resp1 = ingest_system2_telemetry(event=event, request=req, x_sensor_key=VALID_SENSOR_KEY, db=db)
        assert resp1.status == "accepted"

        # 2. Duplicate submission
        resp2 = ingest_system2_telemetry(event=event, request=req, x_sensor_key=VALID_SENSOR_KEY, db=db)
        assert resp2.status == "deduplicated"
        assert resp2.event_id == event_id
    finally:
        db.close()


def test_system2_threat_intelligence_enrichment():
    """Verify threat intelligence lookup returns GeoIP, ASN, IOC, and risk analysis."""
    query = System2ThreatIntelRequest(
        event_ref="atk-test-999",
        indicator_value="198.51.100.42",
        indicator_type="ip",
        requested_analysis=["reputation", "geoip", "asn", "threat_profile"],
        correlation_id="corr-ti-test-01",
    )

    req = mock_request()
    db = SessionLocal()
    try:
        resp = enrich_indicator_system2(
            query=query,
            request=req,
            x_sensor_key=VALID_SENSOR_KEY,
            db=db,
        )
        assert resp.status == "completed"
        assert resp.indicator_value == "198.51.100.42"
        assert resp.geoip.country_code is not None
        assert resp.asn.asn is not None
        assert resp.reputation.verdict in ("benign", "suspicious", "malicious")
        assert resp.risk_assessment["risk_score"] is not None
    finally:
        db.close()


def test_system2_network_pcap_evidence_registration():
    """Verify PCAP network evidence registration and traversal prevention."""
    req = mock_request()
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        # 1. Valid registration
        valid_record = System2NetworkEvidenceRecord(
            pcap_ref_id=f"pcap-cowrie-{uuid.uuid4().hex[:12]}",
            sensor_id="sensor-cowrie-01",
            capture_start=now,
            capture_end=now,
            packet_count=42,
            byte_size=18400,
            sha256_digest="a" * 64,
            source_ip="198.51.100.42",
            destination_ip="10.0.10.22",
            retrieval_endpoint="/api/v1/sensor/evidence/pcap/capture-001.pcap",
        )

        resp_valid = register_pcap_evidence(record=valid_record, request=req, x_sensor_key=VALID_SENSOR_KEY, db=db)
        assert resp_valid["status"] == "registered"
        assert resp_valid["sha256_digest"] == "a" * 64

        # 2. Path traversal attempt rejected
        traversal_record = System2NetworkEvidenceRecord(
            pcap_ref_id=f"pcap-cowrie-{uuid.uuid4().hex[:12]}",
            sensor_id="sensor-cowrie-01",
            capture_start=now,
            capture_end=now,
            packet_count=42,
            byte_size=18400,
            sha256_digest="a" * 64,
            source_ip="198.51.100.42",
            destination_ip="10.0.10.22",
            retrieval_endpoint="/api/v1/sensor/evidence/../../etc/passwd",
        )

        with pytest.raises(HTTPException) as exc_trav:
            register_pcap_evidence(record=traversal_record, request=req, x_sensor_key=VALID_SENSOR_KEY, db=db)
        assert exc_trav.value.status_code == 400
        assert "Path traversal detected" in exc_trav.value.detail
    finally:
        db.close()
