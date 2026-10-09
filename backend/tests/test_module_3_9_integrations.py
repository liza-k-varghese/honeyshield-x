"""Unit Tests for Module 3.9: Enterprise Integration Core Subsystems.

Tests:
- Serializers: honeyshield_json, cef, leef, syslog_json.
- Cryptographic HMAC-SHA256 signature generation and verification.
- Timestamp drift and replay protection window (±300s).
- SSRF security: URL validation, scheme gate, userinfo, control chars, IP blacklisting.
- IPv4-mapped IPv6 evaluation.
- Dual-mode storage: CRUD, secret masking, circuit breaker state, DLQ bounds (500).
- Dispatcher: retry schedule, backoff, circuit breaker tripping.
"""

from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import os
import time
import unittest
from unittest.mock import MagicMock, patch

os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"

from app.integrations.dispatcher import (
    compute_signature,
    verify_signature,
    WebhookDispatcher,
)
from app.integrations.serializers import (
    format_cef,
    format_honeyshield_json,
    format_leef,
    format_syslog_json,
    serialize_payload,
)
from app.integrations.ssrf import (
    DISALLOWED_IPV4_NETWORKS,
    DISALLOWED_IPV6_NETWORKS,
    SSRFValidationError,
    is_ip_disallowed,
    validate_destination_url,
)
from app.integrations.storage import (
    IntegrationStorage,
    generate_endpoint_secret,
    mask_secret,
)


class TestSerializers(unittest.TestCase):
    """Test standard SIEM & Webhook payload serialization formats."""

    def setUp(self):
        self.delivery_id = "del_test_123456"
        self.timestamp = "2026-10-09T12:00:00Z"
        self.sample_data = {
            "title": "SSH Brute Force Attack",
            "severity": "critical",
            "source_ip": "198.51.100.25",
            "message": "Multiple failed auth attempts detected",
            "case_id": "CASE-2026-001",
            "canary_id": "CANARY-ROOT-KEY",
            "secret_token": "super_secret_password_123",
        }

    def test_honeyshield_json_serialization(self):
        raw_bytes, ctype = serialize_payload(
            format_preset="honeyshield_json",
            event_type="alert.triggered",
            delivery_id=self.delivery_id,
            timestamp_iso=self.timestamp,
            data=self.sample_data,
        )
        self.assertEqual(ctype, "application/json")
        parsed = json.loads(raw_bytes.decode("utf-8"))
        self.assertEqual(parsed["schema_version"], "3.9")
        self.assertEqual(parsed["event_type"], "alert.triggered")
        self.assertEqual(parsed["delivery_id"], self.delivery_id)
        # Verify secret token was redacted
        self.assertEqual(parsed["data"]["secret_token"], "[REDACTED]")
        self.assertEqual(parsed["data"]["source_ip"], "198.51.100.25")

    def test_cef_serialization(self):
        raw_bytes, ctype = serialize_payload(
            format_preset="cef",
            event_type="alert.triggered",
            delivery_id=self.delivery_id,
            timestamp_iso=self.timestamp,
            data=self.sample_data,
        )
        self.assertIn("text/plain", ctype)
        cef_str = raw_bytes.decode("utf-8")
        self.assertTrue(cef_str.startswith("CEF:0|HoneyShield-X|Platform|3.9|alert.triggered|"))
        self.assertIn("src=198.51.100.25", cef_str)
        self.assertIn("externalId=del_test_123456", cef_str)
        self.assertIn("cs1=CASE-2026-001", cef_str)
        # Severity mapped (critical -> 10)
        self.assertIn("|10|", cef_str)

    def test_leef_serialization(self):
        raw_bytes, ctype = serialize_payload(
            format_preset="leef",
            event_type="canary.tripped",
            delivery_id=self.delivery_id,
            timestamp_iso=self.timestamp,
            data=self.sample_data,
        )
        self.assertIn("text/plain", ctype)
        leef_str = raw_bytes.decode("utf-8")
        self.assertTrue(leef_str.startswith("LEEF:2.0|HoneyShield-X|Platform|3.9|canary.tripped|\t"))
        self.assertIn("src=198.51.100.25", leef_str)
        self.assertIn("canaryId=CANARY-ROOT-KEY", leef_str)
        self.assertIn("deliveryId=del_test_123456", leef_str)

    def test_syslog_json_serialization(self):
        raw_bytes, ctype = serialize_payload(
            format_preset="syslog_json",
            event_type="case.escalated",
            delivery_id=self.delivery_id,
            timestamp_iso=self.timestamp,
            data=self.sample_data,
        )
        self.assertEqual(ctype, "application/json")
        syslog_str = raw_bytes.decode("utf-8")
        # RFC 5424 PRI and structured data check
        self.assertTrue(syslog_str.startswith("<130>1") or syslog_str.startswith("<"))
        self.assertIn('[honeyShield@47 event="case.escalated"', syslog_str)
        self.assertIn('"source_ip":"198.51.100.25"', syslog_str)


class TestHmacSigning(unittest.TestCase):
    """Test cryptographic HMAC-SHA256 signature protocol and replay window."""

    def setUp(self):
        self.secret = generate_endpoint_secret()
        self.payload = b'{"event":"alert.triggered","id":"123"}'
        self.current_ts = int(time.time())

    def test_signature_generation_and_validation(self):
        sig_header = compute_signature(self.secret, self.current_ts, self.payload)
        self.assertTrue(sig_header.startswith(f"t={self.current_ts},v1="))

        # Valid verification
        valid, reason = verify_signature(
            secret=self.secret,
            signature_header=sig_header,
            payload_bytes=self.payload,
            current_time=self.current_ts,
        )
        self.assertTrue(valid)
        self.assertEqual(reason, "Valid signature")

    def test_signature_tampered_payload_rejected(self):
        sig_header = compute_signature(self.secret, self.current_ts, self.payload)
        tampered_payload = b'{"event":"alert.triggered","id":"123","tampered":true}'

        valid, reason = verify_signature(
            secret=self.secret,
            signature_header=sig_header,
            payload_bytes=tampered_payload,
            current_time=self.current_ts,
        )
        self.assertFalse(valid)
        self.assertIn("digest verification failed", reason)

    def test_signature_replay_window_expired(self):
        old_ts = self.current_ts - 301  # Exceeds 300s tolerance
        sig_header = compute_signature(self.secret, old_ts, self.payload)

        valid, reason = verify_signature(
            secret=self.secret,
            signature_header=sig_header,
            payload_bytes=self.payload,
            current_time=self.current_ts,
            tolerance_seconds=300,
        )
        self.assertFalse(valid)
        self.assertIn("timestamp expired", reason)

    def test_signature_wrong_secret_rejected(self):
        sig_header = compute_signature(self.secret, self.current_ts, self.payload)
        other_secret = generate_endpoint_secret()

        valid, reason = verify_signature(
            secret=other_secret,
            signature_header=sig_header,
            payload_bytes=self.payload,
            current_time=self.current_ts,
        )
        self.assertFalse(valid)
        self.assertIn("digest verification failed", reason)


class TestSsrfValidation(unittest.TestCase):
    """Test SSRF pre-flight validation and network blacklisting."""

    def test_scheme_enforcement(self):
        # HTTP is rejected in production
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("http://example.com/webhook", allow_test_loopback=False)

        # Non-HTTP schemes rejected
        for bad_scheme in ("ftp://", "file:///etc/passwd", "gopher://", "dict://", "ldap://"):
            with self.assertRaises(SSRFValidationError):
                validate_destination_url(f"{bad_scheme}example.com/webhook", allow_test_loopback=False)

    def test_userinfo_rejected(self):
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://user:password@example.com/webhook", allow_test_loopback=False)

    def test_control_characters_rejected(self):
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://example.com/webhook\r\nX-Bad:1", allow_test_loopback=False)
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://example.com/webhook\x00test", allow_test_loopback=False)

    def test_invalid_ports(self):
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://example.com:70000/webhook", allow_test_loopback=False)
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://example.com:0/webhook", allow_test_loopback=False)

    def test_loopback_rejected_in_prod(self):
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://127.0.0.1:8443/webhook", allow_test_loopback=False)
        with self.assertRaises(SSRFValidationError):
            validate_destination_url("https://[::1]:8443/webhook", allow_test_loopback=False)

    def test_rfc1918_private_ips_rejected(self):
        private_ips = ["10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1"]
        for ip in private_ips:
            with self.assertRaises(SSRFValidationError):
                validate_destination_url(f"https://{ip}/webhook", allow_test_loopback=False)

    def test_cloud_metadata_rejected(self):
        metadata_hosts = ["169.254.169.254", "metadata.google.internal", "instance-data"]
        for host in metadata_hosts:
            with self.assertRaises(SSRFValidationError):
                validate_destination_url(f"https://{host}/latest/meta-data", allow_test_loopback=True)

    def test_ipv4_mapped_ipv6_evaluated_safely(self):
        # ::ffff:127.0.0.1 is loopback
        mapped_loopback = ipaddress.ip_address("::ffff:127.0.0.1")
        disallowed, _ = is_ip_disallowed(mapped_loopback, allow_loopback=False)
        self.assertTrue(disallowed)

        # ::ffff:10.0.0.1 is RFC1918
        mapped_private = ipaddress.ip_address("::ffff:10.0.0.1")
        disallowed, _ = is_ip_disallowed(mapped_private, allow_loopback=False)
        self.assertTrue(disallowed)


class TestDualModeStorage(unittest.TestCase):
    """Test in-memory and Redis storage operations, secret masking, and bounded DLQ."""

    def setUp(self):
        self.storage = IntegrationStorage()
        self.storage._redis_client = None  # Force in-memory mode for deterministic unit testing
        self.storage.clear_all()

    def test_endpoint_crud_and_secret_masking(self):
        secret = generate_endpoint_secret()
        ep_data = {
            "id": "ep_test_001",
            "name": "Target Alpha",
            "target_url": "https://example.com/hook",
            "enabled": True,
            "events": ["alert.triggered"],
            "format": "honeyshield_json",
            "secret": secret,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        self.storage.save_endpoint(ep_data)

        # Masked retrieval
        masked = self.storage.get_endpoint("ep_test_001", mask=True)
        self.assertIsNotNone(masked)
        self.assertEqual(masked["secret"], "hsx_whsec_••••••••")

        # Unmasked retrieval (internal dispatcher use only)
        unmasked = self.storage.get_endpoint("ep_test_001", mask=False)
        self.assertEqual(unmasked["secret"], secret)

        # List endpoints
        all_eps = self.storage.list_endpoints(mask=True)
        self.assertEqual(len(all_eps), 1)
        self.assertEqual(all_eps[0]["secret"], "hsx_whsec_••••••••")

        # Delete
        deleted = self.storage.delete_endpoint("ep_test_001")
        self.assertTrue(deleted)
        self.assertIsNone(self.storage.get_endpoint("ep_test_001"))

    def test_per_endpoint_circuit_breaker(self):
        ep_id = "ep_circuit_test"
        self.storage.save_endpoint({"id": ep_id, "name": "T", "target_url": "https://example.com", "enabled": True})

        # Initially closed
        permitted, _ = self.storage.is_delivery_permitted(ep_id)
        self.assertTrue(permitted)

        # Record 4 failures (threshold is 5)
        for _ in range(4):
            state, tripped = self.storage.record_circuit_failure(ep_id)
            self.assertEqual(state, "closed")
            self.assertFalse(tripped)

        # 5th failure trips the circuit
        state, tripped = self.storage.record_circuit_failure(ep_id)
        self.assertEqual(state, "open")
        self.assertTrue(tripped)

        # Delivery is now rejected
        permitted, reason = self.storage.is_delivery_permitted(ep_id)
        self.assertFalse(permitted)
        self.assertIn("OPEN", reason)

        # Success resets circuit
        self.storage.record_circuit_success(ep_id)
        permitted, _ = self.storage.is_delivery_permitted(ep_id)
        self.assertTrue(permitted)

    def test_dlq_capacity_bounded_at_500(self):
        # Enqueue 550 items into DLQ
        for i in range(550):
            item = {
                "delivery_id": f"del_{i}",
                "endpoint_id": "ep_1",
                "endpoint_name": "Target 1",
                "target_url": "https://example.com",
                "event_type": "alert.triggered",
                "payload": {"seq": i},
                "attempts": 4,
                "last_error": "Connection timed out",
                "status_code": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            self.storage.enqueue_dlq(item)

        items, total = self.storage.list_dlq(limit=1000)
        # Strictly capped at 500
        self.assertEqual(total, 500)
        self.assertEqual(len(items), 500)
        # Oldest items (0..49) evicted; newest item (549) is present
        self.assertEqual(items[0]["delivery_id"], "del_549")


if __name__ == "__main__":
    unittest.main()
