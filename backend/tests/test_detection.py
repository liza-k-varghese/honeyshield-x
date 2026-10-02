"""Automated unit and integration test suite for HoneyShield X Detection Engine (Module 2.2)."""

import json
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.detection.rules import SSHBruteForceConfig
from app.detection.service import detect_ssh_brute_force
from app.models import Attack, AttackEvent
from app.routers.detection import analyze_attack
from fastapi import HTTPException


class TestDetectionEngine(unittest.TestCase):
    """Test suite covering all required cases in Module 2.2 Section 17."""

    def setUp(self):
        self.db = SessionLocal()
        # Create a dedicated test attack container
        self.attack = Attack(
            attack_type="ssh_login_probe",
            source_ip="198.51.100.42",
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        self.db.add(self.attack)
        self.db.commit()
        self.db.refresh(self.attack)
        self.created_attack_ids = [self.attack.id]

    def tearDown(self):
        # Clean up created attack events and attacks
        for aid in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == aid).delete()
            self.db.query(Attack).filter(Attack.id == aid).delete()
        self.db.commit()
        self.db.close()

    def _create_event(
        self,
        event_type="ssh_login_failed",
        source_ip="198.51.100.42",
        minutes_ago=0,
        attack_id=None,
    ):
        aid = attack_id if attack_id is not None else self.attack.id
        event_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=minutes_ago
        )
        ev = AttackEvent(
            attack_id=aid,
            event_type=event_type,
            source_ip=source_ip,
            message=f"Test event: {event_type}",
            event_time=event_time,
        )
        self.db.add(ev)
        self.db.commit()
        self.db.refresh(ev)
        return ev

    # -------------------------------------------------------------
    # Test 1 — Below threshold (< 5 failed SSH events)
    # -------------------------------------------------------------
    def test_1_below_threshold(self):
        """Test that fewer than 5 failed SSH events do not trigger detection."""
        for _ in range(4):
            self._create_event("ssh_login_failed")

        result = detect_ssh_brute_force(self.db, self.attack)

        self.assertFalse(result.detected)
        self.assertIsNone(result.detection_type)
        self.assertIsNone(result.severity)
        self.assertIsNone(result.risk_score)
        self.assertEqual(result.evidence_count, 4)

        # Confirm Attack was NOT modified
        self.db.refresh(self.attack)
        self.assertEqual(self.attack.severity, "low")
        self.assertEqual(self.attack.risk_score, 0.0)

    # -------------------------------------------------------------
    # Test 2 — Threshold reached (5 matching failed SSH events)
    # -------------------------------------------------------------
    def test_2_threshold_reached(self):
        """Test that 5 failed SSH events in window trigger ssh_brute_force detection."""
        for _ in range(5):
            self._create_event("ssh_login_failed")

        result = detect_ssh_brute_force(self.db, self.attack)

        self.assertTrue(result.detected)
        self.assertEqual(result.detection_type, "ssh_brute_force")
        self.assertEqual(result.severity, "high")
        self.assertEqual(result.risk_score, 8.0)
        self.assertEqual(result.evidence_count, 5)
        self.assertEqual(result.source_ip, "198.51.100.42")
        self.assertEqual(result.attack_id, self.attack.id)

        # Confirm Attack in PostgreSQL was updated
        self.db.refresh(self.attack)
        self.assertEqual(self.attack.status, "detected")
        self.assertEqual(self.attack.severity, "high")
        self.assertEqual(self.attack.risk_score, 8.0)

    # -------------------------------------------------------------
    # Test 3 — Outside time window (older than window_minutes)
    # -------------------------------------------------------------
    def test_3_outside_time_window(self):
        """Test that events older than the detection window are excluded."""
        # Create 5 events from 10 minutes ago (default window is 5 minutes)
        for _ in range(5):
            self._create_event("ssh_login_failed", minutes_ago=10)

        result = detect_ssh_brute_force(self.db, self.attack)

        self.assertFalse(result.detected)
        self.assertEqual(result.evidence_count, 0)

    # -------------------------------------------------------------
    # Test 4 — Wrong event type (e.g. ssh_login_success)
    # -------------------------------------------------------------
    def test_4_wrong_event_type(self):
        """Test that non-failure events are not counted as brute-force evidence."""
        for _ in range(5):
            self._create_event("ssh_login_success")

        result = detect_ssh_brute_force(self.db, self.attack)

        self.assertFalse(result.detected)
        self.assertEqual(result.evidence_count, 0)

    # -------------------------------------------------------------
    # Test 5 — Nonexistent attack (HTTP 404)
    # -------------------------------------------------------------
    def test_5_nonexistent_attack(self):
        """Test that querying a nonexistent attack ID raises HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            analyze_attack(attack_id=999999, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("999999", ctx.exception.detail)

    # -------------------------------------------------------------
    # Test 6 — Source correlation
    # -------------------------------------------------------------
    def test_6_source_correlation(self):
        """Test that events from a different source IP are not correlated."""
        # 3 events from expected IP 198.51.100.42
        for _ in range(3):
            self._create_event("ssh_login_failed", source_ip="198.51.100.42")

        # 3 events from a different IP 203.0.113.88
        for _ in range(3):
            self._create_event("ssh_login_failed", source_ip="203.0.113.88")

        # Correlating by attack's source_ip (198.51.100.42)
        result = detect_ssh_brute_force(self.db, self.attack)

        self.assertFalse(result.detected)
        self.assertEqual(result.evidence_count, 3)

    # -------------------------------------------------------------
    # Test 7 — Configurable threshold & window
    # -------------------------------------------------------------
    def test_7_configurable_threshold_and_window(self):
        """Test that threshold and window are configurable."""
        custom_config = SSHBruteForceConfig(
            threshold=3,
            window_minutes=20,
            severity="critical",
            risk_score=9.5,
        )

        for _ in range(3):
            self._create_event("ssh_login_failed", minutes_ago=10)

        result = detect_ssh_brute_force(self.db, self.attack, config=custom_config)

        self.assertTrue(result.detected)
        self.assertEqual(result.severity, "critical")
        self.assertEqual(result.risk_score, 9.5)
        self.assertEqual(result.evidence_count, 3)


if __name__ == "__main__":
    unittest.main()
