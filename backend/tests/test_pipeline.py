"""Automated unit and integration test suite for HoneyShield X Automated Pipeline Orchestrator (Module 2.7).

Tests cover:
1. Golden path (end-to-end execution of all 5 stages from a single invocation)
2. Below-threshold path (risk < 50.0 skips alert and notification cleanly)
3. Alert deduplication preservation across repeated runs
4. Notification deduplication preservation across repeated runs
5. Missing attack ID (HTTP 404)
6. Notification provider failure resilience (earlier stages unaffected)
7. Audit telemetry persistence in SystemEvent table
8. Router endpoint schema contract validation
"""

from datetime import datetime, timezone
import http.server
import json
import threading
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Alert, Attack, AttackEvent, SystemEvent, ThreatIntelligence
from app.notifications.webhook import WebhookNotificationProvider
from app.pipeline.service import execute_pipeline
from app.routers.pipeline import process_pipeline_endpoint
from app.schemas import PipelineExecutionResult


class MockWebhookHandler(http.server.BaseHTTPRequestHandler):
    """Threaded mock HTTP receiver to verify webhook dispatch payloads."""

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
        })

        self.send_response(self.__class__.response_status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status": "ok"}')

    def log_message(self, format, *args):
        # Suppress server logging during tests
        pass


class TestPipelineOrchestrator(unittest.TestCase):
    """Test suite covering Automated Pipeline Orchestrator requirements."""

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
        self.created_ti_ids: list[int] = []
        MockWebhookHandler.received_requests = []
        MockWebhookHandler.response_status = 200

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(Alert).filter(Alert.attack_id == aid).delete()
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        for ti_id in self.created_ti_ids:
            self.db.query(ThreatIntelligence).filter(ThreatIntelligence.id == ti_id).delete()
        # Clean test system events
        self.db.query(SystemEvent).filter(SystemEvent.source == "pipeline_orchestrator").delete()
        self.db.commit()
        self.db.close()

    def _create_high_risk_attack(self, source_ip: str = "198.51.100.99") -> Attack:
        """Create an attack with matching threat intel and 6 failed SSH events (triggers threshold)."""
        # Seed Threat Intel IOC
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=source_ip,
            threat_level="high",
            source="pipeline_test_intel",
            confidence=0.90,
            description="Malicious scanner IP",
        )
        self.db.add(ti)
        self.db.commit()
        self.db.refresh(ti)
        self.created_ti_ids.append(ti.id)

        # Create Attack container
        attack = Attack(
            attack_type="SSH Brute Force",
            source_ip=source_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        # Add 6 failed SSH events within recent window
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(6):
            ev = AttackEvent(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                source_ip=source_ip,
                message=f"Failed password for invalid user admin attempt {i}",
                event_time=now,
            )
            self.db.add(ev)
        self.db.commit()

        return attack

    def _create_low_risk_attack(self, source_ip: str = "192.0.2.55") -> Attack:
        """Create an attack without threat intel and 0 failed events (risk < 50.0)."""
        attack = Attack(
            attack_type="Benign Ping",
            source_ip=source_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def test_1_golden_path_end_to_end(self):
        """Test 1: Full golden path execution through all 5 pipeline stages."""
        attack = self._create_high_risk_attack()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        result = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)

        # 1. Overall pipeline completion
        self.assertEqual(result["pipeline_status"], "completed")
        self.assertEqual(result["attack_id"], attack.id)
        self.assertGreater(result["execution_time_ms"], 0.0)

        # 2. Stage 1 — Detection Engine
        detection = result["detection"]
        self.assertTrue(detection["detected"])
        self.assertEqual(detection["detection_type"], "ssh_brute_force")
        self.assertEqual(detection["severity"], "high")
        self.assertEqual(detection["evidence_count"], 6)

        # 3. Stage 2 — Threat Intelligence
        threat_intel = result["threat_intelligence"]
        self.assertTrue(threat_intel["found"])
        self.assertEqual(threat_intel["indicator_value"], attack.source_ip)
        self.assertEqual(threat_intel["threat_level"], "high")

        # 4. Stage 3 — Risk Scoring
        risk = result["risk_scoring"]
        self.assertGreaterEqual(risk["risk_score"], 50.0)
        self.assertIn(risk["severity"], ["high", "critical"])
        self.assertGreater(len(risk["factors"]), 0)

        # 5. Stage 4 — Alert Manager
        alert = result["alert"]
        self.assertTrue(alert["alert_created"])
        self.assertIsNotNone(alert["alert_id"])
        self.assertEqual(alert["status"], "open")

        # 6. Stage 5 — Notification Dispatch
        notification = result["notification"]
        self.assertTrue(notification["attempted"])
        self.assertTrue(notification["sent"])
        self.assertEqual(notification["provider"], "webhook")
        self.assertIn("HTTP 200", notification["message"])

        # 7. Verify receiver received exactly 1 webhook payload
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    def test_2_below_threshold_path(self):
        """Test 2: Low-risk attack executes detection & risk, but skips alert and notification."""
        attack = self._create_low_risk_attack()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        result = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)

        self.assertEqual(result["pipeline_status"], "completed")
        self.assertFalse(result["detection"]["detected"])
        self.assertFalse(result["threat_intelligence"]["found"])
        self.assertLess(result["risk_scoring"]["risk_score"], 50.0)

        # Alert must NOT be created
        alert = result["alert"]
        self.assertFalse(alert["alert_created"])
        self.assertIsNone(alert["alert_id"])
        self.assertIn("below alert threshold", alert["reason"].lower())

        # Notification must be skipped cleanly
        notification = result["notification"]
        self.assertFalse(notification["attempted"])
        self.assertFalse(notification["sent"])
        self.assertIn("skipped", notification["message"].lower())

        # Zero webhooks dispatched
        self.assertEqual(len(MockWebhookHandler.received_requests), 0)

    def test_3_existing_alert_deduplication(self):
        """Test 3: Repeated pipeline runs reuse existing active alert and prevent duplicate alert records."""
        attack = self._create_high_risk_attack()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        # Run 1
        res1 = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        alert_id_1 = res1["alert"]["alert_id"]
        self.assertTrue(res1["alert"]["alert_created"])

        # Run 2
        res2 = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        alert_id_2 = res2["alert"]["alert_id"]
        self.assertFalse(res2["alert"]["alert_created"])
        self.assertEqual(alert_id_1, alert_id_2)
        self.assertIn("already exists", res2["alert"]["reason"].lower())

        # Verify only 1 alert row exists in PostgreSQL for this attack
        count = self.db.query(Alert).filter(Alert.attack_id == attack.id).count()
        self.assertEqual(count, 1)

    def test_4_existing_notification_deduplication(self):
        """Test 4: Repeated pipeline runs preserve Module 2.6 duplicate-notification protection."""
        attack = self._create_high_risk_attack()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        # Run 1: Notification sent
        res1 = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        self.assertTrue(res1["notification"]["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

        # Run 2: Notification duplicate suppressed
        res2 = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        self.assertFalse(res2["notification"]["sent"])
        self.assertIn("already notified", res2["notification"]["message"].lower())

        # Crucial check: Receiver count MUST still be exactly 1
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    def test_5_missing_attack_raises_404(self):
        """Test 5: Nonexistent attack ID raises HTTP 404."""
        nonexistent_id = 9999999
        with self.assertRaises(HTTPException) as ctx:
            execute_pipeline(db=self.db, attack_id=nonexistent_id)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx_endpoint:
            process_pipeline_endpoint(attack_id=nonexistent_id, db=self.db)
        self.assertEqual(ctx_endpoint.exception.status_code, 404)

    def test_6_notification_provider_failure_resilience(self):
        """Test 6: Notification failure does not corrupt earlier pipeline results or crash pipeline."""
        attack = self._create_high_risk_attack()
        # Mock server returns HTTP 500
        MockWebhookHandler.response_status = 500
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        result = execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)

        # Pipeline overall succeeds with stage results intact
        self.assertEqual(result["pipeline_status"], "completed")
        self.assertTrue(result["detection"]["detected"])
        self.assertGreaterEqual(result["risk_scoring"]["risk_score"], 50.0)
        self.assertIsNotNone(result["alert"]["alert_id"])

        # Notification reports controlled failure
        notification = result["notification"]
        self.assertTrue(notification["attempted"])
        self.assertFalse(notification["sent"])
        self.assertIn("500", notification["message"])

    def test_7_audit_telemetry_system_event_recorded(self):
        """Test 7: Pipeline execution creates an audit record in the existing SystemEvent table."""
        attack = self._create_high_risk_attack()
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        execute_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)

        # Query SystemEvent table
        sys_event = (
            self.db.query(SystemEvent)
            .filter(
                SystemEvent.source == "pipeline_orchestrator",
                SystemEvent.event_type == "pipeline_execution",
            )
            .order_by(SystemEvent.id.desc())
            .first()
        )
        self.assertIsNotNone(sys_event)
        self.assertIn(f"Attack #{attack.id}", sys_event.message)
        self.assertIn("risk=", sys_event.message)

    def test_8_router_endpoint_schema_contract(self):
        """Test 8: Router endpoint returns valid PipelineExecutionResult schema."""
        attack = self._create_high_risk_attack()

        result = process_pipeline_endpoint(attack_id=attack.id, db=self.db)
        self.assertIsInstance(result, PipelineExecutionResult)
        self.assertEqual(result.attack_id, attack.id)
        self.assertEqual(result.pipeline_status, "completed")
        self.assertIsInstance(result.execution_time_ms, float)


if __name__ == "__main__":
    unittest.main()
