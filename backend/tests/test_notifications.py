"""Automated unit and integration test suite for HoneyShield X Notification / Dispatch Layer (Module 2.6).

Tests cover:
- Nonexistent alert (404)
- Unconfigured provider handling
- Successful webhook dispatch
- Sequential duplicate dispatch suppression (idempotency)
- Failed dispatch and retryability
- Atomic concurrent race prevention
- In-flight lease protection
- Stale in-flight lease recovery
- Secret token redaction
- Pydantic schema validation
"""

from datetime import datetime, timedelta, timezone
import http.server
import json
import os
import threading
import time
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.alerts.service import evaluate_attack_alert
from app.database import SessionLocal
from app.models import Alert, Attack
from app.notifications.base import BaseNotificationProvider
from app.notifications.service import (
    dispatch_alert_notification,
    get_notification_provider,
)
from app.notifications.webhook import WebhookNotificationProvider
from app.routers.notifications import dispatch_alert_endpoint
from app.schemas import NotificationDispatchResult


class MockWebhookHandler(http.server.BaseHTTPRequestHandler):
    """Threaded mock HTTP receiver to verify webhook dispatch payloads and headers."""

    received_requests: list[dict] = []
    response_status: int = 200

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        payload = {}
        try:
            payload = json.loads(post_data.decode("utf-8"))
        except Exception:
            pass

        self.__class__.received_requests.append({
            "path": self.path,
            "headers": dict(self.headers),
            "payload": payload,
            "raw_data": post_data,
        })

        self.send_response(self.__class__.response_status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status": "ok"}')

    def log_message(self, format, *args):
        # Suppress logging during tests
        pass


class TestNotificationDispatch(unittest.TestCase):
    """Test suite covering Notification Dispatch Layer requirements."""

    @classmethod
    def setUpClass(cls):
        # Bind ephemeral port on localhost
        cls.server = http.server.HTTPServer(("127.0.0.1", 0), MockWebhookHandler)
        cls.server_port = cls.server.server_address[1]
        cls.server_url = f"http://127.0.0.1:{cls.server_port}/webhook"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []
        MockWebhookHandler.received_requests = []
        MockWebhookHandler.response_status = 200

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.commit()
        self.db.close()

    def _create_test_alert(self, risk_score: float = 85.0, severity: str = "critical") -> Alert:
        attack = Attack(
            attack_type="SQL Injection",
            source_ip="192.0.2.100",
            severity=severity,
            risk_score=risk_score,
            status="analyzed",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        eval_result = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        alert_id = eval_result["alert_id"]
        self.assertIsNotNone(alert_id)
        self.created_alert_ids.append(alert_id)

        alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
        self.assertIsNotNone(alert)
        return alert

    def test_1_nonexistent_alert_raises_404(self):
        """Test 1: Nonexistent alert ID raises HTTP 404."""
        nonexistent_id = 9999999
        with self.assertRaises(HTTPException) as ctx:
            dispatch_alert_notification(db=self.db, alert_id=nonexistent_id)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found", ctx.exception.detail.lower())

        with self.assertRaises(HTTPException) as ctx_endpoint:
            dispatch_alert_endpoint(alert_id=nonexistent_id, db=self.db)
        self.assertEqual(ctx_endpoint.exception.status_code, 404)

    def test_2_unconfigured_provider_safe_response(self):
        """Test 2: Unconfigured notification provider returns controlled sent=False without crashing."""
        alert = self._create_test_alert()

        # Explicit None provider
        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=None)
        self.assertFalse(res["sent"])
        self.assertEqual(res["alert_id"], alert.id)
        self.assertEqual(res["message"], "Notification provider is not configured")

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "pending")
        self.assertIsNone(alert.notified_at)

    def test_3_unconfigured_webhook_provider(self):
        """Test 3: Webhook provider with empty URL reports is_configured=False and safe response."""
        alert = self._create_test_alert()
        provider = WebhookNotificationProvider(webhook_url="")
        self.assertFalse(provider.is_configured)

        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res["sent"])
        self.assertEqual(res["provider"], "webhook")
        self.assertEqual(res["message"], "Notification provider is not configured")

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "pending")
        self.assertIsNone(alert.notified_at)

    def test_4_successful_webhook_dispatch(self):
        """Test 4: Successful alert dispatch updates state to delivered and populates notified_at."""
        alert = self._create_test_alert()
        secret = "secret-token-xyz-123"
        provider = WebhookNotificationProvider(
            webhook_url=self.server_url,
            secret_token=secret,
            timeout=3.0,
        )
        self.assertTrue(provider.is_configured)

        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertTrue(res["sent"])
        self.assertEqual(res["provider"], "webhook")
        self.assertIn("HTTP 200", res["message"])

        # Verify database state after success
        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "delivered")
        self.assertIsNotNone(alert.notified_at)

        # Verify mock server received exactly 1 webhook payload
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)
        req = MockWebhookHandler.received_requests[0]
        self.assertEqual(req["path"], "/webhook")
        self.assertEqual(req["headers"].get("Authorization"), f"Bearer {secret}")
        self.assertEqual(req["headers"].get("Content-Type"), "application/json")
        self.assertEqual(req["headers"].get("User-Agent"), "HoneyShield-X-Notification/1.0")

        # Verify payload fields match Alert entity
        payload = req["payload"]
        self.assertEqual(payload["event"], "alert.triggered")
        self.assertEqual(payload["alert_id"], alert.id)
        self.assertEqual(payload["attack_id"], alert.attack_id)
        self.assertEqual(payload["severity"], alert.severity)
        self.assertEqual(payload["alert_type"], alert.alert_type)
        self.assertEqual(payload["status"], alert.status)
        self.assertEqual(payload["message"], alert.message)
        self.assertIsNotNone(payload["created_at"])

    def test_5_failed_webhook_connection_refused(self):
        """Test 5: Unreachable endpoint returns controlled error without crashing and records failed status."""
        alert = self._create_test_alert()
        # Port 59999 is unbound
        provider = WebhookNotificationProvider(
            webhook_url="http://127.0.0.1:59999/webhook",
            timeout=1.0,
        )

        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res["sent"])
        self.assertEqual(res["provider"], "webhook")
        self.assertIn("connection error", res["message"].lower())

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "failed")
        self.assertIsNone(alert.notified_at)

    def test_6_failed_webhook_server_error_500(self):
        """Test 6: Upstream HTTP 500 error returns controlled failure with status code and failed status."""
        alert = self._create_test_alert()
        MockWebhookHandler.response_status = 500
        provider = WebhookNotificationProvider(
            webhook_url=self.server_url,
            timeout=3.0,
        )

        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res["sent"])
        self.assertEqual(res["provider"], "webhook")
        self.assertIn("500", res["message"])

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "failed")
        self.assertIsNone(alert.notified_at)

    def test_7_secret_token_never_leaked_in_error_message(self):
        """Test 7: Verification that credentials/secrets are never reflected in error messages."""
        alert = self._create_test_alert()
        sensitive_token = "SUPER_SECRET_HONEYSHIELD_BEARER_9999"
        provider = WebhookNotificationProvider(
            webhook_url="http://127.0.0.1:59999/webhook?token=LEAK_TEST",
            secret_token=sensitive_token,
            timeout=1.0,
        )

        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res["sent"])
        self.assertNotIn(sensitive_token, res["message"])

    def test_8_router_endpoint_schema_contract(self):
        """Test 8: Router endpoint returns valid NotificationDispatchResult schema."""
        alert = self._create_test_alert()

        # Call the endpoint directly with DB session
        result = dispatch_alert_endpoint(alert_id=alert.id, db=self.db)
        self.assertIsInstance(result, NotificationDispatchResult)
        self.assertEqual(result.alert_id, alert.id)
        self.assertIsInstance(result.sent, bool)
        self.assertIsInstance(result.provider, str)
        self.assertIsInstance(result.message, str)

    def test_9_duplicate_dispatch_sequential(self):
        """Test 9: Sequential duplicate dispatch returns sent=False and dispatches exactly once."""
        alert = self._create_test_alert()
        provider = WebhookNotificationProvider(
            webhook_url=self.server_url,
            timeout=3.0,
        )

        # Call 1: Successful initial dispatch
        res1 = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertTrue(res1["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "delivered")
        self.assertIsNotNone(alert.notified_at)

        # Call 2: Sequential duplicate dispatch attempt
        res2 = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res2["sent"])
        self.assertIn("already notified", res2["message"].lower())

        # Crucial check: Receiver request count MUST still be exactly 1
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    def test_10_failed_dispatch_and_retry(self):
        """Test 10: Failed dispatch sets status to failed and permits subsequent successful retry."""
        alert = self._create_test_alert()

        # Attempt 1: Server returns HTTP 500
        MockWebhookHandler.response_status = 500
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        res1 = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertFalse(res1["sent"])

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "failed")
        self.assertIsNone(alert.notified_at)

        # Attempt 2: Server recovered to HTTP 200 (Retry)
        MockWebhookHandler.response_status = 200
        MockWebhookHandler.received_requests = []  # Reset counter for retry verification

        res2 = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)
        self.assertTrue(res2["sent"])
        self.assertIn("HTTP 200", res2["message"])

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "delivered")
        self.assertIsNotNone(alert.notified_at)

        # Exactly 1 request received during successful retry
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    def test_11_concurrent_dispatch_race(self):
        """Test 11: Concurrent dispatches for the same alert race atomically; exactly one succeeds."""
        alert = self._create_test_alert()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        num_threads = 5
        results: list[dict] = []
        threads: list[threading.Thread] = []
        barrier = threading.Barrier(num_threads)

        def worker():
            thread_db = SessionLocal()
            try:
                barrier.wait()  # Synchronize threads to hit database simultaneously
                res = dispatch_alert_notification(db=thread_db, alert_id=alert.id, provider=provider)
                results.append(res)
            finally:
                thread_db.close()

        for _ in range(num_threads):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Verify exactly one caller reports sent=True
        sent_true = [r for r in results if r["sent"] is True]
        sent_false = [r for r in results if r["sent"] is False]
        self.assertEqual(len(sent_true), 1, f"Expected 1 sent=True, got {len(sent_true)}: {results}")
        self.assertEqual(len(sent_false), num_threads - 1)

        # Verify mock receiver received exactly 1 webhook payload
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

        # Verify final database state is 'delivered'
        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "delivered")
        self.assertIsNotNone(alert.notified_at)

    def test_12_in_flight_behavior(self):
        """Test 12: An alert marked in_flight is not dispatched again while lease is fresh."""
        alert = self._create_test_alert()
        # Manually put alert in in_flight with fresh lease timestamp
        alert.notification_status = "in_flight"
        alert.notified_at = datetime.now(timezone.utc).replace(tzinfo=None)
        self.db.commit()

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)

        self.assertFalse(res["sent"])
        self.assertIn("in flight", res["message"].lower())
        self.assertEqual(len(MockWebhookHandler.received_requests), 0)

    def test_13_stale_lease_recovery(self):
        """Test 13: A stale in_flight alert (> 30s old) can be safely reclaimed and dispatched."""
        alert = self._create_test_alert()
        # Set stale in_flight lease (60 seconds ago)
        stale_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=60)
        alert.notification_status = "in_flight"
        alert.notified_at = stale_time
        self.db.commit()

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        res = dispatch_alert_notification(db=self.db, alert_id=alert.id, provider=provider)

        self.assertTrue(res["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

        self.db.refresh(alert)
        self.assertEqual(alert.notification_status, "delivered")
        self.assertIsNotNone(alert.notified_at)
        self.assertGreater(alert.notified_at, stale_time)


if __name__ == "__main__":
    unittest.main()
