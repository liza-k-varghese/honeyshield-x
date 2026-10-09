"""Unit test suite for Module 3.8 Threat Intelligence & IOC Lifecycle Fusion Engine."""

from datetime import datetime, timedelta, timezone
import json
import unittest

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Attack, ThreatIntelligence
from app.schemas import ThreatIndicatorCreate, ThreatIndicatorUpdate
from app.threat_intelligence.service import (
    calculate_boosted_confidence,
    calculate_temporal_decay,
    derive_status_and_threat_level,
    threat_intel_service,
    validate_indicator,
)
from app.threat_intelligence.storage import ThreatIntelStore, deserialize_ioc_metadata, serialize_ioc_metadata


class TestModule38ThreatIntelCore(unittest.TestCase):
    """Test suite covering deterministic mathematics, validation, and lifecycle states."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_ids: list[int] = []

    def tearDown(self):
        if self.created_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id.in_(self.created_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
        self.db.close()

    def test_1_validation_ip_cidr_domain_hash_user_agent(self):
        """Test strict validation for all indicator types."""
        # IPv4 Public
        val, is_priv = validate_indicator("ip", "93.184.216.34")
        self.assertEqual(val, "93.184.216.34")
        self.assertFalse(is_priv)

        # IPv6 Public
        val, is_priv = validate_indicator("ip", "2606:4700:4700::1111")
        self.assertEqual(val, "2606:4700:4700::1111")
        self.assertFalse(is_priv)

        # Private IP detection
        _, is_priv = validate_indicator("ip", "127.0.0.1")
        self.assertTrue(is_priv)
        _, is_priv = validate_indicator("ip", "10.0.0.1")
        self.assertTrue(is_priv)

        # CIDR
        val, is_priv = validate_indicator("cidr", "93.184.216.0/24")
        self.assertEqual(val, "93.184.216.0/24")
        self.assertFalse(is_priv)

        # Domain
        val, _ = validate_indicator("domain", "c2.adversary-group.org")
        self.assertEqual(val, "c2.adversary-group.org")

        # Hashes (MD5, SHA1, SHA256)
        val, _ = validate_indicator("hash", "d41d8cd98f00b204e9800998ecf8427e")
        self.assertEqual(val, "d41d8cd98f00b204e9800998ecf8427e")
        val, _ = validate_indicator("hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        self.assertEqual(len(val), 64)

        # User Agent
        val, _ = validate_indicator("user_agent", "Mozilla/5.0 (compatible; AdversaryScanner/1.0)")
        self.assertIn("AdversaryScanner", val)

    def test_2_validation_rejection_malformed_and_oversized(self):
        """Test rejection of empty, oversized, and invalid format observables."""
        with self.assertRaises(ValueError):
            validate_indicator("ip", "")

        with self.assertRaises(ValueError):
            validate_indicator("ip", "not.an.ip.address")

        with self.assertRaises(ValueError):
            validate_indicator("domain", "invalid domain with spaces.com")

        with self.assertRaises(ValueError):
            validate_indicator("hash", "not_a_hex_hash_123")

        with self.assertRaises(ValueError):
            validate_indicator("ip", "A" * 256)

        with self.assertRaises(ValueError):
            validate_indicator("ip", "198.51.100.1\nattacker.com")

    def test_3_repeat_hit_confidence_saturation_math(self):
        """Test repeat-hit formula guarantees C_base <= C_boosted <= 1.0 with diminishing returns."""
        base = 0.80

        # hit_count = 1 -> exactly C_base
        c1 = calculate_boosted_confidence(base, 1)
        self.assertEqual(c1, 0.80)

        # hit_count = 2 -> boosted
        c2 = calculate_boosted_confidence(base, 2)
        self.assertGreater(c2, c1)

        # hit_count = 5 -> higher boost
        c5 = calculate_boosted_confidence(base, 5)
        self.assertGreater(c5, c2)

        # Diminishing returns: c(k+1) - c(k) decreases
        delta_1_2 = c2 - c1
        c3 = calculate_boosted_confidence(base, 3)
        delta_2_3 = c3 - c2
        self.assertGreater(delta_1_2, delta_2_3)

        # Large k -> approaches 1.0 but never exceeds 1.0
        c1000 = calculate_boosted_confidence(base, 1000)
        self.assertLessEqual(c1000, 1.0)
        self.assertGreaterEqual(c1000, 0.99)

    def test_4_exponential_temporal_decay_math(self):
        """Test temporal decay follows half-life curve 2^(-delta_t / half_life)."""
        boosted = 0.80
        half_life = 14  # 14 days

        now = datetime.now(timezone.utc)

        # delta_t = 0 -> exactly boosted
        c_now = calculate_temporal_decay(boosted, now, half_life, current_dt=now)
        self.assertEqual(c_now, 0.80)

        # delta_t = 14 days (1 half-life) -> exactly 50% of boosted = 0.40
        seen_14_days_ago = now - timedelta(days=14)
        c_half = calculate_temporal_decay(boosted, seen_14_days_ago, half_life, current_dt=now)
        self.assertAlmostEqual(c_half, 0.40, places=3)

        # delta_t = 28 days (2 half-lives) -> exactly 25% of boosted = 0.20
        seen_28_days_ago = now - timedelta(days=28)
        c_quarter = calculate_temporal_decay(boosted, seen_28_days_ago, half_life, current_dt=now)
        self.assertAlmostEqual(c_quarter, 0.20, places=3)

    def test_5_lifecycle_state_transitions(self):
        """Test status transitions active -> decaying -> retired and severity mappings."""
        # Confidence >= 0.65 -> active
        st, sev = derive_status_and_threat_level("active", 0.90)
        self.assertEqual(st, "active")
        self.assertEqual(sev, "critical")

        st, sev = derive_status_and_threat_level("active", 0.70)
        self.assertEqual(st, "active")
        self.assertEqual(sev, "high")

        # 0.15 <= Confidence < 0.65 -> decaying
        st, sev = derive_status_and_threat_level("active", 0.50)
        self.assertEqual(st, "decaying")
        self.assertEqual(sev, "medium")

        # Confidence < 0.15 -> retired
        st, sev = derive_status_and_threat_level("active", 0.10)
        self.assertEqual(st, "retired")
        self.assertEqual(sev, "low")

        # Precedence: whitelisted always wins
        st, sev = derive_status_and_threat_level("whitelisted", 0.99)
        self.assertEqual(st, "whitelisted")
        self.assertEqual(sev, "low")

        # Precedence: revoked always wins
        st, sev = derive_status_and_threat_level("revoked", 0.99)
        self.assertEqual(st, "revoked")
        self.assertEqual(sev, "low")

    def test_6_crud_lifecycle_in_database(self):
        """Test full indicator creation, retrieval, update, and dynamic decay calculation."""
        payload = ThreatIndicatorCreate(
            indicator_type="ip",
            indicator_value="198.51.100.123",
            threat_level="critical",
            source="manual_analyst",
            confidence=0.90,
            half_life_days=14,
            campaign="TEST-CAMP-A",
            tags=["scanner", "test"],
            description="Initial creation test",
        )

        created = threat_intel_service.create_indicator(
            db=self.db,
            data=payload,
            operator_username="analyst_test",
        )
        self.created_ids.append(created.id)

        self.assertEqual(created.indicator_value, "198.51.100.123")
        self.assertEqual(created.status, "active")
        self.assertEqual(created.hit_count, 1)

        # Fetch and verify
        fetched = threat_intel_service.get_indicator(self.db, created.id)
        self.assertEqual(fetched.id, created.id)
        self.assertEqual(fetched.campaign, "TEST-CAMP-A")

        # Update metadata
        update_req = ThreatIndicatorUpdate(
            campaign="TEST-CAMP-B",
            description="Escalated to critical",
        )
        updated = threat_intel_service.update_indicator(
            db=self.db,
            indicator_id=created.id,
            data=update_req,
            operator_username="analyst_test",
        )
        self.assertEqual(updated.threat_level, "critical")
        self.assertEqual(updated.campaign, "TEST-CAMP-B")

    def test_7_resurrection_of_retired_indicator(self):
        """Test that a retired indicator resurrects to active upon receiving a new hit."""
        # Create an indicator
        payload = ThreatIndicatorCreate(
            indicator_type="ip",
            indicator_value="198.51.100.188",
            threat_level="low",
            source="external_feed",
            confidence=0.70,
            half_life_days=14,
        )
        created = threat_intel_service.create_indicator(
            db=self.db,
            data=payload,
            operator_username="analyst_test",
        )
        self.created_ids.append(created.id)

        # Artificially set status to retired in DB
        ti = self.db.get(ThreatIntelligence, created.id)
        meta, notes = deserialize_ioc_metadata(ti.description)
        meta["status"] = "retired"
        meta["last_seen"] = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        meta["notes"] = notes
        ti.description = serialize_ioc_metadata(meta)
        self.db.commit()

        # Record a repeat hit
        resurrected = threat_intel_service.record_indicator_hit(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.188",
        )
        self.assertIsNotNone(resurrected)
        self.assertEqual(resurrected.status, "active")
        self.assertEqual(resurrected.hit_count, 2)

    def test_8_revocation_and_whitelist_precedence(self):
        """Test operator revocation and administrative whitelisting precedence."""
        payload = ThreatIndicatorCreate(
            indicator_type="ip",
            indicator_value="198.51.100.201",
            threat_level="high",
            confidence=0.85,
            half_life_days=14,
        )
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=payload,
            operator_username="analyst_test",
        )
        self.created_ids.append(ind.id)

        # 1. Revocation
        revoked = threat_intel_service.revoke_indicator(
            db=self.db,
            indicator_id=ind.id,
            reason="Adversary decommissioned VPS",
            operator_username="responder_test",
        )
        self.assertEqual(revoked.status, "revoked")
        self.assertEqual(revoked.decayed_confidence, 0.0)

        # Repeat hit CANNOT resurrect revoked indicator
        after_hit = threat_intel_service.record_indicator_hit(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.201",
        )
        self.assertEqual(after_hit.status, "revoked")

        # 2. Whitelisting (Admin)
        whitelisted = threat_intel_service.whitelist_indicator(
            db=self.db,
            indicator_id=ind.id,
            reason="Confirmed internal diagnostic host",
            operator_username="sec_admin",
        )
        self.assertEqual(whitelisted.status, "whitelisted")
        self.assertEqual(whitelisted.decayed_confidence, 0.0)

    def test_9_stix_21_export_structure(self):
        """Test STIX 2.1 JSON bundle serialization without external libraries."""
        payload = ThreatIndicatorCreate(
            indicator_type="domain",
            indicator_value="c2-stix.adversary.org",
            threat_level="critical",
            confidence=0.90,
            half_life_days=30,
            campaign="APT-STIX-TEST",
        )
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=payload,
            operator_username="analyst_test",
        )
        self.created_ids.append(ind.id)

        stix_bundle = threat_intel_service.export_stix_bundle(self.db)
        self.assertEqual(stix_bundle["type"], "bundle")
        self.assertEqual(stix_bundle["spec_version"], "2.1")
        self.assertIn("bundle--", stix_bundle["id"])

        objects = stix_bundle["objects"]
        self.assertGreater(len(objects), 0)
        obj = next(o for o in objects if "c2-stix.adversary.org" in o["pattern"])
        self.assertEqual(obj["type"], "indicator")
        self.assertEqual(obj["spec_version"], "2.1")
        self.assertEqual(obj["pattern_type"], "stix")
        self.assertIn("[domain-name:value =", obj["pattern"])

    def test_10_csv_formula_injection_defense(self):
        """Test CSV export sanitizes formulas starting with =, +, -, @, tab."""
        payload = ThreatIndicatorCreate(
            indicator_type="domain",
            indicator_value="adversary-c2.org",
            threat_level="high",
            confidence=0.80,
            half_life_days=30,
            campaign="=cmd|' /C calc'!A0",
        )
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=payload,
            operator_username="analyst_test",
        )
        self.created_ids.append(ind.id)

        csv_content = threat_intel_service.export_csv_feed(self.db)
        lines = csv_content.strip().split("\n")
        self.assertGreaterEqual(len(lines), 2)
        # Check header
        self.assertIn("indicator,type", lines[0])

        # Verify formula trigger '=' in campaign was prepended with single quote
        formula_line = [l for l in lines if "calc" in l][0]
        self.assertIn("'=cmd", formula_line)


if __name__ == "__main__":
    unittest.main()
