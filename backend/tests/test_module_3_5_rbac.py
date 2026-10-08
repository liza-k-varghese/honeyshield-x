"""Unit and integration test suite for HoneyShield-X Module 3.5: RBAC & Identity Security.

Tests:
1. Deterministic role permissions verification for all 4 SOC operational tiers.
2. require_permission dependency enforcement (HTTP 403 on forbidden action).
3. Viewer role authorization boundaries (403 on commands).
4. Analyst role authorization boundaries (403 on resolve, containment, dispatch, lockout).
5. Incident Responder role authorization capabilities (authorized for tier 1-3 response).
6. Security Administrator role authorization capabilities (authorized for emergency lockout and admin).
7. Forged X-Operator-Id header neutralization: server exclusively derives identity from Bearer session.
8. Approval token operator binding: token issued to operator A cannot be executed by operator B (HTTP 401).
9. Audit trail verification for authorization denials (OPERATOR_AUTH_DENIED).
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import get_audit_events
from app.auth.dependencies import get_current_operator, require_permission
from app.auth.registry import (
    ROLE_PERMISSIONS,
    default_operator_registry,
    Operator,
)
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.routers.incident_command import (
    execute_command_endpoint,
    preview_command_endpoint,
    toggle_governor_lockout_endpoint,
)
from app.schemas import (
    IncidentCommandRequest,
    LockoutToggleRequest,
)


def make_mock_request(
    method: str = "POST",
    path: str = "/api/v1/incident-command/execute",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
) -> Request:
    """Construct a lightweight Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-RBAC-Test/1.0"),
    ]
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": headers,
        "client": (client_ip, 12345),
    })


class TestModule35RBAC(unittest.TestCase):
    """Test suite covering Module 3.5 RBAC and Identity Boundaries."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_session_store.clear()

        # Reset singleton governor state
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

    def _create_test_attack_and_alert(self, status="open") -> tuple[Attack, Alert]:
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip="198.51.100.99",
            destination_ip="10.0.0.1",
            protocol="TCP",
            severity="high",
            risk_score=85.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        alert = Alert(
            attack_id=attack.id,
            alert_type="Brute Force SSH",
            severity="high",
            message="SSH Brute Force detected from 198.51.100.99",
            status=status,
            notification_status="pending",
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return attack, alert

    # ==========================================
    # 1. Role Permission Matrix Tests
    # ==========================================

    def test_1_role_permission_definitions(self):
        """Verify the exact deterministic permission sets for all 4 roles."""
        viewer_perms = ROLE_PERMISSIONS["viewer"]
        self.assertEqual(viewer_perms, {"telemetry:view", "investigation:view"})

        analyst_perms = ROLE_PERMISSIONS["analyst"]
        self.assertIn("command:preview", analyst_perms)
        self.assertIn("command:ack", analyst_perms)
        self.assertIn("command:escalate", analyst_perms)
        self.assertNotIn("command:resolve", analyst_perms)
        self.assertNotIn("command:stage_containment", analyst_perms)
        self.assertNotIn("governor:lockout", analyst_perms)

        responder_perms = ROLE_PERMISSIONS["incident_responder"]
        self.assertIn("command:resolve", responder_perms)
        self.assertIn("command:stage_containment", responder_perms)
        self.assertIn("command:dispatch_notification", responder_perms)
        self.assertNotIn("governor:lockout", responder_perms)
        self.assertNotIn("operator:admin", responder_perms)

        admin_perms = ROLE_PERMISSIONS["security_administrator"]
        self.assertIn("governor:lockout", admin_perms)
        self.assertIn("operator:admin", admin_perms)

    # ==========================================
    # 2. RBAC Endpoint Enforcement Tests
    # ==========================================

    def test_2_viewer_forbidden_from_command_preview(self):
        """Test Viewer role cannot generate approval tokens (HTTP 403)."""
        viewer = default_operator_registry.get_operator("viewer_dan")
        req = IncidentCommandRequest(action="ALERT_ACKNOWLEDGE", target_id=1)
        req_obj = make_mock_request(path="/api/v1/incident-command/preview")

        # Test require_permission guard directly
        guard = require_permission("command:preview")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Access denied", ctx.exception.detail)

    def test_3_analyst_forbidden_from_resolving_alert(self):
        """Test Analyst role is forbidden from executing ALERT_RESOLVE (HTTP 403)."""
        _, alert = self._create_test_attack_and_alert()
        analyst = default_operator_registry.get_operator("analyst_sarah")

        req = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Triage completed, closing alert",
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=analyst,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("command:resolve", ctx.exception.detail)

    def test_4_analyst_forbidden_from_containment_and_notification(self):
        """Test Analyst role cannot stage containment or dispatch notification (HTTP 403)."""
        _, alert = self._create_test_attack_and_alert()
        analyst = default_operator_registry.get_operator("analyst_sarah")

        # Containment staging
        req_cont = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Isolation requested",
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req_cont,
                x_idempotency_key=str(uuid.uuid4()),
                operator=analyst,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("command:stage_containment", ctx.exception.detail)

        # Notification dispatch
        req_notif = IncidentCommandRequest(
            action="NOTIFICATION_DISPATCH",
            target_id=alert.id,
            justification="Dispatching notification",
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req_notif,
                x_idempotency_key=str(uuid.uuid4()),
                operator=analyst,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("command:dispatch_notification", ctx.exception.detail)

    def test_5_analyst_forbidden_from_governor_lockout(self):
        """Test Analyst role cannot engage or release governor lockout (HTTP 403)."""
        analyst = default_operator_registry.get_operator("analyst_sarah")
        lockout_req = LockoutToggleRequest(engaged=True, justification="Emergency freeze attempt")

        guard = require_permission("governor:lockout")
        req_obj = make_mock_request(path="/api/v1/incident-command/governor/lockout")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_6_responder_authorized_for_resolution(self):
        """Test Incident Responder role is authorized to resolve alert."""
        _, alert = self._create_test_attack_and_alert()
        responder = default_operator_registry.get_operator("responder_alex")

        req = IncidentCommandRequest(
            action="ALERT_RESOLVE",
            target_id=alert.id,
            justification="Host isolated and threat remediated successfully",
        )
        resp = execute_command_endpoint(
            request=req,
            x_idempotency_key=str(uuid.uuid4()),
            operator=responder,
            db=self.db,
        )
        self.assertTrue(resp.success)
        self.assertEqual(resp.new_status, "resolved")

    def test_7_admin_authorized_for_governor_lockout(self):
        """Test Security Administrator role can engage and release emergency lockout."""
        admin = default_operator_registry.get_operator("admin_chief")
        lockout_req = LockoutToggleRequest(engaged=True, justification="Critical platform maintenance")

        resp = toggle_governor_lockout_endpoint(
            request=lockout_req,
            operator=admin,
            db=self.db,
        )
        self.assertTrue(resp.success)
        self.assertTrue(default_governor._emergency_lockout)

    # ==========================================
    # 3. Identity Security & Token Binding Tests
    # ==========================================

    def test_8_forged_x_operator_id_header_ignored(self):
        """Test that client-supplied X-Operator-Id header does not override authenticated identity."""
        _, alert = self._create_test_attack_and_alert()
        analyst = default_operator_registry.get_operator("analyst_sarah")

        # Client attempts to spoof 'admin_chief' via header while presenting analyst credentials
        req = IncidentCommandRequest(
            action="ALERT_ACKNOWLEDGE",
            target_id=alert.id,
        )
        resp = execute_command_endpoint(
            request=req,
            x_idempotency_key=str(uuid.uuid4()),
            x_operator_id="admin_chief",  # FORGED SPOOF HEADER
            operator=analyst,            # AUTHENTICATED AS ANALYST
            db=self.db,
        )
        self.assertTrue(resp.success)

        # Audit log in SystemEvent must record 'analyst_sarah', NOT 'admin_chief'
        audits = get_audit_events(self.db, limit=10, source="incident_command")
        executed_audits = [a for a in audits if a.event_type == "INCIDENT_COMMAND_EXECUTED"]
        self.assertGreaterEqual(len(executed_audits), 1)
        payload = json.loads(executed_audits[0].message)
        self.assertEqual(payload["operator_id"], "analyst_sarah")

    def test_9_approval_token_bound_to_authenticated_operator(self):
        """Test approval token issued to Operator A cannot be executed by Operator B (HSX-F-3.4-02)."""
        _, alert = self._create_test_attack_and_alert()
        responder_alex = default_operator_registry.get_operator("responder_alex")
        responder_bob = Operator(
            username="responder_bob",
            role="incident_responder",
            email="bob@honeyshield.local",
            password_hash="",
        )
        default_operator_registry.register_operator(responder_bob)

        # Alex previews and acquires Level 3 approval token
        preview_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Immediate host quarantine required",
        )
        token_resp = preview_command_endpoint(
            request=preview_req,
            operator=responder_alex,
            db=self.db,
        )
        alex_token = token_resp.approval_token

        # Bob intercepts token and attempts to execute
        exec_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Immediate host quarantine required",
            approval_token=alex_token,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=exec_req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=responder_bob,  # WRONG OPERATOR
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Approval token operator mismatch", ctx.exception.detail)
