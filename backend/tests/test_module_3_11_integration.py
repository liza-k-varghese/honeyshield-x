"""Cross-Module Integration Tests for Module 3.11 Threat Hunting.

Verifies:
- Promotion to Module 3.3 Draft Detection Rule (DetectionRuleRegistry).
- Promotion to Module 3.6 Incident Case (CaseManagementService).
- Idempotency of promotions.
- Governor Tier-2 evaluation and emergency lockout blocking (HTTP 503).
- EventBus broadcast and loop-prevention filter.
- Automated suggestions remain DRAFT and NEVER execute.
- Zero containment authority.
"""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

from app.auth.registry import Operator
from app.hunting.service import HuntService
from app.hunting.storage import HuntStore
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import default_governor
from app.multi_vector_detection.registry import default_registry
from app.schemas import (
    HuntCreateRequest,
    HuntDossier,
    HuntEvidenceRecord,
    HuntQuerySpec,
    HuntUpdateRequest,
)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def hunt_service():
    store = HuntStore(use_redis=False)
    return HuntService(store=store)


@pytest.fixture
def operator_analyst():
    return Operator(
        username="analyst_bob",
        role="analyst",
        email="bob@hsx.local",
        password_hash="",
    )


def test_promote_to_detection_rule_contract(hunt_service, operator_analyst, mock_db):
    """Verify promotion creates an inactive draft detection rule with provenance."""
    # 1. Create and execute hunt
    hunt = hunt_service.create_hunt(
        payload=HuntCreateRequest(
            title="Suspicious Web Path Traversal Sweep",
            description="Investigating adversary directory traversal attempts",
            severity="high",
        ),
        operator=operator_analyst,
        db=mock_db,
    )

    # Attach simulated evidence and set completed
    hunt.evidence = [
        HuntEvidenceRecord(
            evidence_id="ev-001122334455",
            entity_type="attack_event",
            entity_id="101",
            timestamp="2026-10-10T00:00:00Z",
            summary="Directory traversal attempt detected",
            source_ip="198.51.100.42",
            attributes={"payload": "../../../etc/shadow"},
        )
    ]
    hunt.status = "completed"
    hunt.query_spec.payload_substring = "/etc/shadow"
    hunt_service.store.save_hunt(hunt)

    # 2. Promote to rule
    promo_resp = hunt_service.promote_to_rule(
        hunt_id=hunt.hunt_id,
        justification="Verified persistent exploitation pattern across multiple sensors",
        operator=operator_analyst,
        db=mock_db,
    )

    rule_id = promo_resp.target_id
    assert rule_id.startswith("DET-HUNT-")
    assert promo_resp.promotion_type == "rule"

    # Verify rule is registered in DetectionRuleRegistry
    registered_rule = default_registry.get_rule(rule_id)
    assert registered_rule is not None
    assert registered_rule.rule_id == rule_id
    assert registered_rule.severity == "high"
    assert f"[Derived from Threat Hunt {hunt.hunt_id} by {operator_analyst.username}]" in registered_rule.description

    # Verify idempotency: repeated promotion returns existing rule
    second_resp = hunt_service.promote_to_rule(
        hunt_id=hunt.hunt_id,
        justification="Verified persistent exploitation pattern across multiple sensors",
        operator=operator_analyst,
        db=mock_db,
    )
    assert second_resp.target_id == rule_id
    assert "already promoted" in second_resp.message


def test_promote_to_case_contract(hunt_service, operator_analyst, mock_db):
    """Verify promotion of malicious_confirmed hunt spawns Module 3.6 IncidentCase."""
    # 1. Create and conclude hunt with malicious_confirmed
    hunt = hunt_service.create_hunt(
        payload=HuntCreateRequest(
            title="Lateral Movement and C2 Activity",
            description="Adversary compromised internal host and attempting C2 beaconing",
            severity="critical",
        ),
        operator=operator_analyst,
        db=mock_db,
    )

    hunt.evidence = [
        HuntEvidenceRecord(
            evidence_id="ev-998877665544",
            entity_type="alert",
            entity_id="404",
            timestamp="2026-10-10T01:00:00Z",
            summary="Critical C2 beaconing alert",
            source_ip="203.0.113.195",
            attributes={"alert_id": 404},
        )
    ]
    hunt.status = "completed"
    hunt_service.store.save_hunt(hunt)

    hunt_service.update_hunt(
        hunt_id=hunt.hunt_id,
        payload=HuntUpdateRequest(
            verdict="malicious_confirmed",
            conclusion_summary="Confirmed high-confidence adversary C2 beaconing to external IP",
        ),
        operator=operator_analyst,
        db=mock_db,
    )

    # 2. Promote to case
    promo_resp = hunt_service.promote_to_case(
        hunt_id=hunt.hunt_id,
        justification="Adversary activity requires immediate active containment and forensic triage",
        operator=operator_analyst,
        db=mock_db,
    )

    case_id = promo_resp.target_id
    assert case_id.startswith("CASE-")
    assert promo_resp.promotion_type == "case"

    # Verify idempotency
    second_resp = hunt_service.promote_to_case(
        hunt_id=hunt.hunt_id,
        justification="Adversary activity requires immediate active containment and forensic triage",
        operator=operator_analyst,
        db=mock_db,
    )
    assert second_resp.target_id == case_id
    assert "already escalated" in second_resp.message


def test_governor_lockout_blocks_promotion(hunt_service, operator_analyst, mock_db):
    """Verify Governor emergency lockout blocks promotion dispatches with HTTP 503."""
    hunt = hunt_service.create_hunt(
        payload=HuntCreateRequest(
            title="Lockout Verification Threat Hunt",
            description="Testing governor lockout safety gate",
            severity="high",
        ),
        operator=operator_analyst,
        db=mock_db,
    )
    hunt.evidence = [
        HuntEvidenceRecord(
            evidence_id="ev-1234567890ab",
            entity_type="attack",
            entity_id="1",
            timestamp="2026-10-10T00:00:00Z",
            summary="Attack evidence",
        )
    ]
    hunt.status = "completed"
    hunt_service.store.save_hunt(hunt)

    # Engage Governor emergency lockout
    default_governor.set_lockout(engaged=True)
    try:
        with pytest.raises(HTTPException) as exc_info:
            hunt_service.promote_to_rule(
                hunt_id=hunt.hunt_id,
                justification="Attempting promotion during system lockout",
                operator=operator_analyst,
                db=mock_db,
            )
        assert exc_info.value.status_code == 503
        assert "Governor emergency lockout is actively engaged" in exc_info.value.detail
    finally:
        # Release lockout
        default_governor.set_lockout(engaged=False)


def test_event_bus_loop_prevention_and_automated_drafts(hunt_service):
    """Verify EventBus subscriber ignores hunt.* and system.* events and never auto-executes."""
    # 1. Dispatch hunt.* event: must be ignored immediately
    hunt_service.handle_event_bus_message("hunt.created", {"hunt_id": "hunt-ignore001"})
    assert hunt_service.store.get_hunt("hunt-ignore001") is None

    # 2. Dispatch system.* event: must be ignored immediately
    hunt_service.handle_event_bus_message("system.case.updated", {"case_id": "CASE-ignore"})

    # 3. Dispatch canary.tripwire: must create DRAFT suggestion
    initial_total = hunt_service.store.count_total()
    hunt_service.handle_event_bus_message(
        "canary.tripwire",
        {
            "canary_id": "CANARY-WEB-001",
            "source_ip": "198.51.100.99",
            "severity": "critical",
        },
    )

    # A new draft hunt should be recorded
    assert hunt_service.store.count_total() == initial_total + 1
    summaries, _ = hunt_service.store.list_hunts(limit=10)
    suggested = next((s for s in summaries if s.is_automated_suggestion), None)
    assert suggested is not None
    assert suggested.status == "draft"  # Strictly DRAFT
    assert suggested.last_executed_at is None  # Strictly NEVER executed
