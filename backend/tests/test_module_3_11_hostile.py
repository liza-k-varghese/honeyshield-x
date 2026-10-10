"""Hostile & Adversarial Security Test Suite for Module 3.11 Threat Hunting.

Adversarially attacks:
- ReDoS via nested quantifiers, lookarounds, and catastrophic backtracking patterns.
- SQL injection payloads in query predicates and substring filters.
- Concurrency race conditions against the single-flight execution mutex.
- Operator execution rate limit exhaustion (1 per 10s).
- Payload bloating and memory exhaustion attempts against the 64KB dossier cap.
- Storage capacity exhaustion and protection of unevictable states.
- XSS and malicious script payloads in evidence attributes and forensic notes.
"""

from datetime import datetime, timezone
import threading
import time
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

from app.auth.registry import Operator
from app.hunting.engine import (
    RetrospectiveQueryEngine,
    validate_regex_pattern,
)
from app.hunting.service import HuntService
from app.hunting.storage import HuntStore, MAX_ACTIVE_HUNTS, MAX_TOTAL_HUNTS
from app.schemas import (
    HuntCreateRequest,
    HuntDossier,
    HuntEvidenceRecord,
    HuntQuerySpec,
    HuntUpdateRequest,
)


@pytest.fixture
def mock_db():
    db = MagicMock()
    # Mock query returning empty results safely
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    return db


@pytest.fixture
def hostile_service():
    return HuntService(store=HuntStore(use_redis=False))


@pytest.fixture
def operator_attacker():
    return Operator(
        username="adversary_op",
        role="analyst",
        email="adversary@attack.local",
        password_hash="",
    )


def test_hostile_redos_patterns_rejected():
    """Adversarial ReDoS: Submit classical catastrophic backtracking regex payloads."""
    evil_patterns = [
        "(a+)+",
        "(a+)+$",
        "(a*)*",
        "(a|b+)+",
        "(.*)*",
        "([a-zA-Z]+)*",
        "(a{1,5}){1,5}",
        "((a+)+)+",
        "(?=(a+)+)",
        "(?!.*.*)",
        ".*.*.*",
        "a" * 65,  # Exceeds max length
    ]

    for p in evil_patterns:
        with pytest.raises(HTTPException) as exc_info:
            validate_regex_pattern(p)
        assert exc_info.value.status_code == 422, f"Pattern '{p}' should have been rejected with 422"


def test_hostile_sqli_in_query_spec(mock_db):
    """Adversarial SQLi: Inject SQL payloads into query predicates."""
    sqli_payloads = [
        "'; DROP TABLE attacks; --",
        "' OR 1=1 --",
        "1' UNION SELECT * FROM users --",
        "admin'--",
        "SLEEP(5)",
    ]

    for sqli in sqli_payloads:
        spec = HuntQuerySpec(
            payload_substring=sqli,
            source_ips=[sqli],
            attack_types=[sqli],
        )
        # RetrospectiveQueryEngine uses SQLAlchemy ORM parameterized filters (ilike, in_)
        # Must execute without crash or raw SQL syntax error
        evidence = RetrospectiveQueryEngine.execute_query(spec, db=mock_db)
        assert isinstance(evidence, list)


def test_hostile_single_flight_mutex_race(hostile_service, operator_attacker, mock_db):
    """Adversarial Concurrency: Attempt simultaneous parallel executions."""
    hunt = hostile_service.create_hunt(
        payload=HuntCreateRequest(
            title="Single-Flight Concurrency Verification",
            description="Testing race condition against execution mutex",
            severity="medium",
        ),
        operator=operator_attacker,
        db=mock_db,
    )

    results: list[dict] = []

    def run_worker():
        try:
            resp = hostile_service.execute_hunt(hunt.hunt_id, operator=operator_attacker, db=mock_db)
            results.append({"status": "success", "data": resp})
        except HTTPException as exc:
            results.append({"status": "error", "code": exc.status_code, "detail": exc.detail})

    # Artificially hold the flight lock to simulate an in-flight execution
    assert hostile_service._flight_lock.acquire(blocking=False)
    try:
        # A concurrent worker attempts execution while lock is held
        t = threading.Thread(target=run_worker)
        t.start()
        t.join()
    finally:
        hostile_service._flight_lock.release()

    # The concurrent worker must receive HTTP 409 Conflict
    assert len(results) == 1
    assert results[0]["status"] == "error"
    assert results[0]["code"] == 409
    assert "Single-flight concurrency limit enforced" in results[0]["detail"]


def test_hostile_operator_rate_limit_flooding(hostile_service, operator_attacker, mock_db):
    """Adversarial Rate Flooding: Execute multiple times in rapid succession."""
    hunt = hostile_service.create_hunt(
        payload=HuntCreateRequest(
            title="Rate Limit Flooding Test",
            description="Testing per-operator rate limit gate",
            severity="low",
        ),
        operator=operator_attacker,
        db=mock_db,
    )

    # First execution succeeds
    resp1 = hostile_service.execute_hunt(hunt.hunt_id, operator=operator_attacker, db=mock_db)
    assert resp1.matched_count == 0

    # Immediate second execution must be rejected with HTTP 429
    with pytest.raises(HTTPException) as exc_info:
        hostile_service.execute_hunt(hunt.hunt_id, operator=operator_attacker, db=mock_db)
    assert exc_info.value.status_code == 429
    assert "rate limit exceeded" in exc_info.value.detail


def test_hostile_dossier_size_capping():
    """Adversarial Memory Bloat: Force oversized dossier payload (>64KB)."""
    store = HuntStore(use_redis=False)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Create dossier with 200 large evidence records to exceed 64KB
    large_evidence = [
        HuntEvidenceRecord(
            evidence_id=f"ev-bloat{i:06d}",
            entity_type="attack_event",
            entity_id=str(i),
            timestamp=now_iso,
            summary="Bloated attack evidence summary with lots of text" * 5,
            source_ip="192.168.1.100",
            attributes={"large_data": "x" * 1000},
        )
        for i in range(200)
    ]

    dossier = HuntDossier(
        hunt_id="hunt-bloat0001",
        title="Oversized Bloated Threat Dossier",
        description="Testing 64KB payload bounds",
        status="completed",
        severity="high",
        mitre_tactics=["Execution"],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=large_evidence,
        forensic_notes=[],
        created_by="adversary_op",
        created_at=now_iso,
        updated_at=now_iso,
    )

    # Store must truncate attributes / prune evidence so serialized payload stays <= 64KB
    saved = store.save_hunt(dossier, is_new=True)
    serialized = store._serialize_dossier(saved)
    assert len(serialized.encode("utf-8")) <= 65536


def test_hostile_storage_saturation_all_protected():
    """Adversarial Storage Exhaustion: Fill 500 slots with unevictable protected hunts."""
    store = HuntStore(use_redis=False)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Saturate store with 500 malicious_confirmed concluded hunts (strictly unevictable)
    for i in range(MAX_TOTAL_HUNTS):
        h = HuntDossier(
            hunt_id=f"hunt-prot{i:04d}",
            title=f"Protected Malicious Hunt {i}",
            description="Unevictable",
            status="concluded",
            severity="critical",
            verdict="malicious_confirmed",  # Protected verdict
            mitre_tactics=[],
            mitre_techniques=[],
            query_spec=HuntQuerySpec(),
            evidence=[],
            forensic_notes=[],
            created_by="analyst",
            created_at=now_iso,
            updated_at=now_iso,
        )
        store._memory_items[h.hunt_id] = h

    assert store.count_total() == 500

    # Attempting to save 501st hunt when none are evictable must raise HTTP 409
    new_h = HuntDossier(
        hunt_id="hunt-fail501",
        title="Overflow Hunt Attempt",
        description="Should fail",
        status="archived",
        severity="low",
        mitre_tactics=[],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=[],
        forensic_notes=[],
        created_by="analyst",
        created_at=now_iso,
        updated_at=now_iso,
    )
    with pytest.raises(HTTPException) as exc_info:
        store.save_hunt(new_h, is_new=True)
    assert exc_info.value.status_code == 409
    assert "capacity reached (500)" in exc_info.value.detail


def test_hostile_xss_injection_in_forensic_notes(hostile_service, operator_attacker, mock_db):
    """Adversarial XSS: Inject script tags into forensic notes."""
    hunt = hostile_service.create_hunt(
        payload=HuntCreateRequest(
            title="XSS Note Injection Test",
            description="Testing note sanitized storage",
            severity="low",
        ),
        operator=operator_attacker,
        db=mock_db,
    )

    xss_payload = "<script>alert('XSS')</script><img src=x onerror=alert(1)>"
    updated = hostile_service.update_hunt(
        hunt_id=hunt.hunt_id,
        payload=HuntUpdateRequest(note=xss_payload),
        operator=operator_attacker,
        db=mock_db,
    )

    # Note is preserved as inert text in dossier
    assert len(updated.forensic_notes) == 1
    assert updated.forensic_notes[0].message == xss_payload
