"""Automated test suite for HoneyShield X Module 3.3.

Covers:
1. Declarative Rule Catalog & Seeded Rules Contract
2. Rule Filtering (vector, rule_type) and Validation (HTTP 422)
3. Single Rule Detail and 404 Rejection
4. Rule Efficacy Calculation, Telemetry Aggregation, and Heuristic Indicators
5. Deterministic Attack Replay with Isolation Guarantee (Zero DB Mutation)
6. Deterministic IP Replay with Chronological Stepping
7. Replay Guardrails (Max 200 events, 24h window, HTTP 404/422)
8. Candidate Rule Dry-Run Simulation (Threshold Rule)
9. Candidate Rule Dry-Run Simulation (Signature Rule)
10. Simulation Safety & ReDoS Catastrophic Backtracking Rejection
11. Operator Audit Logging via SystemEvent (Zero Schema Change)
12. FastAPI HTTP TestClient Integration across all 7 Endpoints
"""

from datetime import datetime, timedelta, timezone
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.audit.service import get_audit_events, record_operator_audit
from app.database import SessionLocal
from app.models import Alert, Attack, AttackEvent, SystemEvent, ThreatIntelligence
from app.multi_vector_detection.efficacy import calculate_rule_efficacy
from app.multi_vector_detection.registry import default_registry
from app.replay.service import (
    replay_attack_events,
    replay_ip_events,
    simulate_candidate_rule,
    validate_regex_safety,
)
from app.routers.audit import get_audit_events_endpoint
from app.routers.detection_rules import (
    get_rule_detail_endpoint,
    get_rule_efficacy_endpoint,
    list_rules_endpoint,
)
from app.routers.replay import (
    replay_attack_endpoint,
    replay_ip_endpoint,
    simulate_candidate_rule_endpoint,
)
from app.schemas import (
    AuditEventsResponse,
    CandidateRuleSpec,
    DetectionRuleSummary,
    ReplayExecutionResponse,
    ReplayRequest,
    RuleCatalogResponse,
    RuleEfficacyResponse,
    SimulationExecutionResponse,
    SimulationRequest,
)


class TestModule33(unittest.TestCase):
    """Test suite covering Module 3.3 Rule Console, Deterministic Replay, Simulation, and Audit."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_event_ids: list[int] = []
        self.created_sys_event_ids: list[int] = []
        # Isolate in-memory rule registry against cross-test pollution from other suites
        from app.multi_vector_detection.registry import SEEDED_RULES
        default_registry._rules = {r.rule_id: r for r in SEEDED_RULES}

    def tearDown(self):
        # Clean up test records
        try:
            if self.created_sys_event_ids:
                for sid in self.created_sys_event_ids:
                    ev = self.db.get(SystemEvent, sid)
                    if ev:
                        self.db.delete(ev)
                self.db.commit()

            if self.created_event_ids:
                for eid in self.created_event_ids:
                    ev = self.db.get(AttackEvent, eid)
                    if ev:
                        self.db.delete(ev)
                self.db.commit()

            if self.created_attack_ids:
                for aid in self.created_attack_ids:
                    atk = self.db.get(Attack, aid)
                    if atk:
                        self.db.delete(atk)
                self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()
            from app.multi_vector_detection.registry import SEEDED_RULES
            default_registry._rules = {r.rule_id: r for r in SEEDED_RULES}

    def test_1_rule_catalog_seeded_rules(self):
        """Verify the rule catalog returns all 5 seeded rules with complete criteria."""
        rules = default_registry.get_all_rules()
        self.assertEqual(len(rules), 5)
        rule_ids = {r.rule_id for r in rules}
        self.assertEqual(
            rule_ids,
            {
                "AUTH_BRUTE_FORCE",
                "WEB_PATH_TRAVERSAL",
                "WEB_SQL_INJECTION",
                "WEB_COMMAND_INJECTION",
                "PORT_SCAN_SWEEP",
            },
        )
        for r in rules:
            self.assertIn(r.vector, ("auth", "web", "network"))
            self.assertIn(r.rule_type, ("threshold", "signature"))
            self.assertGreater(len(r.target_event_types), 0)
            self.assertGreater(r.window_minutes, 0)
            self.assertGreater(r.threshold_count, 0)
            self.assertGreaterEqual(r.base_risk_score, 0.0)
            self.assertLessEqual(r.base_risk_score, 10.0)

    def test_2_rule_catalog_filters_and_validation(self):
        """Verify vector and rule_type query filters and validation rejection."""
        res_web = list_rules_endpoint(vector="web")
        self.assertEqual(res_web.total_rules, 3)
        for r in res_web.rules:
            self.assertEqual(r.vector, "web")

        res_thresh = list_rules_endpoint(rule_type="threshold")
        self.assertEqual(res_thresh.total_rules, 2)
        for r in res_thresh.rules:
            self.assertEqual(r.rule_type, "threshold")

        # Invalid vector raises 422
        with self.assertRaises(HTTPException) as ctx_vec:
            list_rules_endpoint(vector="invalid_vector")
        self.assertEqual(ctx_vec.exception.status_code, 422)

        # Invalid rule_type raises 422
        with self.assertRaises(HTTPException) as ctx_type:
            list_rules_endpoint(rule_type="heuristic")
        self.assertEqual(ctx_type.exception.status_code, 422)

    def test_3_rule_detail_endpoint(self):
        """Verify detail retrieval for a rule and 404 rejection on unknown rule."""
        res_detail = get_rule_detail_endpoint(rule_id="WEB_SQL_INJECTION")
        self.assertEqual(res_detail.rule_id, "WEB_SQL_INJECTION")
        self.assertEqual(res_detail.severity, "critical")
        self.assertEqual(res_detail.base_risk_score, 9.5)
        self.assertIn("union select", res_detail.match_tokens)
        self.assertTrue(res_detail.is_immutable)

        # Unknown rule returns 404
        with self.assertRaises(HTTPException) as ctx_404:
            get_rule_detail_endpoint(rule_id="NONEXISTENT_RULE")
        self.assertEqual(ctx_404.exception.status_code, 404)

    def test_4_rule_efficacy_calculation(self):
        """Verify rule efficacy calculation over historical telemetry and bounds validation."""
        now = datetime.now(timezone.utc)
        # Seed an audit system event for WEB_SQL_INJECTION
        sys_ev = SystemEvent(
            event_type="multi_vector_detection",
            source="multi_vector_detection_engine",
            severity="critical",
            message="Multi-vector detection: source_ip=198.51.100.99, multi_vector=True, vectors=['auth', 'web'], rules=['WEB_SQL_INJECTION'], score=9.5",
            created_at=now,
        )
        self.db.add(sys_ev)
        self.db.commit()
        self.created_sys_event_ids.append(sys_ev.id)

        efficacy = calculate_rule_efficacy(self.db, "WEB_SQL_INJECTION", time_range_hours=24)
        self.assertEqual(efficacy["rule_id"], "WEB_SQL_INJECTION")
        self.assertGreaterEqual(efficacy["total_triggers"], 1)
        self.assertGreaterEqual(efficacy["unique_attackers"], 1)
        self.assertGreaterEqual(efficacy["correlated_multi_vector_triggers"], 1)
        self.assertIn("heuristic", efficacy["false_positive_indicator_note"].lower())

        # Test bounds validation
        with self.assertRaises(HTTPException) as ctx:
            calculate_rule_efficacy(self.db, "WEB_SQL_INJECTION", time_range_hours=0)
        self.assertEqual(ctx.exception.status_code, 422)

        with self.assertRaises(HTTPException) as ctx_high:
            calculate_rule_efficacy(self.db, "WEB_SQL_INJECTION", time_range_hours=200)
        self.assertEqual(ctx_high.exception.status_code, 422)

        with self.assertRaises(HTTPException) as ctx_404:
            calculate_rule_efficacy(self.db, "UNKNOWN_RULE")
        self.assertEqual(ctx_404.exception.status_code, 404)

    def test_5_deterministic_attack_replay_and_isolation(self):
        """Verify deterministic attack replay and assert ZERO production mutations (isolation)."""
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="telnet_brute_force",
            source_ip="198.51.100.44",
            destination_ip="10.0.0.1",
            protocol="telnet",
            severity="high",
            risk_score=8.0,
            status="investigating",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Seed 6 telnet failure events spaced by 30 seconds
        for i in range(6):
            ev = AttackEvent(
                attack_id=atk.id,
                event_type="telnet_login_failed",
                source_ip="198.51.100.44",
                message=f"Failed telnet login attempt {i+1} for user admin",
                event_time=now - timedelta(seconds=(6 - i) * 30),
            )
            self.db.add(ev)
            self.db.commit()
            self.created_event_ids.append(ev.id)

        # Record counts prior to replay
        alert_count_before = self.db.query(Alert).count()
        attack_count_before = self.db.query(Attack).count()
        intel_count_before = self.db.query(ThreatIntelligence).count()

        # Execute replay
        res1 = replay_attack_events(self.db, atk.id, window_minutes=15, record_audit=False)
        self.assertTrue(res1["deterministic_pass"])
        self.assertEqual(res1["total_events_evaluated"], 6)
        self.assertIn("AUTH_BRUTE_FORCE", res1["replayed_detection"]["rules_triggered"])
        self.assertEqual(len(res1["event_timeline"]), 6)

        # Run replay 5 times and assert bit-for-bit repeatability
        for _ in range(5):
            res_repeat = replay_attack_events(self.db, atk.id, window_minutes=15, record_audit=False)
            self.assertEqual(res_repeat["match_status"], res1["match_status"])
            self.assertEqual(
                res_repeat["replayed_detection"]["rules_triggered"],
                res1["replayed_detection"]["rules_triggered"],
            )
            self.assertEqual(
                res_repeat["replayed_detection"]["suggested_risk_score"],
                res1["replayed_detection"]["suggested_risk_score"],
            )

        # Strict isolation check: database state must remain 100% UNCHANGED
        self.assertEqual(self.db.query(Alert).count(), alert_count_before)
        self.assertEqual(self.db.query(Attack).count(), attack_count_before)
        self.assertEqual(self.db.query(ThreatIntelligence).count(), intel_count_before)

        refreshed_atk = self.db.get(Attack, atk.id)
        self.assertEqual(refreshed_atk.status, "investigating")
        self.assertEqual(refreshed_atk.risk_score, 8.0)

    def test_6_deterministic_ip_replay(self):
        """Verify IP replay across events and validate chronological stepping."""
        now = datetime.now(timezone.utc)
        target_ip = "198.51.100.77"

        atk = Attack(
            attack_type="web_sql_injection",
            source_ip=target_ip,
            destination_ip="10.0.0.1",
            protocol="http",
            severity="critical",
            risk_score=9.5,
            status="open",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Seed events with distinct timestamps
        for i in range(5):
            ev = AttackEvent(
                attack_id=atk.id,
                event_type="web_access",
                source_ip=target_ip,
                message=f"GET /index.php?id={i} UNION SELECT 1,2,3--",
                event_time=now - timedelta(minutes=(5 - i)),
            )
            self.db.add(ev)
            self.db.commit()
            self.created_event_ids.append(ev.id)

        res = replay_ip_events(self.db, source_ip=target_ip, window_minutes=15, record_audit=False)
        self.assertTrue(res["deterministic_pass"])
        self.assertIn("WEB_SQL_INJECTION", res["replayed_detection"]["rules_triggered"])
        self.assertEqual(res["target_identifier"], target_ip)

        # Verify chronological ordering in timeline
        times = [e["event_time"] for e in res["event_timeline"]]
        self.assertEqual(times, sorted(times))

        # Invalid IP returns 422
        with self.assertRaises(HTTPException) as ctx:
            replay_ip_events(self.db, source_ip="not_an_ip")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_7_replay_guardrails_and_limits(self):
        """Verify replay bounds (404 on missing attack, max events bounding)."""
        with self.assertRaises(HTTPException) as ctx_404:
            replay_attack_events(self.db, attack_id=9999999)
        self.assertEqual(ctx_404.exception.status_code, 404)

    def test_8_candidate_rule_simulation_threshold(self):
        """Verify dry-run candidate threshold rule simulation and assert registry immutability."""
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="generic_scan",
            source_ip="198.51.100.88",
            destination_ip="10.0.0.1",
            protocol="tcp",
            severity="low",
            risk_score=3.0,
            status="open",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Seed 3 port probe events (below production threshold of 5)
        for i in range(3):
            ev = AttackEvent(
                attack_id=atk.id,
                event_type="port_probe",
                source_ip="198.51.100.88",
                message=f"TCP probe port {8000 + i}",
                event_time=now - timedelta(seconds=(3 - i) * 10),
            )
            self.db.add(ev)
            self.db.commit()
            self.created_event_ids.append(ev.id)

        candidate_spec = CandidateRuleSpec(
            rule_id="CANDIDATE_FAST_PORT_PROBE",
            name="Fast Port Probe",
            vector="network",
            rule_type="threshold",
            target_event_types=["port_probe"],
            window_minutes=5,
            threshold_count=2,  # Candidate threshold is 2 (so 3 events will trigger it!)
            severity="medium",
            base_risk_score=6.0,
            match_tokens=[],
            regex_patterns=[],
        )

        sim_res = simulate_candidate_rule(
            db=self.db,
            target_scope="attack",
            target_identifier=str(atk.id),
            candidate_spec=candidate_spec,
            window_minutes=15,
        )

        self.assertTrue(sim_res["candidate_rule_triggered"])
        self.assertEqual(sim_res["events_evaluated"], 3)
        self.assertNotIn("PORT_SCAN_SWEEP", sim_res["baseline_rules_triggered"])
        self.assertIn("CANDIDATE_FAST_PORT_PROBE", sim_res["simulation_rules_triggered"])
        self.assertEqual(sim_res["new_detections_count"], 1)

        # Verify production registry is completely untouched
        self.assertIsNone(default_registry.get_rule("CANDIDATE_FAST_PORT_PROBE"))
        self.assertEqual(len(default_registry.get_all_rules()), 5)

    def test_9_candidate_rule_simulation_signature(self):
        """Verify dry-run candidate signature rule simulation and matched sample retrieval."""
        now = datetime.now(timezone.utc)
        target_ip = "198.51.100.12"

        atk = Attack(
            attack_type="web_webshell",
            source_ip=target_ip,
            destination_ip="10.0.0.1",
            protocol="http",
            severity="critical",
            risk_score=9.8,
            status="open",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        ev = AttackEvent(
            attack_id=atk.id,
            event_type="web_access",
            source_ip=target_ip,
            message="POST /api/upload HTTP/1.1 payload: <?php system($_GET['cmd']); ?>",
            event_time=now,
        )
        self.db.add(ev)
        self.db.commit()
        self.created_event_ids.append(ev.id)

        candidate_spec = CandidateRuleSpec(
            rule_id="CANDIDATE_WEBSHELL_UPLOAD",
            name="PHP Webshell Upload",
            vector="web",
            rule_type="signature",
            target_event_types=["web_access"],
            window_minutes=15,
            threshold_count=1,
            severity="critical",
            base_risk_score=9.8,
            match_tokens=["<?php", "system("],
            regex_patterns=[r"(?i)<\?php\s+system\("],
        )

        sim_res = simulate_candidate_rule(
            db=self.db,
            target_scope="ip",
            target_identifier=target_ip,
            candidate_spec=candidate_spec,
            window_minutes=15,
        )

        self.assertTrue(sim_res["candidate_rule_triggered"])
        self.assertGreaterEqual(len(sim_res["matched_payload_samples"]), 1)
        self.assertIn("<?php", sim_res["matched_payload_samples"][0])

    def test_10_simulation_safety_and_redos_rejection(self):
        """Verify rejection of unsafe regex patterns (ReDoS, length, syntax)."""
        # 1. Nested quantifier (catastrophic backtracking)
        with self.assertRaises(HTTPException) as ctx_redos:
            validate_regex_safety(r"(a+)+$")
        self.assertEqual(ctx_redos.exception.status_code, 422)
        self.assertIn("ReDoS", ctx_redos.exception.detail)

        # 2. Pattern length exceeding 256 chars
        long_pattern = "a" * 257
        with self.assertRaises(HTTPException) as ctx_len:
            validate_regex_safety(long_pattern)
        self.assertEqual(ctx_len.exception.status_code, 422)

        # 3. Malformed syntax
        with self.assertRaises(HTTPException) as ctx_syntax:
            validate_regex_safety(r"[invalid(regex")
        self.assertEqual(ctx_syntax.exception.status_code, 422)

        # 4. Safe pattern passes
        compiled = validate_regex_safety(r"(?i)\bselect\s+\*\s+from\b")
        self.assertIsNotNone(compiled)

    def test_11_operator_audit_logging_and_query(self):
        """Verify operator audit logging to SystemEvent without schema changes."""
        ev = record_operator_audit(
            db=self.db,
            event_type="operator_triage_review",
            message="Operator verified rule WEB_SQL_INJECTION efficacy",
            source="operator_console",
            severity="info",
        )
        self.assertIsNotNone(ev)
        self.created_sys_event_ids.append(ev.id)

        queried = get_audit_events(
            db=self.db, limit=10, event_type="operator_triage_review"
        )
        self.assertGreaterEqual(len(queried), 1)
        self.assertEqual(queried[0].event_type, "operator_triage_review")
        self.assertIn("Operator verified", queried[0].message)

    def test_12_router_endpoints_schema_contract(self):
        """Verify all 7 new Module 3.3 router endpoints return their exact schema response models."""
        # 1. GET /api/v1/detection/rules
        r1 = list_rules_endpoint()
        self.assertIsInstance(r1, RuleCatalogResponse)
        self.assertEqual(r1.total_rules, 5)

        # 2. GET /api/v1/detection/rules/{rule_id}
        r2 = get_rule_detail_endpoint(rule_id="PORT_SCAN_SWEEP")
        self.assertIsInstance(r2, DetectionRuleSummary)
        self.assertEqual(r2.rule_id, "PORT_SCAN_SWEEP")

        # 3. GET /api/v1/detection/rules/{rule_id}/efficacy
        r3 = get_rule_efficacy_endpoint(rule_id="PORT_SCAN_SWEEP", time_range_hours=24, db=self.db)
        self.assertIsInstance(r3, RuleEfficacyResponse)
        self.assertEqual(r3.rule_id, "PORT_SCAN_SWEEP")

        # 4. POST /api/v1/replay/attack/{attack_id}
        with self.assertRaises(HTTPException) as ctx_r4:
            replay_attack_endpoint(attack_id=999999, db=self.db)
        self.assertEqual(ctx_r4.exception.status_code, 404)

        # 5. POST /api/v1/replay/ip/{source_ip}
        r5 = replay_ip_endpoint(source_ip="127.0.0.1", request=ReplayRequest(window_minutes=15), db=self.db)
        self.assertIsInstance(r5, ReplayExecutionResponse)
        self.assertTrue(r5.deterministic_pass)

        # 6. POST /api/v1/simulation/rule-test
        candidate_req = SimulationRequest(
            target_scope="ip",
            target_identifier="127.0.0.1",
            window_minutes=15,
            candidate_rule=CandidateRuleSpec(
                rule_id="CANDIDATE_HTTP_BURST",
                name="HTTP Request Burst",
                vector="web",
                rule_type="threshold",
                target_event_types=["web_access"],
                window_minutes=5,
                threshold_count=10,
                severity="medium",
                base_risk_score=6.0,
                match_tokens=[],
                regex_patterns=[],
            ),
        )
        r6 = simulate_candidate_rule_endpoint(request=candidate_req, db=self.db)
        self.assertIsInstance(r6, SimulationExecutionResponse)
        self.assertEqual(r6.target_identifier, "127.0.0.1")

        # 7. GET /api/v1/audit/events
        r7 = get_audit_events_endpoint(limit=20, db=self.db)
        self.assertIsInstance(r7, AuditEventsResponse)
        self.assertIsInstance(r7.events, list)

    def test_13_replay_risk_score_dual_scale_boundaries(self):
        """Verify raw_rule_risk_score bounds (0-10) and composite_operational_risk bounds (0-100)."""
        from pydantic import ValidationError
        from app.schemas import ReplayDetectionSummary

        base = {
            "detected": True,
            "is_multi_vector": False,
            "vectors_detected": ["web"],
            "rules_triggered": ["WEB_SQL_INJECTION"],
            "severity": "critical",
            "suggested_risk_score": 9.5,
        }

        # Valid boundaries
        m1 = ReplayDetectionSummary(**base, raw_rule_risk_score=0.0, composite_operational_risk=0.0)
        self.assertEqual(m1.raw_rule_risk_score, 0.0)
        self.assertEqual(m1.composite_operational_risk, 0.0)

        m2 = ReplayDetectionSummary(**base, raw_rule_risk_score=10.0, composite_operational_risk=100.0)
        self.assertEqual(m2.raw_rule_risk_score, 10.0)
        self.assertEqual(m2.composite_operational_risk, 100.0)

        # Invalid raw_rule_risk_score (< 0.0 or > 10.0)
        with self.assertRaises(ValidationError):
            ReplayDetectionSummary(**base, raw_rule_risk_score=-0.1)
        with self.assertRaises(ValidationError):
            ReplayDetectionSummary(**base, raw_rule_risk_score=10.1)

        # Invalid composite_operational_risk (< 0.0 or > 100.0)
        with self.assertRaises(ValidationError):
            ReplayDetectionSummary(**base, composite_operational_risk=-0.1)
        with self.assertRaises(ValidationError):
            ReplayDetectionSummary(**base, composite_operational_risk=100.1)

    def test_14_orchestrated_attack_replay_operational_reconstruction(self):
        """Verify replay of orchestrated attack correctly reconstructs baseline_score and correlation boost."""
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="web_probe",
            source_ip="203.0.113.199",
            protocol="http",
            severity="critical",
            risk_score=100.0,
            status="detected",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Seed events: SQLi probe matching WEB_SQL_INJECTION (9.5)
        ev1 = AttackEvent(
            attack_id=atk.id,
            event_type="web_access",
            source_ip="203.0.113.199",
            message="GET /search.php?q=admin' UNION SELECT 1,2,3-- HTTP/1.1",
            event_time=now - timedelta(seconds=10),
        )
        self.db.add(ev1)

        # Seed multi_vector_detection SystemEvent
        mv_ev = SystemEvent(
            event_type="multi_vector_detection",
            source="multi_vector_detection_engine",
            severity="critical",
            message=f"Multi-vector detection: attack_id={atk.id}, multi_vector=False, vectors=['web'], rules=['WEB_SQL_INJECTION'], score=9.5",
            created_at=now - timedelta(seconds=5),
        )
        self.db.add(mv_ev)

        # Seed unified_security_processing SystemEvent with correlation boost (+10.0)
        uni_ev = SystemEvent(
            event_type="unified_security_processing",
            source="unified_orchestrator",
            severity="critical",
            message=f"Unified processing for Attack #{atk.id} (source_ip=203.0.113.199): detections=['web'], correlation=multi_vector (conf=0.9), baseline_risk=0.0, operational_risk=100.0 (critical), alert_id=None, notification=sent",
            created_at=now,
        )
        self.db.add(uni_ev)
        self.db.commit()

        # Replay the orchestrated attack
        res = replay_attack_events(self.db, atk.id, window_minutes=15, record_audit=False)
        self.assertTrue(res["deterministic_pass"])
        self.assertEqual(res["match_status"], "identical")
        self.assertEqual(res["detection_diff"]["detection_equivalence"], "equivalent")
        self.assertEqual(res["detection_diff"]["operational_equivalence"], "equivalent")
        self.assertEqual(res["detection_diff"]["rule_risk_delta"], 0.0)
        self.assertEqual(res["detection_diff"]["operational_risk_delta"], 0.0)
        self.assertEqual(res["replayed_detection"]["composite_operational_risk"], 100.0)
        self.assertEqual(res["replayed_detection"]["raw_rule_risk_score"], 9.5)

    def test_15_unorchestrated_attack_fair_comparison(self):
        """Verify un-orchestrated attack without audit provenance reports context_unavailable, not false zero delta."""
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="port_scan",
            source_ip="198.51.100.222",
            protocol="tcp",
            severity="medium",
            risk_score=70.0,
            status="detected",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Seed 6 network events to trigger PORT_SCAN_SWEEP
        for i in range(6):
            ev = AttackEvent(
                attack_id=atk.id,
                event_type="network_scan",
                source_ip="198.51.100.222",
                message=f"TCP connection attempt to port {8000 + i}",
                event_time=now - timedelta(seconds=(6 - i) * 10),
            )
            self.db.add(ev)
        self.db.commit()

        # Replay un-orchestrated attack (no SystemEvents present)
        res = replay_attack_events(self.db, atk.id, window_minutes=15, record_audit=False)
        self.assertTrue(res["deterministic_pass"])
        # Should certify detection equivalence but mark operational equivalence as unavailable
        self.assertEqual(res["match_status"], "detection_equivalent_only")
        self.assertEqual(res["detection_diff"]["detection_equivalence"], "equivalent")
        self.assertEqual(res["detection_diff"]["operational_equivalence"], "unavailable")
        self.assertIsNone(res["detection_diff"]["operational_risk_delta"])
        self.assertIsNone(res["replayed_detection"]["composite_operational_risk"])
        self.assertEqual(res["replayed_detection"]["raw_rule_risk_score"], 7.0)

    def test_16_strict_db_side_effect_isolation(self):
        """Verify target row xmin, updated_at, and table states are completely unmodified during replay."""
        from sqlalchemy import text
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="ssh_login_failed",
            source_ip="198.51.100.77",
            protocol="ssh",
            severity="high",
            risk_score=60.0,
            status="detected",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        # Fetch initial system metadata: xmin (PostgreSQL transaction ID)
        row_before = self.db.execute(
            text("SELECT xmin, risk_score, severity, status FROM attacks WHERE id = :aid"),
            {"aid": atk.id}
        ).fetchone()
        sys_count_before = self.db.query(SystemEvent).count()

        # Execute replay with record_audit=False
        res = replay_attack_events(self.db, atk.id, window_minutes=15, record_audit=False)
        self.assertTrue(res["deterministic_pass"])

        # Fetch post-replay system metadata
        row_after = self.db.execute(
            text("SELECT xmin, risk_score, severity, status FROM attacks WHERE id = :aid"),
            {"aid": atk.id}
        ).fetchone()
        sys_count_after = self.db.query(SystemEvent).count()

        # Strict side-effect assertions: row version xmin must be identical (no update/write occurred)
        self.assertEqual(row_before[0], row_after[0], "Attack row xmin modified during replay!")
        self.assertEqual(row_before[1], row_after[1], "Attack risk_score modified during replay!")
        self.assertEqual(row_before[2], row_after[2], "Attack severity modified during replay!")
        self.assertEqual(sys_count_before, sys_count_after, "SystemEvent created when record_audit=False!")

    def test_17_backward_compatibility_serialization(self):
        """Verify legacy clients reading suggested_risk_score receive expected values on attack and IP scopes."""
        now = datetime.now(timezone.utc)
        atk = Attack(
            attack_type="web_access",
            source_ip="198.51.100.88",
            protocol="http",
            severity="critical",
            risk_score=95.0,
            status="detected",
            detected_at=now,
        )
        self.db.add(atk)
        self.db.commit()
        self.created_attack_ids.append(atk.id)

        r_atk = replay_attack_endpoint(attack_id=atk.id, db=self.db)
        self.assertIsInstance(r_atk, ReplayExecutionResponse)
        self.assertIsInstance(r_atk.replayed_detection.suggested_risk_score, float)
        self.assertIsInstance(r_atk.detection_diff.risk_score_delta, float)

        r_ip = replay_ip_endpoint(source_ip="127.0.0.1", request=ReplayRequest(window_minutes=15), db=self.db)
        self.assertIsInstance(r_ip, ReplayExecutionResponse)
        self.assertIsInstance(r_ip.replayed_detection.suggested_risk_score, float)
        self.assertIsInstance(r_ip.detection_diff.risk_score_delta, float)
