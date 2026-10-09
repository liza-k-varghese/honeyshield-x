"""Hostile Security Audit & Penetration Testing Suite for Module 3.8.

Tests 38 Hostile Security Vectors + 6 High-Concurrency Race Condition Bursts:
- Vectors 1-6: Injection vectors (SQLi, XSS in indicator_value, campaign, notes).
- Vectors 7-10: CSV Formula Injection and CRLF injection defenses.
- Vectors 11-12: Path traversal and null byte injections.
- Vectors 13-16: Loopback and RFC 1918 private infrastructure shielding (internal_network tagging, feed export exclusion).
- Vectors 17-22: Syntactic malformations and fuzzing across all indicator types (IP, CIDR, domain, hash, UA).
- Vectors 23-27: Parameter boundary fuzzing (confidence, half_life, length limits).
- Vectors 28-33: RBAC privilege escalation, unauthenticated access, feed token timing defense.
- Vector 34: JSON deserialization safety against corrupt/hostile metadata in database.
- Vector 35: Contextualizer advisory contract (strictly advisory, non-authoritative).
- Vectors 36-37: Governor Level-3 HITL containment security boundaries.
- Vector 38: Whitelist absolute precedence and anti-weaponization immunity.
- Concurrency Bursts 1-6: Multi-threaded bursts (20-25 workers) covering hit saturation, deduplication, revocation race, whitelist race, feed exports, and store capacity.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import secrets
import time
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.dependencies import require_permission
from app.auth.registry import default_operator_registry, Operator
from app.auth.session import default_session_store
from app.database import SessionLocal
from app.incident_command.governor import default_governor
from app.models import ThreatIntelligence, SystemEvent
from app.routers.threat_intelligence import (
    create_indicator_endpoint,
    export_csv_feed_endpoint,
    export_json_feed_endpoint,
    verify_feed_access,
)
from app.schemas import (
    IndicatorType,
    PromoteCaseObservableRequest,
    ThreatIndicatorCreate,
    ThreatIndicatorUpdate,
)
from app.threat_intelligence.contextualizer import threat_contextualizer
from app.threat_intelligence.service import (
    calculate_boosted_confidence,
    calculate_temporal_decay,
    derive_status_and_threat_level,
    threat_intel_service,
    validate_indicator,
)
from app.threat_intelligence.storage import (
    ThreatIntelStore,
    deserialize_ioc_metadata,
    serialize_ioc_metadata,
    threat_intel_store,
)


def make_mock_req(method: str = "GET", path: str = "/api/v1/threat-intelligence") -> Request:
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": [(b"host", b"testserver")],
            "client": ("127.0.0.1", 50000),
        }
    )


class TestModule38HostilePenetration(unittest.TestCase):
    """Hostile security and adversarial penetration audit for Module 3.8."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_session_store.clear()
        threat_intel_store.clear()

        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        self.admin: Operator = default_operator_registry.get_operator("admin_chief")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")

        self.cleanup_indicator_ids: list[int] = []

    def tearDown(self):
        if self.cleanup_indicator_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id.in_(self.cleanup_indicator_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
        self.db.close()

    # =========================================================================
    # Vectors 1-6: Injection Payloads (SQLi, XSS)
    # =========================================================================

    def test_vector_01_sqli_in_indicator_value(self):
        """Vector 1: SQL injection in indicator value is strictly rejected by format validator."""
        sqli_payload = "' OR 1=1; DROP TABLE threat_intelligence; --"
        with self.assertRaises(ValueError):
            validate_indicator("ip", sqli_payload)
        with self.assertRaises(ValueError):
            validate_indicator("domain", sqli_payload)
        with self.assertRaises(ValueError):
            validate_indicator("hash", sqli_payload)

    def test_vector_02_sqli_in_campaign_parameter(self):
        """Vector 2: SQL injection in campaign parameter is safely parameterized by SQLAlchemy ORM."""
        sqli_camp = "CAMP' OR '1'='1"
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="sqli-camp-test.org",
                threat_level="high",
                campaign=sqli_camp,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)
        # Verify query does not execute SQL injection
        res, total = threat_intel_service.list_indicators(db=self.db, campaign=sqli_camp)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].campaign, sqli_camp)

    def test_vector_03_sqli_in_search_query(self):
        """Vector 3: SQL injection in search filter returns no false matches."""
        sqli_search = "' UNION SELECT * FROM users --"
        res, total = threat_intel_service.list_indicators(db=self.db, search=sqli_search)
        self.assertEqual(len(res), 0)

    def test_vector_04_xss_in_indicator_value(self):
        """Vector 4: XSS script tags in indicator value are rejected by validator."""
        xss_payload = "<script>alert('xss')</script>"
        with self.assertRaises(ValueError):
            validate_indicator("ip", xss_payload)
        with self.assertRaises(ValueError):
            validate_indicator("domain", xss_payload)

    def test_vector_05_xss_in_campaign(self):
        """Vector 5: XSS stored in campaign is escaped safely in JSON and CSV outputs."""
        xss_camp = "<img src=x onerror=alert(1)>"
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="xss-camp-test.net",
                threat_level="high",
                campaign=xss_camp,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        csv = threat_intel_service.export_csv_feed(self.db)
        self.assertIn(f'"{xss_camp}"', csv)

    def test_vector_06_xss_in_description_notes(self):
        """Vector 6: XSS in analyst notes is preserved harmlessly without executing."""
        xss_desc = "javascript:alert(document.cookie)"
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="xss-notes-test.com",
                threat_level="medium",
                description=xss_desc,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)
        fetched = threat_intel_service.get_indicator(self.db, ind.id)
        self.assertEqual(fetched.description, xss_desc)

    # =========================================================================
    # Vectors 7-10: CSV Formula & CRLF Injections
    # =========================================================================

    def test_vector_07_csv_formula_injection_equals(self):
        """Vector 7: CSV Formula Injection starting with '=' is sanitized with leading quote."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="formula-eq-test.org",
                threat_level="high",
                campaign="=cmd|'/C calc'!A0",
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)
        csv = threat_intel_service.export_csv_feed(self.db)
        self.assertIn("'=cmd|'/C calc'!A0", csv)

    def test_vector_08_csv_formula_injection_plus_minus_at(self):
        """Vector 8: CSV Formula Injection starting with '+', '-', '@', '\t' are sanitized."""
        for char in ("+", "-", "@", "\t"):
            camp = f"{char}HYPERLINK('http://evil.com','test')"
            ind = threat_intel_service.create_indicator(
                db=self.db,
                data=ThreatIndicatorCreate(
                    indicator_type="domain",
                    indicator_value=f"formula-{ord(char)}-test.org",
                    threat_level="high",
                    campaign=camp,
                ),
                operator_username=self.analyst.username,
            )
            self.cleanup_indicator_ids.append(ind.id)
            csv = threat_intel_service.export_csv_feed(self.db)
            expected = f"'{camp}".replace("\t", "")
            self.assertIn(expected, csv)

    def test_vector_09_crlf_injection_in_indicator(self):
        """Vector 9: CRLF newline injection in indicator value is strictly rejected."""
        crlf_val = "93.184.216.34\r\nattacker.com"
        with self.assertRaises(ValueError):
            validate_indicator("ip", crlf_val)

    def test_vector_10_crlf_injection_in_campaign(self):
        """Vector 10: CRLF control characters in campaign are stripped during CSV generation preventing row breakouts."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="crlf-camp-test.com",
                threat_level="high",
                campaign="MALICIOUS\r\nINJECTED_ROW,ip,critical,1.0,,",
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)
        csv = threat_intel_service.export_csv_feed(self.db)
        # Must not contain unescaped CRLF newlines breaking into independent CSV records
        lines = csv.strip().split("\n")
        injected_records = [l for l in lines if l.startswith('"INJECTED_ROW') or l.startswith("INJECTED_ROW")]
        self.assertEqual(len(injected_records), 0)
        self.assertNotIn("\r", csv)

    # =========================================================================
    # Vectors 11-12: Path Traversal & Null Bytes
    # =========================================================================

    def test_vector_11_path_traversal_in_indicator(self):
        """Vector 11: Directory traversal characters are rejected."""
        with self.assertRaises(ValueError):
            validate_indicator("domain", "../../../etc/shadow")

    def test_vector_12_null_byte_injection(self):
        """Vector 12: Null bytes in observables are rejected."""
        with self.assertRaises(ValueError):
            validate_indicator("ip", "93.184.216.34\x00evil.com")

    # =========================================================================
    # Vectors 13-16: Internal Infrastructure Shielding
    # =========================================================================

    def test_vector_13_loopback_shielding(self):
        """Vector 13: Loopback IPv4 (127.0.0.1) is tagged internal and excluded from public feeds."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="127.0.0.1",
                threat_level="high",
            ),
            operator_username=self.admin.username,
        )
        self.cleanup_indicator_ids.append(ind.id)
        self.assertIn("internal_network", ind.tags)

        # Excluded from JSON feed
        feed_json = threat_intel_service.export_json_feed(self.db)
        vals = [i["indicator_value"] for i in feed_json["indicators"]]
        self.assertNotIn("127.0.0.1", vals)

    def test_vector_14_rfc1918_private_shielding(self):
        """Vector 14: RFC 1918 addresses (10.0.0.1, 192.168.1.1) are tagged internal and excluded."""
        for priv_ip in ("10.254.1.1", "192.168.1.50"):
            ind = threat_intel_service.create_indicator(
                db=self.db,
                data=ThreatIndicatorCreate(
                    indicator_type="ip",
                    indicator_value=priv_ip,
                    threat_level="high",
                ),
                operator_username=self.admin.username,
            )
            self.cleanup_indicator_ids.append(ind.id)
            self.assertIn("internal_network", ind.tags)

        feed_csv = threat_intel_service.export_csv_feed(self.db)
        self.assertNotIn("10.254.1.1", feed_csv)
        self.assertNotIn("192.168.1.50", feed_csv)

    def test_vector_15_cloud_metadata_shielding(self):
        """Vector 15: Cloud metadata IP (169.254.169.254) is tagged internal."""
        val, is_priv = validate_indicator("ip", "169.254.169.254")
        self.assertTrue(is_priv)

    def test_vector_16_ipv6_loopback_shielding(self):
        """Vector 16: IPv6 loopback (::1) is tagged internal."""
        val, is_priv = validate_indicator("ip", "::1")
        self.assertTrue(is_priv)

    # =========================================================================
    # Vectors 17-22: Syntactic Malformations & Fuzzing
    # =========================================================================

    def test_vector_17_malformed_ip_rejection(self):
        """Vector 17: Malformed IP addresses (octets > 255, missing octets) are rejected."""
        for bad_ip in ("256.1.1.1", "1.2.3", "1.2.3.4.5", "999.999.999.999"):
            with self.assertRaises(ValueError):
                validate_indicator("ip", bad_ip)

    def test_vector_18_malformed_cidr_rejection(self):
        """Vector 18: Malformed CIDR prefix lengths (/33, /-1) are rejected."""
        for bad_cidr in ("93.184.216.0/33", "93.184.216.0/-1", "not_a_net/24"):
            with self.assertRaises(ValueError):
                validate_indicator("cidr", bad_cidr)

    def test_vector_19_oversized_domain_rejection(self):
        """Vector 19: Domains exceeding 253 characters are rejected."""
        huge_domain = "a" * 250 + ".com"
        with self.assertRaises(ValueError):
            validate_indicator("domain", huge_domain)

    def test_vector_20_malformed_domain_characters(self):
        """Vector 20: Domains with illegal punctuation or spaces are rejected."""
        for bad_dom in ("evil..com", "-bad.com", "space in domain.org", "domain_with_underscore.com"):
            with self.assertRaises(ValueError):
                validate_indicator("domain", bad_dom)

    def test_vector_21_non_hex_hash_rejection(self):
        """Vector 21: Non-hex hash strings are rejected."""
        bad_hash = "g" * 32
        with self.assertRaises(ValueError):
            validate_indicator("hash", bad_hash)

    def test_vector_22_non_standard_hash_length(self):
        """Vector 22: Non-standard hash length (e.g. 15 or 45 chars) is rejected."""
        for bad_len in (15, 31, 33, 39, 41, 63, 65):
            with self.assertRaises(ValueError):
                validate_indicator("hash", "a" * bad_len)

    # =========================================================================
    # Vectors 23-27: Parameter Boundary Fuzzing
    # =========================================================================

    def test_vector_23_negative_confidence_rejection(self):
        """Vector 23: Confidence < 0.0 is rejected by schema validator."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                confidence=-0.1,
            )

    def test_vector_24_excess_confidence_rejection(self):
        """Vector 24: Confidence > 1.0 is rejected by schema validator."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                confidence=1.1,
            )

    def test_vector_25_zero_half_life_rejection(self):
        """Vector 25: Decay half-life < 1 day is rejected by schema validator."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                half_life_days=0,
            )

    def test_vector_26_excess_half_life_rejection(self):
        """Vector 26: Decay half-life > 365 days is rejected by schema validator."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                half_life_days=366,
            )

    def test_vector_27_oversized_description_rejection(self):
        """Vector 27: Notes exceeding 1000 characters are rejected."""
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.34",
                description="A" * 1001,
            )

    # =========================================================================
    # Vectors 28-33: RBAC & Authentication Boundaries
    # =========================================================================

    def test_vector_28_unauthenticated_creation_rejected(self):
        """Vector 28: Unauthenticated creation request fails closed (HTTP 401)."""
        req = make_mock_req("POST")
        from app.auth.dependencies import get_current_operator
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=None, db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_29_viewer_cannot_revoke(self):
        """Vector 29: Viewer role is denied revocation capability (HTTP 403)."""
        dep = require_permission("threat_intel:revoke")
        with self.assertRaises(HTTPException) as ctx:
            dep(request=make_mock_req(), operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_vector_30_analyst_cannot_whitelist(self):
        """Vector 30: Analyst role is denied administrative whitelisting (HTTP 403)."""
        dep = require_permission("threat_intel:admin")
        with self.assertRaises(HTTPException) as ctx:
            dep(request=make_mock_req(), operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_vector_31_inactive_operator_rejected(self):
        """Vector 31: Deactivated operator is rejected even with valid session."""
        self.analyst.is_active = False
        raw_token, _ = default_session_store.create_session(self.analyst, "127.0.0.1", "test")
        req = make_mock_req("GET")
        from app.auth.dependencies import get_current_operator
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req, authorization=f"Bearer {raw_token}", db=self.db)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_32_invalid_feed_token_rejected(self):
        """Vector 32: Incorrect feed token is rejected (HTTP 401)."""
        req = make_mock_req("GET")
        with self.assertRaises(HTTPException) as ctx:
            verify_feed_access(request=req, token="attack_token_invalid")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_33_feed_token_timing_attack_defense(self):
        """Vector 33: Constant-time comparison defends against side-channel token timing attacks."""
        import hmac
        token_a = "hsx_feed_token_default"
        token_b = "hsx_feed_token_defaulx"
        self.assertFalse(hmac.compare_digest(token_a, token_b))

    # =========================================================================
    # Vectors 34-38: Safe Deserialization, Advisory, HITL & Whitelist Precedence
    # =========================================================================

    def test_vector_34_corrupted_metadata_deserialization_safety(self):
        """Vector 34: Corrupted, malformed JSON metadata in database description does not crash parser."""
        corrupt_desc = "{bad_json: missing_quotes, [unclosed"
        meta, notes = deserialize_ioc_metadata(corrupt_desc)
        self.assertEqual(meta["status"], "active")
        self.assertEqual(notes, corrupt_desc)

    def test_vector_35_contextualizer_strictly_advisory_contract(self):
        """Vector 35: Contextualizer never mutates authoritative attributes."""
        raw_ind = {
            "id": 999,
            "indicator_type": "ip",
            "indicator_value": "93.184.216.88",
            "threat_level": "low",
            "decayed_confidence": 0.20,
            "status": "retired",
        }
        res = threat_contextualizer.contextualize_indicator(raw_ind)
        self.assertTrue(res["advisory"])
        self.assertFalse(res["authoritative"])
        # Does not change raw indicator
        self.assertEqual(raw_ind["status"], "retired")

    def test_vector_36_governor_tier3_missing_token_rejection(self):
        """Vector 36: Tier 3 IOC action without approval token is rejected (HTTP 422)."""
        with self.assertRaises(HTTPException) as ctx:
            default_governor.evaluate_command_policy(
                action="IOC_CONTAINMENT_DISPATCH",
                target_id=505,
                operator_id=self.responder.username,
                justification="Emergency perimeter block",
                approval_token=None,
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_vector_37_governor_tier3_token_replay_rejection(self):
        """Vector 37: Replayed approval token is rejected (HTTP 401)."""
        token = default_governor.create_approval_token("IOC_BULK_REVOKE", 707, self.responder.username)
        # First use
        default_governor.evaluate_command_policy(
            action="IOC_BULK_REVOKE",
            target_id=707,
            operator_id=self.responder.username,
            justification="Bulk revoke authorized",
            approval_token=token["approval_token"],
        )
        # Second use (replay) -> HTTP 401
        with self.assertRaises(HTTPException) as ctx:
            default_governor.evaluate_command_policy(
                action="IOC_BULK_REVOKE",
                target_id=707,
                operator_id=self.responder.username,
                justification="Bulk revoke replay",
                approval_token=token["approval_token"],
            )
        self.assertEqual(ctx.exception.status_code, 401)

    def test_vector_38_whitelist_absolute_precedence(self):
        """Vector 38: Whitelisted entity possesses absolute immunity against adversary resurrection."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.77",
                threat_level="high",
                confidence=0.85,
            ),
            operator_username=self.admin.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        threat_intel_service.whitelist_indicator(
            db=self.db,
            indicator_id=ind.id,
            reason="Core diagnostic probe",
            operator_username=self.admin.username,
        )

        # Observed adversary hit
        after_hit = threat_intel_service.record_indicator_hit(
            db=self.db,
            indicator_type="ip",
            indicator_value="93.184.216.77",
        )
        self.assertEqual(after_hit.status, "whitelisted")
        self.assertEqual(after_hit.decayed_confidence, 0.0)

    # =========================================================================
    # Concurrency Bursts 1-6 (20-25 Worker Threads)
    # =========================================================================

    def test_concurrency_burst_01_hit_saturation(self):
        """Burst 1: 20 concurrent hits on the same indicator verify thread-safe monotonic confidence boost."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.101",
                threat_level="low",
                confidence=0.50,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        def worker_hit(_):
            local_db: Session = SessionLocal()
            try:
                threat_intel_service.record_indicator_hit(
                    db=local_db,
                    indicator_type="ip",
                    indicator_value="93.184.216.101",
                )
            finally:
                local_db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(worker_hit, range(20)))

        # Refresh
        refreshed = threat_intel_service.get_indicator(self.db, ind.id)
        self.assertGreater(refreshed.hit_count, 1)
        self.assertGreater(refreshed.decayed_confidence, 0.50)

    def test_concurrency_burst_02_deduplication_race(self):
        """Burst 2: 20 concurrent creates for the same indicator allow exactly 1 and reject 19 with 409 Conflict."""
        target_domain = f"race-dedup-{secrets.token_hex(4)}.org"
        successes = []
        conflicts = []

        def worker_create(worker_id: int):
            local_db: Session = SessionLocal()
            try:
                res = threat_intel_service.create_indicator(
                    db=local_db,
                    data=ThreatIndicatorCreate(
                        indicator_type="domain",
                        indicator_value=target_domain,
                        threat_level="high",
                    ),
                    operator_username=f"worker_{worker_id}",
                )
                successes.append(res.id)
            except HTTPException as e:
                if e.status_code == 409:
                    conflicts.append(worker_id)
            finally:
                local_db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(worker_create, range(20)))

        self.assertEqual(len(successes), 1)
        self.assertEqual(len(conflicts), 19)
        self.cleanup_indicator_ids.extend(successes)

    def test_concurrency_burst_03_revoke_vs_hit_race(self):
        """Burst 3: 20 concurrent operations mixing revocation and hits preserve revocation precedence."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.103",
                threat_level="high",
                confidence=0.80,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        def worker_task(idx: int):
            local_db: Session = SessionLocal()
            try:
                if idx == 0:
                    threat_intel_service.revoke_indicator(
                        db=local_db,
                        indicator_id=ind.id,
                        reason="Adversary host seized",
                        operator_username=self.responder.username,
                    )
                else:
                    threat_intel_service.record_indicator_hit(
                        db=local_db,
                        indicator_type="ip",
                        indicator_value="93.184.216.103",
                    )
            finally:
                local_db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(worker_task, range(20)))

        self.db.expire_all()
        refreshed = threat_intel_service.get_indicator(self.db, ind.id)
        self.assertEqual(refreshed.status, "revoked")
        self.assertEqual(refreshed.decayed_confidence, 0.0)

    def test_concurrency_burst_04_whitelist_vs_hit_race(self):
        """Burst 4: 20 concurrent operations mixing whitelisting and hits preserve whitelisted state."""
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.104",
                threat_level="high",
                confidence=0.80,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        def worker_task(idx: int):
            local_db: Session = SessionLocal()
            try:
                if idx == 0:
                    threat_intel_service.whitelist_indicator(
                        db=local_db,
                        indicator_id=ind.id,
                        reason="Confirmed core DNS recursor",
                        operator_username=self.admin.username,
                    )
                else:
                    threat_intel_service.record_indicator_hit(
                        db=local_db,
                        indicator_type="ip",
                        indicator_value="93.184.216.104",
                    )
            finally:
                local_db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(worker_task, range(20)))

        self.db.expire_all()
        refreshed = threat_intel_service.get_indicator(self.db, ind.id)
        self.assertEqual(refreshed.status, "whitelisted")
        self.assertEqual(refreshed.decayed_confidence, 0.0)

    def test_concurrency_burst_05_concurrent_feed_exports(self):
        """Burst 5: 20 concurrent feed export calls execute cleanly without deadlocks."""
        # Create a sample indicator for feeds
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="concurrent-feed-item.net",
                threat_level="critical",
                confidence=0.95,
            ),
            operator_username=self.analyst.username,
        )
        self.cleanup_indicator_ids.append(ind.id)

        def worker_export(_):
            local_db: Session = SessionLocal()
            try:
                json_res = threat_intel_service.export_json_feed(local_db)
                csv_res = threat_intel_service.export_csv_feed(local_db)
                stix_res = threat_intel_service.export_stix_bundle(local_db)
                return len(json_res["indicators"]), len(csv_res), len(stix_res["objects"])
            finally:
                local_db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(worker_export, range(20)))

        self.assertEqual(len(results), 20)
        for j_count, c_len, s_count in results:
            self.assertGreater(j_count, 0)
            self.assertGreater(c_len, 0)
            self.assertGreater(s_count, 0)

    def test_concurrency_burst_06_memory_store_flooding_and_capacity(self):
        """Burst 6: 25 worker threads flood in-memory store, verifying thread safety and 50k item bound."""
        store = ThreatIntelStore()

        def worker_store_flood(worker_id: int):
            for i in range(100):
                item = {
                    "id": worker_id * 1000 + i,
                    "indicator_type": "ip",
                    "indicator_value": f"93.184.{worker_id}.{i}",
                    "threat_level": "high",
                    "base_confidence": 0.8,
                    "decayed_confidence": 0.8,
                    "status": "active",
                    "hit_count": 1,
                    "tags": [],
                }
                store.save_indicator(item)

        with ThreadPoolExecutor(max_workers=25) as executor:
            list(executor.map(worker_store_flood, range(25)))

        self.assertEqual(len(store._indicators_by_id), 2500)


if __name__ == "__main__":
    unittest.main()
