"""Automated unit and integration test suite for HoneyShield X Multi-Vector Detection Engine (Module 2.9).

15 Mandatory Test Scenarios:
1. Single Auth Rule: >= 5 Telnet failure events trigger AUTH_BRUTE_FORCE (vector='auth')
2. Single Web Rule (Traversal): GET /../../etc/passwd triggers WEB_PATH_TRAVERSAL (vector='web')
3. Single Web Rule (SQLi): admin' UNION SELECT 1,2-- triggers WEB_SQL_INJECTION (vector='web')
4. Single Web Rule (RCE): ; id; whoami triggers WEB_COMMAND_INJECTION (vector='web')
5. Single Network Rule: >= 5 port probes trigger PORT_SCAN_SWEEP (vector='network')
6. In-Container Multi-Vector Attack: Web + Port sweep in same container returns is_multi_vector=True
7. Cross-Attack Multi-Vector Query: IP query across 2 containers (Web + Auth) returns is_multi_vector=True
8. Benign Traffic Below Threshold: Normal requests return detected=False
9. Time-Window Cutoff: Events older than window_minutes are excluded
10. Malicious Oversized Payload (DoS Test): 100 KB payload truncated to 4 KB and processed safely in < 5ms
11. Query Truncation Flag: 250 web events sets truncated=True with accurate counts
12. Frozen Module 2.2 Compatibility: Module 2.2 detect_ssh_brute_force operates intact
13. Frozen Module 2.4 Compatibility: Module 2.4 calculate_attack_risk operates intact
14. Frozen Module 2.8 Compatibility: Module 2.8 correlate_source_ip operates intact
15. Audit Telemetry Persistence: SystemEvent persisted for positive detections
16. Router API Endpoints: Validates analyze_attack_endpoint and analyze_ip_endpoint
"""

from datetime import datetime, timedelta, timezone
import time
import unittest
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.correlation.service import correlate_source_ip
from app.database import SessionLocal
from app.detection.service import detect_ssh_brute_force
from app.models import Attack, AttackEvent, SystemEvent
from app.multi_vector_detection.registry import default_registry
from app.multi_vector_detection.service import (
    evaluate_attack_rules,
    evaluate_ip_rules,
    scan_payload,
)
from app.risk.service import calculate_attack_risk
from app.routers.multi_vector_detection import (
    analyze_attack_endpoint,
    analyze_ip_endpoint,
)
from app.schemas import MultiVectorDetectionResponse


class TestMultiVectorDetectionEngine(unittest.TestCase):
    """Test suite covering all Module 2.9 Multi-Vector Detection Engine requirements."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        # Clean up existing multi_vector_detection audit events
        self.db.query(SystemEvent).filter(
            SystemEvent.source == "multi_vector_detection_engine"
        ).delete()
        self.db.commit()

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        self.db.query(SystemEvent).filter(
            SystemEvent.source == "multi_vector_detection_engine"
        ).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(
        self,
        source_ip: str = "198.51.100.77",
        attack_type: str = "web_attack",
        minutes_ago: int = 0,
    ) -> Attack:
        detected_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=minutes_ago
        )
        attack = Attack(
            attack_type=attack_type,
            source_ip=source_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
            detected_at=detected_at,
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def _create_event(
        self,
        attack_id: int,
        event_type: str = "http_request",
        source_ip: str = "198.51.100.77",
        message: str = "GET /index.html",
        minutes_ago: int = 0,
    ) -> AttackEvent:
        event_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=minutes_ago
        )
        event = AttackEvent(
            attack_id=attack_id,
            event_type=event_type,
            source_ip=source_ip,
            message=message,
            event_time=event_time,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    # 1. Single Auth Rule
    def test_1_single_auth_rule(self):
        """Test >= 5 Telnet failure events trigger AUTH_BRUTE_FORCE."""
        attack = self._create_attack(attack_type="telnet_probe")
        for i in range(5):
            self._create_event(
                attack_id=attack.id,
                event_type="telnet_login_failed",
                message=f"Telnet authentication failed for user test{i}",
                minutes_ago=1,
            )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], ["auth"])
        self.assertEqual(len(res["rules_triggered"]), 1)
        self.assertEqual(res["rules_triggered"][0]["rule_id"], "AUTH_BRUTE_FORCE")
        self.assertEqual(res["rules_triggered"][0]["evidence_count"], 5)
        self.assertEqual(res["severity"], "high")
        self.assertEqual(res["suggested_risk_score"], 8.0)

    # 2. Single Web Rule (Traversal)
    def test_2_single_web_path_traversal(self):
        """Test GET /../../etc/passwd triggers WEB_PATH_TRAVERSAL."""
        attack = self._create_attack(attack_type="web_attack")
        self._create_event(
            attack_id=attack.id,
            event_type="http_request",
            message="GET /../../etc/passwd HTTP/1.1",
            minutes_ago=2,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], ["web"])
        rule_ids = [r["rule_id"] for r in res["rules_triggered"]]
        self.assertIn("WEB_PATH_TRAVERSAL", rule_ids)
        self.assertEqual(res["severity"], "high")
        self.assertEqual(res["suggested_risk_score"], 8.5)

    # 3. Single Web Rule (SQLi)
    def test_3_single_web_sql_injection(self):
        """Test admin' UNION SELECT 1,2-- triggers WEB_SQL_INJECTION."""
        attack = self._create_attack(attack_type="web_attack")
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="POST /login username=admin' UNION SELECT 1,2--",
            minutes_ago=2,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], ["web"])
        rule_ids = [r["rule_id"] for r in res["rules_triggered"]]
        self.assertIn("WEB_SQL_INJECTION", rule_ids)
        self.assertEqual(res["severity"], "critical")
        self.assertEqual(res["suggested_risk_score"], 9.5)

    # 4. Single Web Rule (RCE)
    def test_4_single_web_command_injection(self):
        """Test ; id; whoami triggers WEB_COMMAND_INJECTION."""
        attack = self._create_attack(attack_type="web_attack")
        self._create_event(
            attack_id=attack.id,
            event_type="web_probe",
            message="GET /cgi-bin/test?cmd=; id; whoami HTTP/1.1",
            minutes_ago=2,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], ["web"])
        rule_ids = [r["rule_id"] for r in res["rules_triggered"]]
        self.assertIn("WEB_COMMAND_INJECTION", rule_ids)
        self.assertEqual(res["severity"], "critical")
        self.assertEqual(res["suggested_risk_score"], 9.5)

    # 5. Single Network Rule
    def test_5_single_network_port_scan_sweep(self):
        """Test >= 5 distinct port probes trigger PORT_SCAN_SWEEP."""
        attack = self._create_attack(attack_type="port_scan")
        ports = [21, 22, 23, 80, 443, 8080]
        for p in ports:
            self._create_event(
                attack_id=attack.id,
                event_type="port_probe",
                message=f"TCP SYN probe to port {p}",
                minutes_ago=1,
            )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], ["network"])
        self.assertEqual(len(res["rules_triggered"]), 1)
        self.assertEqual(res["rules_triggered"][0]["rule_id"], "PORT_SCAN_SWEEP")
        self.assertEqual(res["rules_triggered"][0]["evidence_count"], 6)
        self.assertEqual(res["severity"], "medium")
        self.assertEqual(res["suggested_risk_score"], 7.0)

    # 6. In-Container Multi-Vector Attack
    def test_6_in_container_multi_vector_attack(self):
        """Test container with Web + Port Probe triggers both rules and returns is_multi_vector=True."""
        attack = self._create_attack(attack_type="composite_attack")
        # Web payload
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="GET /../../etc/passwd HTTP/1.1",
            minutes_ago=3,
        )
        # 5 distinct network probes
        for p in [22, 80, 443, 3306, 5432]:
            self._create_event(
                attack_id=attack.id,
                event_type="port_probe",
                message=f"Scan port {p}",
                minutes_ago=2,
            )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertTrue(res["is_multi_vector"])
        self.assertEqual(sorted(res["vectors_detected"]), ["network", "web"])
        self.assertEqual(res["severity"], "high")  # max(high, medium)
        # Risk score includes multi-vector synergy boost: 8.5 + 0.5 = 9.0
        self.assertEqual(res["suggested_risk_score"], 9.0)

    # 7. Cross-Attack Multi-Vector Query
    def test_7_cross_attack_multi_vector_ip_query(self):
        """Test IP query across 2 containers (Web + Auth) returns is_multi_vector=True."""
        ip = "198.51.100.99"
        # Attack 1: Web SQLi
        attack1 = self._create_attack(source_ip=ip, attack_type="web_attack")
        self._create_event(
            attack_id=attack1.id,
            event_type="web_access",
            source_ip=ip,
            message="POST /api/search q=admin' UNION SELECT 1,2--",
            minutes_ago=5,
        )

        # Attack 2: Auth brute force
        attack2 = self._create_attack(source_ip=ip, attack_type="ftp_probe")
        for i in range(5):
            self._create_event(
                attack_id=attack2.id,
                event_type="ftp_login_failed",
                source_ip=ip,
                message=f"FTP login failed for user ftpuser{i}",
                minutes_ago=3,
            )

        res = evaluate_ip_rules(self.db, source_ip=ip, window_minutes=15)
        self.assertTrue(res["detected"])
        self.assertTrue(res["is_multi_vector"])
        self.assertEqual(sorted(res["vectors_detected"]), ["auth", "web"])
        self.assertIn(attack1.id, res["attack_ids"])
        self.assertIn(attack2.id, res["attack_ids"])
        self.assertEqual(res["severity"], "critical")
        self.assertEqual(res["suggested_risk_score"], 10.0)  # 9.5 + 0.5 = 10.0

    # 8. Benign Traffic Below Threshold
    def test_8_benign_traffic_below_threshold(self):
        """Test isolated normal requests return detected=False."""
        attack = self._create_attack(attack_type="web_access")
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="GET /images/logo.png HTTP/1.1",
            minutes_ago=2,
        )
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="GET /style.css HTTP/1.1",
            minutes_ago=1,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertFalse(res["detected"])
        self.assertFalse(res["is_multi_vector"])
        self.assertEqual(res["vectors_detected"], [])
        self.assertEqual(res["rules_triggered"], [])
        self.assertEqual(res["suggested_risk_score"], 0.0)
        self.assertEqual(res["severity"], "low")

    # 9. Time-Window Cutoff
    def test_9_time_window_cutoff(self):
        """Test events older than window_minutes are strictly excluded."""
        attack = self._create_attack(attack_type="web_attack")
        # Event created 30 minutes ago (outside default 15m window)
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="GET /../../etc/passwd HTTP/1.1",
            minutes_ago=30,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertFalse(res["detected"])
        self.assertEqual(res["total_event_count"], 0)

        # In a wider window (45m), it should be detected
        res_wide = evaluate_attack_rules(self.db, attack.id, window_minutes=45)
        self.assertTrue(res_wide["detected"])
        self.assertEqual(res_wide["total_event_count"], 1)

    # 10. Malicious Oversized Payload (DoS Test)
    def test_10_oversized_payload_safe_scan(self):
        """Test 100 KB payload is truncated to 4 KB and processed safely in < 5ms."""
        rule = default_registry.get_rule("WEB_PATH_TRAVERSAL")
        self.assertIsNotNone(rule)

        # Create 100 KB payload with traversal at beginning and large padding
        oversized_payload = "GET /../../etc/passwd HTTP/1.1\r\n" + ("X" * 100_000)
        start_time = time.perf_counter()
        matches = scan_payload(oversized_payload, rule)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        self.assertIn("../", matches)
        self.assertIn("/etc/passwd", matches)
        self.assertLess(elapsed_ms, 5.0, f"Payload scan took {elapsed_ms:.2f}ms, expected < 5ms")

        # Verify that attack evaluation with oversized payload completes quickly
        attack = self._create_attack(attack_type="web_attack")
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message=oversized_payload,
            minutes_ago=1,
        )
        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])

    # 11. Query Truncation Flag
    def test_11_query_truncation_flag(self):
        """Test ingesting 250 web events sets truncated=True with accurate counts."""
        attack = self._create_attack(attack_type="web_probe")
        # Ingest 250 events
        for i in range(250):
            event = AttackEvent(
                attack_id=attack.id,
                event_type="web_probe",
                source_ip="198.51.100.77",
                message=f"GET /page_{i}.html",
                event_time=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=i),
            )
            self.db.add(event)
        self.db.commit()

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["truncated"])
        self.assertEqual(res["total_event_count"], 250)
        self.assertEqual(res["analyzed_event_count"], 200)

    # 12. Frozen Module 2.2 Compatibility
    def test_12_frozen_module_2_2_compatibility(self):
        """Verify Module 2.2 detect_ssh_brute_force continues to function unmodified."""
        attack = self._create_attack(attack_type="ssh_brute_force")
        for i in range(6):
            self._create_event(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                message=f"Failed password for user{i}",
                minutes_ago=1,
            )
        det_res = detect_ssh_brute_force(self.db, attack=attack)
        self.assertTrue(det_res.detected)
        self.assertEqual(det_res.detection_type, "ssh_brute_force")

    # 13. Frozen Module 2.4 Compatibility
    def test_13_frozen_module_2_4_compatibility(self):
        """Verify Module 2.4 calculate_attack_risk continues to function unmodified."""
        attack = self._create_attack(attack_type="ssh_probe")
        for _ in range(6):
            self._create_event(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                message="Failed login",
                minutes_ago=1,
            )
        risk_res = calculate_attack_risk(self.db, attack_id=attack.id)
        self.assertIn("risk_score", risk_res)
        self.assertIn("severity", risk_res)

    # 14. Frozen Module 2.8 Compatibility
    def test_14_frozen_module_2_8_compatibility(self):
        """Verify Module 2.8 correlate_source_ip continues to function unmodified."""
        ip = "198.51.100.123"
        # 3 separate attacks for distributed_burst
        for _ in range(3):
            att = self._create_attack(source_ip=ip, attack_type="probe")
            self._create_event(attack_id=att.id, source_ip=ip, event_type="probe", minutes_ago=5)
            self._create_event(attack_id=att.id, source_ip=ip, event_type="probe", minutes_ago=5)

        corr_res = correlate_source_ip(self.db, source_ip=ip, window_hours=24)
        self.assertTrue(corr_res["correlated"])
        self.assertEqual(corr_res["correlation_type"], "distributed_burst")

    # 15. Audit Telemetry Persistence
    def test_15_audit_telemetry_persistence(self):
        """Verify positive detections persist a sanitized record in SystemEvent table."""
        attack = self._create_attack(attack_type="web_attack")
        self._create_event(
            attack_id=attack.id,
            event_type="web_access",
            message="GET /../../etc/passwd HTTP/1.1",
            minutes_ago=1,
        )

        res = evaluate_attack_rules(self.db, attack.id, window_minutes=15)
        self.assertTrue(res["detected"])

        # Check SystemEvent record
        audit_event = (
            self.db.query(SystemEvent)
            .filter(
                SystemEvent.source == "multi_vector_detection_engine",
                SystemEvent.event_type == "multi_vector_detection",
            )
            .order_by(SystemEvent.id.desc())
            .first()
        )
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.severity, "high")
        self.assertIn(f"attack_id={attack.id}", audit_event.message)
        self.assertIn("WEB_PATH_TRAVERSAL", audit_event.message)

    # 16. Router API Endpoints & Error Handling
    def test_16_router_endpoints(self):
        """Test FastAPI router endpoints for analyze and ip queries."""
        attack = self._create_attack(source_ip="198.51.100.88")
        self._create_event(
            attack_id=attack.id,
            source_ip="198.51.100.88",
            event_type="web_probe",
            message="GET /?q=admin' UNION SELECT 1,2--",
            minutes_ago=1,
        )

        # 16.1 POST /analyze/{attack_id} endpoint
        res_attack = analyze_attack_endpoint(
            attack_id=attack.id,
            window_minutes=15,
            db=self.db,
        )
        self.assertIsInstance(res_attack, MultiVectorDetectionResponse)
        self.assertTrue(res_attack.detected)
        self.assertEqual(res_attack.severity, "critical")

        # 16.2 Missing attack -> 404
        with self.assertRaises(HTTPException) as cm_404:
            analyze_attack_endpoint(attack_id=999999999, window_minutes=15, db=self.db)
        self.assertEqual(cm_404.exception.status_code, status.HTTP_404_NOT_FOUND)

        # 16.3 GET /ip/{source_ip} endpoint
        res_ip = analyze_ip_endpoint(
            source_ip="198.51.100.88",
            window_minutes=15,
            db=self.db,
        )
        self.assertIsInstance(res_ip, MultiVectorDetectionResponse)
        self.assertTrue(res_ip.detected)
        self.assertEqual(res_ip.source_ip, "198.51.100.88")

        # 16.4 Invalid IP -> 422
        with self.assertRaises(HTTPException) as cm_invalid_ip:
            analyze_ip_endpoint(source_ip="not-an-ip", window_minutes=15, db=self.db)
        self.assertEqual(cm_invalid_ip.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        # 16.5 Invalid window -> 422
        with self.assertRaises(HTTPException) as cm_invalid_win:
            analyze_ip_endpoint(source_ip="198.51.100.88", window_minutes=0, db=self.db)
        self.assertEqual(cm_invalid_win.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        with self.assertRaises(HTTPException) as cm_invalid_win2:
            analyze_ip_endpoint(source_ip="198.51.100.88", window_minutes=61, db=self.db)
        self.assertEqual(cm_invalid_win2.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
