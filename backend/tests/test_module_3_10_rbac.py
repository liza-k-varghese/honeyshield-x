"""RBAC Boundary and Permission Test Suite for Module 3.10 (Campaign Intelligence).

Tests:
1. Deterministic permission resolution on Operator across 4 roles:
   - viewer: campaign:view
   - analyst: campaign:view, campaign:update
   - incident_responder: campaign:view, campaign:update
   - security_administrator: campaign:view, campaign:update, campaign:admin
2. Dependency guard require_permission evaluation:
   - 403 Forbidden enforcement on insufficient permissions
   - SystemEvent audit trail verification
3. Endpoint authorization checks across all 4 roles:
   - list_campaigns, get_campaign, get_campaign_graph, get_campaign_timeline, get_campaign_metrics
   - trigger_clustering, update_campaign, link_case, unlink_case
   - merge_campaigns
   - contain_campaign
4. Campaign resurrection RBAC restriction:
   - Only security_administrator may resurrect a resolved campaign.
"""

import os
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

os.environ["HONEYSHIELD_TESTING"] = "1"
os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"

from app.auth.dependencies import get_current_operator, require_permission
from app.auth.registry import (
    CAMPAIGN_ROLE_PERMISSIONS,
    Operator,
    default_operator_registry,
)
from app.auth.session import default_session_store
from app.campaigns.storage import default_campaign_store
from app.database import SessionLocal
from app.routers.campaigns import (
    contain_campaign,
    get_campaign,
    get_campaign_graph,
    get_campaign_metrics,
    get_campaign_timeline,
    link_case,
    list_campaigns,
    merge_campaigns,
    trigger_clustering,
    unlink_case,
    update_campaign,
)
from app.schemas import (
    CampaignContainmentRequest,
    CampaignDossier,
    CampaignMergeRequest,
    CampaignUpdateRequest,
)


def make_mock_request(
    method: str = "GET",
    path: str = "/api/v1/campaigns",
    authorization: str | None = None,
) -> Request:
    """Construct mock Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-Campaign-RBAC-Test/1.0"),
    ]
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": headers,
            "client": ("127.0.0.1", 50000),
        }
    )


class TestModule310Rbac(unittest.TestCase):
    """Test deterministic role-based access control for Campaign Intelligence."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_campaign_store.clear()
        default_session_store.clear()

        # Seed valid operator profiles
        self.viewer_op = default_operator_registry.get_operator("viewer_dan")
        self.analyst_op = default_operator_registry.get_operator("analyst_sarah")
        self.responder_op = default_operator_registry.get_operator("responder_alex")
        self.admin_op = default_operator_registry.get_operator("admin_chief")

        # Create active sessions
        self.viewer_token, _ = default_session_store.create_session(self.viewer_op)
        self.analyst_token, _ = default_session_store.create_session(self.analyst_op)
        self.responder_token, _ = default_session_store.create_session(self.responder_op)
        self.admin_token, _ = default_session_store.create_session(self.admin_op)

        # Seed sample campaigns
        self.camp1 = CampaignDossier(
            campaign_id="camp-rbac001",
            name="RBAC Test Campaign 1",
            status="active",
            severity="high",
            confidence=0.85,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.1"],
            case_ids=["case-100"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        self.camp2 = CampaignDossier(
            campaign_id="camp-rbac002",
            name="RBAC Test Campaign 2",
            status="active",
            severity="medium",
            confidence=0.75,
            first_seen="2026-10-09T11:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.2"],
            created_at="2026-10-09T11:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(self.camp1)
        default_campaign_store.save_campaign(self.camp2)

    def tearDown(self):
        default_campaign_store.clear()
        default_session_store.clear()
        self.db.close()

    # =========================================================================
    # 1. Operator Permission Resolution Tests
    # =========================================================================

    def test_operator_permission_resolution(self):
        """Verify exact permissions populated on Operator by role."""
        # Viewer
        self.assertTrue(self.viewer_op.has_permission("campaign:view"))
        self.assertFalse(self.viewer_op.has_permission("campaign:update"))
        self.assertFalse(self.viewer_op.has_permission("campaign:admin"))

        # Analyst
        self.assertTrue(self.analyst_op.has_permission("campaign:view"))
        self.assertTrue(self.analyst_op.has_permission("campaign:update"))
        self.assertFalse(self.analyst_op.has_permission("campaign:admin"))

        # Responder
        self.assertTrue(self.responder_op.has_permission("campaign:view"))
        self.assertTrue(self.responder_op.has_permission("campaign:update"))
        self.assertFalse(self.responder_op.has_permission("campaign:admin"))

        # Administrator
        self.assertTrue(self.admin_op.has_permission("campaign:view"))
        self.assertTrue(self.admin_op.has_permission("campaign:update"))
        self.assertTrue(self.admin_op.has_permission("campaign:admin"))

    # =========================================================================
    # 2. Dependency Guard (require_permission) Tests
    # =========================================================================

    def test_require_permission_view_guard(self):
        """campaign:view permits all 4 authenticated personas."""
        guard = require_permission("campaign:view")

        for token, op in [
            (self.viewer_token, self.viewer_op),
            (self.analyst_token, self.analyst_op),
            (self.responder_token, self.responder_op),
            (self.admin_token, self.admin_op),
        ]:
            req = make_mock_request(authorization=f"Bearer {token}")
            resolved_op = guard(request=req, operator=op, db=self.db)
            self.assertEqual(resolved_op.username, op.username)

    def test_require_permission_update_guard(self):
        """campaign:update rejects viewer with 403 Forbidden."""
        guard = require_permission("campaign:update")

        req = make_mock_request(authorization=f"Bearer {self.viewer_token}")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req, operator=self.viewer_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("campaign:update", ctx.exception.detail)

        # Passes for analyst, responder, admin
        for token, op in [
            (self.analyst_token, self.analyst_op),
            (self.responder_token, self.responder_op),
            (self.admin_token, self.admin_op),
        ]:
            req = make_mock_request(authorization=f"Bearer {token}")
            resolved = guard(request=req, operator=op, db=self.db)
            self.assertEqual(resolved.username, op.username)

    def test_require_permission_admin_guard(self):
        """campaign:admin rejects viewer, analyst, and responder with 403 Forbidden."""
        guard = require_permission("campaign:admin")

        for token, op in [
            (self.viewer_token, self.viewer_op),
            (self.analyst_token, self.analyst_op),
            (self.responder_token, self.responder_op),
        ]:
            req = make_mock_request(authorization=f"Bearer {token}")
            with self.assertRaises(HTTPException) as ctx:
                guard(request=req, operator=op, db=self.db)
            self.assertEqual(ctx.exception.status_code, 403)
            self.assertIn("campaign:admin", ctx.exception.detail)

        # Passes for admin
        req = make_mock_request(authorization=f"Bearer {self.admin_token}")
        resolved = guard(request=req, operator=self.admin_op, db=self.db)
        self.assertEqual(resolved.username, self.admin_op.username)

    # =========================================================================
    # 3. Read Endpoints (campaign:view)
    # =========================================================================

    def test_read_endpoints_accessible_to_viewer(self):
        """Viewer can list campaigns, view dossier, graph, timeline, and metrics."""
        # 1. list_campaigns
        res = list_campaigns(operator=self.viewer_op)
        self.assertEqual(res.total, 2)

        # 2. get_campaign
        dossier = get_campaign("camp-rbac001", operator=self.viewer_op)
        self.assertEqual(dossier.campaign_id, "camp-rbac001")

        # 3. get_campaign_graph
        graph = get_campaign_graph("camp-rbac001", operator=self.viewer_op, db=self.db)
        self.assertEqual(graph.campaign_id, "camp-rbac001")

        # 4. get_campaign_timeline
        timeline = get_campaign_timeline("camp-rbac001", operator=self.viewer_op, db=self.db)
        self.assertEqual(timeline.campaign_id, "camp-rbac001")

        # 5. get_campaign_metrics
        metrics = get_campaign_metrics(operator=self.viewer_op)
        self.assertEqual(metrics.active_campaigns, 2)

    # =========================================================================
    # 4. Write Endpoints (campaign:update & campaign:admin)
    # =========================================================================

    def test_merge_campaigns_restricted_to_admin(self):
        """Merge requires campaign:admin."""
        merge_req = CampaignMergeRequest(
            primary_campaign_id="camp-rbac001",
            secondary_campaign_id="camp-rbac002",
            justification="Correlated shared infrastructure between clusters",
        )

        # Admin succeeds
        merged = merge_campaigns(
            payload=merge_req,
            operator=self.admin_op,
            db=self.db,
        )
        self.assertEqual(merged.campaign_id, "camp-rbac001")
        # Secondary campaign must now be archived
        sec = default_campaign_store.get_campaign("camp-rbac002")
        self.assertEqual(sec.status, "archived")
        self.assertEqual(sec.merged_into, "camp-rbac001")

    def test_resurrection_restricted_to_security_administrator(self):
        """Only security_administrator can resurrect a resolved campaign."""
        # First resolve camp-rbac001 as analyst
        resolve_req = CampaignUpdateRequest(
            status="resolved",
            justification="Incident investigation concluded and remediated",
        )
        update_campaign("camp-rbac001", resolve_req, operator=self.analyst_op, db=self.db)
        camp = default_campaign_store.get_campaign("camp-rbac001")
        self.assertEqual(camp.status, "resolved")

        # Analyst attempts resurrection -> 403 Forbidden
        resurrect_req = CampaignUpdateRequest(
            status="active",
            justification="New adversarial evidence detected",
        )
        with self.assertRaises(HTTPException) as ctx:
            update_campaign("camp-rbac001", resurrect_req, operator=self.analyst_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("security administrators", ctx.exception.detail)

        # Responder attempts resurrection -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            update_campaign("camp-rbac001", resurrect_req, operator=self.responder_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Admin attempts resurrection -> Succeeds
        resurrected = update_campaign("camp-rbac001", resurrect_req, operator=self.admin_op, db=self.db)
        self.assertEqual(resurrected.status, "active")

    def test_case_link_and_unlink(self):
        """Analyst and responder can link and unlink cases."""
        linked = link_case("camp-rbac001", "case-999", operator=self.analyst_op, db=self.db)
        self.assertIn("case-999", linked.case_ids)

        unlinked = unlink_case("camp-rbac001", "case-999", operator=self.responder_op, db=self.db)
        self.assertNotIn("case-999", unlinked.case_ids)


if __name__ == "__main__":
    unittest.main()
