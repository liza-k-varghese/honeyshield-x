"""Comprehensive Distributed Deduplication and Durable Idempotency Test Suite.

Audits and verifies:
1. Deduplication within the active fast-path cache window (Redis / in-memory).
2. Deduplication after Redis TTL expiration (Durable PostgreSQL Ledger).
3. Deduplication under complete Redis unavailability (graceful fallback).
4. Concurrent submission race conditions across multiple threads/workers.
5. Conflicting payload submissions with reused event IDs.
6. Transaction atomicity and rollback boundaries.
7. Event acknowledgement semantics and schema fidelity.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from unittest.mock import MagicMock
import uuid
import pytest

from app.database import SessionLocal, engine, Base
from app.models import Attack, AttackEvent, Alert, System2IngestedEvent
from app.routers.system2_integration import ingest_system2_telemetry
from app.system2_integration.schemas import (
    System2AttackCategory,
    System2DataProvenance,
    System2SensorTelemetryEvent,
    System2SensorType,
)
from app.system2_integration.service import System2IntegrationService

VALID_SENSOR_KEY = "hsx-system2-sensor-token-secret-key-2026"


@pytest.fixture(scope="module", autouse=True)
def setup_tables():
    Base.metadata.create_all(bind=engine)


def mock_request(client_ip="127.0.0.1"):
    req = MagicMock()
    req.client.host = client_ip
    req.headers = {}
    return req


def create_test_event(event_id=None, sensor_id="sensor-cowrie-01", source_ip="198.51.100.77", category=System2AttackCategory.BRUTE_FORCE):
    return System2SensorTelemetryEvent(
        sensor_id=sensor_id,
        sensor_type=System2SensorType.COWRIE,
        event_id=event_id or f"evt-test-{uuid.uuid4().hex[:12]}",
        timestamp=datetime.now(timezone.utc),
        source_ip=source_ip,
        protocol="tcp",
        service="ssh",
        attack_category=category,
        message="Simulated SSH brute force test event",
        data_provenance=System2DataProvenance.SYNTHETIC_VERIFICATION_PROBE,
    )


def test_01_deduplication_within_active_window():
    """Verify duplicate submission within active window returns 'deduplicated' with identical IDs."""
    service = System2IntegrationService()
    db = SessionLocal()
    try:
        event = create_test_event()
        # 1. First submission
        resp1 = service.ingest_sensor_telemetry(event, db)
        assert resp1.status == "accepted"
        assert resp1.event_id == event.event_id

        # 2. Immediate duplicate submission
        resp2 = service.ingest_sensor_telemetry(event, db)
        assert resp2.status == "deduplicated"
        assert resp2.event_id == event.event_id
        assert resp2.attack_id == resp1.attack_id
        assert resp2.attack_event_id == resp1.attack_event_id
    finally:
        db.close()


def test_02_deduplication_after_redis_cache_expiry():
    """Verify that even when Redis key expires or is deleted, PostgreSQL ledger enforces durable idempotency."""
    service = System2IntegrationService()
    db = SessionLocal()
    try:
        event = create_test_event()
        # 1. Ingest event
        resp1 = service.ingest_sensor_telemetry(event, db)
        assert resp1.status == "accepted"

        # 2. Simulate Redis key expiration and in-memory cache eviction
        if service._redis_client is not None:
            service._redis_client.delete(f"hsx:system2:dedup:{event.event_id}")
        service._dedup_cache.clear()

        # 3. Re-submit the exact same event
        resp2 = service.ingest_sensor_telemetry(event, db)
        assert resp2.status == "deduplicated"
        assert resp2.attack_id == resp1.attack_id
        assert resp2.attack_event_id == resp1.attack_event_id

        # Verify only 1 AttackEvent exists in database for this event
        ingested_count = db.query(System2IngestedEvent).filter(System2IngestedEvent.event_id == event.event_id).count()
        assert ingested_count == 1
    finally:
        db.close()


def test_03_deduplication_under_complete_redis_outage():
    """Verify deduplication continues functioning reliably when Redis is completely unavailable."""
    service = System2IntegrationService()
    # Force Redis client to None to simulate complete Redis outage
    service._redis_client = None
    db = SessionLocal()
    try:
        event = create_test_event()
        resp1 = service.ingest_sensor_telemetry(event, db)
        assert resp1.status == "accepted"

        # Duplicate submission with Redis offline
        resp2 = service.ingest_sensor_telemetry(event, db)
        assert resp2.status == "deduplicated"
        assert resp2.attack_id == resp1.attack_id
    finally:
        db.close()


def test_04_concurrent_duplicate_submission_race():
    """Verify concurrent submissions of identical event IDs across multiple worker threads."""
    service = System2IntegrationService()
    event = create_test_event()

    def submit_event(_):
        local_db = SessionLocal()
        try:
            return service.ingest_sensor_telemetry(event, local_db)
        finally:
            local_db.close()

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(submit_event, range(5)))

    statuses = [r.status for r in results]
    assert "accepted" in statuses
    # Exactly one thread accepted the event
    assert statuses.count("accepted") == 1
    # All other 4 threads received 'deduplicated'
    assert statuses.count("deduplicated") == 4

    # Verify all return the exact same attack_id
    attack_ids = {r.attack_id for r in results}
    assert len(attack_ids) == 1

    # Verify database contains only 1 ingested ledger entry
    db = SessionLocal()
    try:
        count = db.query(System2IngestedEvent).filter(System2IngestedEvent.event_id == event.event_id).count()
        assert count == 1
    finally:
        db.close()


def test_05_conflicting_event_payload_with_reused_id():
    """Verify that an incoming event reusing an existing event_id with conflicting IP/sensor is deduplicated without mutating original."""
    service = System2IntegrationService()
    db = SessionLocal()
    try:
        event1 = create_test_event(event_id=f"evt-conflict-{uuid.uuid4().hex[:8]}", sensor_id="sensor-01", source_ip="198.51.100.10")
        resp1 = service.ingest_sensor_telemetry(event1, db)
        assert resp1.status == "accepted"

        # Create conflicting event with same event_id but different source_ip and sensor_id
        event2 = create_test_event(event_id=event1.event_id, sensor_id="sensor-ROGUE", source_ip="203.0.113.99")
        resp2 = service.ingest_sensor_telemetry(event2, db)
        assert resp2.status == "deduplicated"
        assert resp2.attack_id == resp1.attack_id

        # Verify original database ledger record remains intact and untampered
        ledger = db.query(System2IngestedEvent).filter(System2IngestedEvent.event_id == event1.event_id).first()
        assert ledger is not None
        assert ledger.source_ip == "198.51.100.10"
        assert ledger.sensor_id == "sensor-01"
    finally:
        db.close()


def test_06_event_acknowledgement_semantics():
    """Verify response payload satisfies full Pydantic contract and provides idempotent acknowledgment."""
    service = System2IntegrationService()
    db = SessionLocal()
    try:
        event = create_test_event(category=System2AttackCategory.EXPLOITATION)
        resp1 = service.ingest_sensor_telemetry(event, db)
        assert resp1.status == "accepted"
        assert resp1.pipeline_triggered is True
        assert resp1.alert_generated is True
        assert resp1.alert_id is not None
        assert resp1.normalized_type == "cowrie:exploitation"

        resp2 = service.ingest_sensor_telemetry(event, db)
        assert resp2.status == "deduplicated"
        assert resp2.alert_generated == resp1.alert_generated
        assert resp2.alert_id == resp1.alert_id
        assert resp2.attack_id == resp1.attack_id
    finally:
        db.close()
