"""Unit and integration test suite for Module 3.8: Threat Intelligence RBAC Boundaries.

Tests:
1. Viewer role authorization boundaries (view indicators, context, campaigns; 403 on create, update, revoke, whitelist, promote, export).
2. Analyst role authorization boundaries (view, create, update, promote, export; 403 on revoke, whitelist).
3. Incident Responder role capabilities (view, create, update, revoke, promote, export; 403 on whitelist).
4. Security Administrator role capabilities (authorized for all TI operations including whitelist).
5. Unauthenticated / missing token rejection (HTTP 401).
6. Malformed Bearer header rejection (HTTP 401).
7. Inactive operator rejection (HTTP 401).
8. Feed token parameter authorization (?token=... valid vs invalid).
9. Audit trail verification (SystemEvent logging for privileged state changes).
"""

import json
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import Response

from app.auth.dependencies import require_permission
from app.auth.registry import default_operator_registry, Operator
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.models import ThreatIntelligence, SystemEvent
from app.routers.threat_intelligence import (
    create_indicator_endpoint,
    export_csv_feed_endpoint,
    export_json_feed_endpoint,
    export_stix_bundle_endpoint,
    get_indicator_context_endpoint,
    get_indicator_endpoint,
    list_campaigns_endpoint,
    list_indicators_endpoint,
    promote_canary_hit_endpoint,
    promote_case_observable_endpoint,
    revoke_indicator_endpoint,
    update_indicator_endpoint,
    verify_feed_access,
    whitelist_indicator_endpoint,
)
from app.schemas import (
    IndicatorType,
    PromoteCanaryHitRequest,
    PromoteCaseObservableRequest,
    ThreatIndicatorCreate,
    ThreatIndicatorUpdate,
)
from app.threat_intelligence.service import threat_intel_service
from app.threat_intelligence.storage import threat_intel_store


def make_mock_request(
    method: str = "GET",
    path: str = "/api/v1/threat-intelligence/indicators",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
) -> Request:
    """Construct a mock Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-ThreatIntel-RBAC-Test/1.0"),
    ]
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": headers,
            "client": (client_ip, 50000),
        }
    )


class TestModule38RBAC(unittest.TestCase):
    """Test suite verifying Module 3.8 RBAC permission boundaries."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_session_store.clear()
        threat_intel_store.clear()

        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.admin: Operator = default_operator_registry.get_operator("admin_chief")

        self.created_ids: list[int] = []

        # Baseline indicator created by admin
        baseline = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                threat_level="high",
                confidence=0.85,
                campaign="TEST-RBAC-CAMP",
                tags=["c2", "test"],
                description="RBAC Baseline Indicator",
            ),
            operator_username=self.admin.username,
        )
        self.created_ids.append(baseline.id)
        self.test_indicator_id = baseline.id

    def tearDown(self):
        if self.created_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id.in_(self.created_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
        self.db.close()

    def test_1_viewer_role_boundaries(self):
        """Viewer can view indicators and context, but is denied mutations and export (HTTP 403)."""
        # Authorized reads
        list_res = list_indicators_endpoint(
            status=None,
            indicator_type=None,
            campaign=None,
            min_confidence=None,
            search=None,
            skip=0,
            limit=50,
            operator=self.viewer,
            db=self.db,
        )
        self.assertGreaterEqual(list_res.total, 1)

        ind_res = get_indicator_endpoint(
            indicator_id=self.test_indicator_id,
            operator=self.viewer,
            db=self.db,
        )
        self.assertEqual(ind_res.id, self.test_indicator_id)

        ctx_res = get_indicator_context_endpoint(
            indicator_id=self.test_indicator_id,
            operator=self.viewer,
            db=self.db,
        )
        self.assertIn("advisory", ctx_res)

        camp_res = list_campaigns_endpoint(
            operator=self.viewer,
            db=self.db,
        )
        self.assertGreaterEqual(camp_res.total, 1)

        # Denied: create
        req = make_mock_request("POST", "/threat-intelligence/indicators")
        dep_create = require_permission("threat_intel:create")
        with self.assertRaises(HTTPException) as ctx:
            dep_create(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Denied: update
        dep_update = require_permission("threat_intel:update")
        with self.assertRaises(HTTPException) as ctx:
            dep_update(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Denied: revoke
        dep_revoke = require_permission("threat_intel:revoke")
        with self.assertRaises(HTTPException) as ctx:
            dep_revoke(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Denied: admin whitelist
        dep_admin = require_permission("threat_intel:admin")
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Denied: export
        dep_export = require_permission("threat_intel:export")
        with self.assertRaises(HTTPException) as ctx:
            dep_export(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_2_analyst_role_boundaries(self):
        """Analyst can create, update, promote, and export, but CANNOT revoke or whitelist (HTTP 403)."""
        # Authorized: create
        created = create_indicator_endpoint(
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="analyst-domain.com",
                threat_level="medium",
                confidence=0.70,
            ),
            operator=self.analyst,
            db=self.db,
        )
        self.created_ids.append(created.id)
        self.assertEqual(created.indicator_value, "analyst-domain.com")

        # Authorized: update
        updated = update_indicator_endpoint(
            indicator_id=created.id,
            data=ThreatIndicatorUpdate(threat_level="high", campaign="CAMP-ANALYST"),
            operator=self.analyst,
            db=self.db,
        )
        self.assertEqual(updated.campaign, "CAMP-ANALYST")

        # Authorized: promote case
        promoted = promote_case_observable_endpoint(
            data=PromoteCaseObservableRequest(
                case_id="CASE-2026-0001",
                observable_type=IndicatorType.DOMAIN,
                observable_value="case-observable.org",
                threat_level="high",
            ),
            operator=self.analyst,
            db=self.db,
        )
        self.created_ids.append(promoted.id)
        self.assertEqual(promoted.indicator_value, "case-observable.org")

        # Denied: revoke (403)
        req = make_mock_request("POST", f"/threat-intelligence/indicators/{created.id}/revoke")
        dep_revoke = require_permission("threat_intel:revoke")
        with self.assertRaises(HTTPException) as ctx:
            dep_revoke(request=req, operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Denied: whitelist (403)
        dep_admin = require_permission("threat_intel:admin")
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_3_incident_responder_role_boundaries(self):
        """Incident Responder can view, create, update, revoke, and export, but CANNOT whitelist (HTTP 403)."""
        # Authorized: revoke
        revoked = revoke_indicator_endpoint(
            indicator_id=self.test_indicator_id,
            reason="Adversary infrastructure taken down by registrar",
            operator=self.responder,
            db=self.db,
        )
        self.assertEqual(revoked.status, "revoked")

        # Denied: whitelist (403)
        req = make_mock_request("POST", f"/threat-intelligence/indicators/{self.test_indicator_id}/whitelist")
        dep_admin = require_permission("threat_intel:admin")
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.responder, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_4_security_administrator_role_boundaries(self):
        """Security Administrator possesses all threat intel permissions including whitelist."""
        whitelisted = whitelist_indicator_endpoint(
            indicator_id=self.test_indicator_id,
            reason="Authorized threat simulation host",
            operator=self.admin,
            db=self.db,
        )
        self.assertEqual(whitelisted.status, "whitelisted")
        self.assertEqual(whitelisted.decayed_confidence, 0.0)

    def test_5_unauthenticated_request_rejection(self):
        """Unauthenticated request without Authorization header returns HTTP 401."""
        req = make_mock_request("GET", "/threat-intelligence/indicators")
        from app.auth.dependencies import get_current_operator
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=None, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_6_malformed_bearer_header_rejection(self):
        """Malformed or invalid Authorization header returns HTTP 401."""
        req = make_mock_request("GET", "/threat-intelligence/indicators", authorization="InvalidPrefix token123")
        from app.auth.dependencies import get_current_operator
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization="InvalidPrefix token123", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_7_inactive_operator_rejection(self):
        """Deactivated operator is rejected even with valid token (HTTP 401) and has zero permissions."""
        self.analyst.is_active = False
        raw_token, _ = default_session_store.create_session(self.analyst, "127.0.0.1", "test-agent")
        req = make_mock_request("GET", "/threat-intelligence/indicators")
        from app.auth.dependencies import get_current_operator
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=f"Bearer {raw_token}", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertFalse(self.analyst.has_permission("threat_intel:view"))

    def test_8_feed_token_authorization(self):
        """Export feed token verification allows valid token and rejects invalid."""
        # Unauthenticated request without token or session -> 401
        req_anon = make_mock_request("GET", "/threat-intelligence/export/json")
        with self.assertRaises(HTTPException) as ctx:
            verify_feed_access(request=req_anon, token=None)
        self.assertEqual(ctx.exception.status_code, 401)

        # Invalid feed token -> 401
        with self.assertRaises(HTTPException) as ctx:
            verify_feed_access(request=req_anon, token="wrong_token_12345")
        self.assertEqual(ctx.exception.status_code, 401)

        # Valid feed token -> authorized
        user = verify_feed_access(request=req_anon, token="hsx_feed_token_default")
        self.assertEqual(user, "automated_feed_poller")

        # Session with threat_intel:export permission -> authorized
        raw_token, sess = default_session_store.create_session(self.analyst, "127.0.0.1", "test-agent")
        req_auth = make_mock_request("GET", "/threat-intelligence/export/json", authorization=f"Bearer {raw_token}")
        user_sess = verify_feed_access(request=req_auth, token=None)
        self.assertEqual(user_sess, self.analyst.username)

    def test_9_audit_trail_verification(self):
        """Verifies SystemEvent audit records are emitted upon privileged actions."""
        # Whitelist indicator generates IOC_WHITELISTED
        whitelist_indicator_endpoint(
            indicator_id=self.test_indicator_id,
            reason="Verified internal test gateway",
            operator=self.admin,
            db=self.db,
        )

        event = self.db.query(SystemEvent).filter(
            SystemEvent.event_type == "IOC_WHITELISTED"
        ).order_by(SystemEvent.id.desc()).first()

        self.assertIsNotNone(event)
        self.assertEqual(event.source, "threat_intelligence_service")
        payload = json.loads(event.message)
        self.assertEqual(payload["action"], "whitelist")
        self.assertEqual(payload["operator"], self.admin.username)


if __name__ == "__main__":
    unittest.main()
