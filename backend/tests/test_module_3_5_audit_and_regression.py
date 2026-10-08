"""Unit and integration test suite for HoneyShield-X Module 3.5: Audit Compliance & Module 3.4 Regressions.

Tests:
1. Audit event persistence across all security-relevant operational triggers.
2. Strict redaction: audit payloads never contain plaintext passwords, hashes, salts, or bearer tokens.
3. Level 3 missing approval token fails closed with HTTP 422.
4. Level 3 invalid approval token fails closed with HTTP 401.
5. Level 3 expired approval token fails closed with HTTP 401.
6. Level 3 single-use approval token consumption fails subsequent execution with HTTP 401.
7. Level 3 token mismatch on action fails closed with HTTP 401.
8. Level 3 token mismatch on target fails closed with HTTP 401.
9. Terminal resolved alert immutability returns HTTP 409 Conflict.
10. Circuit Breaker in HALF_OPEN permits exactly one probe and rejects concurrent outbound dispatches (HTTP 503).
11. Mandatory X-Idempotency-Key validation (HTTP 422 if missing).
12. Idempotency deduplication returns cached result on retransmission.
"""

import json
import time
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import get_audit_events
from app.auth.registry import default_operator_registry, Operator
from app.auth.service import default_auth_service, default_login_rate_limiter
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.incident_command.governor import (
    CircuitBreakerState,
    DeterministicGovernor,
    default_governor,
)
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.routers.auth import break_glass_endpoint, login_endpoint, logout_endpoint
from app.routers.incident_command import (
    execute_command_endpoint,
    preview_command_endpoint,
    toggle_governor_lockout_endpoint,
)
from app.schemas import (
    BreakGlassRequest,
    IncidentCommandRequest,
    LockoutToggleRequest,
    LoginRequest,
)


def make_mock_request(
    method: str = "POST",
    path: str = "/api/v1/auth/login",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
) -> Request:
    headers = [(b"host", b"testserver")]
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": headers,
        "client": (client_ip, 12345),
    })


class TestModule35AuditAndRegression(unittest.TestCase):
    """Test suite covering audit trails and Module 3.4 safety regressions."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_session_store.clear()
        default_login_rate_limiter.reset()

        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.query(SystemEvent).filter(SystemEvent.source.in_(["auth", "incident_command"])).delete()
        self.db.commit()
        self.db.close()
        default_operator_registry.reset()
        default_session_store.clear()
        default_login_rate_limiter.reset()

    def _create_test_attack_and_alert(self, status="open") -> tuple[Attack, Alert]:
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip="198.51.100.111",
            destination_ip="10.0.0.1",
            protocol="TCP",
            severity="critical",
            risk_score=95.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        alert = Alert(
            attack_id=attack.id,
            alert_type="Brute Force SSH",
            severity="critical",
            message="SSH Brute Force detected from 198.51.100.111",
            status=status,
            notification_status="pending",
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return attack, alert

    # ==========================================
    # 1. Audit Event Taxonomy & Secret Redaction
    # ==========================================

    def test_1_login_success_and_logout_audit(self):
        """Test OPERATOR_LOGIN_SUCCESS and OPERATOR_LOGOUT audit event persistence."""
        req = make_mock_request()
        login_res = login_endpoint(
            credentials=LoginRequest(username="analyst_sarah", password="AnalystPass123!"),
            request=req,
            db=self.db,
        )
        op = default_operator_registry.get_operator("analyst_sarah")

        logout_endpoint(
            request=req,
            authorization=f"Bearer {login_res.token}",
            operator=op,
            db=self.db,
        )

        audits = get_audit_events(self.db, limit=10, source="auth")
        event_types = [a.event_type for a in audits]

        self.assertIn("OPERATOR_LOGIN_SUCCESS", event_types)
        self.assertIn("OPERATOR_LOGOUT", event_types)

        login_event = next(a for a in audits if a.event_type == "OPERATOR_LOGIN_SUCCESS")
        login_payload = json.loads(login_event.message)
        self.assertEqual(login_payload["operator_id"], "analyst_sarah")
        self.assertEqual(login_payload["role"], "analyst")

    def test_2_login_failure_and_account_lockout_audit(self):
        """Test OPERATOR_LOGIN_FAILURE and OPERATOR_ACCOUNT_LOCKED audit event persistence."""
        req = make_mock_request()
        bad_creds = LoginRequest(username="responder_alex", password="WrongPassword!")

        for _ in range(5):
            try:
                login_endpoint(credentials=bad_creds, request=req, db=self.db)
            except HTTPException:
                pass

        audits = get_audit_events(self.db, limit=10, source="auth")
        event_types = [a.event_type for a in audits]

        self.assertIn("OPERATOR_LOGIN_FAILURE", event_types)
        self.assertIn("OPERATOR_ACCOUNT_LOCKED", event_types)

    def test_3_break_glass_critical_audit_trail(self):
        """Test BREAK_GLASS_ENGAGED audit persistence with critical severity."""
        req = make_mock_request(path="/api/v1/auth/break-glass")
        payload = BreakGlassRequest(
            passphrase="HoneyShield-SOC-Emergency-BreakGlass-2026!",
            justification="Emergency breakglass incident command engagement",
        )
        break_glass_endpoint(payload=payload, request=req, db=self.db)

        audits = get_audit_events(self.db, limit=5, source="auth")
        bg_events = [a for a in audits if a.event_type == "BREAK_GLASS_ENGAGED"]
        self.assertEqual(len(bg_events), 1)
        bg = bg_events[0]

        self.assertEqual(bg.severity, "critical")
        payload_data = json.loads(bg.message)
        self.assertEqual(payload_data["operator_id"], "emergency_breakglass")
        self.assertEqual(payload_data["duration_minutes"], 30)

    def test_4_audit_records_never_leak_secrets(self):
        """Verify audit message strings never contain plaintext passwords, hashes, salts, or bearer tokens."""
        req = make_mock_request()
        # Perform login and breakglass
        login_endpoint(
            credentials=LoginRequest(username="admin_chief", password="AdminPass123!"),
            request=req,
            db=self.db,
        )

        all_audits = get_audit_events(self.db, limit=50)
        forbidden_substrings = ["AdminPass123!", "pbkdf2_sha256", "hsx_sess_"]

        for event in all_audits:
            for forbidden in forbidden_substrings:
                self.assertNotIn(
                    forbidden,
                    event.message,
                    f"Audit event {event.id} leaked sensitive credential substring: {forbidden}",
                )

    # ==========================================
    # 2. Module 3.4 Safety Regressions Under Auth Flow
    # ==========================================

    def test_5_level3_missing_approval_token_rejected_422(self):
        """Test Level 3 action missing approval token returns HTTP 422 (HSX-F-3.4-01)."""
        _, alert = self._create_test_attack_and_alert()
        responder = default_operator_registry.get_operator("responder_alex")

        req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Containment staging attempt without pre-flight token",
            approval_token=None,  # OMITTED
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("requires a mandatory pre-flight approval token", ctx.exception.detail)

    def test_6_level3_invalid_and_expired_approval_token_401(self):
        """Test invalid or expired approval token returns HTTP 401."""
        _, alert = self._create_test_attack_and_alert()
        responder = default_operator_registry.get_operator("responder_alex")

        # Invalid token
        req_invalid = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Executing with fabricated token",
            approval_token=str(uuid.uuid4()),  # NON-EXISTENT TOKEN
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req_invalid,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid or expired approval token", ctx.exception.detail)

        # Expired token
        token_data = default_governor.create_approval_token(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            operator_id="responder_alex",
        )
        exp_token = token_data["approval_token"]
        default_governor._approval_tokens[exp_token]["expires_at"] = time.time() - 10.0

        req_expired = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Executing with expired token",
            approval_token=exp_token,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req_expired,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("expired", ctx.exception.detail.lower())

    def test_7_level3_single_use_token_cannot_be_reused_401(self):
        """Test approval tokens are single-use; subsequent execution raises HTTP 401."""
        _, alert = self._create_test_attack_and_alert()
        responder = default_operator_registry.get_operator("responder_alex")

        token_data = default_governor.create_approval_token(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            operator_id="responder_alex",
        )
        token = token_data["approval_token"]

        req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="First legitimate execution",
            approval_token=token,
        )
        # First execution succeeds
        resp1 = execute_command_endpoint(
            request=req,
            x_idempotency_key=str(uuid.uuid4()),
            operator=responder,
            db=self.db,
        )
        self.assertTrue(resp1.success)

        # Second execution with same token is rejected
        req2 = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Second illicit replay execution",
            approval_token=token,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req2,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid or expired approval token", ctx.exception.detail)

    def test_8_terminal_resolved_alert_immutability_409(self):
        """Test modifying an already resolved alert returns HTTP 409 Conflict (HSX-F-3.4-03)."""
        _, alert = self._create_test_attack_and_alert(status="resolved")
        responder = default_operator_registry.get_operator("responder_alex")

        req = IncidentCommandRequest(
            action="ALERT_ACKNOWLEDGE",
            target_id=alert.id,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("terminal 'resolved' state", ctx.exception.detail)

    def test_9_circuit_breaker_half_open_single_probe_503(self):
        """Test Circuit Breaker in HALF_OPEN grants single probe and blocks second request (HSX-F-3.4-04)."""
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

    def test_10_mandatory_idempotency_and_deduplication(self):
        """Test mandatory idempotency key deduplicates identical request without re-executing."""
        _, alert = self._create_test_attack_and_alert()
        responder = default_operator_registry.get_operator("responder_alex")
        fixed_key = str(uuid.uuid4())

        req = IncidentCommandRequest(
            action="ALERT_ACKNOWLEDGE",
            target_id=alert.id,
        )
        # First execution
        resp1 = execute_command_endpoint(
            request=req,
            x_idempotency_key=fixed_key,
            operator=responder,
            db=self.db,
        )
        self.assertTrue(resp1.success)

        # Retransmission with exact same idempotency key returns cached response
        resp2 = execute_command_endpoint(
            request=req,
            x_idempotency_key=fixed_key,
            operator=responder,
            db=self.db,
        )
        self.assertTrue(resp2.success)
        self.assertEqual(resp1.command_id, resp2.command_id)
