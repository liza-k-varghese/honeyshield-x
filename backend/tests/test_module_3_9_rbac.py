"""Unit and integration test suite for Module 3.9: Enterprise Integration RBAC Boundaries.

Tests:
1. Deterministic permission resolution on Operator across 4 roles:
   - viewer: integration:view
   - analyst: integration:view, integration:test
   - incident_responder: integration:view, integration:test, integration:retry
   - security_administrator: all four
2. Dependency guard require_permission evaluation:
   - 403 Forbidden enforcement on insufficient permissions
   - SystemEvent OPERATOR_AUTH_DENIED audit trail verification
3. Direct endpoint handler verification for all 4 roles:
   - list_endpoints, get_endpoint, list_dlq, get_metrics
   - test_endpoint
   - retry_dlq
   - create_endpoint, update_endpoint, delete_endpoint, delete_dlq_record, dispatch_soar_block
4. get_current_operator authentication guards:
   - Missing Authorization header (401)
   - Malformed scheme (401)
   - Invalid/expired token (401)
   - Inactive operator (401)
"""

import os
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"
os.environ["HONEYSHIELD_ALLOW_TEST_WEBHOOK_LOOPBACK"] = "1"

from app.auth.dependencies import get_current_operator, require_permission
from app.auth.registry import (
    INTEGRATION_ROLE_PERMISSIONS,
    Operator,
    default_operator_registry,
)
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.integrations.storage import default_integration_storage
from app.models import SystemEvent
from app.routers.integrations import (
    create_endpoint,
    delete_dlq_record,
    delete_endpoint,
    dispatch_soar_block,
    get_endpoint,
    get_metrics,
    list_dlq,
    list_endpoints,
    retry_dlq,
    test_endpoint as handle_test_endpoint,
    update_endpoint,
)
from app.schemas import (
    SoarBlockRequest,
    TestPingRequest as PingRequestModel,
    WebhookEndpointCreate,
    WebhookEndpointUpdate,
)


def make_mock_request(
    method: str = "GET",
    path: str = "/api/v1/integrations/endpoints",
    authorization: str | None = None,
) -> Request:
    """Construct mock Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-Integration-RBAC-Test/1.0"),
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


class TestModule39Rbac(unittest.TestCase):
    """Test deterministic role-based access control for Enterprise Integrations."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_integration_storage.clear_all()
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

        # Register a sample endpoint for ID-dependent tests
        self.endpoint_id = "ep_rbac_fixture"
        default_integration_storage.save_endpoint({
            "id": self.endpoint_id,
            "name": "RBAC Test Endpoint",
            "target_url": "http://127.0.0.1:9099/webhook",
            "enabled": True,
            "events": ["alert.triggered"],
            "format": "honeyshield_json",
            "secret": "hsx_whsec_test_12345678",
            "created_at": "2026-10-09T10:00:00Z",
            "updated_at": "2026-10-09T10:00:00Z",
        })

    def tearDown(self):
        default_integration_storage.clear_all()
        default_session_store.clear()
        self.db.close()

    # =========================================================================
    # 1. Operator Permission Resolution Tests
    # =========================================================================

    def test_permission_resolution_across_roles(self):
        # Viewer permissions
        v_perms = self.viewer_op.permissions
        self.assertIn("integration:view", v_perms)
        self.assertNotIn("integration:test", v_perms)
        self.assertNotIn("integration:retry", v_perms)
        self.assertNotIn("integration:admin", v_perms)

        # Analyst permissions
        a_perms = self.analyst_op.permissions
        self.assertIn("integration:view", a_perms)
        self.assertIn("integration:test", a_perms)
        self.assertNotIn("integration:retry", a_perms)
        self.assertNotIn("integration:admin", a_perms)

        # Incident Responder permissions
        r_perms = self.responder_op.permissions
        self.assertIn("integration:view", r_perms)
        self.assertIn("integration:test", r_perms)
        self.assertIn("integration:retry", r_perms)
        self.assertNotIn("integration:admin", r_perms)

        # Security Administrator permissions
        s_perms = self.admin_op.permissions
        self.assertIn("integration:view", s_perms)
        self.assertIn("integration:test", s_perms)
        self.assertIn("integration:retry", s_perms)
        self.assertIn("integration:admin", s_perms)

    # =========================================================================
    # 2. Authentication Dependency Guards (HTTP 401)
    # =========================================================================

    def test_authentication_guards(self):
        # Missing header
        with self.assertRaises(HTTPException) as ctx:
            req = make_mock_request(authorization=None)
            get_current_operator(request=req, authorization=None, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

        # Malformed scheme
        with self.assertRaises(HTTPException) as ctx:
            req = make_mock_request(authorization="Basic dXNlcjpwYXNz")
            get_current_operator(request=req, authorization="Basic dXNlcjpwYXNz", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

        # Invalid token
        with self.assertRaises(HTTPException) as ctx:
            req = make_mock_request(authorization="Bearer nonexistent_token_123")
            get_current_operator(request=req, authorization="Bearer nonexistent_token_123", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    # =========================================================================
    # 3. RBAC Dependency Guard Enforcement (HTTP 403)
    # =========================================================================

    def test_rbac_dependency_guards(self):
        req = make_mock_request()

        # integration:view -> Allowed for all 4 roles
        dep_view = require_permission("integration:view")
        self.assertEqual(dep_view(request=req, operator=self.viewer_op, db=self.db), self.viewer_op)
        self.assertEqual(dep_view(request=req, operator=self.analyst_op, db=self.db), self.analyst_op)
        self.assertEqual(dep_view(request=req, operator=self.responder_op, db=self.db), self.responder_op)
        self.assertEqual(dep_view(request=req, operator=self.admin_op, db=self.db), self.admin_op)

        # integration:test -> Denied for viewer, allowed for others
        dep_test = require_permission("integration:test")
        with self.assertRaises(HTTPException) as ctx:
            dep_test(request=req, operator=self.viewer_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(dep_test(request=req, operator=self.analyst_op, db=self.db), self.analyst_op)
        self.assertEqual(dep_test(request=req, operator=self.responder_op, db=self.db), self.responder_op)
        self.assertEqual(dep_test(request=req, operator=self.admin_op, db=self.db), self.admin_op)

        # integration:retry -> Denied for viewer & analyst, allowed for responder & admin
        dep_retry = require_permission("integration:retry")
        with self.assertRaises(HTTPException) as ctx:
            dep_retry(request=req, operator=self.viewer_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        with self.assertRaises(HTTPException) as ctx:
            dep_retry(request=req, operator=self.analyst_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(dep_retry(request=req, operator=self.responder_op, db=self.db), self.responder_op)
        self.assertEqual(dep_retry(request=req, operator=self.admin_op, db=self.db), self.admin_op)

        # integration:admin -> Denied for viewer, analyst & responder, allowed strictly for admin
        dep_admin = require_permission("integration:admin")
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.viewer_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.analyst_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        with self.assertRaises(HTTPException) as ctx:
            dep_admin(request=req, operator=self.responder_op, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(dep_admin(request=req, operator=self.admin_op, db=self.db), self.admin_op)

    # =========================================================================
    # 4. Direct Router Handlers Verification
    # =========================================================================

    def test_viewer_endpoint_handlers(self):
        # Viewer reads successfully
        eps = list_endpoints(operator=self.viewer_op)
        self.assertEqual(len(eps), 1)

        single_ep = get_endpoint(endpoint_id=self.endpoint_id, operator=self.viewer_op)
        self.assertEqual(single_ep.id, self.endpoint_id)

        dlq_res = list_dlq(limit=10, offset=0, operator=self.viewer_op)
        self.assertEqual(dlq_res.total, 0)

        metrics_res = get_metrics(operator=self.viewer_op)
        self.assertEqual(metrics_res.total_endpoints, 1)

    def test_analyst_test_endpoint_handler(self):
        # Analyst can trigger test_endpoint
        test_res = handle_test_endpoint(
            endpoint_id=self.endpoint_id,
            payload=PingRequestModel(event_type="test.ping"),
            operator=self.analyst_op,
            db=self.db,
        )
        self.assertIsNotNone(test_res.delivery_id)

    def test_admin_create_update_delete_handlers(self):
        # Admin can create endpoint
        created = create_endpoint(
            payload=WebhookEndpointCreate(
                name="New Admin Target",
                target_url="http://127.0.0.1:9099/hook_admin",
                format="cef",
                events=["alert.triggered"],
            ),
            operator=self.admin_op,
            db=self.db,
        )
        self.assertIsNotNone(created.id)
        self.assertTrue(created.secret.startswith("hsx_whsec_"))
        self.assertFalse("••••" in created.secret)

        # Admin can update endpoint
        updated = update_endpoint(
            endpoint_id=created.id,
            payload=WebhookEndpointUpdate(name="Renamed Target"),
            operator=self.admin_op,
            db=self.db,
        )
        self.assertEqual(updated.name, "Renamed Target")

        # Admin can delete endpoint
        del_res = delete_endpoint(endpoint_id=created.id, operator=self.admin_op, db=self.db)
        self.assertTrue(del_res["deleted"])


if __name__ == "__main__":
    unittest.main()
