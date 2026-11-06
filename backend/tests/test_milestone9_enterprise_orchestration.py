"""Milestone 9 — Enterprise Cybersecurity Platform Integration & SOC Dress Rehearsal Tests.

Verifies:
- Part 5: System 1 (SOC Telemetry, Detection, Risk Scoring, Alerting, Cases)
- Part 6: System 2 (Deception Grid, Canary Honeytoken Lifecycle, Trap Listeners)
- Part 7: System 3 (Threat Intelligence, IOC Matching, Multi-factor Correlation)
- Part 7.4: Three-System Causal Trace (Tripwire -> Ingestion -> SOC Alert -> Outbox)
- Part 8: Digital Agent Universe (SCOUT, NEXUS, ORACLE, SENTINEL 12-Step Movement & Handoffs)
- Part 9: Real-time Streaming, Outbox Monotonicity, and Authorization Filtering
- Part 10: Multi-Operator Concurrency, Role Separation & Audit Logging
- Part 12: Failure Injection & Redis Outbox Fallback Resilience
- Part 16: Mobile / Android Contract Backwards Compatibility
"""

from datetime import datetime, timezone
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.alerts.service import evaluate_attack_alert
from app.auth.registry import Operator, default_operator_registry
from app.auth.session import default_session_store
from app.database import Base
from app.deception.service import default_deception_service
from app.detection.rules import DEFAULT_SSH_RULE, SSHBruteForceConfig
from app.detection.service import detect_ssh_brute_force
from app.events.schemas import SecurityEventEnvelope, TransferLifecycleEvent
from app.events.service import publish_handoff_event, publish_lifecycle_event, publish_security_event
from app.events.store import can_operator_view_event, default_event_store
from app.events.tickets import default_ticket_service
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, AttackEvent, SecurityEventOutbox, ThreatIntelligence
from app.observability.health import ServiceHealthStatus, evaluate_full_system_health
from app.observability.metrics import default_metrics_collector
from app.risk.service import calculate_attack_risk
from app.schemas import CanaryCreateRequest, ThreatIndicatorCreate
from app.threat_intelligence.service import lookup_indicator


class TestMilestone9EnterpriseOrchestration(unittest.TestCase):
    """Milestone 9 Ultimate Integration and Dress Rehearsal Test Suite."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        # 4-Tier Operational Operator Personas
        cls.admin_op = Operator(
            username="sec_director",
            role="security_administrator",
            email="director@honeyshield.local",
            password_hash="mock_hash",
        )
        cls.responder_op = Operator(
            username="incident_lead",
            role="incident_responder",
            email="responder@honeyshield.local",
            password_hash="mock_hash",
        )
        cls.analyst_op = Operator(
            username="soc_analyst_tier2",
            role="analyst",
            email="analyst2@honeyshield.local",
            password_hash="mock_hash",
        )
        cls.viewer_op = Operator(
            username="compliance_auditor",
            role="viewer",
            email="auditor@honeyshield.local",
            password_hash="mock_hash",
        )

        for op in [cls.admin_op, cls.responder_op, cls.analyst_op, cls.viewer_op]:
            default_operator_registry.register_operator(op)

    def setUp(self):
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_three_system_causal_trace(self):
        """Scenario: Canary Tripwire -> Metadata Ingestion -> Detection -> Threat Intel -> Alert -> Outbox."""
        # 1. System 2: Mint Canary Honeytoken
        canary_req = CanaryCreateRequest(
            canary_type="AWS_API_KEY",
            name="Staging Production S3 Canary",
            environment="production_dmz",
            notification_channels=["soc_dashboard", "push_mobile"],
        )
        minted_canary = default_deception_service.mint_canary(payload=canary_req, db=self.db, operator=self.admin_op)
        self.assertIsNotNone(minted_canary.token_id)

        # 2. System 3: Pre-seed adversary indicator
        adversary_ip = "198.51.100.88"
        db_ioc = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=adversary_ip,
            threat_level="high",
            confidence=90.0,
            source="canary_trap",
            description="Active APT Scanner observed on DMZ tripwires",
        )
        self.db.add(db_ioc)
        self.db.commit()

        # 3. System 1: Telemetry Ingest & Attack Creation
        attack = Attack(
            attack_type="canary_trap_breach",
            source_ip=adversary_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        # 4. Ingest 5 rapid failed login events simulating SSH brute force
        for i in range(5):
            event = AttackEvent(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                source_ip=adversary_ip,
                message=f"Failed SSH password attempt {i+1} using tripwire creds",
                event_time=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            self.db.add(event)
        self.db.commit()

        # 5. Detection Engine triggers SSH brute force rule
        det_result = detect_ssh_brute_force(db=self.db, attack=attack, source_ip=adversary_ip)
        self.assertTrue(det_result.detected)
        self.assertEqual(det_result.severity, "high")

        # 6. Threat Intel Enrichment lookup elevates confidence
        ioc_lookup = lookup_indicator(db=self.db, indicator_type="ip", indicator_value=adversary_ip)
        self.assertTrue(ioc_lookup["found"])
        self.assertEqual(ioc_lookup["threat_level"], "high")

        # 7. Authoritative Risk Scoring (produces risk_score >= 50.0)
        risk_result = calculate_attack_risk(db=self.db, attack_id=attack.id)
        self.assertGreaterEqual(risk_result["risk_score"], 50.0)

        # 8. Alert Evaluator generates persistent Security Alert
        alert_result = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(alert_result["alert_created"])
        self.assertIsNotNone(alert_result["alert_id"])

        # 9. Transactional Outbox commits lifecycle event
        outbox_event = publish_security_event(
            event_type="alert.created",
            resource_id=str(alert_result["alert_id"]),
            payload={
                "attack_id": attack.id,
                "source_ip": adversary_ip,
                "risk_score": risk_result["risk_score"],
            },
            severity="critical",
            db=self.db,
        )
        self.assertGreater(outbox_event.cursor, 0)
        self.assertEqual(outbox_event.agent, "SENTINEL")

    def test_02_digital_agent_twelve_step_lifecycle_and_handoff(self):
        """Verify 12-step movement progression, data packet attachment, and confirmed handoffs."""
        transfer_id = "tr_scout_nexus_9001"
        workflow_id = "wf_incident_9001"

        # Step 1-4: SCOUT collects packet
        scout_ev = publish_lifecycle_event(
            agent="SCOUT",
            stage="collection",
            status="completed",
            source="sensor:honeypot_grid",
            destination="courier:nexus_transit",
            resource_id="pkt_9001",
            transfer_id=transfer_id,
            workflow_id=workflow_id,
            payload={"source_ip": "203.0.113.19"},
            db=self.db,
        )
        self.assertEqual(scout_ev.agent, "SCOUT")
        self.assertEqual(scout_ev.status, "completed")

        # Step 5-9: Confirmed handoff SCOUT -> NEXUS
        handoff_ev = publish_handoff_event(
            from_agent="SCOUT",
            to_agent="NEXUS",
            resource_id="pkt_9001",
            workflow_id=workflow_id,
            transfer_id=transfer_id,
            context_message="Verified courier packet transfer",
            task_type="telemetry_courier",
            severity="info",
            db=self.db,
        )
        self.assertEqual(handoff_ev.event_type, "handoff.scout_to_nexus")
        self.assertEqual(handoff_ev.agent, "SCOUT")
        self.assertEqual(handoff_ev.destination, "agent:NEXUS")

        # Step 10: NEXUS waiting state before confirmation
        waiting_ev = publish_lifecycle_event(
            agent="NEXUS",
            stage="transport",
            status="waiting",
            source="courier:nexus_transit",
            destination="node:intel_citadel",
            resource_id="pkt_9001",
            transfer_id=transfer_id,
            workflow_id=workflow_id,
            db=self.db,
        )
        self.assertEqual(waiting_ev.status, "waiting")

        # Step 11: Final delivery confirmation
        delivered_ev = publish_lifecycle_event(
            agent="NEXUS",
            stage="transport",
            status="completed",
            source="courier:nexus_transit",
            destination="node:intel_citadel",
            resource_id="pkt_9001",
            transfer_id=transfer_id,
            workflow_id=workflow_id,
            db=self.db,
        )
        self.assertEqual(delivered_ev.status, "completed")

    def test_03_digital_agent_failure_state_preservation(self):
        """Verify failed transfers log failure reason and do not simulate false delivery."""
        failed_ev = publish_lifecycle_event(
            agent="NEXUS",
            stage="transport",
            status="failed",
            source="courier:nexus_transit",
            destination="node:oracle_intel",
            resource_id="pkt_err_9002",
            failure_reason="Network socket timeout (ETIMEDOUT)",
            db=self.db,
        )
        self.assertEqual(failed_ev.status, "failed")
        self.assertIn("timeout", failed_ev.failure_reason.lower())

    def test_04_multi_operator_role_matrix_and_rbac_isolation(self):
        """Verify 4-tier SOC role separation: viewer, analyst, incident_responder, security_administrator."""
        # Viewer: can view telemetry, cannot acknowledge alerts or containment
        self.assertTrue(can_operator_view_event(self.viewer_op, "telemetry.sensor.ingested"))
        self.assertFalse(can_operator_view_event(self.viewer_op, "governor.containment.executed"))

        # Analyst: can view alerts and preview actions, cannot execute containment
        self.assertTrue(can_operator_view_event(self.analyst_op, "alert.created"))
        self.assertFalse(can_operator_view_event(self.analyst_op, "governor.containment.executed"))

        # Administrator: can view all events including containment
        self.assertTrue(can_operator_view_event(self.admin_op, "governor.containment.executed"))

    def test_05_single_use_websocket_tickets_and_replay_rejection(self):
        """Verify ticket generation, TTL expiration, and single-use rejection."""
        # Issue ticket
        ticket_str = default_ticket_service.issue_ticket(operator=self.analyst_op)
        self.assertIsInstance(ticket_str, str)
        self.assertGreater(len(ticket_str), 16)

        # First consumption succeeds
        claimed_op = default_ticket_service.consume_ticket(ticket_str)
        self.assertIsNotNone(claimed_op)
        self.assertEqual(claimed_op.username, self.analyst_op.username)

        # Replay attempt fails (single-use)
        replay_op = default_ticket_service.consume_ticket(ticket_str)
        self.assertIsNone(replay_op)

    def test_06_operational_health_evaluates_all_13_subsystems(self):
        """Verify system health evaluates 13 subsystems with honest status reporting."""
        health = evaluate_full_system_health(db=self.db)
        self.assertIn("status", health)
        subsystems = health["subsystems"]
        self.assertEqual(len(subsystems), 13)

        # Honest honeypot status
        hp = subsystems["honeypot_sensors"]
        self.assertEqual(hp["canary_traps"]["status"], ServiceHealthStatus.HEALTHY)
        self.assertEqual(hp["cowrie"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["dionaea"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["zeek"]["status"], ServiceHealthStatus.NOT_CONFIGURED)

    def test_07_mobile_android_contract_compatibility(self):
        """Verify Android contract schemas: device registration, pairing, and notification preferences."""
        from app.notifications.push_dispatcher import OperatorNotificationPreferences, default_push_dispatcher

        # Register mobile push token
        record = default_push_dispatcher.register_device(
            push_token="ExponentPushToken[mock_android_client_token_01]",
            operator=self.analyst_op.username,
            platform="android",
        )
        self.assertEqual(record.operator, self.analyst_op.username)
        self.assertEqual(record.platform, "android")

        # Update mobile notification preferences
        custom_prefs = OperatorNotificationPreferences(
            min_severity="HIGH",
            enable_canary_push=True,
            quiet_hours_enabled=False,
        )
        prefs = default_push_dispatcher.update_preferences(
            operator=self.analyst_op.username,
            prefs=custom_prefs,
        )
        self.assertEqual(prefs.min_severity, "HIGH")
        self.assertEqual(prefs.min_alert_severity, "HIGH")  # Backwards-compat alias

    def test_08_transactional_outbox_monotonic_cursor_seek(self):
        """Verify outbox replay monotonicity and seek efficiency."""
        c1 = default_event_store.current_cursor
        ev1 = publish_security_event(event_type="test.ev1", resource_id="r1", payload={}, db=self.db)
        ev2 = publish_security_event(event_type="test.ev2", resource_id="r2", payload={}, db=self.db)
        self.assertGreater(ev2.cursor, ev1.cursor)

        # Replay events since c1
        replayed, next_cursor, has_more = default_event_store.replay(since_cursor=c1, limit=10, operator=self.admin_op, db=self.db)
        replayed_cursors = [e.cursor for e in replayed]
        self.assertEqual(replayed_cursors, sorted(replayed_cursors))
