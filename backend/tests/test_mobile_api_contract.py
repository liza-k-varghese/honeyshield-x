"""Automated Mobile API Contract & Integration Test Suite for HoneyShield X.

Validates end-to-end contracts between the dedicated Android application
and the HoneyShield X FastAPI backend across all functional subsystems:
1. Authentication, RBAC, Biometrics & Break-Glass Protocol
2. System 1: SOC Dashboard & Telemetry
3. System 2: Attack Lab & Active Deception Grid
4. System 3: Threat Intelligence, Campaigns & Adversary Hunts
5. Incident Command & Playbook Task Progression
6. Supervised Host Service Controller (Zero Shell Access)
7. Mobile Device Registration & Notification Preferences
8. Operator Audit Trail Ledger
"""

import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException
from pydantic import ValidationError

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.routers.auth import login_endpoint, break_glass_endpoint
from app.routers.dashboard import get_dashboard_stats
from app.routers.attacks import get_attacks
from app.routers.alerts import list_alerts_endpoint
from app.routers.deception import list_canaries, mint_canary, list_all_hits
from app.routers.threat_intelligence import list_indicators_endpoint, lookup_indicator_endpoint
from app.routers.campaigns import list_campaigns
from app.routers.hunts import list_hunts
from app.routers.cases import list_cases
from app.routers.services import get_services_status, control_service, ServiceControlRequest, ManagedServiceName, ServiceActionType
from app.routers.mobile import register_device, unregister_device, get_preferences, DeviceRegistrationRequest
from app.routers.audit import get_audit_events_endpoint
from app.schemas import (
    BreakGlassRequest,
    CanaryCreateRequest,
    LoginRequest,
)


class TestMobileApiContract(unittest.TestCase):
    """Rigorous contract test suite for HoneyShield X Mobile API integration."""

    @classmethod
    def setUpClass(cls):
        cls.admin_op = Operator(
            username="admin_chief",
            role="security_administrator",
            email="admin.chief@honeyshield.local",
            password_hash="dummy",
        )
        cls.responder_op = Operator(
            username="responder_alex",
            role="incident_responder",
            email="responder.alex@honeyshield.local",
            password_hash="dummy",
        )
        cls.analyst_op = Operator(
            username="analyst_sarah",
            role="analyst",
            email="analyst.sarah@honeyshield.local",
            password_hash="dummy",
        )
        cls.viewer_op = Operator(
            username="viewer_dan",
            role="viewer",
            email="viewer.dan@honeyshield.local",
            password_hash="dummy",
        )
        
        # Configure robust mock db for SQLAlchemy queries
        cls.mock_db = MagicMock()
        cls.mock_db.scalars.return_value.all.return_value = []
        cls.mock_db.scalar.return_value = 0
        cls.mock_db.execute.return_value.all.return_value = []

        cls.mock_request = MagicMock()
        cls.mock_request.client.host = "10.0.2.2"
        cls.mock_request.headers = {"user-agent": "HoneyShieldX-Android/1.0"}

    # =========================================================================
    # 1. Authentication & Security Contracts
    # =========================================================================

    def test_01_operator_login_contract(self):
        """Test operator login contract with PBKDF2 verification."""
        req = LoginRequest(username="admin_chief", password="AdminPass123!")
        res = login_endpoint(credentials=req, request=self.mock_request, db=self.mock_db)

        self.assertIsNotNone(res.token)
        self.assertEqual(res.token_type.lower(), "bearer")
        self.assertEqual(res.operator.username, "admin_chief")
        self.assertEqual(res.operator.role, "security_administrator")
        self.assertIn("command:stage_containment", res.operator.permissions)

    def test_02_operator_login_invalid_password(self):
        """Test that invalid password raises 401 Unauthorized."""
        req = LoginRequest(username="admin_chief", password="WrongPassword999!")
        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=req, request=self.mock_request, db=self.mock_db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_03_break_glass_protocol_validation(self):
        """Test that break-glass requires sufficient justification."""
        # Short justification must fail validation
        with self.assertRaises(ValidationError):
            BreakGlassRequest(
                username="admin_chief",
                passphrase="AdminPass123!",
                justification="Too short",
            )

        # Valid justification passes contract
        valid_req = BreakGlassRequest(
            username="admin_chief",
            passphrase="HoneyShield-SOC-Emergency-BreakGlass-2026!",
            justification="Emergency Level-3 incident response containment override",
        )
        res = break_glass_endpoint(payload=valid_req, request=self.mock_request, db=self.mock_db)
        self.assertIsNotNone(res.token)
        self.assertEqual(res.token_type.lower(), "bearer")
        self.assertEqual(res.expires_in, 1800)
        self.assertIn("EMERGENCY BREAK-GLASS ACTIVE", res.warning)

    # =========================================================================
    # 2. System 1: SOC Dashboard & Telemetry Contracts
    # =========================================================================

    def test_04_soc_dashboard_stats_contract(self):
        """Test dashboard stats schema compliance."""
        stats = get_dashboard_stats(db=self.mock_db)
        self.assertIsInstance(stats.total_attacks, int)
        self.assertIsInstance(stats.active_alerts, int)
        self.assertIsNotNone(stats.active_alerts_by_severity)
        self.assertIsInstance(stats.active_alerts_by_severity.critical, int)
        self.assertIsNotNone(stats.system_health)
        self.assertIn(stats.system_health.api, ["healthy", "degraded"])

    def test_05_attacks_and_alerts_listing_contract(self):
        """Test attack and alert listing contracts."""
        attacks = get_attacks(skip=0, limit=10, db=self.mock_db)
        self.assertIsInstance(attacks, list)

        alerts = list_alerts_endpoint(status_filter=None, limit=10, db=self.mock_db)
        self.assertIsInstance(alerts, list)

    # =========================================================================
    # 3. System 2: Active Deception Grid Contracts
    # =========================================================================

    def test_06_deception_canary_contracts(self):
        """Test canary listing, minting, and hit retrieval contracts."""
        # 1. Listing canaries
        canaries_res = list_canaries(operator=self.analyst_op)
        self.assertIsNotNone(canaries_res.canaries)
        self.assertIsInstance(canaries_res.total, int)

        # 2. Minting canary token
        mint_req = CanaryCreateRequest(
            name="TEST_MOBILE_AWS_TRIPWIRE",
            canary_type="AWS_API_KEY",
            environment="production",
            placement_hint="Seeded in mobile contract test suite",
        )
        mint_res = mint_canary(payload=mint_req, operator=self.analyst_op, db=self.mock_db)
        self.assertIsNotNone(mint_res.canary_id)
        self.assertEqual(mint_res.canary_type, "AWS_API_KEY")
        self.assertEqual(mint_res.status, "active")

        # 3. Listing deception hits
        hits_res = list_all_hits(limit=10, operator=self.analyst_op)
        self.assertIsNotNone(hits_res.hits)
        self.assertIsInstance(hits_res.total, int)

    def test_07_deception_rbac_enforcement(self):
        """Test that viewer cannot mint canary honeytokens."""
        perm_dep = require_permission("deception:create")
        with self.assertRaises(HTTPException) as ctx:
            perm_dep(request=self.mock_request, operator=self.viewer_op, db=self.mock_db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertFalse(self.viewer_op.has_permission("deception:create"))
        self.assertTrue(self.analyst_op.has_permission("deception:create"))

    # =========================================================================
    # 4. System 3: Threat Intelligence & Hunts Contracts
    # =========================================================================

    def test_08_threat_intelligence_contracts(self):
        """Test threat indicators and adversary campaign retrieval."""
        indicators_res = list_indicators_endpoint(
            status=None,
            indicator_type=None,
            campaign=None,
            min_confidence=None,
            search=None,
            skip=0,
            limit=10,
            operator=self.analyst_op,
            db=self.mock_db,
        )
        self.assertIsNotNone(indicators_res.indicators)
        self.assertIsInstance(indicators_res.total, int)

        campaigns_res = list_campaigns(operator=self.analyst_op)
        self.assertIsNotNone(campaigns_res.campaigns)
        self.assertIsInstance(campaigns_res.total, int)

    def test_09_threat_hunting_contract(self):
        """Test hypothesis-driven hunt listing."""
        hunts_res = list_hunts(operator=self.analyst_op, limit=10, offset=0)
        self.assertIsNotNone(hunts_res.hunts)
        self.assertIsInstance(hunts_res.total, int)

    # =========================================================================
    # 5. Incident Cases & Playbook Tasks Contracts
    # =========================================================================

    def test_10_incident_cases_contract(self):
        """Test case management and playbook task contracts."""
        cases_res = list_cases(operator=self.responder_op, limit=10, offset=0)
        self.assertIsNotNone(cases_res.cases)
        self.assertIsInstance(cases_res.total, int)

    # =========================================================================
    # 6. Supervised Host Service Controller (Zero Shell Policy)
    # =========================================================================

    def test_11_host_services_status_contract(self):
        """Test retrieval of managed platform daemons."""
        services = get_services_status(operator=self.admin_op)
        self.assertEqual(len(services), 5)
        names = [s.name.value for s in services]
        self.assertIn("postgresql", names)
        self.assertIn("redis", names)
        self.assertIn("honeyshield-backend", names)
        self.assertIn("honeyshield-frontend", names)
        self.assertIn("suricata", names)

    def test_12_host_service_restart_with_governor_audit(self):
        """Test service restart with mandatory justification and audit logging."""
        req = ServiceControlRequest(
            service=ManagedServiceName.REDIS,
            action=ServiceActionType.RESTART,
            justification="Periodic cache memory threshold maintenance",
        )
        res = control_service(
            payload=req,
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "executed")
        self.assertIn("AUD_SVC_", res["audit_id"])

    def test_13_host_service_insufficient_justification_rejected(self):
        """Test that justification under 10 chars is rejected."""
        with self.assertRaises(ValidationError):
            ServiceControlRequest(
                service=ManagedServiceName.REDIS,
                action=ServiceActionType.RESTART,
                justification="Short",
            )

    def test_14_host_service_unauthorized_role_rejected(self):
        """Test that viewer cannot control host services."""
        req = ServiceControlRequest(
            service=ManagedServiceName.POSTGRESQL,
            action=ServiceActionType.RESTART,
            justification="Unauthorized attempt to reboot database cluster",
        )
        with self.assertRaises(HTTPException) as ctx:
            control_service(
                payload=req,
                request=self.mock_request,
                operator=self.viewer_op,
                db=self.mock_db,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    # =========================================================================
    # 7. Mobile Device Registration & Preferences
    # =========================================================================

    def test_15_mobile_device_registration_contract(self):
        """Test mobile push token registration and unregistration."""
        dev_req = DeviceRegistrationRequest(
            push_token="ExponentPushToken[TestMobileDeviceToken777]",
            platform="android",
            metadata={"device": "Pixel 8 Pro", "android": 14},
        )
        reg_res = register_device(payload=dev_req, operator=self.admin_op)
        self.assertTrue(reg_res["registered"])
        self.assertEqual(reg_res["operator"], "admin_chief")

        # Preferences retrieval
        prefs = get_preferences(operator=self.admin_op)
        self.assertEqual(prefs.min_alert_severity, "HIGH")
        self.assertTrue(prefs.enable_canary_push)

        # Unregister
        unreg_res = unregister_device(payload=dev_req, operator=self.admin_op)
        self.assertTrue(unreg_res["unregistered"])

    # =========================================================================
    # 8. Operator Audit Ledger Contracts
    # =========================================================================

    def test_16_audit_events_contract(self):
        """Test audit trail query schema compliance."""
        # Mock get_audit_events return
        self.mock_db.scalars.return_value.all.return_value = []
        audit_res = get_audit_events_endpoint(limit=10, db=self.mock_db)
        self.assertIsNotNone(audit_res.events)
        self.assertIsInstance(audit_res.total_events, int)


if __name__ == "__main__":
    unittest.main()
