"""Automated unit and integration test suite for HoneyShield X Risk Scoring (Module 2.4)."""

import unittest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Attack, AttackEvent, ThreatIntelligence
from app.risk.service import (
    calculate_attack_risk,
    get_severity_band,
)
from app.routers.risk import analyze_risk_endpoint


class TestRiskScoring(unittest.TestCase):
    """Test suite covering all requirements in Module 2.4."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_ti_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        for ti_id in self.created_ti_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id == ti_id
            ).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(self, source_ip="198.51.100.77", attack_type="ssh_login_probe"):
        attack = Attack(
            attack_type=attack_type,
            source_ip=source_ip,
            severity="low",
            risk_score=0.0,
            status="monitoring",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def _create_events(self, attack_id, count=5, event_type="ssh_login_failed", source_ip="198.51.100.77"):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        events = []
        for i in range(count):
            ev = AttackEvent(
                attack_id=attack_id,
                event_type=event_type,
                source_ip=source_ip,
                message=f"Failed SSH attempt {i+1}",
                event_time=now,
            )
            self.db.add(ev)
            events.append(ev)
        self.db.commit()
        return events

    def _create_ti(self, indicator_value="198.51.100.77", threat_level="high", confidence=0.95):
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=indicator_value,
            threat_level=threat_level,
            source="local_test_feed",
            confidence=confidence,
            description="Known malicious brute-forcer",
        )
        self.db.add(ti)
        self.db.commit()
        self.db.refresh(ti)
        self.created_ti_ids.append(ti.id)
        return ti

    def test_1_valid_attack_with_detection_result(self):
        """Test 1: Attack with detection result (SSH brute-force triggered) receives high score."""
        attack = self._create_attack()
        self._create_events(attack.id, count=5)

        res = calculate_attack_risk(db=self.db, attack_id=attack.id)
        self.assertGreaterEqual(res["risk_score"], 50.0)
        self.assertEqual(res["severity"], "high")

        # Verify factors breakdown
        factor_names = [f["factor"] for f in res["factors"]]
        self.assertIn("detection_rule", factor_names)
        self.assertIn("event_volume", factor_names)

        # Verify database update on Attack model
        self.db.refresh(attack)
        self.assertEqual(attack.risk_score, res["risk_score"])
        self.assertEqual(attack.severity, res["severity"])

    def test_2_attack_with_threat_intelligence_match(self):
        """Test 2: Attack with detection AND threat-intelligence match reaches critical score."""
        attack = self._create_attack(source_ip="198.51.100.88")
        self._create_events(attack.id, count=5, source_ip="198.51.100.88")
        self._create_ti(indicator_value="198.51.100.88", threat_level="high", confidence=0.95)

        res = calculate_attack_risk(db=self.db, attack_id=attack.id)
        # 40 (rule) + 10 (volume) + 28.5 (ti: 30 * 0.95) = 78.5
        self.assertAlmostEqual(res["risk_score"], 78.5, places=1)
        self.assertEqual(res["severity"], "critical")

        factor_names = [f["factor"] for f in res["factors"]]
        self.assertIn("threat_intelligence", factor_names)

    def test_3_attack_without_threat_intelligence_match(self):
        """Test 3: Attack without threat-intelligence match contains no TI contribution."""
        attack = self._create_attack(source_ip="192.0.2.99")
        self._create_events(attack.id, count=5, source_ip="192.0.2.99")

        res = calculate_attack_risk(db=self.db, attack_id=attack.id)
        factor_names = [f["factor"] for f in res["factors"]]
        self.assertNotIn("threat_intelligence", factor_names)
        self.assertEqual(res["risk_score"], 50.0)
        self.assertEqual(res["severity"], "high")

    def test_4_nonexistent_attack_returns_404(self):
        """Test 4: Analyzing nonexistent attack returns HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            calculate_attack_risk(db=self.db, attack_id=999999)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            analyze_risk_endpoint(attack_id=999999, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_5_score_always_bounded_between_0_and_100(self):
        """Test 5: Risk score never drops below 0 or exceeds 100."""
        # Clean baseline attack (0 events, no TI)
        attack_clean = self._create_attack(source_ip="192.0.2.1")
        res_clean = calculate_attack_risk(db=self.db, attack_id=attack_clean.id)
        self.assertGreaterEqual(res_clean["risk_score"], 0.0)
        self.assertEqual(res_clean["risk_score"], 0.0)
        self.assertEqual(res_clean["severity"], "low")

        # Heavy attack with many events and critical TI
        attack_heavy = self._create_attack(source_ip="198.51.100.99")
        self._create_events(attack_heavy.id, count=20, source_ip="198.51.100.99")
        self._create_ti(indicator_value="198.51.100.99", threat_level="critical", confidence=1.0)
        res_heavy = calculate_attack_risk(db=self.db, attack_id=attack_heavy.id)
        self.assertLessEqual(res_heavy["risk_score"], 100.0)
        self.assertGreaterEqual(res_heavy["risk_score"], 0.0)
        self.assertEqual(res_heavy["severity"], "critical")

    def test_6_severity_always_matches_defined_score_bands(self):
        """Test 6: Verify severity band mapping matches defined thresholds."""
        # 0 - 24.9 -> low
        self.assertEqual(get_severity_band(0.0), "low")
        self.assertEqual(get_severity_band(24.9), "low")
        # 25.0 - 49.9 -> medium
        self.assertEqual(get_severity_band(25.0), "medium")
        self.assertEqual(get_severity_band(49.9), "medium")
        # 50.0 - 74.9 -> high
        self.assertEqual(get_severity_band(50.0), "high")
        self.assertEqual(get_severity_band(74.9), "high")
        # 75.0 - 100.0 -> critical
        self.assertEqual(get_severity_band(75.0), "critical")
        self.assertEqual(get_severity_band(100.0), "critical")

    def test_7_reproducible_and_deterministic_scoring(self):
        """Test 7: The exact same attack inputs always yield the identical risk score."""
        attack = self._create_attack(source_ip="198.51.100.70")
        self._create_events(attack.id, count=5, source_ip="198.51.100.70")
        self._create_ti(indicator_value="198.51.100.70", threat_level="medium", confidence=0.8)

        res1 = calculate_attack_risk(db=self.db, attack_id=attack.id)
        res2 = calculate_attack_risk(db=self.db, attack_id=attack.id)

        self.assertEqual(res1["risk_score"], res2["risk_score"])
        self.assertEqual(res1["severity"], res2["severity"])
        self.assertEqual(len(res1["factors"]), len(res2["factors"]))


if __name__ == "__main__":
    unittest.main()
