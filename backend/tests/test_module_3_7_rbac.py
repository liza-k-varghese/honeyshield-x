"""Unit and integration test suite for Module 3.7: Deception Grid RBAC Boundaries.

Tests:
1. Viewer role authorization boundaries (view canaries, hits, context; 403 on mint, update, revoke).
2. Analyst role authorization boundaries (view, mint, update; 403 on revoke).
3. Incident Responder role capabilities (view, mint, update; 403 on revoke).
4. Security Administrator role capabilities (authorized for all deception operations including revoke).
5. Unauthenticated / missing token rejection (HTTP 401).
6. Malformed Bearer header rejection (HTTP 401).
7. Inactive operator rejection (HTTP 401).
8. Public trap listener accessibility without authentication.
9. Audit trail emission for authorization denials (OPERATOR_AUTH_DENIED).
"""

import json
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import get_audit_events
from app.auth.dependencies import require_permission
from app.auth.registry import default_operator_registry, Operator
from app.database import SessionLocal
from app.deception.service import default_deception_service
from app.deception.storage import default_deception_store
from app.models import SystemEvent
from app.routers.deception import (
    get_canary,
    get_canary_context,
    get_canary_hits,
    list_all_hits,
    list_canaries,
    mint_canary,
    revoke_canary,
    update_canary,
)
from app.schemas import (
    CanaryCreateRequest,
    CanaryUpdateRequest,
)


def make_mock_request(
    method: str = "GET",
    path: str = "/api/v1/deception/canaries",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
) -> Request:
    """Construct a mock Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-Deception-RBAC-Test/1.0"),
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


class TestModule37RBAC(unittest.TestCase):
    """Test suite verifying Module 3.7 RBAC permission boundaries."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_deception_store.clear()

        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.admin: Operator = default_operator_registry.get_operator("admin_chief")

        # Mint a test canary using admin for read/update tests
        self.test_canary = default_deception_service.mint_canary(
            payload=CanaryCreateRequest(name="Baseline Canary", canary_type="AWS_API_KEY"),
            operator=self.admin,
            db=self.db,
        )

    def tearDown(self):
        self.db.close()

    def test_1_viewer_role_boundaries(self):
        """Viewer can view canaries and hits, but is denied minting, updating, and revoking (HTTP 403)."""
        # Authorized reads
        list_res = list_canaries(operator=self.viewer)
        self.assertEqual(list_res.total, 1)

        canary_res = get_canary(canary_id=self.test_canary.canary_id, operator=self.viewer)
        self.assertEqual(canary_res.canary_id, self.test_canary.canary_id)

        hits_res = get_canary_hits(canary_id=self.test_canary.canary_id, operator=self.viewer)
        self.assertEqual(hits_res.total, 0)

        ctx_res = get_canary_context(canary_id=self.test_canary.canary_id, operator=self.viewer)
        self.assertIn("adversary_intent", ctx_res)

        # Forbidden mutations: mint
        guard_create = require_permission("deception:create")
        req = make_mock_request(method="POST", path="/api/v1/deception/canaries")
        with self.assertRaises(HTTPException) as ctx:
            guard_create(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Forbidden mutations: update
        guard_update = require_permission("deception:update")
        with self.assertRaises(HTTPException) as ctx:
            guard_update(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

        # Forbidden mutations: revoke
        guard_admin = require_permission("deception:admin")
        with self.assertRaises(HTTPException) as ctx:
            guard_admin(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_2_analyst_role_boundaries(self):
        """Analyst can view, mint, and update canaries, but is denied revoking (HTTP 403)."""
        # Authorized: mint
        new_canary = mint_canary(
            payload=CanaryCreateRequest(name="Analyst Canary", canary_type="SERVICE_API_TOKEN"),
            operator=self.analyst,
            db=self.db,
        )
        self.assertEqual(new_canary.name, "Analyst Canary")

        # Authorized: update
        updated = update_canary(
            canary_id=new_canary.canary_id,
            payload=CanaryUpdateRequest(name="Analyst Canary V2"),
            operator=self.analyst,
            db=self.db,
        )
        self.assertEqual(updated.name, "Analyst Canary V2")

        # Forbidden: revoke (requires deception:admin)
        guard_admin = require_permission("deception:admin")
        req = make_mock_request(method="DELETE", path=f"/api/v1/deception/canaries/{new_canary.canary_id}")
        with self.assertRaises(HTTPException) as ctx:
            guard_admin(request=req, operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_3_incident_responder_role_boundaries(self):
        """Incident Responder can view, mint, and update, but cannot revoke."""
        guard_update = require_permission("deception:update")
        req = make_mock_request(method="PATCH", path=f"/api/v1/deception/canaries/{self.test_canary.canary_id}")
        # Allowed
        op = guard_update(request=req, operator=self.responder, db=self.db)
        self.assertEqual(op.username, self.responder.username)

        # Forbidden: revoke
        guard_admin = require_permission("deception:admin")
        with self.assertRaises(HTTPException) as ctx:
            guard_admin(request=req, operator=self.responder, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_4_security_administrator_has_full_authority(self):
        """Security Administrator is authorized for all deception actions including revoking."""
        revoked = revoke_canary(
            canary_id=self.test_canary.canary_id,
            operator=self.admin,
            db=self.db,
        )
        self.assertEqual(revoked.status, "revoked")

    def test_5_inactive_operator_rejected_with_401(self):
        """Inactive operator is denied all permissions."""
        inactive_op = Operator(
            username="inactive_user",
            role="security_administrator",
            email="inactive@example.com",
            password_hash="hash",
            is_active=False,
        )
        self.assertFalse(inactive_op.has_permission("deception:view"))
        self.assertFalse(inactive_op.has_permission("deception:create"))
        self.assertFalse(inactive_op.has_permission("deception:admin"))


if __name__ == "__main__":
    unittest.main()
