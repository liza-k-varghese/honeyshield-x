"""Automated unit and integration test suite for HoneyShield X Correlation Engine (Module 2.8).

Tests cover:
1. Multi-attack burst (same source IP across 3 separate attack containers)
2. Multi-vector (different event types / attack vectors)
3. Persistent attacker (repeated activity across containers over time)
4. Single benign activity (isolated attack/event below thresholds)
5. Time-window cutoff (events outside the window are excluded)
6. Clean / unobserved IP (zero attacks, zero events, uncorrelated)
7. Invalid IP (HTTP 422 validation failure)
8. Missing attack (HTTP 404 error)
9. Invalid window (HTTP 422 for window < 1 or > 168)
10. Audit telemetry (SystemEvent recorded for high-confidence correlation >= 0.7)
11. Endpoints integration (router responses validate against CorrelationResultResponse schema)
"""

from datetime import datetime, timedelta, timezone
import unittest
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.correlation.service import correlate_attack, correlate_source_ip
from app.database import SessionLocal
from app.models import Attack, AttackEvent, SystemEvent
from app.routers.correlation import correlate_attack_endpoint, correlate_ip_endpoint
from app.schemas import CorrelationResultResponse


class TestCorrelationEngine(unittest.TestCase):
    """Test suite covering all Module 2.8 Security Event Correlation Engine requirements."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        # Clear test audit events from correlation engine
        self.db.query(SystemEvent).filter(SystemEvent.source == "correlation_engine").delete()
        self.db.commit()

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        self.db.query(SystemEvent).filter(SystemEvent.source == "correlation_engine").delete()
        self.db.commit()
        self.db.close()

    def _create_attack(
        self,
        source_ip: str = "198.51.100.50",
        attack_type: str = "ssh_probe",
        minutes_ago: int = 0,
    ) -> Attack:
        detected_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=minutes_ago)
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
        source_ip: str = "198.51.100.50",
        event_type: str = "ssh_login_failed",
        minutes_ago: int = 0,
    ) -> AttackEvent:
        event_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=minutes_ago)
        event = AttackEvent(
            attack_id=attack_id,
            source_ip=source_ip,
            event_type=event_type,
            message=f"Correlation test event: {event_type}",
            event_time=event_time,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def test_1_multi_attack_burst(self):
        """Test 1: Activity from same source_ip distributed across 3 separate Attack containers."""
        ip = "198.51.100.50"
        a1 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=15)
        a2 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=10)
        a3 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=5)

        # 2 events each = 6 aggregate events (individual containers stay below single-attack threshold)
        self._create_event(a1.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=15)
        self._create_event(a1.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=14)
        self._create_event(a2.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=10)
        self._create_event(a2.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=9)
        self._create_event(a3.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=5)
        self._create_event(a3.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=4)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        self.assertTrue(result["correlated"])
        self.assertEqual(result["correlation_type"], "distributed_burst")
        self.assertEqual(result["total_attacks"], 3)
        self.assertEqual(result["total_events"], 6)
        self.assertGreaterEqual(result["confidence"], 0.7)
        self.assertIn(a1.id, result["correlated_attack_ids"])
        self.assertIn(a2.id, result["correlated_attack_ids"])
        self.assertIn(a3.id, result["correlated_attack_ids"])

    def test_2_multi_vector(self):
        """Test 2: Same source_ip spanning multiple event types / vectors."""
        ip = "198.51.100.51"
        attack = self._create_attack(source_ip=ip, attack_type="multi_vector_probe", minutes_ago=20)

        # Activity spanning ssh_login_failed + web_access
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=18)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=15)
        self._create_event(attack.id, source_ip=ip, event_type="web_access", minutes_ago=10)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        self.assertTrue(result["correlated"])
        self.assertEqual(result["correlation_type"], "multi_vector")
        self.assertIn("ssh_login_failed", result["attack_types"])
        self.assertIn("web_access", result["attack_types"])
        self.assertGreaterEqual(result["confidence"], 0.7)
        self.assertIn("Multi-vector", result["reason"])

    def test_3_persistent_attacker(self):
        """Test 3: Repeated activity from same source_ip across multiple attack containers over time."""
        ip = "198.51.100.52"
        a1 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=120)
        a2 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=10)

        self._create_event(a1.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=120)
        self._create_event(a1.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=115)
        self._create_event(a2.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=10)
        self._create_event(a2.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=5)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        self.assertTrue(result["correlated"])
        self.assertEqual(result["correlation_type"], "persistent_attacker")
        self.assertEqual(result["total_attacks"], 2)
        self.assertEqual(result["total_events"], 4)
        self.assertGreaterEqual(result["confidence"], 0.7)
        self.assertIn("Persistent attacker", result["reason"])

    def test_4_single_benign_activity(self):
        """Test 4: One isolated attack and event should not be correlated."""
        ip = "198.51.100.53"
        attack = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=5)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=5)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        self.assertFalse(result["correlated"])
        self.assertEqual(result["correlation_type"], "none")
        self.assertEqual(result["confidence"], 0.0)
        self.assertEqual(result["total_attacks"], 1)
        self.assertEqual(result["total_events"], 1)

    def test_5_time_window_cutoff(self):
        """Test 5: Events outside configured time window must be strictly excluded."""
        ip = "198.51.100.54"
        attack = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=30)

        # 2 events within window (10 and 20 minutes ago)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=20)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=10)

        # 3 events outside window (30 hours ago, default window is 24 hours)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=30 * 60)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=31 * 60)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=32 * 60)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        # Only the 2 recent events should be counted
        self.assertEqual(result["total_events"], 2)
        self.assertFalse(result["correlated"])

    def test_6_clean_unobserved_ip(self):
        """Test 6: Querying an unobserved IP returns empty correlation with zero counts."""
        ip = "198.51.100.99"
        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)

        self.assertFalse(result["correlated"])
        self.assertEqual(result["correlation_type"], "none")
        self.assertEqual(result["confidence"], 0.0)
        self.assertEqual(result["total_attacks"], 0)
        self.assertEqual(result["total_events"], 0)
        self.assertEqual(result["attack_types"], [])
        self.assertEqual(result["correlated_attack_ids"], [])

    def test_7_invalid_ip(self):
        """Test 7: Invalid IP format raises HTTP 422."""
        with self.assertRaises(HTTPException) as cm:
            correlate_source_ip(self.db, source_ip="not-an-ip-address", window_hours=24)
        self.assertEqual(cm.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        with self.assertRaises(HTTPException) as cm_router:
            correlate_ip_endpoint(source_ip="999.999.999.999", window_hours=24, db=self.db)
        self.assertEqual(cm_router.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    def test_8_missing_attack(self):
        """Test 8: Unknown attack ID raises HTTP 404."""
        with self.assertRaises(HTTPException) as cm:
            correlate_attack(self.db, attack_id=9999999, window_hours=24)
        self.assertEqual(cm.exception.status_code, status.HTTP_404_NOT_FOUND)

        with self.assertRaises(HTTPException) as cm_router:
            correlate_attack_endpoint(attack_id=9999999, window_hours=24, db=self.db)
        self.assertEqual(cm_router.exception.status_code, status.HTTP_404_NOT_FOUND)

    def test_9_invalid_window(self):
        """Test 9: window_hours outside [1, 168] raises HTTP 422."""
        with self.assertRaises(HTTPException) as cm_low:
            correlate_source_ip(self.db, source_ip="198.51.100.50", window_hours=0)
        self.assertEqual(cm_low.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

        with self.assertRaises(HTTPException) as cm_high:
            correlate_source_ip(self.db, source_ip="198.51.100.50", window_hours=169)
        self.assertEqual(cm_high.exception.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    def test_10_audit_telemetry(self):
        """Test 10: High-confidence correlation (confidence >= 0.7) records a SystemEvent."""
        ip = "198.51.100.55"
        a1 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=15)
        a2 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=10)
        a3 = self._create_attack(source_ip=ip, attack_type="ssh_probe", minutes_ago=5)

        for aid in [a1.id, a2.id, a3.id]:
            self._create_event(aid, source_ip=ip, event_type="ssh_login_failed", minutes_ago=5)
            self._create_event(aid, source_ip=ip, event_type="ssh_login_failed", minutes_ago=4)

        result = correlate_source_ip(self.db, source_ip=ip, window_hours=24)
        self.assertGreaterEqual(result["confidence"], 0.7)

        # Verify audit event in SystemEvent table
        audit_event = (
            self.db.query(SystemEvent)
            .filter(
                SystemEvent.event_type == "correlation_detected",
                SystemEvent.source == "correlation_engine",
            )
            .first()
        )
        self.assertIsNotNone(audit_event)
        self.assertIn(ip, audit_event.message)
        self.assertIn("distributed_burst", audit_event.message)

    def test_11_endpoints_integration(self):
        """Test 11: Endpoints return validated CorrelationResultResponse schema objects."""
        ip = "198.51.100.56"
        attack = self._create_attack(source_ip=ip, attack_type="probe", minutes_ago=10)
        self._create_event(attack.id, source_ip=ip, event_type="ssh_login_failed", minutes_ago=10)
        self._create_event(attack.id, source_ip=ip, event_type="web_access", minutes_ago=5)

        # Test POST /api/v1/correlation/analyze/{attack_id}
        res_attack = correlate_attack_endpoint(attack_id=attack.id, window_hours=24, db=self.db)
        self.assertIsInstance(res_attack, CorrelationResultResponse)
        self.assertEqual(res_attack.source_ip, ip)
        self.assertTrue(res_attack.correlated)
        self.assertEqual(res_attack.correlation_type, "multi_vector")

        # Test GET /api/v1/correlation/ip/{source_ip}
        res_ip = correlate_ip_endpoint(source_ip=ip, window_hours=24, db=self.db)
        self.assertIsInstance(res_ip, CorrelationResultResponse)
        self.assertEqual(res_ip.source_ip, ip)
        self.assertTrue(res_ip.correlated)
        self.assertEqual(res_ip.correlation_type, "multi_vector")
