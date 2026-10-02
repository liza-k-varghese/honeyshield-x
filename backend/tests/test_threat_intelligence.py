"""Automated unit and integration test suite for HoneyShield X Threat Intelligence (Module 2.3)."""

import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Attack, ThreatIntelligence
from app.routers.threat_intelligence import (
    enrich_attack_endpoint,
    lookup_indicator_endpoint,
)
from app.threat_intelligence.service import enrich_attack, lookup_indicator


class TestThreatIntelligence(unittest.TestCase):
    """Test suite covering all required cases in Module 2.3 Section 14."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_ti_ids: list[int] = []
        self.created_attack_ids: list[int] = []

        # Seed test IOCs
        self.ti_v4 = ThreatIntelligence(
            indicator_type="ip",
            indicator_value="198.51.100.23",
            threat_level="high",
            source="local_test_feed",
            confidence=0.95,
            description="Known malicious source",
        )
        self.db.add(self.ti_v4)

        self.ti_v6 = ThreatIntelligence(
            indicator_type="ip",
            indicator_value="2001:db8::10",
            threat_level="medium",
            source="local_test_feed",
            confidence=0.80,
            description="Known IPv6 scanner",
        )
        self.db.add(self.ti_v6)

        self.db.commit()
        self.db.refresh(self.ti_v4)
        self.db.refresh(self.ti_v6)
        self.created_ti_ids.extend([self.ti_v4.id, self.ti_v6.id])

    def tearDown(self):
        for aid in self.created_attack_ids:
            self.db.query(Attack).filter(Attack.id == aid).delete()
        for ti_id in self.created_ti_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id == ti_id
            ).delete()
        self.db.commit()
        self.db.close()

    def test_1_matching_ip(self):
        """Test 1: Lookup known IPv4 IOC returns found=true and threat metadata."""
        res = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.23",
        )
        self.assertTrue(res["found"])
        self.assertEqual(res["indicator_type"], "ip")
        self.assertEqual(res["indicator_value"], "198.51.100.23")
        self.assertEqual(res["threat_level"], "high")
        self.assertEqual(res["source"], "local_test_feed")
        self.assertAlmostEqual(res["confidence"], 0.95)
        self.assertEqual(res["description"], "Known malicious source")

        # Also verify through the API endpoint wrapper
        endpoint_res = lookup_indicator_endpoint(
            indicator_type="ip",
            indicator_value="198.51.100.23",
            db=self.db,
        )
        self.assertTrue(endpoint_res.found)
        self.assertEqual(endpoint_res.threat_level, "high")

    def test_2_unknown_ip(self):
        """Test 2: Lookup unrecorded IP returns found=false without HTTP 404."""
        res = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="192.0.2.10",
        )
        self.assertFalse(res["found"])
        self.assertEqual(res["indicator_type"], "ip")
        self.assertEqual(res["indicator_value"], "192.0.2.10")
        self.assertIsNone(res["threat_level"])
        self.assertIsNone(res["source"])
        self.assertIsNone(res["confidence"])
        self.assertIsNone(res["description"])

        # Also verify through the API endpoint wrapper
        endpoint_res = lookup_indicator_endpoint(
            indicator_type="ip",
            indicator_value="192.0.2.10",
            db=self.db,
        )
        self.assertFalse(endpoint_res.found)

    def test_3_invalid_ip(self):
        """Test 3: Invalid IP values must raise ValueError in service and HTTP 422 in router."""
        with self.assertRaises(ValueError):
            lookup_indicator(
                db=self.db,
                indicator_type="ip",
                indicator_value="not-an-ip",
            )

        # In router, it must translate to HTTP 422 Unprocessable Entity
        with self.assertRaises(HTTPException) as ctx:
            lookup_indicator_endpoint(
                indicator_type="ip",
                indicator_value="not-an-ip",
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 422)

        # Another invalid IP format (out of octet range)
        with self.assertRaises(HTTPException) as ctx:
            lookup_indicator_endpoint(
                indicator_type="ip",
                indicator_value="999.999.999.999",
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_4_exact_matching(self):
        """Test 4: Verify prefix/suffix or similar IP does not match exact indicator."""
        # 198.51.100.2 is similar to 198.51.100.23 but not identical
        res = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.2",
        )
        self.assertFalse(res["found"])

        # 198.51.100.230 is also not identical
        res2 = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.230",
        )
        self.assertFalse(res2["found"])

    def test_5_ipv6_indicator(self):
        """Test 5: Valid IPv6 addresses are accepted and correctly looked up."""
        res = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="2001:db8::10",
        )
        self.assertTrue(res["found"])
        self.assertEqual(res["threat_level"], "medium")
        self.assertEqual(res["source"], "local_test_feed")
        self.assertAlmostEqual(res["confidence"], 0.80)

        # Unknown IPv6
        res_unknown = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="2001:db8::9999",
        )
        self.assertFalse(res_unknown["found"])

    def test_6_attack_enrichment_with_source_ip(self):
        """Test 6: Enrich an existing attack having matching threat intelligence."""
        attack = Attack(
            attack_type="ssh_login_probe",
            source_ip="198.51.100.23",
            severity="low",
            risk_score=2.0,
            status="monitoring",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        res = enrich_attack(db=self.db, attack_id=attack.id)
        self.assertTrue(res["found"])
        self.assertEqual(res["indicator_value"], "198.51.100.23")
        self.assertEqual(res["threat_level"], "high")
        self.assertEqual(res["source"], "local_test_feed")
        self.assertAlmostEqual(res["confidence"], 0.95)

        # Check through router endpoint
        endpoint_res = enrich_attack_endpoint(attack_id=attack.id, db=self.db)
        self.assertTrue(endpoint_res.found)
        self.assertEqual(endpoint_res.threat_level, "high")

        # Verify Attack model was not corrupted/overwritten
        self.db.refresh(attack)
        self.assertEqual(attack.status, "monitoring")
        self.assertEqual(attack.severity, "low")
        self.assertEqual(attack.risk_score, 2.0)

    def test_7_attack_with_no_source_ip(self):
        """Test 7: Attack with missing source_ip is handled cleanly with found=false."""
        attack = Attack(
            attack_type="generic_anomaly",
            source_ip=None,
            severity="low",
            risk_score=1.0,
            status="monitoring",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        res = enrich_attack(db=self.db, attack_id=attack.id)
        self.assertFalse(res["found"])
        self.assertEqual(res["indicator_type"], "ip")
        self.assertEqual(res["indicator_value"], "")

        # Check through router endpoint
        endpoint_res = enrich_attack_endpoint(attack_id=attack.id, db=self.db)
        self.assertFalse(endpoint_res.found)

    def test_8_nonexistent_attack_returns_404(self):
        """Test 8: Enriching a nonexistent attack returns HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            enrich_attack(db=self.db, attack_id=999999)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            enrich_attack_endpoint(attack_id=999999, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
