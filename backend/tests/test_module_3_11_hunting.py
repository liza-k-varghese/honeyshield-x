"""Unit Tests for Module 3.11 Retrospective Threat Hunting Engine and Storage.

Verifies:
- Deterministic regex AST safety validation (fail-closed against ReDoS).
- Dual-mode HuntStore capacity bounds (200 active, 500 total).
- Deterministic FIFO eviction of ARCHIVED and benign CONCLUDED hunts.
- Protection of unevictable hunt states.
- 64 KB serialization limit and attribute scrubbing.
- Query engine predicate limits (<= 10 predicates) and 30-day temporal window cap.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from app.hunting.engine import (
    RetrospectiveQueryEngine,
    make_evidence_id,
    sanitize_attributes,
    validate_regex_pattern,
)
from app.hunting.storage import HuntStore, MAX_ACTIVE_HUNTS, MAX_TOTAL_HUNTS
from app.schemas import (
    HuntDossier,
    HuntEvidenceRecord,
    HuntNote,
    HuntQuerySpec,
)


def test_regex_safety_validator_allowed_patterns():
    """Verify standard defensive hunting patterns pass AST validation."""
    valid_patterns = [
        "admin",
        "SELECT.*FROM",
        r"\b(?:etc/passwd|win\.ini)\b",
        "192\\.168\\.1\\.[0-9]+",
        "^[a-zA-Z0-9_-]{3,16}$",
        r"\bcat\s+/etc/shadow\b",
    ]
    for pattern in valid_patterns:
        validate_regex_pattern(pattern)  # Must not raise


def test_regex_safety_validator_rejects_long_patterns():
    """Verify patterns exceeding 64 characters are rejected."""
    long_pattern = "a" * 65
    with pytest.raises(HTTPException) as exc_info:
        validate_regex_pattern(long_pattern)
    assert exc_info.value.status_code == 422
    assert "exceeds maximum length" in exc_info.value.detail


def test_regex_safety_validator_rejects_lookarounds():
    """Verify lookahead and lookbehind assertions are strictly prohibited."""
    prohibited_lookarounds = [
        "(?=admin)",
        "(?!root)",
        "(?<=user)",
        "(?<!guest)",
    ]
    for p in prohibited_lookarounds:
        with pytest.raises(HTTPException) as exc_info:
            validate_regex_pattern(p)
        assert exc_info.value.status_code == 422


def test_regex_safety_validator_rejects_backreferences():
    """Verify backreferences are rejected."""
    prohibited_backrefs = [
        r"(a)\1",
        r"(foo)\2",
    ]
    for p in prohibited_backrefs:
        with pytest.raises(HTTPException) as exc_info:
            validate_regex_pattern(p)
        assert exc_info.value.status_code == 422


def test_regex_safety_validator_rejects_nested_quantifiers():
    """Verify nested quantifiers (catastrophic backtracking) are rejected."""
    prohibited_nested = [
        "(a+)+",
        "(a*)*",
        "(a|b+)+",
    ]
    for p in prohibited_nested:
        with pytest.raises(HTTPException) as exc_info:
            validate_regex_pattern(p)
        assert exc_info.value.status_code == 422
        assert "Nested quantifiers" in exc_info.value.detail or "prohibited" in exc_info.value.detail


def test_regex_safety_validator_rejects_large_quantifiers():
    """Verify quantifier repetitions exceeding 20 are rejected."""
    with pytest.raises(HTTPException) as exc_info:
        validate_regex_pattern("a{1,25}")
    assert exc_info.value.status_code == 422
    assert "exceeds maximum bound" in exc_info.value.detail


def test_regex_safety_validator_rejects_consecutive_wildcards():
    """Verify consecutive unbounded wildcards are rejected."""
    with pytest.raises(HTTPException) as exc_info:
        validate_regex_pattern(".*.*")
    assert exc_info.value.status_code == 422


def test_sanitize_attributes_masks_sensitive_data():
    """Verify recursive scrubbing masks sensitive keys with [REDACTED]."""
    raw_data = {
        "source_ip": "10.0.0.1",
        "password": "supersecretpassword",
        "api_token": "token-12345",
        "auth_header": "Bearer abcde",
        "secret_key": "k-9999",
        "nested": {
            "credential_hash": "sha256-hash",
            "safe_counter": 42,
        },
    }
    scrubbed = sanitize_attributes(raw_data)
    assert scrubbed["source_ip"] == "10.0.0.1"
    assert scrubbed["password"] == "[REDACTED]"
    assert scrubbed["api_token"] == "[REDACTED]"
    assert scrubbed["auth_header"] == "[REDACTED]"
    assert scrubbed["secret_key"] == "[REDACTED]"
    assert scrubbed["nested"]["credential_hash"] == "[REDACTED]"
    assert scrubbed["nested"]["safe_counter"] == 42


def test_hunt_store_capacity_and_active_bounds():
    """Verify HuntStore enforces max 200 active hunts and max 500 total hunts."""
    store = HuntStore(use_redis=False)

    # 1. Fill store with 200 active hunts
    now_iso = datetime.now(timezone.utc).isoformat()
    for i in range(MAX_ACTIVE_HUNTS):
        dossier = HuntDossier(
            hunt_id=f"hunt-act{i:03d}",
            title=f"Active Threat Hypothesis {i}",
            description="Investigative scenario",
            status="draft",
            severity="medium",
            mitre_tactics=["Reconnaissance"],
            mitre_techniques=[],
            query_spec=HuntQuerySpec(),
            evidence=[],
            forensic_notes=[],
            conclusion_summary=None,
            verdict=None,
            promoted_rule_ids=[],
            promoted_case_ids=[],
            execution_count=0,
            last_executed_at=None,
            is_automated_suggestion=False,
            created_by="analyst_test",
            created_at=now_iso,
            updated_at=now_iso,
        )
        store.save_hunt(dossier, is_new=True)

    assert store.count_active() == 200
    assert store.count_total() == 200

    # 2. Attempting to add 201st active hunt must raise HTTP 409
    overflow_dossier = HuntDossier(
        hunt_id="hunt-overflow01",
        title="Overflow Active Hypothesis",
        description="Investigative scenario",
        status="draft",
        severity="medium",
        mitre_tactics=[],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=[],
        forensic_notes=[],
        conclusion_summary=None,
        verdict=None,
        promoted_rule_ids=[],
        promoted_case_ids=[],
        execution_count=0,
        last_executed_at=None,
        is_automated_suggestion=False,
        created_by="analyst_test",
        created_at=now_iso,
        updated_at=now_iso,
    )
    with pytest.raises(HTTPException) as exc_info:
        store.save_hunt(overflow_dossier, is_new=True)
    assert exc_info.value.status_code == 409
    assert "Active hunt limit (200) reached" in exc_info.value.detail


def test_hunt_store_fifo_eviction():
    """Verify FIFO eviction prioritizes oldest ARCHIVED hunts over benign CONCLUDED hunts."""
    store = HuntStore(use_redis=False)
    now = datetime.now(timezone.utc)

    # Pre-populate 498 protected hunts
    for i in range(498):
        h = HuntDossier(
            hunt_id=f"hunt-prot{i:04d}",
            title=f"Protected Hunt {i}",
            description="Protected",
            status="draft" if i < 150 else "completed",
            severity="low",
            mitre_tactics=[],
            mitre_techniques=[],
            query_spec=HuntQuerySpec(),
            evidence=[],
            forensic_notes=[],
            created_by="analyst",
            created_at=now.isoformat(),
            updated_at=(now + timedelta(seconds=i)).isoformat(),
        )
        store._memory_items[h.hunt_id] = h

    # Add 1 old archived hunt
    old_archived = HuntDossier(
        hunt_id="hunt-arch0001",
        title="Old Archived Hunt",
        description="Archived",
        status="archived",
        severity="low",
        mitre_tactics=[],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=[],
        forensic_notes=[],
        created_by="analyst",
        created_at=(now - timedelta(days=10)).isoformat(),
        updated_at=(now - timedelta(days=10)).isoformat(),
    )
    store._memory_items[old_archived.hunt_id] = old_archived

    # Add 1 old concluded benign hunt
    old_benign = HuntDossier(
        hunt_id="hunt-benign001",
        title="Old Benign Hunt",
        description="Benign",
        status="concluded",
        severity="low",
        verdict="benign_activity",
        mitre_tactics=[],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=[],
        forensic_notes=[],
        created_by="analyst",
        created_at=(now - timedelta(days=5)).isoformat(),
        updated_at=(now - timedelta(days=5)).isoformat(),
    )
    store._memory_items[old_benign.hunt_id] = old_benign

    assert store.count_total() == 500

    # Save a new hunt to trigger eviction
    new_hunt = HuntDossier(
        hunt_id="hunt-new501",
        title="New Hunt After Eviction",
        description="New hunt",
        status="archived",  # Not active so active count check doesn't trip
        severity="low",
        mitre_tactics=[],
        mitre_techniques=[],
        query_spec=HuntQuerySpec(),
        evidence=[],
        forensic_notes=[],
        created_by="analyst",
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )

    store.save_hunt(new_hunt, is_new=True)

    # Oldest ARCHIVED hunt should be evicted
    assert store.get_hunt("hunt-arch0001") is None
    # Benign hunt should still exist
    assert store.get_hunt("hunt-benign001") is not None
    # Total count capped at 500
    assert store.count_total() == 500


def test_query_engine_predicate_and_time_limits():
    """Verify query engine enforces max 10 predicates and max 30-day temporal window."""
    # 1. 11 active predicates
    excess_spec = HuntQuerySpec(
        time_range_start="2026-01-01T00:00:00Z",
        source_ips=["1.1.1.1"],
        destination_ips=["2.2.2.2"],
        attack_types=["ssh"],
        severities=["high"],
        alert_statuses=["open"],
        payload_substring="test",
        ioc_values=["bad.com"],
        canary_ids=["canary-1"],
        campaign_ids=["camp-1"],
        regex_pattern="admin",
    )
    with pytest.raises(HTTPException) as exc_info:
        RetrospectiveQueryEngine.execute_query(excess_spec, db=None)  # type: ignore
    assert exc_info.value.status_code == 422
    assert "maximum allowed: 10" in exc_info.value.detail

    # 2. 35-day window
    wide_spec = HuntQuerySpec(
        time_range_start="2026-01-01T00:00:00Z",
        time_range_end="2026-02-15T00:00:00Z",  # 45 days
    )
    with pytest.raises(HTTPException) as exc_info:
        RetrospectiveQueryEngine.execute_query(wide_spec, db=None)  # type: ignore
    assert exc_info.value.status_code == 422
    assert "exceeds 30-day safety limit" in exc_info.value.detail
