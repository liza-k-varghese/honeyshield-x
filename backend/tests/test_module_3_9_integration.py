"""Integration test suite for Module 3.9: Enterprise Integration & Webhook Gateway.

Tests cover:
1. End-to-end webhook delivery to an HTTP receiver with HMAC signature verification.
2. EventBus event fan-out (alert.triggered, canary.tripped, case.escalated).
3. Legacy Module 2.6 notification fanout backward-compatibility.
4. Failure handling, per-endpoint circuit breaker, and DLQ enqueue/replay flow.
"""

import http.server
import json
import os
import threading
import time
import unittest
from sqlalchemy.orm import Session

os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"
os.environ["HONEYSHIELD_ALLOW_TEST_WEBHOOK_LOOPBACK"] = "1"
os.environ["HONEYSHIELD_FAST_RETRIES"] = "1"

from app.auth.registry import default_operator_registry
from app.database import SessionLocal
from app.incident_command.bus import default_event_bus as event_bus
from app.integrations.dispatcher import default_webhook_dispatcher, verify_signature
from app.integrations.storage import default_integration_storage
from app.models import Alert, Attack, SystemEvent
from app.notifications.service import fanout_legacy_alert
from app.routers.integrations import retry_dlq


class MockIntegrationReceiver(http.server.BaseHTTPRequestHandler):
    """Threaded mock HTTP server collecting received webhooks for verification."""

    received_requests: list[dict] = []
    response_code: int = 200
    response_body: bytes = b'{"status": "received"}'

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        parsed = {}
        try:
            parsed = json.loads(body.decode("utf-8"))
        except Exception:
            pass

        self.__class__.received_requests.append({
            "path": self.path,
            "headers": {k.lower(): v for k, v in self.headers.items()},
            "raw_body": body,
            "json": parsed,
        })

        self.send_response(self.__class__.response_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(self.__class__.response_body)

    def log_message(self, format, *args):
        # Silence HTTP server logs during testing
        pass


class TestModule39Integration(unittest.TestCase):
    """End-to-end integration tests for Module 3.9 Webhook Gateway."""

    @classmethod
    def setUpClass(cls):
        cls.server = http.server.HTTPServer(("127.0.0.1", 0), MockIntegrationReceiver)
        cls.server_port = cls.server.server_address[1]
        cls.server_url = f"http://127.0.0.1:{cls.server_port}/soc-webhook"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.db: Session = SessionLocal()
        default_integration_storage.clear_all()
        MockIntegrationReceiver.received_requests = []
        MockIntegrationReceiver.response_code = 200
        MockIntegrationReceiver.response_body = b'{"status": "received"}'

        self.admin_op = default_operator_registry.get_operator("admin_chief")
        self.responder_op = default_operator_registry.get_operator("responder_alex")

        # Setup standard test endpoint
        self.endpoint_id = "ep_integration_test_01"
        self.endpoint_secret = "hsx_whsec_test_secret_integration_key"
        default_integration_storage.save_endpoint({
            "id": self.endpoint_id,
            "name": "SOC SIEM Ingestion",
            "target_url": self.server_url,
            "enabled": True,
            "events": ["alert.triggered", "canary.tripped", "case.escalated"],
            "format": "honeyshield_json",
            "secret": self.endpoint_secret,
            "created_at": "2026-10-09T10:00:00Z",
            "updated_at": "2026-10-09T10:00:00Z",
        })

    def tearDown(self):
        default_integration_storage.clear_all()
        self.db.close()

    # =========================================================================
    # 1. End-to-End Direct Dispatch & HMAC Verification
    # =========================================================================

    def test_direct_dispatch_and_hmac_verification(self):
        """Verify delivery to HTTP receiver, correct headers, and HMAC signature validation."""
        delivery_id = default_webhook_dispatcher.dispatch_event(
            event_type="alert.triggered",
            payload={
                "alert_id": 999,
                "severity": "CRITICAL",
                "attack_type": "SQL_INJECTION",
                "src_ip": "198.51.100.42",
            },
            endpoint_id=self.endpoint_id,
            wait=True,
        )

        self.assertIsNotNone(delivery_id)
        self.assertEqual(len(MockIntegrationReceiver.received_requests), 1)

        req = MockIntegrationReceiver.received_requests[0]
        headers = req["headers"]
        self.assertEqual(headers.get("x-honeyshield-event"), "alert.triggered")
        self.assertEqual(headers.get("x-honeyshield-delivery-id"), delivery_id)
        self.assertTrue(headers.get("user-agent", "").startswith("HoneyShield-Integrations/"))

        sig_header = headers.get("x-honeyshield-signature")
        self.assertIsNotNone(sig_header)
        self.assertTrue(sig_header.startswith("t="))
        self.assertIn(",v1=", sig_header)

        # Validate cryptographic integrity using secret
        is_valid, _ = verify_signature(
            secret=self.endpoint_secret,
            signature_header=sig_header,
            payload_bytes=req["raw_body"],
        )
        self.assertTrue(is_valid)

        # Verify parsed JSON structure
        data = req["json"]
        self.assertEqual(data.get("event_type"), "alert.triggered")
        self.assertEqual(data.get("delivery_id"), delivery_id)
        self.assertEqual(data.get("data", {}).get("alert_id"), 999)

    # =========================================================================
    # 2. EventBus Fan-Out to Subscribed Endpoints
    # =========================================================================

    def test_event_bus_fanout_alerts_canaries_cases(self):
        """Verify that publishing to EventBus fans out to configured webhook endpoints."""
        MockIntegrationReceiver.received_requests.clear()

        # Publish alert.triggered
        event_bus.publish("alert.triggered", {
            "alert_id": 101,
            "severity": "HIGH",
            "message": "SSH brute force detected",
        })
        time.sleep(0.5)

        # Publish canary.tripped
        event_bus.publish("canary.tripped", {
            "token_id": "canary_token_888",
            "src_ip": "203.0.113.99",
            "action": "DECEPTION_TRIGGERED",
        })
        time.sleep(0.5)

        # Publish case.escalated
        event_bus.publish("case.escalated", {
            "case_id": "HSX-CASE-2026-0042",
            "status": "ESCALATED",
            "priority": "P1",
        })
        time.sleep(0.5)

        # Should receive all three events
        self.assertEqual(len(MockIntegrationReceiver.received_requests), 3)
        received_events = [r["headers"].get("x-honeyshield-event") for r in MockIntegrationReceiver.received_requests]
        self.assertIn("alert.triggered", received_events)
        self.assertIn("canary.tripped", received_events)
        self.assertIn("case.escalated", received_events)

    # =========================================================================
    # 3. Module 2.6 Legacy Notification Compatibility
    # =========================================================================

    def test_legacy_notification_fanout(self):
        """Verify that fanout_legacy_alert correctly formats and fans out without breaking legacy paths."""
        MockIntegrationReceiver.received_requests.clear()

        fanout_legacy_alert(
            alert_id=555,
            severity="HIGH",
            attack_type="CREDENTIAL_STUFFING",
            source_ip="198.51.100.77",
            details={"attempts": 42},
        )
        time.sleep(0.5)

        self.assertEqual(len(MockIntegrationReceiver.received_requests), 1)
        req = MockIntegrationReceiver.received_requests[0]
        self.assertEqual(req["headers"].get("x-honeyshield-event"), "alert.triggered")
        self.assertEqual(req["json"]["data"]["alert_id"], 555)
        self.assertEqual(req["json"]["data"]["attack_type"], "CREDENTIAL_STUFFING")

    # =========================================================================
    # 4. Failure, Circuit Breaker, DLQ Enqueue & Replay Flow
    # =========================================================================

    def test_failure_dlq_enqueue_and_replay_resolution(self):
        """Verify failure leading to DLQ enqueue, circuit trip, and successful replay recovery."""
        MockIntegrationReceiver.received_requests.clear()
        MockIntegrationReceiver.response_code = 500
        MockIntegrationReceiver.response_body = b'{"error": "Internal SIEM Failure"}'

        # Dispatch should fail and exhaust retries, resulting in DLQ record
        delivery_id = default_webhook_dispatcher.dispatch_event(
            event_type="alert.triggered",
            payload={"alert_id": 777, "message": "Failure Test Alert"},
            endpoint_id=self.endpoint_id,
            wait=True,
        )

        items, total = default_integration_storage.list_dlq(limit=10, offset=0)
        self.assertGreaterEqual(total, 1)
        record = items[0]
        self.assertEqual(record["endpoint_id"], self.endpoint_id)
        self.assertEqual(record["status_code"], 500)

        # Now recover the remote receiver
        MockIntegrationReceiver.response_code = 200
        MockIntegrationReceiver.response_body = b'{"status": "recovered"}'

        # Execute DLQ replay via handler
        retry_res = retry_dlq(
            delivery_id=record["delivery_id"],
            operator=self.responder_op,
            db=self.db,
        )

        self.assertEqual(retry_res["status"], "success")
        self.assertEqual(retry_res["status_code"], 200)

        # DLQ record should now be resolved and removed from queue
        remaining_items, remaining_total = default_integration_storage.list_dlq(limit=10, offset=0)
        self.assertEqual(remaining_total, 0)


if __name__ == "__main__":
    unittest.main()
