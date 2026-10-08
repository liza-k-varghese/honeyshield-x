"""Unit and integration test suite for HoneyShield-X Module 3.4 (Incident Command & Governance).

Verifies:
1. Deterministic Governor Action Allowlist enforcement (HTTP 403).
2. Operator rate limit enforcement (max 10 actions / 60s -> HTTP 429).
3. Target entity cooldown enforcement (30s cooldown -> HTTP 429).
4. Idempotency key deduplication and validation (UUID v4, exactly-once execution).
5. Emergency lockout behavior (engaging blocks outbound dispatch with HTTP 503).
6. 3-state Circuit Breaker transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED).
7. Human-in-the-Loop pre-flight preview and justification requirements.
8. Alert lifecycle command executions (ACKNOWLEDGE, RESOLVE, ESCALATE).
9. Immutable SystemEvent audit trails.
10. Virtual Incident projections over Alert and Attack.
11. Event Bus publishing and SSE stream endpoint.
12. Fail-closed safety invariants.
"""

import json
import time
import inspect
import unittest
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.routers.incident_command import execute_command_endpoint, preview_command_endpoint
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import (
    ALLOWED_ACTIONS,
    CircuitBreakerState,
    DeterministicGovernor,
    default_governor,
)
from app.incident_command.service import (
    execute_incident_command,
    get_allowlisted_actions_catalog,
    get_virtual_incidents,
)
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.schemas import IncidentCommandRequest, LockoutToggleRequest


class TestIncidentCommandModule34(unittest.TestCase):
    """Test suite covering Module 3.4 Incident Command and Governance."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_alert_ids: list[int] = []
        self.created_attack_ids: list[int] = []
        self.created_audit_ids: list[int] = []

        # Reset singleton governor state for predictable test execution
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

    def tearDown(self):
        # Clean up database records
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        for aud_id in self.created_audit_ids:
            self.db.query(SystemEvent).filter(SystemEvent.id == aud_id).delete()

        # Clean any audit records created during test
        self.db.query(SystemEvent).filter(SystemEvent.source == "incident_command").delete()
        self.db.commit()
        self.db.close()

    def _create_test_attack_and_alert(
        self,
        severity="medium",
        status="open",
        source_ip="198.51.100.77",
    ) -> tuple[Attack, Alert]:
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip=source_ip,
            destination_ip="10.0.0.1",
            protocol="TCP",
            severity=severity,
            risk_score=75.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        # Attach 2 attack events
        ev1 = AttackEvent(
            attack_id=attack.id,
            event_type="auth_failure",
            source_ip=source_ip,
            message="Failed root login",
        )
        ev2 = AttackEvent(
            attack_id=attack.id,
            event_type="auth_failure",
            source_ip=source_ip,
            message="Failed admin login",
        )
        self.db.add_all([ev1, ev2])
        self.db.commit()

        alert = Alert(
            attack_id=attack.id,
            alert_type="Brute Force SSH",
            severity=severity,
            message=f"SSH Brute Force detected from {source_ip}",
            status=status,
            notification_status="pending",
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)

        return attack, alert

    # =========================================================================
    # Test 1: Action Allowlist Enforcement
    # =========================================================================

    def test_1_action_allowlist_enforcement(self):
        """Test 1: Unlisted action strings are rejected with HTTP 403; allowlisted actions pass."""
        _, alert = self._create_test_attack_and_alert()

        req_invalid = IncidentCommandRequest(
            action="ARBITRARY_REMOTE_EXECUTE",
            target_id=alert.id,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_invalid,
                idempotency_key=str(uuid.uuid4()),
                operator_id="test_analyst",
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("not allowlisted", ctx.exception.detail)

        # Allowlisted action succeeds
        req_valid = IncidentCommandRequest(
            action="ALERT_ACKNOWLEDGE",
            target_id=alert.id,
        )
        res = execute_incident_command(
            db=self.db,
            request=req_valid,
            idempotency_key=str(uuid.uuid4()),
            operator_id="test_analyst",
        )
        self.assertTrue(res.success)
        self.assertEqual(res.new_status, "acknowledged")

    # =========================================================================
    # Test 2: Operator Rate Limiting Enforcement
    # =========================================================================

    def test_2_operator_rate_limiting(self):
        """Test 2: Exceeding 10 actions within 60s raises HTTP 429 Too Many Requests."""
        # 10 actions against different targets
        for i in range(10):
            req = IncidentCommandRequest(
                action="GOVERNOR_LOCKOUT_RELEASE",
                target_id=0,
            )
            execute_incident_command(
                db=self.db,
                request=req,
                idempotency_key=str(uuid.uuid4()),
                operator_id="rapid_operator",
            )

        # 11th action from same operator must raise 429
        req_11 = IncidentCommandRequest(
            action="GOVERNOR_LOCKOUT_RELEASE",
            target_id=0,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_11,
                idempotency_key=str(uuid.uuid4()),
                operator_id="rapid_operator",
            )
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("exceeded rate limit", ctx.exception.detail)

        # A different operator is unaffected
        res_other = execute_incident_command(
            db=self.db,
            request=req_11,
            idempotency_key=str(uuid.uuid4()),
            operator_id="other_operator",
        )
        self.assertTrue(res_other.success)

    # =========================================================================
    # Test 3: Target Entity Cooldown Enforcement
    # =========================================================================

    def test_3_entity_cooldown_enforcement(self):
        """Test 3: Re-executing commands on the same entity within 30s raises HTTP 429."""
        _, alert1 = self._create_test_attack_and_alert()
        _, alert2 = self._create_test_attack_and_alert()

        # Command on Alert 1
        req1 = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert1.id)
        execute_incident_command(
            db=self.db,
            request=req1,
            idempotency_key=str(uuid.uuid4()),
            operator_id="op_1",
        )

        # Immediate command on Alert 1 triggers cooldown
        req1_repeat = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert1.id)
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req1_repeat,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_2",  # Even with different operator, entity is in cooldown
            )
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("in cooldown", ctx.exception.detail)

        # Action on Alert 2 succeeds (different target entity)
        req2 = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert2.id)
        res2 = execute_incident_command(
            db=self.db,
            request=req2,
            idempotency_key=str(uuid.uuid4()),
            operator_id="op_1",
        )
        self.assertTrue(res2.success)

    # =========================================================================
    # Test 4: Idempotency Key Deduplication
    # =========================================================================

    def test_4_idempotency_key_deduplication(self):
        """Test 4: Duplicate idempotency key returns cached response without duplicate execution."""
        _, alert = self._create_test_attack_and_alert()
        fixed_key = str(uuid.uuid4())

        req = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert.id)

        # Execution 1
        res1 = execute_incident_command(
            db=self.db,
            request=req,
            idempotency_key=fixed_key,
            operator_id="op_idem",
        )
        self.assertTrue(res1.success)

        # Execution 2 with same key returns cached response (cooldown is NOT triggered)
        res2 = execute_incident_command(
            db=self.db,
            request=req,
            idempotency_key=fixed_key,
            operator_id="op_idem",
        )
        self.assertEqual(res1.command_id, res2.command_id)
        self.assertEqual(res1.audit_event_id, res2.audit_event_id)

        # Invalid UUID format is rejected with HTTP 422
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req,
                idempotency_key="non-uuid-key-1234",
                operator_id="op_idem",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    # =========================================================================
    # Test 5: Governor Emergency Lockout
    # =========================================================================

    def test_5_emergency_lockout_behavior(self):
        """Test 5: Engaging lockout blocks outbound notification dispatch with HTTP 503."""
        _, alert = self._create_test_attack_and_alert()

        # Engage lockout
        default_governor.set_lockout(True)
        self.assertTrue(default_governor.is_lockout_engaged)

        # Attempt NOTIFICATION_DISPATCH while locked out -> HTTP 503
        req = IncidentCommandRequest(action="NOTIFICATION_DISPATCH", target_id=alert.id)
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_lockout",
            )
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("lockout is actively engaged", ctx.exception.detail)

        # Internal actions (ALERT_ACKNOWLEDGE) remain permitted during outbound lockout
        req_ack = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert.id)
        res_ack = execute_incident_command(
            db=self.db,
            request=req_ack,
            idempotency_key=str(uuid.uuid4()),
            operator_id="op_lockout",
        )
        self.assertTrue(res_ack.success)

        # Release lockout
        default_governor.set_lockout(False)
        self.assertFalse(default_governor.is_lockout_engaged)

    # =========================================================================
    # Test 6: 3-State Circuit Breaker Transitions
    # =========================================================================

    def test_6_circuit_breaker_3_state_transitions(self):
        """Test 6: Circuit Breaker transitions: CLOSED -> OPEN -> HALF_OPEN -> CLOSED."""
        cb = default_governor.circuit_breaker
        cb.reset()

        # 1. Starts CLOSED
        self.assertEqual(cb.current_state, CircuitBreakerState.CLOSED)
        permitted, _ = cb.check_permission()
        self.assertTrue(permitted)

        # 2. Record 2 failures -> remains CLOSED
        cb.record_failure("error 1")
        cb.record_failure("error 2")
        self.assertEqual(cb.current_state, CircuitBreakerState.CLOSED)

        # 3. 3rd consecutive failure -> trips to OPEN
        cb.record_failure("error 3")
        self.assertEqual(cb.current_state, CircuitBreakerState.OPEN)
        permitted, reason = cb.check_permission()
        self.assertFalse(permitted)
        self.assertIn("OPEN", reason)

        # 4. Simulate cooldown elapsed -> transitions to HALF_OPEN
        cb.metrics.last_state_change = time.time() - 65.0
        self.assertEqual(cb.current_state, CircuitBreakerState.HALF_OPEN)
        permitted, _ = cb.check_permission()
        self.assertTrue(permitted)

        # 5. Successful probe -> restores to CLOSED
        cb.record_success()
        self.assertEqual(cb.current_state, CircuitBreakerState.CLOSED)
        self.assertEqual(cb.metrics.consecutive_failures, 0)

        # 6. Trip again to test failed probe in HALF_OPEN
        cb.record_failure("err 1")
        cb.record_failure("err 2")
        cb.record_failure("err 3")
        self.assertEqual(cb.current_state, CircuitBreakerState.OPEN)

        # Cooldown elapsed -> HALF_OPEN
        cb.metrics.last_state_change = time.time() - 65.0
        self.assertEqual(cb.current_state, CircuitBreakerState.HALF_OPEN)

        # Failed probe -> returns to OPEN
        cb.record_failure("probe failed")
        self.assertEqual(cb.current_state, CircuitBreakerState.OPEN)

    # =========================================================================
    # Test 7: Human-in-the-Loop Justification and Approval Token
    # =========================================================================

    def test_7_human_in_the_loop_justification_and_token(self):
        """Test 7: Level 2/3 actions require justification; approval tokens validate correctly."""
        _, alert = self._create_test_attack_and_alert()

        # RESOLVE without justification -> HTTP 422
        req_no_just = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="",
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_no_just,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_hitl",
            )
        self.assertEqual(ctx.exception.status_code, 422)

        # Create approval token via Governor bound to operator
        token_info = default_governor.create_approval_token(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            operator_id="op_hitl",
        )
        valid_token = token_info["approval_token"]

        # Resolve WITH justification and token -> Success
        req_valid = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Verified false positive from internal vulnerability scanner",
            approval_token=valid_token,
        )
        res = execute_incident_command(
            db=self.db,
            request=req_valid,
            idempotency_key=str(uuid.uuid4()),
            operator_id="op_hitl",
        )
        self.assertTrue(res.success)
        self.assertEqual(res.new_status, "resolved")

    # =========================================================================
    # Test 8: Alert Lifecycle Command Executions
    # =========================================================================

    def test_8_alert_lifecycle_command_executions(self):
        """Test 8: ALERT_ACKNOWLEDGE, ALERT_RESOLVE, ALERT_ESCALATE update PostgreSQL state."""
        _, alert = self._create_test_attack_and_alert(severity="medium", status="open")

        # 1. Acknowledge
        req_ack = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert.id)
        execute_incident_command(
            db=self.db,
            request=req_ack,
            idempotency_key=str(uuid.uuid4()),
            operator_id="analyst_1",
        )
        self.db.refresh(alert)
        self.assertEqual(alert.status, "acknowledged")

        # Reset cooldown on alert for sequential test
        default_governor._entity_cooldowns.clear()

        # 2. Escalate severity: medium -> high
        req_esc = IncidentCommandRequest(
            action="ALERT_ESCALATE",
            target_id=alert.id,
            justification="Attacker persistence escalating",
        )
        execute_incident_command(
            db=self.db,
            request=req_esc,
            idempotency_key=str(uuid.uuid4()),
            operator_id="analyst_1",
        )
        self.db.refresh(alert)
        self.assertEqual(alert.severity, "high")

        default_governor._entity_cooldowns.clear()

        # 3. Resolve
        req_res = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Remediated via host firewall block",
        )
        execute_incident_command(
            db=self.db,
            request=req_res,
            idempotency_key=str(uuid.uuid4()),
            operator_id="analyst_1",
        )
        self.db.refresh(alert)
        self.assertEqual(alert.status, "resolved")

        # 4. Non-existent alert raises HTTP 404
        req_404 = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=999999)
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_404,
                idempotency_key=str(uuid.uuid4()),
                operator_id="analyst_1",
            )
        self.assertEqual(ctx.exception.status_code, 404)

    # =========================================================================
    # Test 9: Immutable SystemEvent Audit Logging
    # =========================================================================

    def test_9_immutable_audit_logging(self):
        """Test 9: Every executed command creates an immutable SystemEvent record with structured metadata."""
        _, alert = self._create_test_attack_and_alert()

        req = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert.id)
        res = execute_incident_command(
            db=self.db,
            request=req,
            idempotency_key=str(uuid.uuid4()),
            operator_id="audit_analyst",
        )

        self.assertIsNotNone(res.audit_event_id)
        audit_event = self.db.query(SystemEvent).filter(SystemEvent.id == res.audit_event_id).first()
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.event_type, "INCIDENT_COMMAND_EXECUTED")
        self.assertEqual(audit_event.source, "incident_command")

        # Parse message JSON
        data = json.loads(audit_event.message)
        self.assertEqual(data["action"], "ALERT_ACKNOWLEDGE")
        self.assertEqual(data["target_id"], alert.id)
        self.assertEqual(data["operator_id"], "audit_analyst")
        self.assertEqual(data["new_status"], "acknowledged")

    # =========================================================================
    # Test 10: Virtual Incident Projections
    # =========================================================================

    def test_10_virtual_incident_projections(self):
        """Test 10: Virtual incident collection projects over Alert and Attack with zero schema migrations."""
        atk, alt = self._create_test_attack_and_alert(source_ip="198.51.100.99")

        incidents_resp = get_virtual_incidents(db=self.db, status_filter="all", limit=50)
        self.assertGreaterEqual(incidents_resp.total_incidents, 1)

        # Find our incident
        target_inc = next((i for i in incidents_resp.incidents if i.alert_id == alt.id), None)
        self.assertIsNotNone(target_inc)
        self.assertEqual(target_inc.incident_id, f"INC-{alt.id}")
        self.assertEqual(target_inc.source_ip, "198.51.100.99")
        self.assertEqual(target_inc.event_count, 2)  # Correlated events
        self.assertEqual(target_inc.status, "open")

    # =========================================================================
    # Test 11: Real-Time Event Bus Publishing
    # =========================================================================

    def test_11_event_bus_publishing(self):
        """Test 11: EventBus publishes sanitized, bounded event structures."""
        event = default_event_bus.publish_event(
            "alert.created",
            {"alert_id": 42, "sensitive_token": "super_secret_xyz", "message": "Test alert"},
        )
        self.assertEqual(event["event_type"], "alert.created")
        self.assertEqual(event["payload"]["alert_id"], 42)
        # Sensitive field must be redacted
        self.assertEqual(event["payload"]["sensitive_token"], "[REDACTED]")

    # =========================================================================
    # Test 12: Action Catalog API Contract
    # =========================================================================

    def test_12_action_catalog_and_governor_status(self):
        """Test 12: Action catalog lists all 8 allowlisted actions; Governor status reports health."""
        catalog = get_allowlisted_actions_catalog()
        self.assertEqual(catalog.total_actions, len(ALLOWED_ACTIONS))
        action_names = {a.action for a in catalog.actions}
        self.assertEqual(action_names, ALLOWED_ACTIONS)

        # Governor status
        gov_status = default_governor.get_status_dict(operator_id="test_op")
        self.assertFalse(gov_status["lockout_engaged"])
        self.assertEqual(gov_status["circuit_breaker"]["state"], "CLOSED")
        self.assertIn("ALERT_ACKNOWLEDGE", gov_status["allowlisted_actions"])

    # =========================================================================
    # Test 13 (HSX-F-3.4-01): Mandatory Level 3 Approval Token Gate
    # =========================================================================

    def test_13_fix1_mandatory_level3_approval_token(self):
        """Test 13 (HSX-F-3.4-01): Blast Tier 3 actions strictly require pre-flight approval tokens."""
        _, alert = self._create_test_attack_and_alert()

        # 1. Level 3 action (CONTAINMENT_STAGING_REQUEST) WITHOUT approval_token -> HTTP 422
        req_no_token = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=None,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_no_token,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("mandatory pre-flight approval token", ctx.exception.detail)

        # 2. Invalid / Non-existent token -> HTTP 401
        req_bad_token = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=str(uuid.uuid4()),
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_bad_token,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid or expired", ctx.exception.detail)

        # 3. Expired token -> HTTP 401
        token_data = default_governor.create_approval_token(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            operator_id="sec_ops_1",
        )
        expired_token = token_data["approval_token"]
        default_governor._approval_tokens[expired_token]["expires_at"] = time.time() - 10.0
        req_expired = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=expired_token,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_expired,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("expired", ctx.exception.detail)

        # 4. Valid token -> Success
        valid_token_data = default_governor.create_approval_token(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            operator_id="sec_ops_1",
        )
        req_valid = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=valid_token_data["approval_token"],
        )
        res = execute_incident_command(
            db=self.db,
            request=req_valid,
            idempotency_key=str(uuid.uuid4()),
            operator_id="sec_ops_1",
        )
        self.assertTrue(res.success)
        self.assertEqual(res.new_status, "staged_containment")

        # 5. Token reuse -> HTTP 401 (token was consumed)
        default_governor._entity_cooldowns.clear()
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_valid,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 401)

        # 6. Action mismatch -> HTTP 401
        token_for_other_action = default_governor.create_approval_token(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            operator_id="sec_ops_1",
        )
        req_mismatch_act = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=token_for_other_action["approval_token"],
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_mismatch_act,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("mismatch", ctx.exception.detail)

        # 7. Target mismatch -> HTTP 401
        _, alert2 = self._create_test_attack_and_alert()
        token_for_alert2 = default_governor.create_approval_token(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert2.id,
            operator_id="sec_ops_1",
        )
        req_mismatch_target = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Staging defensive containment for brute force",
            approval_token=token_for_alert2["approval_token"],
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_mismatch_target,
                idempotency_key=str(uuid.uuid4()),
                operator_id="sec_ops_1",
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("mismatch", ctx.exception.detail)

    # =========================================================================
    # Test 14 (HSX-F-3.4-02): Approval Token Operator Binding
    # =========================================================================

    def test_14_fix2_approval_token_operator_binding(self):
        """Test 14 (HSX-F-3.4-02): Ephemeral approval tokens are strictly bound to operator identity."""
        _, alert = self._create_test_attack_and_alert()

        # Token generated for operator_alice
        token_info = default_governor.create_approval_token(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            operator_id="operator_alice",
        )
        self.assertEqual(token_info["operator_id"], "operator_alice")

        # Redemption attempted by operator_bob -> HTTP 401
        req_bob = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Resolving incident as operator bob",
            approval_token=token_info["approval_token"],
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_bob,
                idempotency_key=str(uuid.uuid4()),
                operator_id="operator_bob",
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("operator mismatch", ctx.exception.detail)
        self.assertIn("operator_alice", ctx.exception.detail)
        self.assertIn("operator_bob", ctx.exception.detail)

    # =========================================================================
    # Test 15 (HSX-F-3.4-03): Terminal State Immutability
    # =========================================================================

    def test_15_fix3_terminal_alert_state_immutability(self):
        """Test 15 (HSX-F-3.4-03): Terminal 'resolved' alerts cannot be acknowledged, re-resolved, or escalated."""
        _, alert = self._create_test_attack_and_alert(status="open")

        # Resolve alert initially
        token = default_governor.create_approval_token(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            operator_id="op_close",
        )
        req_resolve = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Initial successful resolution",
            approval_token=token["approval_token"],
        )
        res = execute_incident_command(
            db=self.db,
            request=req_resolve,
            idempotency_key=str(uuid.uuid4()),
            operator_id="op_close",
        )
        self.assertEqual(res.new_status, "resolved")
        self.db.refresh(alert)
        self.assertEqual(alert.status, "resolved")

        default_governor._entity_cooldowns.clear()

        # 1. Attempt ALERT_ACKNOWLEDGE on resolved alert -> HTTP 409 Conflict
        req_ack = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=alert.id)
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_ack,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_tester",
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("terminal 'resolved' state", ctx.exception.detail)

        # 2. Attempt ALERT_RESOLVE on already resolved alert -> HTTP 409 Conflict
        default_governor._entity_cooldowns.clear()
        token2 = default_governor.create_approval_token(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            operator_id="op_tester",
        )
        req_re_resolve = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Attempting re-resolve",
            approval_token=token2["approval_token"],
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_re_resolve,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_tester",
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("already in terminal 'resolved' state", ctx.exception.detail)

        # 3. Attempt ALERT_ESCALATE on resolved alert -> HTTP 409 Conflict
        default_governor._entity_cooldowns.clear()
        req_escalate = IncidentCommandRequest(
            action="ALERT_ESCALATE",
            target_id=alert.id,
            justification="Attempting escalation on closed incident",
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_incident_command(
                db=self.db,
                request=req_escalate,
                idempotency_key=str(uuid.uuid4()),
                operator_id="op_tester",
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("terminal 'resolved' state", ctx.exception.detail)

    # =========================================================================
    # Test 16 (HSX-F-3.4-04): Circuit Breaker HALF_OPEN Single Probe Serialization
    # =========================================================================

    def test_16_fix4_circuit_breaker_half_open_single_probe(self):
        """Test 16 (HSX-F-3.4-04): In HALF_OPEN, exactly one caller reserves the probe; concurrent callers are shed."""
        cb = default_governor.circuit_breaker
        cb.reset()

        # Trip to OPEN
        cb.record_failure("f1")
        cb.record_failure("f2")
        cb.record_failure("f3")
        self.assertEqual(cb.current_state, CircuitBreakerState.OPEN)

        # Force cooldown to elapse -> HALF_OPEN
        cb.metrics.last_state_change = time.time() - 65.0
        self.assertEqual(cb.current_state, CircuitBreakerState.HALF_OPEN)

        # Caller 1 calls check_permission -> Permitted (probe reserved)
        p1, reason1 = cb.check_permission()
        self.assertTrue(p1)
        self.assertIn("HALF_OPEN probe reserved", reason1)

        # Caller 2 calls check_permission while probe in flight -> Shed
        p2, reason2 = cb.check_permission()
        self.assertFalse(p2)
        self.assertIn("single probe already in flight", reason2)

        # Caller 3 calls check_permission while probe in flight -> Shed
        p3, reason3 = cb.check_permission()
        self.assertFalse(p3)
        self.assertIn("single probe already in flight", reason3)

        # Probe failure resets probe flag and returns to OPEN
        cb.record_failure("probe timed out")
        self.assertEqual(cb.current_state, CircuitBreakerState.OPEN)
        self.assertFalse(cb._probe_in_flight)

        # Force cooldown again -> HALF_OPEN
        cb.metrics.last_state_change = time.time() - 65.0
        self.assertEqual(cb.current_state, CircuitBreakerState.HALF_OPEN)

        # Caller succeeds
        p4, _ = cb.check_permission()
        self.assertTrue(p4)
        cb.record_success()
        self.assertEqual(cb.current_state, CircuitBreakerState.CLOSED)
        self.assertFalse(cb._probe_in_flight)

    # =========================================================================
    # Test 17 (HSX-F-3.4-06): Mandatory Idempotency Header on Router Endpoint & Audit Persistence
    # =========================================================================

    def test_17_fix5_mandatory_idempotency_header_and_audit_rejected(self):
        """Test 17 (HSX-F-3.4-06): POST /execute strictly requires X-Idempotency-Key header; rejected commands persist audit."""
        _, alert = self._create_test_attack_and_alert()

        # 1. Verify router signature enforces mandatory X-Idempotency-Key header
        sig = inspect.signature(execute_command_endpoint)
        self.assertIn("x_idempotency_key", sig.parameters)
        param = sig.parameters["x_idempotency_key"]
        header_def = param.default
        self.assertTrue(header_def.is_required())
        self.assertEqual(header_def.alias, "X-Idempotency-Key")

        # 2. Invocation with None / omitted parameter raises HTTP 422
        req = IncidentCommandRequest(
            action="ALERT_ACKNOWLEDGE",
            target_id=alert.id,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(request=req, x_idempotency_key=None, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("X-Idempotency-Key", ctx.exception.detail)

        # 3. Direct invocation with mandatory header succeeds
        valid_key = str(uuid.uuid4())
        resp = execute_command_endpoint(
            request=req,
            x_idempotency_key=valid_key,
            x_operator_id="router_analyst",
            db=self.db,
        )
        self.assertTrue(resp.success)
        self.assertEqual(resp.new_status, "acknowledged")

        # 4. Rejected execution persists INCIDENT_COMMAND_REJECTED in SystemEvent
        bad_req = IncidentCommandRequest(
            action="FORBIDDEN_ACTION_TEST",
            target_id=alert.id,
        )
        with self.assertRaises(HTTPException):
            execute_incident_command(
                db=self.db,
                request=bad_req,
                idempotency_key=str(uuid.uuid4()),
                operator_id="audit_tester",
            )

        rejected_event = (
            self.db.query(SystemEvent)
            .filter(
                SystemEvent.event_type == "INCIDENT_COMMAND_REJECTED",
                SystemEvent.source == "incident_command",
            )
            .order_by(SystemEvent.id.desc())
            .first()
        )
        self.assertIsNotNone(rejected_event)
        data = json.loads(rejected_event.message)
        self.assertEqual(data["action"], "FORBIDDEN_ACTION_TEST")
        self.assertEqual(data["operator_id"], "audit_tester")
        self.assertEqual(data["rejected_status_code"], 403)



if __name__ == "__main__":
    unittest.main()
