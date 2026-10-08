"""Unit and integration test suite for HoneyShield-X Module 3.5: Authentication & Sessions.

Tests:
1. Valid login with PBKDF2 verification and bearer session token issuance.
2. Invalid password rejection (HTTP 401).
3. Nonexistent operator rejection (HTTP 401).
4. Inactive operator rejection (HTTP 401).
5. Account lockout after 5 consecutive failed attempts (HTTP 401).
6. Automatic account lockout expiration after 15 minutes.
7. Login rate limiting (max 5 requests / min / IP -> HTTP 429).
8. Successful login resets failed attempts counter.
9. Session validation (valid, missing token, malformed token, expired, idle timeout, revoked).
10. Logout session invalidation.
11. Administrative operator session revocation.
12. Fresh session generation upon every successful login.
13. Break-glass emergency procedure (valid, short justification 422, invalid passphrase 401, 30m TTL).
"""

import time
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.crypto import hash_password, verify_password, generate_session_token, hash_session_token
from app.auth.dependencies import get_current_operator
from app.auth.registry import default_operator_registry, Operator
from app.auth.service import default_login_rate_limiter, default_auth_service
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.models import SystemEvent
from app.routers.auth import break_glass_endpoint, login_endpoint, logout_endpoint
from app.schemas import BreakGlassRequest, LoginRequest


def make_mock_request(
    method: str = "POST",
    path: str = "/api/v1/auth/login",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
    user_agent: str = "HoneyShield-Test/1.0",
) -> Request:
    """Construct a lightweight Starlette Request instance without third-party test dependencies."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", user_agent.encode()),
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


class TestModule35Auth(unittest.TestCase):
    """Test suite covering Module 3.5 Authentication and Session Management."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_session_store.clear()
        default_login_rate_limiter.reset()

    def tearDown(self):
        # Clean any audit records created during test
        self.db.query(SystemEvent).filter(SystemEvent.source == "auth").delete()
        self.db.commit()
        self.db.close()
        default_operator_registry.reset()
        default_session_store.clear()
        default_login_rate_limiter.reset()

    # ==========================================
    # 1. Cryptographic Primitives Tests
    # ==========================================

    def test_1_pbkdf2_hashing_and_verification(self):
        """Test PBKDF2 password hashing structure and constant-time verification."""
        password = "SecureSOCPassword2026!"
        h = hash_password(password)

        self.assertTrue(h.startswith("pbkdf2_sha256$600000$"))
        self.assertTrue(verify_password(password, h))
        self.assertFalse(verify_password("WrongPassword", h))
        self.assertFalse(verify_password("", h))
        self.assertFalse(verify_password(password, "malformed$hash"))

    def test_2_session_token_entropy_and_hashing(self):
        """Test opaque CSPRNG bearer token generation and SHA-256 digest hashing."""
        token1 = generate_session_token()
        token2 = generate_session_token()

        self.assertTrue(token1.startswith("hsx_sess_"))
        self.assertTrue(token2.startswith("hsx_sess_"))
        self.assertNotEqual(token1, token2)

        hash1 = hash_session_token(token1)
        hash2 = hash_session_token(token2)
        self.assertEqual(len(hash1), 64)
        self.assertNotEqual(hash1, hash2)

    # ==========================================
    # 2. Login & Credential Authentication Tests
    # ==========================================

    def test_3_valid_login_success(self):
        """Test successful login returns valid bearer token and operator profile."""
        req = make_mock_request(path="/api/v1/auth/login")
        creds = LoginRequest(username="analyst_sarah", password="AnalystPass123!")
        resp = login_endpoint(credentials=creds, request=req, db=self.db)

        self.assertTrue(resp.token.startswith("hsx_sess_"))
        self.assertEqual(resp.token_type, "bearer")
        self.assertEqual(resp.operator.username, "analyst_sarah")
        self.assertEqual(resp.operator.role, "analyst")
        self.assertIn("command:ack", resp.operator.permissions)

    def test_4_invalid_password_returns_401(self):
        """Test incorrect password returns HTTP 401 and increments failure counter."""
        req = make_mock_request(path="/api/v1/auth/login")
        creds = LoginRequest(username="analyst_sarah", password="WrongPassword!")

        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid username or password", ctx.exception.detail)

        op = default_operator_registry.get_operator("analyst_sarah")
        self.assertIsNotNone(op)
        self.assertEqual(op.failed_login_attempts, 1)

    def test_5_nonexistent_operator_returns_401(self):
        """Test login with unknown username returns HTTP 401."""
        req = make_mock_request(path="/api/v1/auth/login")
        creds = LoginRequest(username="ghost_operator", password="AnyPassword!")

        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid username or password", ctx.exception.detail)

    def test_6_inactive_operator_returns_401(self):
        """Test deactivated operator cannot authenticate."""
        default_operator_registry.deactivate_operator("viewer_dan")

        req = make_mock_request(path="/api/v1/auth/login")
        creds = LoginRequest(username="viewer_dan", password="ViewerPass123!")

        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("inactive", ctx.exception.detail.lower())

    def test_7_lockout_after_5_consecutive_failures(self):
        """Test account lockout triggers after 5 failed attempts for 15 minutes."""
        req = make_mock_request(path="/api/v1/auth/login")
        creds = LoginRequest(username="responder_alex", password="BadPassword!")

        for _ in range(4):
            with self.assertRaises(HTTPException) as ctx:
                login_endpoint(credentials=creds, request=req, db=self.db)
            self.assertEqual(ctx.exception.status_code, 401)

        op = default_operator_registry.get_operator("responder_alex")
        self.assertEqual(op.failed_login_attempts, 4)
        self.assertFalse(op.is_locked())

        # 5th attempt trips lockout
        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertTrue(op.is_locked())

        # Reset IP rate limiter to isolate account lockout verification
        default_login_rate_limiter.reset()

        # 6th attempt with correct password still fails closed due to lockout (HTTP 401)
        good_creds = LoginRequest(username="responder_alex", password="ResponderPass123!")
        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=good_creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("locked", ctx.exception.detail.lower())

    def test_8_lockout_expiration(self):
        """Test that lockout expires after the 15-minute window."""
        op = default_operator_registry.get_operator("responder_alex")
        now = time.time()
        for _ in range(5):
            op.record_failed_login(current_time=now)
        self.assertTrue(op.is_locked(current_time=now))

        # Check 16 minutes later (960s > 900s)
        future_time = now + 960.0
        self.assertFalse(op.is_locked(current_time=future_time))
        self.assertEqual(op.failed_login_attempts, 0)

    def test_9_login_rate_limiting(self):
        """Test per-IP rate limiting enforces max 5 login requests per minute."""
        req = make_mock_request(client_ip="203.0.113.10")
        creds = LoginRequest(username="analyst_sarah", password="BadPassword!")

        for _ in range(5):
            try:
                login_endpoint(credentials=creds, request=req, db=self.db)
            except HTTPException:
                pass

        # 6th request from same IP raises HTTP 429
        good_creds = LoginRequest(username="analyst_sarah", password="AnalystPass123!")
        with self.assertRaises(HTTPException) as ctx:
            login_endpoint(credentials=good_creds, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Too many login attempts", ctx.exception.detail)

    def test_10_successful_login_resets_failed_counter(self):
        """Test that a successful login resets the failed attempts counter to 0."""
        req = make_mock_request(client_ip="203.0.113.20")
        bad_creds = LoginRequest(username="admin_chief", password="WrongPassword!")

        for _ in range(3):
            try:
                login_endpoint(credentials=bad_creds, request=req, db=self.db)
            except HTTPException:
                pass

        op = default_operator_registry.get_operator("admin_chief")
        self.assertEqual(op.failed_login_attempts, 3)

        # Successful login
        good_creds = LoginRequest(username="admin_chief", password="AdminPass123!")
        resp = login_endpoint(credentials=good_creds, request=req, db=self.db)
        self.assertEqual(resp.operator.username, "admin_chief")
        self.assertEqual(op.failed_login_attempts, 0)
        self.assertIsNone(op.locked_until)

    # ==========================================
    # 3. Session Lifecycle Tests
    # ==========================================

    def test_11_session_auth_me_dependency(self):
        """Test get_current_operator dependency resolves authenticated operator from Bearer header."""
        req_login = make_mock_request()
        creds = LoginRequest(username="analyst_sarah", password="AnalystPass123!")
        login_res = login_endpoint(credentials=creds, request=req_login, db=self.db)
        token = login_res.token

        # Resolve operator via dependency
        req_auth = make_mock_request(method="GET", path="/api/v1/auth/me", authorization=f"Bearer {token}")
        resolved_op = get_current_operator(request=req_auth, authorization=f"Bearer {token}", db=self.db)

        self.assertEqual(resolved_op.username, "analyst_sarah")
        self.assertEqual(resolved_op.role, "analyst")

    def test_12_missing_authorization_header_returns_401(self):
        """Test request without Authorization header returns HTTP 401."""
        req = make_mock_request(method="GET", path="/api/v1/auth/me")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=None, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Missing Authorization header", ctx.exception.detail)

    def test_13_malformed_authorization_scheme_returns_401(self):
        """Test non-Bearer scheme returns HTTP 401."""
        req = make_mock_request(authorization="Basic dXNlcjpwYXNz")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization="Basic dXNlcjpwYXNz", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Bearer", ctx.exception.detail)

    def test_14_expired_session_returns_401(self):
        """Test session past absolute 8-hour expiration returns HTTP 401."""
        op = default_operator_registry.get_operator("analyst_sarah")
        now = time.time()
        # Create session with 10s lifetime
        token, _ = default_session_store.create_session(op, max_lifetime_seconds=10.0, current_time=now)

        # Check 15 seconds in future
        session_after = default_session_store.get_session(token, current_time=now + 15.0)
        self.assertIsNone(session_after)

        req = make_mock_request(authorization=f"Bearer {token}")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=f"Bearer {token}", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_15_idle_timeout_session_invalidation(self):
        """Test session inactivity exceeding 30 minutes invalidates session."""
        op = default_operator_registry.get_operator("analyst_sarah")
        now = time.time()
        token, _ = default_session_store.create_session(op, current_time=now)

        # Check 31 minutes later (1860s > 1800s) without intervening requests
        session_idle = default_session_store.get_session(token, current_time=now + 1860.0)
        self.assertIsNone(session_idle)

    def test_16_logout_revokes_session(self):
        """Test POST /api/v1/auth/logout immediately invalidates bearer token."""
        req_login = make_mock_request()
        creds = LoginRequest(username="viewer_dan", password="ViewerPass123!")
        login_res = login_endpoint(credentials=creds, request=req_login, db=self.db)
        token = login_res.token

        op = default_operator_registry.get_operator("viewer_dan")
        req_logout = make_mock_request(authorization=f"Bearer {token}")
        logout_res = logout_endpoint(request=req_logout, authorization=f"Bearer {token}", operator=op, db=self.db)
        self.assertTrue(logout_res.success)

        # Subsequent query with revoked token returns HTTP 401
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req_logout, authorization=f"Bearer {token}", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_17_admin_revocation_of_operator_sessions(self):
        """Test administrative invalidation of all sessions for an operator."""
        op = default_operator_registry.get_operator("analyst_sarah")
        token1, _ = default_session_store.create_session(op)
        token2, _ = default_session_store.create_session(op)

        self.assertIsNotNone(default_session_store.get_session(token1))
        self.assertIsNotNone(default_session_store.get_session(token2))

        # Revoke all analyst_sarah sessions
        revoked_count = default_session_store.revoke_operator_sessions("analyst_sarah")
        self.assertGreaterEqual(revoked_count, 2)

        self.assertIsNone(default_session_store.get_session(token1))
        self.assertIsNone(default_session_store.get_session(token2))

    def test_18_fresh_session_generated_per_login(self):
        """Test that successive logins create distinct sessions."""
        req = make_mock_request()
        creds = LoginRequest(username="analyst_sarah", password="AnalystPass123!")
        res1 = login_endpoint(credentials=creds, request=req, db=self.db)
        res2 = login_endpoint(credentials=creds, request=req, db=self.db)

        self.assertNotEqual(res1.token, res2.token)
        # Both sessions remain independently valid
        self.assertIsNotNone(default_session_store.get_session(res1.token))
        self.assertIsNotNone(default_session_store.get_session(res2.token))

    # ==========================================
    # 4. Break-Glass Emergency Procedure Tests
    # ==========================================

    def test_19_break_glass_procedure_success(self):
        """Test valid break-glass emergency activation grants 30-minute Security Admin session."""
        req = make_mock_request(path="/api/v1/auth/break-glass")
        payload = BreakGlassRequest(
            passphrase="HoneyShield-SOC-Emergency-BreakGlass-2026!",
            justification="Active ransomware containment incident response authorization",
        )
        resp = break_glass_endpoint(payload=payload, request=req, db=self.db)

        self.assertTrue(resp.token.startswith("hsx_sess_"))
        self.assertEqual(resp.expires_in, 1800)
        self.assertEqual(resp.operator.username, "emergency_breakglass")
        self.assertEqual(resp.operator.role, "security_administrator")
        self.assertIn("EMERGENCY BREAK-GLASS ACTIVE", resp.warning)

        # Resolves via get_current_operator dependency
        req_auth = make_mock_request(authorization=f"Bearer {resp.token}")
        resolved = get_current_operator(request=req_auth, authorization=f"Bearer {resp.token}", db=self.db)
        self.assertEqual(resolved.username, "emergency_breakglass")
        self.assertEqual(resolved.role, "security_administrator")

    def test_20_break_glass_short_justification_returns_422(self):
        """Test break-glass fails with validation error if justification is shorter than 20 characters."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            BreakGlassRequest(
                passphrase="HoneyShield-SOC-Emergency-BreakGlass-2026!",
                justification="1234567890123456789",  # 19 characters (violates >= 20 constraint)
            )

    def test_21_break_glass_invalid_passphrase_returns_401(self):
        """Test break-glass fails with HTTP 401 if emergency passphrase is incorrect."""
        req = make_mock_request(path="/api/v1/auth/break-glass")
        payload = BreakGlassRequest(
            passphrase="WrongEmergencyPassword!",
            justification="Active ransomware containment incident response authorization",
        )
        with self.assertRaises(HTTPException) as ctx:
            break_glass_endpoint(payload=payload, request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid break-glass", ctx.exception.detail)
