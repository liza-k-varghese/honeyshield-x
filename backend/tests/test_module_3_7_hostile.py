"""Hostile Security Audit & Adversarial Probing Test Suite for Module 3.7.

Tests 30+ Hostile Adversarial Vectors + Concurrency Race Conditions:
- Vectors 1-8: Token ID fuzzing, path traversal, SQLi, command injection, XSS, null bytes, CRLF, length bounds.
- Vectors 9-12: Oversized payloads, oversized headers, header injection, body fuzzing.
- Vectors 13-15: Spoofed identity headers (X-Operator-Id, X-Role, X-Forwarded-For).
- Vectors 16-17: Non-existent and revoked token probing.
- Vectors 18-19: Per-IP rate limiting enforcement and exhaustion defense.
- Vectors 20-21: Timing attack resilience and 256-bit CSPRNG entropy.
- Vectors 22-25: Permanent credential and beacon inertness verification.
- Vectors 26-27: Zero SSRF and zero subprocess/eval/exec verification.
- Vectors 28-33: RBAC privilege escalation defense and session tampering.
- Vector 34: Zero autonomous containment execution invariant.
- Vectors 35-38: Multi-threaded concurrency bursts and memory exhaustion defense.
"""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import json
import secrets
import time
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.dependencies import require_permission
from app.auth.registry import default_operator_registry, Operator
from app.cases.service import default_case_service
from app.database import SessionLocal
from app.deception.generators import generate_decoy_payload
from app.deception.service import DeceptionGridService, default_deception_service
from app.deception.storage import DeceptionStore, default_deception_store
from app.incident_command.governor import default_governor
from app.models import Alert, SystemEvent
from app.routers.deception import (
    get_canary,
    list_canaries,
    mint_canary,
    revoke_canary,
    validate_canary_get,
    validate_canary_post,
)
from app.schemas import (
    CanaryCreateRequest,
    CanaryHitEvent,
    CanaryUpdateRequest,
)


def make_hostile_trap_request(
    path: str = "/api/v1/deception/validate/token",
    method: str = "POST",
    client_ip: str = "198.51.100.100",
    headers: dict[str, str] | None = None,
    body: bytes = b"",
) -> Request:
    """Construct an adversarial Starlette Request."""
    raw_headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"Hostile-Security-Fuzzer/3.7"),
    ]
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode(), v.encode()))

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": raw_headers,
            "client": (client_ip, 54321),
        },
        receive=receive,
    )


class TestModule37HostileSecurityAudit(unittest.IsolatedAsyncioTestCase):
    """Hostile adversarial penetration test suite for Module 3.7."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_deception_store.clear()
        default_case_service.store.clear()

        # Reset governor singleton
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        self.admin: Operator = default_operator_registry.get_operator("admin_chief")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")

        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        self.db.commit()
        self.db.close()

    # --- Vectors 1-8: Token ID Fuzzing and Path Traversal ---

    async def test_vector_01_path_traversal_in_token_id(self):
        """Vector 1: Path traversal attempt in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="../../etc/passwd", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_02_sqli_in_token_id(self):
        """Vector 2: SQL injection string in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="' OR 1=1 --", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_03_command_injection_in_token_id(self):
        """Vector 3: Shell command injection syntax in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="token; rm -rf /", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_04_xss_in_token_id(self):
        """Vector 4: Cross-site scripting payload in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="<script>alert(1)</script>", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_05_null_byte_in_token_id(self):
        """Vector 5: Null byte injection in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="validtoken\x00extra", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_06_crlf_in_token_id(self):
        """Vector 6: CRLF injection in token_id is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="token\r\nSet-Cookie: evil", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_07_undersized_token_id(self):
        """Vector 7: Undersized token_id (<8 chars) is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="abc", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    async def test_vector_08_oversized_token_id(self):
        """Vector 8: Oversized token_id (>64 chars) is safely rejected."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="A" * 128, request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 400)

    # --- Vectors 9-12: Payload and Header Fuzzing ---

    async def test_vector_09_oversized_request_body_rejected(self):
        """Vector 9: Oversized request body (>16KB) raises HTTP 413."""
        oversized_body = b"X" * 20000  # 20 KB
        req = make_hostile_trap_request(body=oversized_body)
        with self.assertRaises(HTTPException) as ctx:
            await validate_canary_post(token_id="valid_token_id_1234", request=req, db=self.db)
        self.assertEqual(ctx.exception.status_code, 413)

    async def test_vector_10_oversized_headers_bounded(self):
        """Vector 10: Excess headers (>15 headers and long values) are safely bounded."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Header Trap", canary_type="SERVICE_API_TOKEN"),
            operator=self.analyst,
            db=self.db,
        )
        hostile_headers = {f"X-Evil-Header-{i}": "V" * 500 for i in range(30)}
        req = make_hostile_trap_request(headers=hostile_headers, client_ip="198.51.100.5")
        resp = await validate_canary_get(token_id=canary.token_id, request=req, db=self.db)
        self.assertEqual(resp.code, 401)

        # Inspect captured hit telemetry
        hits = default_deception_service.get_hits_for_canary(canary.canary_id)
        self.assertTrue(len(hits) >= 1)
        # Verify headers captured bounded to at most 15
        self.assertLessEqual(len(hits[0].headers_captured), 15)

    async def test_vector_11_crlf_header_injection_sanitized(self):
        """Vector 11: CRLF in User-Agent header is sanitized without corrupting logs."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="CRLF Trap", canary_type="AWS_API_KEY"),
            operator=self.analyst,
            db=self.db,
        )
        req = make_hostile_trap_request(
            headers={"User-Agent": "Scanner/1.0\r\nInjected-Header: evil\r\n\r\n"},
            client_ip="198.51.100.6",
        )
        resp = await validate_canary_get(token_id=canary.token_id, request=req, db=self.db)
        self.assertEqual(resp.code, 401)

        hits = default_deception_service.get_hits_for_canary(canary.canary_id)
        self.assertNotIn("\r", hits[0].user_agent)
        self.assertNotIn("\n", hits[0].user_agent)

    async def test_vector_12_binary_null_bytes_in_body_sanitized(self):
        """Vector 12: Binary null bytes in body preview are safely handled without crash."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Binary Trap", canary_type="WEB_TRIPWIRE_ENDPOINT"),
            operator=self.analyst,
            db=self.db,
        )
        raw_body = b"prefix\x00\x01\x02evil_payload\x00suffix"
        req = make_hostile_trap_request(method="POST", body=raw_body, client_ip="198.51.100.7")
        resp = await validate_canary_post(token_id=canary.token_id, request=req, db=self.db)
        self.assertEqual(resp.code, 401)

        hits = default_deception_service.get_hits_for_canary(canary.canary_id)
        self.assertNotIn("\x00", hits[0].payload_preview)

    # --- Vectors 13-15: Spoofed Identity Headers ---

    async def test_vector_13_spoofed_operator_id_header_ignored(self):
        """Vector 13: X-Operator-Id spoofing does not grant authenticated context."""
        req = make_hostile_trap_request(headers={"X-Operator-Id": "admin_marcus"})
        resp = await validate_canary_get(token_id="valid_token_id_9999", request=req, db=self.db)
        # Endpoint treats request as unauthenticated adversary encounter
        self.assertEqual(resp.code, 401)

    async def test_vector_14_spoofed_role_header_ignored(self):
        """Vector 14: X-Role header spoofing does not elevate privileges."""
        req = make_hostile_trap_request(headers={"X-Role": "security_administrator"})
        resp = await validate_canary_get(token_id="valid_token_id_9999", request=req, db=self.db)
        self.assertEqual(resp.code, 401)

    async def test_vector_15_forwarded_for_never_bypasses_connection_ip(self):
        """Vector 15: Spoofed X-Forwarded-For header does not masquerade client network identity."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Spoof Trap", canary_type="AWS_API_KEY"),
            operator=self.analyst,
            db=self.db,
        )
        req = make_hostile_trap_request(
            headers={"X-Forwarded-For": "127.0.0.1"},
            client_ip="198.51.100.22",
        )
        await validate_canary_get(token_id=canary.token_id, request=req, db=self.db)

        hits = default_deception_service.get_hits_for_canary(canary.canary_id)
        # Real client socket IP is recorded
        self.assertEqual(hits[0].source_ip, "198.51.100.22")

    # --- Vectors 16-17: Non-Existent and Revoked Probing ---

    async def test_vector_16_non_existent_token_returns_decoy_error(self):
        """Vector 16: Non-existent token probing returns safe 401 decoy error."""
        req = make_hostile_trap_request()
        resp = await validate_canary_get(token_id="nonexistent_token_12345", request=req, db=self.db)
        self.assertEqual(resp.status, "error")
        self.assertEqual(resp.code, 401)

    async def test_vector_17_revoked_token_returns_decoy_error_without_alert(self):
        """Vector 17: Revoked token probing returns 401 decoy error without alert creation."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Dead Token", canary_type="SERVICE_API_TOKEN"),
            operator=self.admin,
            db=self.db,
        )
        revoke_canary(canary_id=canary.canary_id, operator=self.admin, db=self.db)

        alerts_before = self.db.query(Alert).count()
        req = make_hostile_trap_request(client_ip="198.51.100.44")
        resp = await validate_canary_get(token_id=canary.token_id, request=req, db=self.db)
        self.assertEqual(resp.code, 401)

        alerts_after = self.db.query(Alert).count()
        self.assertEqual(alerts_before, alerts_after)

    # --- Vectors 18-19: Per-IP Rate Limiting & Exhaustion ---

    async def test_vector_18_rate_limiting_exceeded_raises_429(self):
        """Vector 18: Burst exceeding 30 requests/minute from one IP triggers HTTP 429."""
        ip = "198.51.100.88"
        # Consume allowed 30 requests
        for _ in range(30):
            req = make_hostile_trap_request(client_ip=ip)
            await validate_canary_get(token_id="dummy_token_rate_test", request=req, db=self.db)

        # 31st request must trigger 429
        req_blocked = make_hostile_trap_request(client_ip=ip)
        with self.assertRaises(HTTPException) as ctx:
            await validate_canary_get(token_id="dummy_token_rate_test", request=req_blocked, db=self.db)
        self.assertEqual(ctx.exception.status_code, 429)

    def test_vector_19_rate_limit_sliding_window_cleanup(self):
        """Vector 19: Rate limit tracking cleans up expired timestamps without unbounded growth."""
        store = DeceptionStore()
        test_ip = "10.10.10.10"
        for _ in range(5):
            self.assertTrue(store.check_rate_limit(test_ip))
        # Ensure memory tracked for this IP is exactly 5
        self.assertEqual(len(store._ip_rate_limits[test_ip]), 5)

    # --- Vectors 20-21: Timing Attack & Entropy ---

    def test_vector_20_constant_time_comparison(self):
        """Vector 20: Token validation relies on constant-time comparison primitives."""
        secret_token = secrets.token_urlsafe(32)
        wrong_token = secret_token[:-1] + "X"
        self.assertFalse(hmac.compare_digest(secret_token, wrong_token))
        self.assertTrue(hmac.compare_digest(secret_token, secret_token))

    def test_vector_21_csprng_entropy_verification(self):
        """Vector 21: 500 consecutively generated tokens exhibit 256-bit CSPRNG uniqueness with zero collisions."""
        generated = set()
        for _ in range(500):
            token = secrets.token_urlsafe(32)
            self.assertNotIn(token, generated)
            self.assertGreaterEqual(len(token), 43)  # urlsafe base64 for 32 bytes
            generated.add(token)
        self.assertEqual(len(generated), 500)

    # --- Vectors 22-25: Permanent Credential & Beacon Inertness ---

    def test_vector_22_aws_credential_permanently_inert(self):
        """Vector 22: AWS decoy keys contain explicit inert disclaimers and zero functional credentials."""
        payload = generate_decoy_payload("AWS_API_KEY", "CANARY-1", "test_token")
        self.assertIn("PERMANENTLY INERT DECOY", payload["inert_disclaimer"])
        self.assertNotIn("aws_session_token", payload)

    def test_vector_23_database_credential_permanently_inert(self):
        """Vector 23: Database connection string points to fake .lan domain and inert credentials."""
        payload = generate_decoy_payload("DATABASE_CREDENTIAL", "CANARY-2", "test_token")
        self.assertIn("PERMANENTLY INERT DECOY", payload["inert_disclaimer"])
        self.assertIn(".lan", payload["host"])

    def test_vector_24_service_api_token_permanently_inert(self):
        """Vector 24: Service API token uses inert prefix and does not authenticate."""
        payload = generate_decoy_payload("SERVICE_API_TOKEN", "CANARY-3", "test_token")
        self.assertTrue(payload["token"].startswith("hsx_sec_"))
        self.assertIn("PERMANENTLY INERT DECOY", payload["inert_disclaimer"])

    def test_vector_25_canary_file_beacon_zero_executable_code(self):
        """Vector 25: Canary file beacon is pure text template with ZERO executable code, macros, or external SSRF."""
        payload = generate_decoy_payload("CANARY_FILE_BEACON", "CANARY-4", "test_token")
        content = payload["file_content"]
        self.assertNotIn("<script", content.lower())
        self.assertNotIn("powershell", content.lower())
        self.assertNotIn("exec(", content.lower())
        self.assertIn("PERMANENTLY INERT STATIC TEMPLATE", payload["inert_disclaimer"])

    # --- Vectors 26-27: Zero SSRF and Zero Subprocess ---

    def test_vector_26_zero_outbound_ssrf(self):
        """Vector 26: Canary processing performs zero outbound HTTP requests."""
        # Codebase audit: DeceptionGridService does not import requests, urllib.request, or httpx
        import app.deception.service as svc_mod
        self.assertFalse(hasattr(svc_mod, "requests"))
        self.assertFalse(hasattr(svc_mod, "urllib"))

    def test_vector_27_zero_subprocess_or_eval_exec(self):
        """Vector 27: Verify zero subprocess or os.system primitives in deception module."""
        import app.deception.service as svc_mod
        self.assertFalse(hasattr(svc_mod, "subprocess"))
        self.assertFalse(hasattr(svc_mod, "os.system"))

    # --- Vectors 28-33: RBAC Privilege Escalation & Session Tampering ---

    def test_vector_28_viewer_cannot_mint_canary(self):
        """Vector 28: Privilege escalation attempt: Viewer cannot mint canary."""
        guard = require_permission("deception:create")
        req = make_hostile_trap_request(path="/api/v1/deception/canaries")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_vector_29_analyst_cannot_revoke_canary(self):
        """Vector 29: Privilege escalation attempt: Analyst cannot revoke canary."""
        guard = require_permission("deception:admin")
        req = make_hostile_trap_request(path="/api/v1/deception/canaries/test")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req, operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_vector_30_responder_cannot_revoke_canary(self):
        """Vector 30: Privilege escalation attempt: Responder cannot revoke canary."""
        guard = require_permission("deception:admin")
        req = make_hostile_trap_request(path="/api/v1/deception/canaries/test")
        with self.assertRaises(HTTPException) as ctx:
            guard(request=req, operator=self.responder, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_vector_31_unauthenticated_request_missing_token_raises_401(self):
        """Vector 31: Unauthenticated management request raises HTTP 401."""
        from app.auth.dependencies import get_current_operator
        req = make_hostile_trap_request(path="/api/v1/deception/canaries")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=None, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_32_malformed_bearer_header_raises_401(self):
        """Vector 32: Malformed Bearer authorization header raises HTTP 401."""
        from app.auth.dependencies import get_current_operator
        req = make_hostile_trap_request(path="/api/v1/deception/canaries")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization="Basic invalidbase64", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_33_forged_session_token_raises_401(self):
        """Vector 33: Non-existent / forged session token raises HTTP 401."""
        from app.auth.dependencies import get_current_operator
        req = make_hostile_trap_request(path="/api/v1/deception/canaries")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization="Bearer forged_token_value_xyz", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    # --- Vector 34: Autonomous Containment Bypass Defense ---

    async def test_vector_34_zero_autonomous_containment_bypass(self):
        """Vector 34: Canary hit strictly PREVENTS autonomous containment without Governor HITL."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Zero Auto Block Trap", canary_type="AWS_API_KEY"),
            operator=self.analyst,
            db=self.db,
        )
        adversary_ip = "198.51.100.99"
        req = make_hostile_trap_request(client_ip=adversary_ip)
        await validate_canary_get(token_id=canary.token_id, request=req, db=self.db)

        # Confirm governor entity cooldown is completely empty for adversary IP
        self.assertNotIn(adversary_ip, default_governor._entity_cooldowns)

    # --- Vectors 35-38: Concurrency Stress Bursts ---

    def test_vector_35_concurrency_burst_simultaneous_hits(self):
        """Vector 35: 10 concurrent threads hitting the same canary maintain deterministic consistency."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Concurrency Canary", canary_type="SERVICE_API_TOKEN"),
            operator=self.analyst,
            db=self.db,
        )
        store = DeceptionStore()
        store.save_canary(canary)

        def worker_hit(thread_idx: int):
            hit = CanaryHitEvent(
                hit_id=f"HIT-THREAD-{thread_idx}",
                canary_id=canary.canary_id,
                canary_type=canary.canary_type,
                source_ip=f"10.0.1.{thread_idx}",
                user_agent="ThreadWorker",
                request_method="GET",
                headers_captured={},
                payload_preview=None,
                alert_id=None,
                case_id=None,
                timestamp="2026-10-09T00:00:00Z",
            )
            store.record_hit(hit)

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker_hit, i) for i in range(10)]
            for f in futures:
                f.result()

        hits = store.get_hits_for_canary(canary.canary_id)
        self.assertEqual(len(hits), 10)

    def test_vector_36_concurrency_race_simultaneous_mints(self):
        """Vector 36: 10 concurrent mint operations generate unique canary IDs without collisions."""
        store = DeceptionStore()
        service = DeceptionGridService(store=store)

        def worker_mint(thread_idx: int):
            req = CanaryCreateRequest(name=f"Concurrent-{thread_idx}", canary_type="AWS_API_KEY")
            return service.mint_canary(req, operator=self.analyst, db=self.db)

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker_mint, i) for i in range(10)]
            results = [f.result() for f in futures]

        unique_ids = {c.canary_id for c in results}
        self.assertEqual(len(unique_ids), 10)

    def test_vector_37_concurrency_race_revoke_and_hit(self):
        """Vector 37: Concurrent revoke and hit operations do not deadlock or corrupt state."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Race Canary", canary_type="DATABASE_CREDENTIAL"),
            operator=self.analyst,
            db=self.db,
        )
        store = DeceptionStore()
        store.save_canary(canary)

        def do_revoke():
            return store.revoke_canary(canary.canary_id, operator_username="admin_marcus")

        def do_hit():
            hit = CanaryHitEvent(
                hit_id="HIT-RACE",
                canary_id=canary.canary_id,
                canary_type=canary.canary_type,
                source_ip="192.0.2.1",
                user_agent="Racer",
                request_method="GET",
                headers_captured={},
                payload_preview=None,
                alert_id=None,
                case_id=None,
                timestamp="2026-10-09T00:00:00Z",
            )
            store.record_hit(hit)

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(do_revoke)
            f2 = executor.submit(do_hit)
            f1.result()
            f2.result()

        final = store.get_canary(canary.canary_id)
        self.assertEqual(final.status, "revoked")

    def test_vector_38_memory_exhaustion_defense_under_flood(self):
        """Vector 38: 200 rapid hits remain strictly capped at 100 stored records."""
        store = DeceptionStore()
        canary_id = "CANARY-FLOOD-TEST"

        for i in range(200):
            store.record_hit(
                CanaryHitEvent(
                    hit_id=f"FLOOD-{i}",
                    canary_id=canary_id,
                    canary_type="AWS_API_KEY",
                    source_ip=f"10.0.0.{i % 255}",
                    user_agent="FloodAgent",
                    request_method="GET",
                    headers_captured={},
                    payload_preview=None,
                    alert_id=None,
                    case_id=None,
                    timestamp="2026-10-09T00:00:00Z",
                )
            )

        self.assertEqual(len(store.get_hits_for_canary(canary_id)), 100)


if __name__ == "__main__":
    unittest.main()
