"""Automated unit and integration test suite for HoneyShield X Alert Manager (Module 2.5)."""

import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.alerts.service import (
    evaluate_attack_alert,
    get_alert,
    list_alerts,
    update_alert_status,
)
from app.database import SessionLocal
from app.models import Alert, Attack
from app.routers.alerts import (
    evaluate_alert_endpoint,
    get_alert_endpoint,
    list_alerts_endpoint,
    update_alert_status_endpoint,
)
from app.schemas import AlertStatusUpdate


class TestAlertManager(unittest.TestCase):
    """Test suite covering Alert Manager requirements."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            # Delete any alerts tied to test attacks
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(
        self,
        risk_score=78.5,
        severity="critical",
        source_ip="198.51.100.42",
        status="detected",
    ):
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip=source_ip,
            severity=severity,
            risk_score=risk_score,
            status=status,
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def test_1_high_risk_attack_creates_open_alert(self):
        """Test 1: Attack with risk_score >= 50.0 creates a new open alert in PostgreSQL."""
        attack = self._create_attack(risk_score=78.5, severity="critical")

        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(res["alert_created"])
        self.assertIsNotNone(res["alert_id"])
        self.assertEqual(res["status"], "open")
        self.assertEqual(res["severity"], "critical")
        self.assertEqual(res["risk_score"], 78.5)

        # Track for cleanup
        self.created_alert_ids.append(res["alert_id"])

        # Verify record exists in PostgreSQL
        alert_db = self.db.query(Alert).filter(Alert.id == res["alert_id"]).first()
        self.assertIsNotNone(alert_db)
        self.assertEqual(alert_db.attack_id, attack.id)
        self.assertEqual(alert_db.status, "open")
        self.assertEqual(alert_db.severity, "critical")
        self.assertIn("Security Alert", alert_db.message)

    def test_2_low_risk_attack_creates_no_alert(self):
        """Test 2: Attack with risk_score < 50.0 (low: 15.0) produces no alert."""
        attack = self._create_attack(risk_score=15.0, severity="low")

        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertFalse(res["alert_created"])
        self.assertIsNone(res["alert_id"])
        self.assertIsNone(res["status"])
        self.assertEqual(res["severity"], "low")
        self.assertEqual(res["risk_score"], 15.0)
        self.assertIn("below alert threshold", res["reason"])

        # Verify no alert row in database for this attack
        count = self.db.query(Alert).filter(Alert.attack_id == attack.id).count()
        self.assertEqual(count, 0)

    def test_3_medium_risk_attack_creates_no_alert(self):
        """Test 3: Attack with medium risk (35.0) produces no alert."""
        attack = self._create_attack(risk_score=35.0, severity="medium")

        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertFalse(res["alert_created"])
        self.assertIsNone(res["alert_id"])
        self.assertEqual(res["severity"], "medium")

    def test_4_duplicate_alert_suppression(self):
        """Test 4: Evaluating an attack with an existing active alert reuses it without duplicate rows."""
        attack = self._create_attack(risk_score=65.0, severity="high")

        # First evaluation: creates alert
        res1 = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(res1["alert_created"])
        first_alert_id = res1["alert_id"]
        self.created_alert_ids.append(first_alert_id)

        # Second evaluation: reuses existing active alert
        res2 = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertFalse(res2["alert_created"])
        self.assertEqual(res2["alert_id"], first_alert_id)
        self.assertEqual(res2["status"], "open")
        self.assertIn("already exists", res2["reason"])

        # Verify exactly 1 alert row exists in PostgreSQL for this attack
        total_alerts = self.db.query(Alert).filter(Alert.attack_id == attack.id).count()
        self.assertEqual(total_alerts, 1)

    def test_5_resolved_alert_allows_new_alert(self):
        """Test 5: If an alert is marked 'resolved', subsequent evaluation can create a new alert."""
        attack = self._create_attack(risk_score=80.0, severity="critical")

        # First alert created
        res1 = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.created_alert_ids.append(res1["alert_id"])

        # Mark first alert as resolved
        update_alert_status(db=self.db, alert_id=res1["alert_id"], new_status="resolved")

        # Second evaluation now creates a new alert
        res2 = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(res2["alert_created"])
        self.assertNotEqual(res2["alert_id"], res1["alert_id"])
        self.created_alert_ids.append(res2["alert_id"])

        # Verify 2 alerts exist in DB (1 resolved, 1 open)
        total_alerts = self.db.query(Alert).filter(Alert.attack_id == attack.id).count()
        self.assertEqual(total_alerts, 2)

    def test_6_nonexistent_attack_returns_404(self):
        """Test 6: Evaluating nonexistent attack ID returns HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            evaluate_attack_alert(db=self.db, attack_id=999999)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            evaluate_alert_endpoint(attack_id=999999, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_7_unscored_attack_returns_400(self):
        """Test 7: Attack with no risk scoring performed returns HTTP 400."""
        attack = self._create_attack(
            status="unscored",
            severity="unscored",
            risk_score=0.0,
        )

        with self.assertRaises(HTTPException) as ctx:
            evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Risk analysis has not been performed", ctx.exception.detail)

    def test_8_alert_lifecycle_status_transitions(self):
        """Test 8: Status transitions (open -> acknowledged -> resolved) and validation."""
        attack = self._create_attack(risk_score=70.0, severity="high")
        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        alert_id = res["alert_id"]
        self.created_alert_ids.append(alert_id)

        # Transition to acknowledged
        alert_ack = update_alert_status(db=self.db, alert_id=alert_id, new_status="acknowledged")
        self.assertEqual(alert_ack.status, "acknowledged")

        # Transition to resolved via router endpoint
        endpoint_res = update_alert_status_endpoint(
            alert_id=alert_id,
            update_data=AlertStatusUpdate(status="resolved"),
            db=self.db,
        )
        self.assertEqual(endpoint_res.status, "resolved")

        # Invalid status returns 422
        with self.assertRaises(HTTPException) as ctx:
            update_alert_status(db=self.db, alert_id=alert_id, new_status="invalid_status")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_9_list_and_get_alerts(self):
        """Test 9: Listing and fetching individual alert records."""
        attack = self._create_attack(risk_score=55.0, severity="high")
        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        alert_id = res["alert_id"]
        self.created_alert_ids.append(alert_id)

        # Fetch by ID
        alert_fetched = get_alert(db=self.db, alert_id=alert_id)
        self.assertEqual(alert_fetched.id, alert_id)

        # List all alerts
        alerts_list = list_alerts(db=self.db)
        self.assertTrue(any(a.id == alert_id for a in alerts_list))

        # Filter by status
        open_alerts = list_alerts(db=self.db, status_filter="open")
        self.assertTrue(any(a.id == alert_id for a in open_alerts))


if __name__ == "__main__":
    unittest.main()
