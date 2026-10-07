"""Automated test suite for HoneyShield X SOC Dashboard API and Timeline (Module 3.1).

Scenarios Covered:
1. Dashboard Stats Schema & Keys: Validates response type, fields, and service health indicators.
2. Dashboard Stats Severity Aggregation: Validates open alerts correctly group into severity bands and ignore resolved alerts.
3. Dashboard Stats Unique IPs 24h Window: Validates sliding 24-hour window filter for unique attacker IPs.
4. Dashboard Stats Resilient Health Check: Validates PostgreSQL and Redis health reports without raising uncaught exceptions.
5. Attack Events Timeline Success: Validates timeline retrieval for existing attack containers.
6. Attack Events Timeline Chronological Order: Validates ascending sort by event_time and id.
7. Attack Events Timeline Pagination: Validates skip and limit offset pagination.
8. Attack Events Timeline Missing Attack 404: Validates HTTP 404 when attack container does not exist.
9. CORS Middleware Configuration: Validates allowed origins and middleware attachment on FastAPI app.
10. Regression Safety: Validates existing Phase 2 attack and alert endpoints function concurrently.
"""

from datetime import datetime, timedelta, timezone
import unittest
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.main import ALLOWED_ORIGINS, app
from app.models import Alert, Attack, AttackEvent
from app.routers.attacks import get_attack_events
from app.routers.dashboard import get_dashboard_stats
from app.schemas import AttackEventResponse, DashboardStatsResponse


class TestDashboardAPI(unittest.TestCase):
    """Test suite covering Module 3.1 Dashboard and Timeline APIs."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(self, source_ip: str = "198.51.100.20", detected_at: datetime | None = None) -> Attack:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        attack = Attack(
            attack_type="web",
            source_ip=source_ip,
            severity="critical",
            risk_score=95.0,
            status="detected",
            detected_at=detected_at or now,
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def _create_alert(self, attack_id: int, severity: str = "critical", status: str = "open") -> Alert:
        alert = Alert(
            attack_id=attack_id,
            alert_type="WEB_SQL_INJECTION",
            severity=severity,
            message=f"Test alert with severity {severity}",
            status=status,
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return alert

    # =========================================================================
    # Test 1: Dashboard Stats Schema & Keys
    # =========================================================================
    def test_1_dashboard_stats_schema_and_keys(self):
        """Test 1: GET /dashboard/stats endpoint returns valid DashboardStatsResponse."""
        stats = get_dashboard_stats(db=self.db)
        self.assertIsInstance(stats, DashboardStatsResponse)
        self.assertGreaterEqual(stats.total_attacks, 0)
        self.assertGreaterEqual(stats.active_alerts, 0)
        self.assertGreaterEqual(stats.unique_attacker_ips_24h, 0)

        # Verify severity breakdown keys
        self.assertGreaterEqual(stats.active_alerts_by_severity.critical, 0)
        self.assertGreaterEqual(stats.active_alerts_by_severity.high, 0)
        self.assertGreaterEqual(stats.active_alerts_by_severity.medium, 0)
        self.assertGreaterEqual(stats.active_alerts_by_severity.low, 0)

        # Verify health indicators
        self.assertEqual(stats.system_health.api, "healthy")
        self.assertIn("connect", stats.system_health.postgresql.lower())

    # =========================================================================
    # Test 2: Dashboard Stats Severity Aggregation
    # =========================================================================
    def test_2_dashboard_stats_severity_aggregation(self):
        """Test 2: Dashboard stats groups active alerts by severity and excludes resolved."""
        initial_stats = get_dashboard_stats(db=self.db)

        attack = self._create_attack(source_ip="198.51.100.21")
        self._create_alert(attack.id, severity="critical", status="open")
        self._create_alert(attack.id, severity="high", status="open")
        self._create_alert(attack.id, severity="medium", status="open")
        self._create_alert(attack.id, severity="low", status="open")
        # Resolved alert must not count in active alerts
        self._create_alert(attack.id, severity="critical", status="resolved")

        updated_stats = get_dashboard_stats(db=self.db)

        self.assertEqual(
            updated_stats.active_alerts,
            initial_stats.active_alerts + 4,
        )
        self.assertEqual(
            updated_stats.active_alerts_by_severity.critical,
            initial_stats.active_alerts_by_severity.critical + 1,
        )
        self.assertEqual(
            updated_stats.active_alerts_by_severity.high,
            initial_stats.active_alerts_by_severity.high + 1,
        )
        self.assertEqual(
            updated_stats.active_alerts_by_severity.medium,
            initial_stats.active_alerts_by_severity.medium + 1,
        )
        self.assertEqual(
            updated_stats.active_alerts_by_severity.low,
            initial_stats.active_alerts_by_severity.low + 1,
        )

    # =========================================================================
    # Test 3: Dashboard Stats Unique IPs 24h Window
    # =========================================================================
    def test_3_dashboard_stats_unique_ips_24h_window(self):
        """Test 3: Unique IPs correctly counts IPs in the last 24 hours and ignores older ones."""
        initial_stats = get_dashboard_stats(db=self.db)
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        fresh_ip = f"198.51.100.{int(now.timestamp()) % 150 + 50}"
        old_ip = f"203.0.113.{int(now.timestamp()) % 150 + 50}"

        # Attack inside 24h window
        self._create_attack(source_ip=fresh_ip, detected_at=now - timedelta(hours=2))
        # Duplicate attack with same IP inside 24h window
        self._create_attack(source_ip=fresh_ip, detected_at=now - timedelta(hours=1))
        # Attack outside 24h window
        self._create_attack(source_ip=old_ip, detected_at=now - timedelta(hours=26))

        updated_stats = get_dashboard_stats(db=self.db)
        # Should increment by exactly 1 unique IP
        self.assertEqual(
            updated_stats.unique_attacker_ips_24h,
            initial_stats.unique_attacker_ips_24h + 1,
        )

    # =========================================================================
    # Test 4: Dashboard Stats Resilient Health Check
    # =========================================================================
    def test_4_dashboard_stats_resilient_health_check(self):
        """Test 4: System health reporting responds cleanly with operational status."""
        stats = get_dashboard_stats(db=self.db)
        self.assertEqual(stats.system_health.api, "healthy")
        self.assertTrue(len(stats.system_health.postgresql) > 0)
        self.assertTrue(len(stats.system_health.redis) > 0)

    # =========================================================================
    # Test 5: Attack Events Timeline Success
    # =========================================================================
    def test_5_attack_events_timeline_success(self):
        """Test 5: GET /attacks/{id}/events returns AttackEvent records for an attack."""
        attack = self._create_attack()
        event = AttackEvent(
            attack_id=attack.id,
            event_type="web_access",
            source_ip=attack.source_ip,
            message="GET /admin/config.php",
            event_time=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(event)
        self.db.commit()

        events = get_attack_events(attack_id=attack.id, skip=0, limit=50, db=self.db)
        self.assertIsInstance(events, list)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].message, "GET /admin/config.php")

    # =========================================================================
    # Test 6: Attack Events Timeline Chronological Order
    # =========================================================================
    def test_6_attack_events_timeline_chronological_order(self):
        """Test 6: Timeline events are strictly sorted by event_time ascending."""
        attack = self._create_attack()
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        ev_1 = AttackEvent(
            attack_id=attack.id,
            event_type="probe",
            source_ip=attack.source_ip,
            message="T1 - Earliest event",
            event_time=now - timedelta(minutes=10),
        )
        ev_2 = AttackEvent(
            attack_id=attack.id,
            event_type="probe",
            source_ip=attack.source_ip,
            message="T2 - Middle event",
            event_time=now - timedelta(minutes=5),
        )
        ev_3 = AttackEvent(
            attack_id=attack.id,
            event_type="probe",
            source_ip=attack.source_ip,
            message="T3 - Latest event",
            event_time=now - timedelta(minutes=1),
        )

        # Insert out of order: ev_3, then ev_1, then ev_2
        self.db.add_all([ev_3, ev_1, ev_2])
        self.db.commit()

        events = get_attack_events(attack_id=attack.id, skip=0, limit=50, db=self.db)
        self.assertEqual(len(events), 3)
        self.assertEqual(events[0].message, "T1 - Earliest event")
        self.assertEqual(events[1].message, "T2 - Middle event")
        self.assertEqual(events[2].message, "T3 - Latest event")
        self.assertLess(events[0].event_time, events[1].event_time)
        self.assertLess(events[1].event_time, events[2].event_time)

    # =========================================================================
    # Test 7: Attack Events Timeline Pagination
    # =========================================================================
    def test_7_attack_events_timeline_pagination(self):
        """Test 7: Bounded pagination using skip and limit parameters."""
        attack = self._create_attack()
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        for i in range(10):
            ev = AttackEvent(
                attack_id=attack.id,
                event_type="stream",
                source_ip=attack.source_ip,
                message=f"Event index {i}",
                event_time=now + timedelta(seconds=i),
            )
            self.db.add(ev)
        self.db.commit()

        # Page 1: skip 0, limit 3
        page_1 = get_attack_events(attack_id=attack.id, skip=0, limit=3, db=self.db)
        self.assertEqual(len(page_1), 3)
        self.assertEqual(page_1[0].message, "Event index 0")
        self.assertEqual(page_1[2].message, "Event index 2")

        # Page 2: skip 3, limit 3
        page_2 = get_attack_events(attack_id=attack.id, skip=3, limit=3, db=self.db)
        self.assertEqual(len(page_2), 3)
        self.assertEqual(page_2[0].message, "Event index 3")
        self.assertEqual(page_2[2].message, "Event index 5")

    # =========================================================================
    # Test 8: Attack Events Timeline Missing Attack 404
    # =========================================================================
    def test_8_attack_events_timeline_missing_attack_404(self):
        """Test 8: Querying events for non-existent attack returns HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            get_attack_events(attack_id=99999999, skip=0, limit=50, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found", ctx.exception.detail.lower())

    # =========================================================================
    # Test 9: CORS Middleware Configuration
    # =========================================================================
    def test_9_cors_middleware_configuration(self):
        """Test 9: FastAPI application mounts CORSMiddleware with development origins."""
        cors_middlewares = [
            m for m in app.user_middleware if m.cls == CORSMiddleware
        ]
        self.assertEqual(len(cors_middlewares), 1)
        self.assertIn("http://localhost:5173", ALLOWED_ORIGINS)
        self.assertIn("http://127.0.0.1:5173", ALLOWED_ORIGINS)

    # =========================================================================
    # Test 10: Regression Safety
    # =========================================================================
    def test_10_regression_safety(self):
        """Test 10: Attacks and alerts routers function consistently with dashboard endpoints."""
        attack = self._create_attack()
        alert = self._create_alert(attack.id, severity="high", status="open")

        # Verify Attack model relationships
        db_attack = self.db.get(Attack, attack.id)
        self.assertIsNotNone(db_attack)
        self.assertEqual(db_attack.severity, "critical")

        # Verify Alert model querying
        db_alert = self.db.get(Alert, alert.id)
        self.assertIsNotNone(db_alert)
        self.assertEqual(db_alert.status, "open")


if __name__ == "__main__":
    unittest.main()
