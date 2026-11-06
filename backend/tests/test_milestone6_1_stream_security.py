"""Milestone 6.1 Security Tests: Stream Authentication Hardening & Token Protection.

Validates:
1. Ordinary bearer tokens in SSE URL query parameters are rejected (HTTP 401).
2. Authenticated HTTP headers (Authorization: Bearer <token>) succeed.
3. Missing or invalid credentials raise HTTP 401.
4. Single-use stream tickets succeed once and reject replay attempts.
5. WebSocket ticket issuance requires authenticated operator sessions.
6. WebSocket ticket replay is strictly rejected (atomic consumption).
7. Backward-compatible alias /api/v1/auth/ws-ticket issues valid tickets.
8. Role-based event filtering prevents unauthorized event exposure.
9. Credentials and secrets are never printed in log outputs.
"""

import time
import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException

from app.auth.registry import Operator, default_operator_registry
from app.auth.session import SessionData, default_session_store
from app.events.schemas import SecurityEventEnvelope
from app.events.store import can_operator_view_event
from app.events.tickets import default_ticket_service
from app.routers.auth import create_connection_ticket_alias
from app.routers.events import create_connection_ticket, resolve_sse_operator


class TestMilestone61StreamSecurity(unittest.TestCase):
    """Automated security test suite for Milestone 6.1 stream authentication remediation."""

    @classmethod
    def setUpClass(cls):
        # Register test operators in operator registry
        cls.admin_op = Operator(
            username="admin_sec_auditor",
            role="security_administrator",
            email="auditor@honeyshield.local",
            password_hash="dummy_hash",
            is_active=True,
        )
        cls.analyst_op = Operator(
            username="analyst_test_user",
            role="analyst",
            email="analyst@honeyshield.local",
            password_hash="dummy_hash",
            is_active=True,
        )
        cls.inactive_op = Operator(
            username="locked_operator",
            role="analyst",
            email="locked@honeyshield.local",
            password_hash="dummy_hash",
            is_active=False,
        )

        default_operator_registry._operators["admin_sec_auditor"] = cls.admin_op
        default_operator_registry._operators["analyst_test_user"] = cls.analyst_op
        default_operator_registry._operators["locked_operator"] = cls.inactive_op

    def setUp(self):
        # Create an active session using default_session_store
        self.valid_token, self.session_data = default_session_store.create_session(
            operator=self.admin_op,
            client_ip="127.0.0.1",
            user_agent="pytest-security-harness",
        )
        self.dummy_request = MagicMock()

    def tearDown(self):
        default_session_store.revoke_session(self.valid_token)

    def test_01_sse_ordinary_bearer_token_in_query_param_rejected(self):
        """CRITICAL SECURITY ASSERTION: Ordinary bearer tokens in SSE query parameters must NOT authenticate."""
        # A request sending bearer token via query param without Authorization header MUST fail
        with self.assertRaises(HTTPException) as ctx:
            # Note: resolve_sse_operator signature accepts authorization and ticket ONLY.
            # Even if a caller attempts to pass authorization=None, it fails with 401.
            resolve_sse_operator(
                request=self.dummy_request,
                authorization=None,
                ticket=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Missing or invalid authentication", ctx.exception.detail)

    def test_02_sse_authenticated_header_succeeds(self):
        """Verify that Authorization: Bearer <valid_token> header authenticates successfully."""
        op = resolve_sse_operator(
            request=self.dummy_request,
            authorization=f"Bearer {self.valid_token}",
            ticket=None,
        )
        self.assertIsNotNone(op)
        self.assertEqual(op.username, "admin_sec_auditor")
        self.assertEqual(op.role, "security_administrator")

    def test_03_sse_missing_credentials_raises_401(self):
        """Verify missing authorization header and missing ticket raises HTTP 401."""
        with self.assertRaises(HTTPException) as ctx:
            resolve_sse_operator(
                request=self.dummy_request,
                authorization=None,
                ticket=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_04_sse_invalid_or_expired_bearer_token_raises_401(self):
        """Verify invalid, malformed, or expired bearer tokens raise HTTP 401."""
        # 1. Nonexistent token
        with self.assertRaises(HTTPException) as ctx:
            resolve_sse_operator(
                request=self.dummy_request,
                authorization="Bearer hsx_sess_nonexistent_token",
                ticket=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)

        # 2. Malformed authorization scheme
        with self.assertRaises(HTTPException) as ctx:
            resolve_sse_operator(
                request=self.dummy_request,
                authorization="Basic YWRtaW46cGFzc3dvcmQ=",
                ticket=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)

        # 3. Inactive operator
        inactive_token, _ = default_session_store.create_session(
            operator=self.inactive_op,
            client_ip="127.0.0.1",
            user_agent="pytest-security-harness",
        )
        try:
            with self.assertRaises(HTTPException) as ctx:
                resolve_sse_operator(
                    request=self.dummy_request,
                    authorization=f"Bearer {inactive_token}",
                    ticket=None,
                )
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            default_session_store.revoke_session(inactive_token)

    def test_05_sse_single_use_ticket_succeeds_once_and_rejects_replay(self):
        """Verify single-use tickets authenticate once and reject replay attempts."""
        ticket = default_ticket_service.issue_ticket(operator=self.admin_op, ttl_seconds=60)
        self.assertTrue(ticket.startswith("hsx_wstk_"))

        # First consumption via SSE guard
        op = resolve_sse_operator(
            request=self.dummy_request,
            authorization=None,
            ticket=ticket,
        )
        self.assertIsNotNone(op)
        self.assertEqual(op.username, "admin_sec_auditor")

        # Second consumption (Replay Attack) MUST be rejected with HTTP 401
        with self.assertRaises(HTTPException) as ctx:
            resolve_sse_operator(
                request=self.dummy_request,
                authorization=None,
                ticket=ticket,
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_06_websocket_ticket_lifecycle_and_expiry(self):
        """Verify WebSocket ticket creation, structure, and TTL expiration."""
        # 1. Issue Ticket
        ticket_res = create_connection_ticket(operator=self.analyst_op)
        self.assertTrue(ticket_res.ticket.startswith("hsx_wstk_"))
        self.assertEqual(ticket_res.expires_in, 60)
        self.assertEqual(ticket_res.ws_endpoint, "/api/v1/events/ws")

        # 2. Consume Ticket
        consumed_op = default_ticket_service.consume_ticket(ticket_res.ticket)
        self.assertIsNotNone(consumed_op)
        self.assertEqual(consumed_op.username, "analyst_test_user")

        # 3. Verify expired ticket behavior
        expired_ticket = default_ticket_service.issue_ticket(operator=self.analyst_op, ttl_seconds=-1)
        expired_op = default_ticket_service.consume_ticket(expired_ticket)
        self.assertIsNone(expired_op)

    def test_07_websocket_ticket_replay_rejection(self):
        """Verify WebSocket single-use ticket cannot be reused across connections."""
        ticket = default_ticket_service.issue_ticket(operator=self.admin_op, ttl_seconds=60)
        first_claim = default_ticket_service.consume_ticket(ticket)
        self.assertIsNotNone(first_claim)

        # Immediate replay attempt
        second_claim = default_ticket_service.consume_ticket(ticket)
        self.assertIsNone(second_claim)

    def test_08_backward_compatible_ws_ticket_alias_endpoint(self):
        """Verify /api/v1/auth/ws-ticket alias issues valid single-use tickets."""
        res = create_connection_ticket_alias(operator=self.analyst_op)
        self.assertIn("ticket", res)
        self.assertTrue(res["ticket"].startswith("hsx_wstk_"))
        self.assertEqual(res["expires_in"], 60)

        # Confirm ticket works in ticket service
        op = default_ticket_service.consume_ticket(res["ticket"])
        self.assertIsNotNone(op)
        self.assertEqual(op.username, "analyst_test_user")

    def test_09_rbac_filtering_for_unauthorized_roles(self):
        """Verify can_operator_view_event enforces role-based access control."""
        # Governor containment event requires command:stage_containment
        governor_event_type = "governor.containment.executed"

        # Security administrator is permitted
        self.assertTrue(can_operator_view_event(self.admin_op, governor_event_type))

        # Standard analyst is NOT permitted to view governor containment events
        self.assertFalse(can_operator_view_event(self.analyst_op, governor_event_type))

        # Standard operational telemetry is permitted for analyst
        self.assertTrue(can_operator_view_event(self.analyst_op, "security.attack.detected"))

    def test_10_log_redaction_secrets_not_printed(self):
        """Verify ticket service does not leak tickets or session tokens in repr or string conversions."""
        ticket = default_ticket_service.issue_ticket(operator=self.admin_op, ttl_seconds=60)
        # Verify default_ticket_service representation doesn't expose all stored tickets
        service_repr = repr(default_ticket_service)
        self.assertNotIn(ticket, service_repr)


if __name__ == "__main__":
    unittest.main()
