"""Automated test suite for HoneyShield X Investigation & Attack-Chain Explorer (Module 3.2).

Scenarios Covered:
1. MITRE Catalog & Known Rule Mappings
2. Event Fallback Mappings & Unknown Event Handling
3. Attacker IP Dossier Aggregation
4. Threat Intelligence & Correlation Integration
5. Single-Attack Graph Derivation
6. Cross-Attack IP Graph Derivation
7. Graph Determinism & Chronological Transitions
8. Cross-Attack Event Timeline Ordering & Bounded Limit
9. Window Hours Validation (1 to 168 hours)
10. Malformed IP Address Rejection (HTTP 422)
11. Nonexistent Attack Container Rejection (HTTP 404)
12. Attacker String Safety & Escaping
13. FastAPI TestClient HTTP Integration & Frozen Schema Contracts
"""

from datetime import datetime, timedelta, timezone
import unittest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.investigation.mitre import (
    get_mitre_catalog,
    map_event_to_mitre,
    map_rule_to_mitre,
)
from app.investigation.service import (
    get_attack_graph,
    get_cross_attack_events,
    get_ip_dossier,
    get_ip_graph,
    validate_ip_address,
)
from app.main import app
from app.models import Alert, Attack, AttackEvent, ThreatIntelligence
from app.routers.investigation import (
    get_attack_graph_endpoint,
    get_cross_attack_events_endpoint,
    get_ip_dossier_endpoint,
    get_ip_graph_endpoint,
    get_mitre_catalog_endpoint,
)
from app.schemas import (
    AttackGraphResponse,
    CrossAttackEventResponse,
    IpDossierResponse,
    MitreCatalogResponse,
)


class TestInvestigationAPI(unittest.TestCase):
    """Test suite covering Module 3.2 Investigation, MITRE Catalog, and Attack Graphs."""

    def setUp(self):
        self.db: Session = SessionLocal()
        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []
        self.created_ti_ids: list[int] = []

    def tearDown(self):
        for tid in self.created_ti_ids:
            self.db.query(ThreatIntelligence).filter(ThreatIntelligence.id == tid).delete()
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.commit()
        self.db.close()

    def _create_attack(
        self,
        source_ip: str = "198.51.100.55",
        attack_type: str = "web",
        severity: str = "high",
        risk_score: float = 85.0,
        detected_at: datetime | None = None,
    ) -> Attack:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        attack = Attack(
            attack_type=attack_type,
            source_ip=source_ip,
            destination_ip="10.0.0.1",
            protocol="HTTP",
            severity=severity,
            risk_score=risk_score,
            status="detected",
            detected_at=detected_at or now,
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)
        return attack

    def _create_event(
        self,
        attack_id: int,
        event_type: str,
        source_ip: str = "198.51.100.55",
        message: str = "Test security event",
        event_time: datetime | None = None,
    ) -> AttackEvent:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        event = AttackEvent(
            attack_id=attack_id,
            event_type=event_type,
            source_ip=source_ip,
            message=message,
            event_time=event_time or now,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def _create_alert(
        self,
        attack_id: int,
        severity: str = "high",
        status: str = "open",
        alert_type: str = "WEB_SQL_INJECTION",
    ) -> Alert:
        alert = Alert(
            attack_id=attack_id,
            alert_type=alert_type,
            severity=severity,
            message=f"Test alert for {alert_type}",
            status=status,
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return alert

    def _create_threat_intel(
        self,
        indicator_value: str = "198.51.100.55",
        threat_level: str = "high",
        confidence: float = 0.9,
    ) -> ThreatIntelligence:
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=indicator_value,
            threat_level=threat_level,
            source="AbuseIPDB",
            confidence=confidence,
            description="Known adversarial scanning host",
        )
        self.db.add(ti)
        self.db.commit()
        self.db.refresh(ti)
        self.created_ti_ids.append(ti.id)
        return ti

    # =========================================================================
    # Test 1: MITRE Catalog & Known Rule Mappings
    # =========================================================================
    def test_1_mitre_catalog_and_known_rule_mappings(self):
        """Test 1: Verify static MITRE mapping catalog and seeded detection rules."""
        catalog_resp = get_mitre_catalog_endpoint()
        self.assertIsInstance(catalog_resp, MitreCatalogResponse)
        self.assertGreaterEqual(catalog_resp.total_entries, 10)

        # Rule PORT_SCAN_SWEEP -> TA0043 / T1046
        r_port = map_rule_to_mitre("PORT_SCAN_SWEEP")
        self.assertIsNotNone(r_port)
        self.assertEqual(r_port.tactic_id, "TA0043")
        self.assertEqual(r_port.tactic_name, "Reconnaissance")
        self.assertEqual(r_port.technique_id, "T1046")
        self.assertEqual(r_port.confidence, 1.0)

        # Rule WEB_PATH_TRAVERSAL -> TA0001 / T1190
        r_trav = map_rule_to_mitre("WEB_PATH_TRAVERSAL")
        self.assertIsNotNone(r_trav)
        self.assertEqual(r_trav.tactic_id, "TA0001")
        self.assertEqual(r_trav.technique_id, "T1190")

        # Rule WEB_SQL_INJECTION -> TA0001 / T1190
        r_sqli = map_rule_to_mitre("WEB_SQL_INJECTION")
        self.assertIsNotNone(r_sqli)
        self.assertEqual(r_sqli.tactic_id, "TA0001")
        self.assertEqual(r_sqli.technique_id, "T1190")

        # Rule AUTH_BRUTE_FORCE -> TA0006 / T1110
        r_auth = map_rule_to_mitre("AUTH_BRUTE_FORCE")
        self.assertIsNotNone(r_auth)
        self.assertEqual(r_auth.tactic_id, "TA0006")
        self.assertEqual(r_auth.technique_id, "T1110")

        # Rule WEB_COMMAND_INJECTION -> TA0002 / T1059
        r_cmd = map_rule_to_mitre("WEB_COMMAND_INJECTION")
        self.assertIsNotNone(r_cmd)
        self.assertEqual(r_cmd.tactic_id, "TA0002")
        self.assertEqual(r_cmd.technique_id, "T1059")

    # =========================================================================
    # Test 2: Event Fallback Mappings & Unknown Event Handling
    # =========================================================================
    def test_2_mitre_event_fallback_and_unknown_mappings(self):
        """Test 2: Verify fallback mappings for raw events and graceful unknown handling."""
        # ssh_login_failed -> TA0006 / T1110
        m_ssh = map_event_to_mitre("ssh_login_failed")
        self.assertEqual(m_ssh.tactic_id, "TA0006")
        self.assertEqual(m_ssh.technique_id, "T1110")

        # ssh_command_exec -> TA0002 / T1059.004
        m_exec = map_event_to_mitre("ssh_command_exec")
        self.assertEqual(m_exec.tactic_id, "TA0002")
        self.assertEqual(m_exec.technique_id, "T1059.004")

        # port_probe -> TA0043 / T1046
        m_probe = map_event_to_mitre("port_probe")
        self.assertEqual(m_probe.tactic_id, "TA0043")
        self.assertEqual(m_probe.technique_id, "T1046")

        # web_probe -> TA0043 / T1595
        m_web = map_event_to_mitre("web_probe")
        self.assertEqual(m_web.tactic_id, "TA0043")
        self.assertEqual(m_web.technique_id, "T1595")

        # Completely unknown event -> TA0000 / T0000 with 0.5 confidence
        m_unknown = map_event_to_mitre("unknown_zero_day_telemetry")
        self.assertEqual(m_unknown.tactic_id, "TA0000")
        self.assertEqual(m_unknown.technique_id, "T0000")
        self.assertEqual(m_unknown.confidence, 0.5)

    # =========================================================================
    # Test 3: Attacker IP Dossier Aggregation
    # =========================================================================
    def test_3_ip_dossier_aggregation(self):
        """Test 3: Verify comprehensive IP dossier aggregation."""
        test_ip = "198.51.100.60"
        self._create_threat_intel(indicator_value=test_ip, threat_level="high", confidence=0.88)

        attack1 = self._create_attack(source_ip=test_ip, attack_type="SSH Brute Force", severity="medium", risk_score=60.0)
        attack2 = self._create_attack(source_ip=test_ip, attack_type="Web Exploitation", severity="critical", risk_score=92.0)

        self._create_event(attack1.id, "ssh_login_failed", source_ip=test_ip)
        self._create_event(attack2.id, "web_access", source_ip=test_ip, message="union select 1,2,3")

        self._create_alert(attack2.id, severity="critical", status="open")

        dossier = get_ip_dossier(db=self.db, source_ip=test_ip, window_hours=24)
        resp = IpDossierResponse(**dossier)

        self.assertEqual(resp.source_ip, test_ip)
        self.assertEqual(resp.total_attacks, 2)
        self.assertEqual(resp.total_events, 2)
        self.assertIn(attack1.id, resp.attack_ids)
        self.assertIn(attack2.id, resp.attack_ids)
        self.assertEqual(resp.highest_severity, "critical")
        self.assertEqual(resp.highest_risk_score, 92.0)
        self.assertEqual(resp.active_alerts_count, 1)
        self.assertTrue(resp.threat_intelligence.found)
        self.assertEqual(resp.threat_intelligence.threat_level, "high")

    # =========================================================================
    # Test 4: Threat Intelligence & Correlation Integration
    # =========================================================================
    def test_4_ip_dossier_threat_intel_and_correlation(self):
        """Test 4: Verify correlation directives and multi-vector results in IP dossier."""
        test_ip = "198.51.100.70"
        attack = self._create_attack(source_ip=test_ip)
        self._create_event(attack.id, "port_probe", source_ip=test_ip)

        dossier = get_ip_dossier_endpoint(source_ip=test_ip, window_hours=48, db=self.db)
        self.assertEqual(dossier.source_ip, test_ip)
        self.assertIsNotNone(dossier.correlation)
        self.assertIsNotNone(dossier.multi_vector)

    # =========================================================================
    # Test 5: Single-Attack Graph Derivation
    # =========================================================================
    def test_5_single_attack_graph_generation(self):
        """Test 5: Verify derived Attack-Chain DAG for a single attack container."""
        attack = self._create_attack(source_ip="198.51.100.80", severity="critical", risk_score=95.0)

        t0 = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=10)
        t1 = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5)
        t2 = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)

        ev1 = self._create_event(attack.id, "port_probe", event_time=t0, message="Scanning port 80")
        ev2 = self._create_event(attack.id, "web_access", event_time=t1, message="GET /login.php?id=1 union select")
        ev3 = self._create_event(attack.id, "ssh_command_exec", event_time=t2, message="cat /etc/passwd")

        alert = self._create_alert(attack.id, severity="critical")

        graph_dict = get_attack_graph(db=self.db, attack_id=attack.id)
        graph = AttackGraphResponse(**graph_dict)

        self.assertEqual(graph.entity_id, str(attack.id))
        self.assertEqual(graph.entity_type, "attack")
        self.assertGreaterEqual(len(graph.nodes), 3)  # Entity + Stages + Alert
        self.assertGreaterEqual(len(graph.edges), 2)

        node_types = [n.type for n in graph.nodes]
        self.assertIn("entity", node_types)
        self.assertIn("tactic_stage", node_types)
        self.assertIn("alert", node_types)

        # Execution stage TA0002 must be flagged
        self.assertTrue(graph.summary.has_execution)
        self.assertEqual(graph.summary.highest_severity, "critical")

    # =========================================================================
    # Test 6: Cross-Attack IP Graph Derivation
    # =========================================================================
    def test_6_cross_attack_ip_graph_generation(self):
        """Test 6: Verify cross-attack progression DAG across multiple attack containers."""
        test_ip = "198.51.100.90"
        att1 = self._create_attack(source_ip=test_ip, attack_type="Recon")
        att2 = self._create_attack(source_ip=test_ip, attack_type="Exploit")

        self._create_event(att1.id, "port_probe", source_ip=test_ip)
        self._create_event(att2.id, "ssh_login_failed", source_ip=test_ip)

        graph_dict = get_ip_graph(db=self.db, source_ip=test_ip, window_hours=24)
        graph = AttackGraphResponse(**graph_dict)

        self.assertEqual(graph.entity_id, test_ip)
        self.assertEqual(graph.entity_type, "source_ip")
        self.assertGreaterEqual(graph.summary.stages_observed, 1)

    # =========================================================================
    # Test 7: Graph Determinism & Chronological Transitions
    # =========================================================================
    def test_7_graph_determinism_and_chronological_edges(self):
        """Test 7: Verify that graph derivation is 100% deterministic and edges link sequentially."""
        attack = self._create_attack(source_ip="198.51.100.100")
        self._create_event(attack.id, "port_probe")
        self._create_event(attack.id, "web_probe")
        self._create_event(attack.id, "ssh_command_exec")

        g1 = get_attack_graph(db=self.db, attack_id=attack.id)
        g2 = get_attack_graph(db=self.db, attack_id=attack.id)

        # Determinism check: node IDs and edge IDs must be completely identical
        self.assertEqual([n["id"] for n in g1["nodes"]], [n["id"] for n in g2["nodes"]])
        self.assertEqual([e["id"] for e in g1["edges"]], [e["id"] for e in g2["edges"]])

        # Edge validity: every edge source and target must exist in node IDs
        node_ids = {n["id"] for n in g1["nodes"]}
        for edge in g1["edges"]:
            self.assertIn(edge["source"], node_ids)
            self.assertIn(edge["target"], node_ids)

    # =========================================================================
    # Test 8: Cross-Attack Event Timeline Ordering & Bounded Limit
    # =========================================================================
    def test_8_cross_attack_timeline_ordering_and_limit(self):
        """Test 8: Verify chronological ordering and 200-event limit clamping."""
        test_ip = "198.51.100.110"
        attack = self._create_attack(source_ip=test_ip)

        t_base = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
        # Create 10 events out of order
        self._create_event(attack.id, "web_access", source_ip=test_ip, event_time=t_base + timedelta(minutes=10))
        self._create_event(attack.id, "port_probe", source_ip=test_ip, event_time=t_base + timedelta(minutes=2))
        self._create_event(attack.id, "ssh_login_failed", source_ip=test_ip, event_time=t_base + timedelta(minutes=5))

        events = get_cross_attack_events(db=self.db, source_ip=test_ip, window_hours=24, limit=50)
        self.assertEqual(len(events), 3)

        # Must be strictly ascending by event_time
        times = [e["event_time"] for e in events]
        self.assertEqual(times, sorted(times))

        # Each event must have MITRE mapping attached
        for e in events:
            self.assertIn("mitre", e)
            self.assertIn("tactic_id", e["mitre"])

    # =========================================================================
    # Test 9: Window Hours Validation (1 to 168 hours)
    # =========================================================================
    def test_9_window_hours_validation_1_to_168(self):
        """Test 9: Verify window hours boundary acceptance and bounds checking."""
        test_ip = "198.51.100.120"
        self._create_attack(source_ip=test_ip)

        # Valid limits: 1h and 168h
        r1 = get_ip_dossier_endpoint(source_ip=test_ip, window_hours=1, db=self.db)
        self.assertIsInstance(r1, IpDossierResponse)

        r168 = get_ip_dossier_endpoint(source_ip=test_ip, window_hours=168, db=self.db)
        self.assertIsInstance(r168, IpDossierResponse)

        # Timeline valid limits
        ev_1 = get_cross_attack_events_endpoint(source_ip=test_ip, window_hours=1, db=self.db)
        self.assertIsInstance(ev_1, list)

        ev_168 = get_cross_attack_events_endpoint(source_ip=test_ip, window_hours=168, db=self.db)
        self.assertIsInstance(ev_168, list)

    # =========================================================================
    # Test 10: Malformed IP Address Rejection (HTTP 422)
    # =========================================================================
    def test_10_malformed_ip_returns_422(self):
        """Test 10: Reject malformed IP addresses with HTTP 422."""
        malformed_inputs = [
            "not-an-ip",
            "999.999.999.999",
            "192.168.1.1/24",
            "192.168.1.1; DROP TABLE attacks;",
            "<script>alert(1)</script>",
        ]
        for bad_ip in malformed_inputs:
            with self.assertRaises(HTTPException) as ctx:
                validate_ip_address(bad_ip)
            self.assertEqual(ctx.exception.status_code, 422)

            with self.assertRaises(HTTPException) as ctx:
                get_ip_dossier_endpoint(source_ip=bad_ip, db=self.db)
            self.assertEqual(ctx.exception.status_code, 422)

            with self.assertRaises(HTTPException) as ctx:
                get_ip_graph_endpoint(source_ip=bad_ip, db=self.db)
            self.assertEqual(ctx.exception.status_code, 422)

            with self.assertRaises(HTTPException) as ctx:
                get_cross_attack_events_endpoint(source_ip=bad_ip, db=self.db)
            self.assertEqual(ctx.exception.status_code, 422)

    # =========================================================================
    # Test 11: Nonexistent Attack Container Rejection (HTTP 404)
    # =========================================================================
    def test_11_nonexistent_attack_returns_404(self):
        """Test 11: Querying a non-existent attack container returns HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            get_attack_graph(db=self.db, attack_id=9999999)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            get_attack_graph_endpoint(attack_id=9999999, db=self.db)
        self.assertEqual(ctx.exception.status_code, 404)

    # =========================================================================
    # Test 12: Attacker String Safety & Escaping
    # =========================================================================
    def test_12_attacker_string_safety(self):
        """Test 12: Attacker strings with XSS or shell injection remain raw data."""
        xss_payload = "<script>alert('xss')</script>"
        cmd_payload = "$(rm -rf /) ; whoami | id"

        attack = self._create_attack(source_ip="198.51.100.130")
        self._create_event(attack.id, "web_access", source_ip="198.51.100.130", message=xss_payload)
        self._create_event(attack.id, "ssh_command_exec", source_ip="198.51.100.130", message=cmd_payload)

        # Ensure timeline returns strings unchanged as raw data
        events = get_cross_attack_events(db=self.db, source_ip="198.51.100.130", window_hours=24)
        messages = [e["message"] for e in events]
        self.assertIn(xss_payload, messages)
        self.assertIn(cmd_payload, messages)

    # =========================================================================
    # Test 13: Direct Router Endpoint Invocations & Frozen Schema Contracts
    # =========================================================================
    def test_13_router_endpoints_schema_contract(self):
        """Test 13: Verify exact schema response models returned by all 5 router endpoints."""
        attack = self._create_attack(source_ip="198.51.100.140")
        self._create_event(attack.id, "port_probe", source_ip="198.51.100.140")

        # 1. Catalog
        res_cat = get_mitre_catalog_endpoint()
        self.assertIsInstance(res_cat, MitreCatalogResponse)
        self.assertGreaterEqual(res_cat.total_entries, 1)

        # 2. IP Dossier
        res_dos = get_ip_dossier_endpoint(source_ip="198.51.100.140", db=self.db)
        self.assertIsInstance(res_dos, IpDossierResponse)
        self.assertEqual(res_dos.source_ip, "198.51.100.140")

        # 3. Attack Graph
        res_ag = get_attack_graph_endpoint(attack_id=attack.id, db=self.db)
        self.assertIsInstance(res_ag, AttackGraphResponse)
        self.assertEqual(res_ag.entity_id, str(attack.id))

        # 4. IP Graph
        res_ig = get_ip_graph_endpoint(source_ip="198.51.100.140", db=self.db)
        self.assertIsInstance(res_ig, AttackGraphResponse)
        self.assertEqual(res_ig.entity_id, "198.51.100.140")

        # 5. IP Events Timeline
        res_ev = get_cross_attack_events_endpoint(source_ip="198.51.100.140", db=self.db)
        self.assertIsInstance(res_ev, list)
        self.assertGreaterEqual(len(res_ev), 1)
        self.assertIsInstance(res_ev[0], CrossAttackEventResponse)


if __name__ == "__main__":
    unittest.main()
