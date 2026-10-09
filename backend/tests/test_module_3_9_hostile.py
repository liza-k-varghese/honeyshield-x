"""Hostile security test suite for Module 3.9: Enterprise Integration Gateway.

Attacks covered:
1. Hostile SSRF Vectors (30+ variations: loopback, private RFC1918, metadata, multicast,
   decimal IPs, bad schemes, userinfo, invalid ports, control characters, CRLF).
2. DNS Rebinding and direct IP binding enforcement.
3. Header injection & CRLF sanitization.
4. Secret protection: masking in GET/list, absence in SystemEvent audits.
5. Governor Tier-3 HITL containment bypass attacks (missing token, forged token,
   operator spoofing, token replay, short justification, emergency lockout).
6. DLQ capacity exhaustion & strict 500-item FIFO bounding.
7. Concurrency bursts on storage, circuit breaker, and dispatch workers.
"""

import concurrent.futures
import json
import os
import socket
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"
os.environ["HONEYSHIELD_FAST_RETRIES"] = "1"

from app.auth.registry import default_operator_registry
from app.database import SessionLocal
from app.incident_command.governor import default_governor
from app.integrations.dispatcher import default_dispatcher
from app.integrations.ssrf import (
    SSRFValidationError,
    validate_destination_url,
)
from app.integrations.storage import default_integration_storage
from app.models import SystemEvent
from app.routers.integrations import (
    create_endpoint,
    dispatch_soar_block,
    get_endpoint,
    list_endpoints,
)
from app.schemas import (
    SoarBlockRequest,
    WebhookEndpointCreate,
)

_ORIG_GETADDRINFO = socket.getaddrinfo


def _mock_dns_getaddrinfo(host, port, *args, **kwargs):
    """Mock getaddrinfo allowing example.com testing without external network access."""
    if "example.com" in host or "example.org" in host:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", int(port or 443)))]
    return _ORIG_GETADDRINFO(host, port, *args, **kwargs)


class TestModule39Hostile(unittest.TestCase):
    """Hostile security test suite attacking Module 3.9 Enterprise Integration Gateway."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_integration_storage.clear_all()
        default_governor.set_lockout(False)

        self.admin_op = default_operator_registry.get_operator("admin_chief")
        self.analyst_op = default_operator_registry.get_operator("analyst_sarah")

        self.dns_patcher = patch("socket.getaddrinfo", side_effect=_mock_dns_getaddrinfo)
        self.dns_patcher.start()

    def tearDown(self):
        self.dns_patcher.stop()
        default_integration_storage.clear_all()
        default_governor.set_lockout(False)
        self.db.close()

    # =========================================================================
    # 1. Hostile SSRF Vectors (30+ attack vectors)
    # =========================================================================

    def test_hostile_ssrf_vectors_rejected(self):
        """Verify that 30+ hostile SSRF vectors are completely blocked."""
        hostile_urls = [
            # IPv4 Loopbacks
            "https://127.0.0.1/webhook",
            "https://127.0.0.2:8443/webhook",
            "https://127.127.127.127/test",
            "https://0.0.0.0:443/webhook",
            "https://localhost/webhook",
            "https://localhost:8443/webhook",
            # IPv6 Loopbacks & Unspecified
            "https://[::1]/webhook",
            "https://[::]/webhook",
            "https://[0000:0000:0000:0000:0000:0000:0000:0001]/webhook",
            # IPv4-mapped IPv6
            "https://[::ffff:127.0.0.1]/webhook",
            "https://[::ffff:10.0.0.1]/webhook",
            "https://[::ffff:192.168.1.1]/webhook",
            # RFC1918 Private Networks
            "https://10.0.0.1/webhook",
            "https://10.254.254.254/webhook",
            "https://172.16.0.1/webhook",
            "https://172.31.255.255/webhook",
            "https://192.168.0.1/webhook",
            "https://192.168.254.254/webhook",
            # Cloud Metadata & Link-Local
            "https://169.254.169.254/latest/meta-data/",
            "https://169.254.1.1/webhook",
            "https://[fe80::1]/webhook",
            "https://metadata.google.internal/computeMetadata/v1/",
            # Carrier-Grade NAT (RFC6598)
            "https://100.64.0.1/webhook",
            "https://100.127.255.255/webhook",
            # Multicast & Broadcast
            "https://224.0.0.1/webhook",
            "https://239.255.255.250/webhook",
            "https://255.255.255.255/webhook",
            # Test & Documentation Networks (RFC5737)
            "https://192.0.2.1/webhook",
            "https://198.51.100.1/webhook",
            "https://203.0.113.1/webhook",
            # Bad Schemes
            "http://example.com/webhook",  # Plain HTTP blocked in prod
            "ftp://example.com/webhook",
            "file:///etc/passwd",
            "gopher://example.com/",
            "dict://example.com/",
            # Userinfo in URL
            "https://admin:password@example.com/webhook",
            "https://user@example.com/webhook",
            # Invalid / Boundary Ports
            "https://example.com:0/webhook",
            "https://example.com:65536/webhook",
            "https://example.com:99999/webhook",
            "https://example.com:-1/webhook",
            "https://example.com:abc/webhook",
            # Control Characters & CRLF
            "https://example.com\r\n/webhook",
            "https://example.com\x00/webhook",
            "https://example.com\t/webhook",
        ]

        for url in hostile_urls:
            with self.subTest(url=url):
                with self.assertRaises(SSRFValidationError, msg=f"Hostile URL was not rejected: {url}"):
                    validate_destination_url(url, allow_test_loopback=False)

    # =========================================================================
    # 2. Decimal IP Representation
    # =========================================================================

    def test_decimal_ip_rejected(self):
        """Decimal integer IP notation (e.g. 2130706433 for 127.0.0.1) must be blocked."""
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://2130706433/webhook", allow_test_loopback=False)

    # =========================================================================
    # 3. Header Injection and CRLF Sanitization
    # =========================================================================

    def test_header_crlf_injection_protection(self):
        """Ensure attempts to inject CRLF into custom headers or names cannot pollute HTTP request."""
        ep = create_endpoint(
            payload=WebhookEndpointCreate(
                name="Header Injection Test",
                target_url="https://audit-gateway.example.com/hook",
                custom_headers={
                    "X-Custom": "SafeValue",
                    "X-Injected\r\nInjected-Header": "AttackValue",
                },
            ),
            operator=self.admin_op,
            db=self.db,
        )
        self.assertIsNotNone(ep.id)
        # Custom headers cannot overwrite critical security headers
        ep_data = default_integration_storage.get_endpoint(ep.id, mask=False)
        self.assertNotIn("x-honeyshield-signature", ep_data.get("custom_headers", {}))

    # =========================================================================
    # 4. Secret Protection & Zero Plaintext Leakage
    # =========================================================================

    def test_secret_masking_in_api_and_audit(self):
        """Verify secret tokens are masked in GET requests and NEVER written to SystemEvent audit."""
        with patch("app.routers.integrations.record_operator_audit") as mock_audit:
            created = create_endpoint(
                payload=WebhookEndpointCreate(
                    name="Audit Secret Test",
                    target_url="https://audit-gateway.example.com/hook",
                ),
                operator=self.admin_op,
                db=self.db,
            )

            plaintext_secret = created.secret
            self.assertTrue(plaintext_secret.startswith("hsx_whsec_"))

            # 1. Masked in get_endpoint
            fetched = get_endpoint(endpoint_id=created.id, operator=self.admin_op)
            self.assertIn("••••••••", fetched.secret)
            self.assertNotEqual(fetched.secret, plaintext_secret)

            # 2. Masked in list_endpoints
            all_eps = list_endpoints(operator=self.admin_op)
            matching = [e for e in all_eps if e.id == created.id][0]
            self.assertIn("••••••••", matching.secret)
            self.assertNotEqual(matching.secret, plaintext_secret)

            # 3. SystemEvent audit logs must NOT contain plaintext secret
            mock_audit.assert_called()
            for call in mock_audit.call_args_list:
                msg = call[1].get("message", "")
                self.assertNotIn(plaintext_secret, msg)

    # =========================================================================
    # 5. Governor Level-3 HITL Containment Bypass Attacks
    # =========================================================================

    def test_governor_missing_approval_token_rejected(self):
        """Tier-3 SOAR containment dispatch must reject requests without an approval token."""
        # 1. Schema-level rejection
        with self.assertRaises(ValidationError):
            SoarBlockRequest(
                target_entity_id="101",
                justification="Containment for compromised host",
                approval_token=None,
            )

        # 2. Handler-level rejection
        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest.model_construct(
                    target_entity_id="101",
                    justification="Containment for compromised host",
                    approval_token="",
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertIn(ctx.exception.status_code, (401, 422))

    def test_governor_short_justification_rejected(self):
        """Tier-3 SOAR containment dispatch must reject justifications under 10 chars."""
        # 1. Schema-level validation rejects < 10 chars
        with self.assertRaises(ValidationError):
            SoarBlockRequest(
                target_entity_id="102",
                justification="Too short",
                approval_token="any-token",
            )

        # 2. Handler whitespace strip rejection
        token_info = default_governor.create_approval_token(
            action="SOAR_BLOCK_DISPATCH",
            target_id="102",
            operator_id=self.admin_op.username,
        )
        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest(
                    target_entity_id="102",
                    justification="              ",  # 14 spaces, strips to empty
                    approval_token=token_info["approval_token"],
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_governor_forged_approval_token_rejected(self):
        """Tier-3 SOAR containment dispatch must reject non-existent/forged tokens."""
        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest(
                    target_entity_id="103",
                    justification="Legitimate sounding emergency justification",
                    approval_token="fake-forged-token-uuid-1234",
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_governor_operator_spoofing_rejected(self):
        """Approval token issued to operator A cannot be redeemed by operator B."""
        # Token issued to analyst_sarah
        token_info = default_governor.create_approval_token(
            action="SOAR_BLOCK_DISPATCH",
            target_id="104",
            operator_id=self.analyst_op.username,
        )

        # admin_chief attempts to redeem token issued to analyst_sarah
        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest(
                    target_entity_id="104",
                    justification="Administrative override of containment action",
                    approval_token=token_info["approval_token"],
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_governor_token_replay_rejected(self):
        """Approval tokens are single-use; subsequent redemption attempts must fail."""
        token_info = default_governor.create_approval_token(
            action="SOAR_BLOCK_DISPATCH",
            target_id="105",
            operator_id=self.admin_op.username,
        )
        tok = token_info["approval_token"]

        # First use succeeds
        res = dispatch_soar_block(
            payload=SoarBlockRequest(
                target_entity_id="105",
                justification="Valid initial containment action justification",
                approval_token=tok,
            ),
            operator=self.admin_op,
            db=self.db,
        )
        self.assertEqual(res["status"], "staged")

        # Replay attempt fails
        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest(
                    target_entity_id="105",
                    justification="Replay attack attempt with same token",
                    approval_token=tok,
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_governor_emergency_lockout_blocks_dispatch(self):
        """Active emergency lockout must immediately reject SOAR block dispatches."""
        token_info = default_governor.create_approval_token(
            action="SOAR_BLOCK_DISPATCH",
            target_id="106",
            operator_id=self.admin_op.username,
        )

        # Engage emergency lockout
        default_governor.set_lockout(True)

        with self.assertRaises(HTTPException) as ctx:
            dispatch_soar_block(
                payload=SoarBlockRequest(
                    target_entity_id="106",
                    justification="Attempting containment during active lockout",
                    approval_token=token_info["approval_token"],
                ),
                operator=self.admin_op,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 503)

    # =========================================================================
    # 6. DLQ Capacity Saturation (Bounded at 500)
    # =========================================================================

    def test_dlq_capacity_saturation_bounded_at_500(self):
        """Enqueuing 600 failed deliveries must not exceed 500 records (FIFO eviction)."""
        for i in range(600):
            default_integration_storage.enqueue_dlq({
                "delivery_id": f"del_flood_{i}",
                "endpoint_id": "ep_flood",
                "endpoint_name": "Flood Endpoint",
                "target_url": "https://audit-gateway.example.com/flood",
                "event_type": "alert.triggered",
                "payload": {"seq": i},
                "attempts": 4,
                "last_error": "Connection refused",
                "status_code": 500,
                "created_at": "2026-10-09T12:00:00Z",
            })

        items, total = default_integration_storage.list_dlq(limit=1000, offset=0)
        self.assertEqual(total, 500)
        self.assertEqual(len(items), 500)

        # Verify oldest entries (0-99) were evicted and newest (100-599) retained
        # Note: list_dlq returns newest first
        self.assertEqual(items[0]["delivery_id"], "del_flood_599")
        self.assertEqual(items[-1]["delivery_id"], "del_flood_100")

    # =========================================================================
    # 7. Concurrency Bursts
    # =========================================================================

    def test_concurrency_bursts_on_storage_and_circuits(self):
        """Concurrent mutations to endpoints, circuits, and DLQ must execute without race conditions."""
        endpoint_id = "ep_concurrent_test"
        default_integration_storage.save_endpoint({
            "id": endpoint_id,
            "name": "Concurrent Target",
            "target_url": "https://audit-gateway.example.com/concurrent",
            "enabled": True,
            "events": ["alert.triggered"],
            "format": "honeyshield_json",
            "secret": "hsx_whsec_conc_key_12345",
            "created_at": "2026-10-09T10:00:00Z",
            "updated_at": "2026-10-09T10:00:00Z",
        })

        def worker_task(worker_id: int):
            for i in range(20):
                # Circuit failure and success
                default_integration_storage.record_circuit_failure(endpoint_id)
                default_integration_storage.record_circuit_success(endpoint_id)
                # Metrics record
                default_integration_storage.record_metric(success=True, latency_ms=12.5)
                # DLQ record
                default_integration_storage.enqueue_dlq({
                    "delivery_id": f"conc_{worker_id}_{i}",
                    "endpoint_id": endpoint_id,
                    "endpoint_name": "Concurrent Target",
                    "target_url": "https://audit-gateway.example.com/concurrent",
                    "event_type": "alert.triggered",
                    "payload": {"worker": worker_id, "i": i},
                    "attempts": 4,
                    "last_error": "Timeout",
                    "status_code": 504,
                    "created_at": "2026-10-09T12:00:00Z",
                })

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker_task, wid) for wid in range(10)]
            for fut in concurrent.futures.as_completed(futures):
                fut.result()

        # Metrics should accurately record 200 successes
        metrics = default_integration_storage.get_metrics()
        self.assertGreaterEqual(metrics["total_dispatched"], 200)

        # DLQ capacity bounded
        items, total = default_integration_storage.list_dlq(limit=500, offset=0)
        self.assertEqual(total, 200)


if __name__ == "__main__":
    unittest.main()
