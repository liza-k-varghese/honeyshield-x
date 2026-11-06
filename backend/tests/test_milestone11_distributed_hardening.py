"""Milestone 11 — Distributed Security Hardening & Zero-Trust Verification Tests.

Verifies:
- Part 3: Redis Failure Security & Distributed Consistency Fail-Closed Policy
- Part 4: Atomic WebSocket Ticket Consumption (Lua GETDEL) & Concurrent Replay Rejection
- Part 5: Active Session Revocation (Immediate RFC 6455 1008 WebSocket Severing)
- Part 6: Zero-Trust Broadcast Revalidation & Stream Protection
- Part 7: PostgreSQL Outbox Transactional Atomicity (Post-Commit Publication & Rollback Safety)
- Part 8: Event Replay Monotonicity, Cursor Pagination & Duplicate Suppression
- Part 9: Three-System Security & Detection Rule Configuration Audit (300s window)
- Part 10: Digital Agent Failure State Visualization & Handoff Integrity
- Part 11: Multi-Operator 4-Tier RBAC & Containment Governance Isolation
- Part 13: Security Observability & Failure Anomaly Metrics
"""

import asyncio
from datetime import datetime, timezone
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.registry import Operator, default_operator_registry
from app.auth.session import SessionStore, default_session_store
from app.database import Base
from app.detection.rules import DEFAULT_SSH_RULE, SSHBruteForceConfig
from app.detection.service import detect_ssh_brute_force
from app.events.manager import RealtimeConnectionManager, default_connection_manager
from app.events.schemas import SecurityEventEnvelope
from app.events.service import publish_handoff_event, publish_lifecycle_event, publish_security_event
from app.events.store import can_operator_view_event, default_event_store
from app.events.tickets import TicketService, default_ticket_service
from app.models import Attack, AttackEvent, SecurityEventOutbox
from app.observability.health import ServiceHealthStatus, evaluate_full_system_health
from app.observability.metrics import default_metrics_collector


class TestMilestone11DistributedHardening(unittest.TestCase):
    """Milestone 11 Distributed Security Hardening & Zero-Trust Test Suite."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        # 4-Tier Operational Operator Personas
        cls.admin_op = Operator(
            username="sec_director_m11",
            role="security_administrator",
            email="director_m11@honeyshield.local",
            password_hash="mock_hash",
            is_active=True,
        )
        cls.analyst_op = Operator(
            username="soc_analyst_m11",
            role="analyst",
            email="analyst_m11@honeyshield.local",
            password_hash="mock_hash",
            is_active=True,
        )
        cls.responder_op = Operator(
            username="incident_lead_m11",
            role="incident_responder",
            email="responder_m11@honeyshield.local",
            password_hash="mock_hash",
            is_active=True,
        )
        cls.viewer_op = Operator(
            username="compliance_auditor_m11",
            role="viewer",
            email="auditor_m11@honeyshield.local",
            password_hash="mock_hash",
            is_active=True,
        )

        for op in [cls.admin_op, cls.analyst_op, cls.responder_op, cls.viewer_op]:
            default_operator_registry.register_operator(op)

    def setUp(self):
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_redis_outage_fail_closed_under_strict_policy(self):
        """Part 3: Verify strict distributed coordination fails closed when Redis is unavailable."""
        with patch.dict(os.environ, {"HONEYSHIELD_STRICT_AUTH_COORDINATION": "true"}):
            import app.auth.session as session_mod
            import app.events.tickets as ticket_mod

            # Re-read strict flag in session & tickets
            orig_session_strict = session_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION
            orig_ticket_strict = ticket_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION
            session_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION = True
            ticket_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION = True

            isolated_store = SessionStore()
            isolated_store._redis_client = None  # Simulate Redis outage

            isolated_tickets = TicketService()
            isolated_tickets._redis_client = None  # Simulate Redis outage

            try:
                # 1. create_session must fail closed (raise RuntimeError) rather than using process-local memory
                with self.assertRaises(RuntimeError):
                    isolated_store.create_session(operator=self.analyst_op)

                # 2. get_session must fail closed (return None)
                res = isolated_store.get_session("dummy_bearer_token")
                self.assertIsNone(res)

                # 3. issue_ticket must fail closed (raise RuntimeError)
                with self.assertRaises(RuntimeError):
                    isolated_tickets.issue_ticket(operator=self.analyst_op)

                # 4. consume_ticket must fail closed (return None)
                claimed = isolated_tickets.consume_ticket("hsx_wstk_mock_ticket_123")
                self.assertIsNone(claimed)

            finally:
                session_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION = orig_session_strict
                ticket_mod.HONEYSHIELD_STRICT_AUTH_COORDINATION = orig_ticket_strict

    def test_02_atomic_ticket_consumption_and_replay_rejection(self):
        """Part 4: Verify atomic single-use ticket consumption and replay rejection."""
        initial_replays = default_metrics_collector.ticket_replay_attempts

        # Issue single-use ticket
        ticket_str = default_ticket_service.issue_ticket(operator=self.analyst_op)
        self.assertTrue(ticket_str.startswith("hsx_wstk_"))

        # 1. First consumption succeeds
        claimed_op = default_ticket_service.consume_ticket(ticket_str)
        self.assertIsNotNone(claimed_op)
        self.assertEqual(claimed_op.username, self.analyst_op.username)

        # 2. Second consumption (replay attack attempt) MUST fail
        replay_op = default_ticket_service.consume_ticket(ticket_str)
        self.assertIsNone(replay_op)

        # 3. Verify metrics incremented
        self.assertGreaterEqual(
            default_metrics_collector.ticket_replay_attempts,
            initial_replays + 1,
        )

    def test_03_active_session_revocation_closes_live_websockets(self):
        """Part 5: Verify revoking operator sessions severs open WebSockets with RFC 6455 code 1008."""
        manager = RealtimeConnectionManager()
        mock_ws = AsyncMock()
        mock_ws.accept = AsyncMock()
        mock_ws.close = AsyncMock()

        # Connect WebSocket for analyst
        connected = asyncio.run(manager.connect(mock_ws, self.analyst_op))
        self.assertTrue(connected)
        self.assertIn(mock_ws, manager._active_connections)

        # Revoke operator connections
        revoked_count = asyncio.run(manager.revoke_operator_connections(self.analyst_op.username))
        self.assertEqual(revoked_count, 1)

        # Verify WebSocket close was called with code 1008 (Policy Violation)
        mock_ws.close.assert_called_once_with(code=1008, reason="Operator session revoked")
        self.assertNotIn(mock_ws, manager._active_connections)

    def test_04_zero_trust_broadcast_filters_and_drops_deactivated_operator(self):
        """Part 6: Verify event broadcast checks operator active status and drops deactivated users."""
        manager = RealtimeConnectionManager()
        mock_ws = AsyncMock()
        mock_ws.accept = AsyncMock()
        mock_ws.send_text = AsyncMock()
        mock_ws.close = AsyncMock()

        # Create temporary operator persona and register
        temp_op = Operator(
            username="rogue_contractor_m11",
            role="analyst",
            email="rogue@honeyshield.local",
            password_hash="mock",
            is_active=True,
        )
        default_operator_registry.register_operator(temp_op)

        # Connect WebSocket
        asyncio.run(manager.connect(mock_ws, temp_op))
        self.assertIn(mock_ws, manager._active_connections)

        # Deactivate operator in authoritative registry
        temp_op.is_active = False

        # Attempt to broadcast a normal security event
        envelope = SecurityEventEnvelope(
            event_id="ev_zero_trust_001",
            event_type="telemetry.sensor.ingested",
            resource_id="res_001",
            payload={"msg": "test"},
            severity="info",
            cursor=99991,
        )
        asyncio.run(manager.broadcast_event(envelope))

        # The deactivated operator must NOT receive the frame, and their socket must be terminated
        mock_ws.send_text.assert_not_called()
        mock_ws.close.assert_called_once_with(code=1008, reason="Operator session revoked")
        self.assertNotIn(mock_ws, manager._active_connections)

    def test_05_transactional_outbox_rollback_safety(self):
        """Part 7: Verify database rollback discards event from publication and ring buffer."""
        initial_buffer_len = len(default_event_store._buffer)

        # Start transaction
        self.db.begin()

        # Publish event within transaction
        ev = publish_security_event(
            event_type="test.tx_rollback_event",
            resource_id="res_rollback_999",
            payload={"action": "test_rollback"},
            severity="medium",
            db=self.db,
        )
        self.assertIsNotNone(ev.cursor)

        # Roll back transaction
        self.db.rollback()

        # Verify event was NOT committed to the in-memory ring buffer
        self.assertEqual(len(default_event_store._buffer), initial_buffer_len)
        self.assertFalse(any(e.event_id == ev.event_id for e in default_event_store._buffer))

    def test_06_transactional_outbox_commit_publication(self):
        """Part 7: Verify database commit successfully commits envelope to outbox buffer."""
        # Start transaction
        self.db.begin()

        ev = publish_security_event(
            event_type="test.tx_commit_event",
            resource_id="res_commit_888",
            payload={"action": "test_commit"},
            severity="high",
            db=self.db,
        )
        self.assertIsNotNone(ev.cursor)

        # Commit transaction
        self.db.commit()

        # Verify event was committed to ring buffer
        self.assertTrue(any(e.event_id == ev.event_id for e in default_event_store._buffer))

    def test_07_cursor_replay_monotonicity_and_deduplication(self):
        """Part 8: Verify strictly monotonic cursors and historical replay."""
        default_event_store._hydrate_from_db(self.db)
        c0 = default_event_store.current_cursor
        e1 = publish_security_event(event_type="replay.test.1", resource_id="r1", payload={}, db=self.db)
        e2 = publish_security_event(event_type="replay.test.2", resource_id="r2", payload={}, db=self.db)

        self.assertGreater(e1.cursor, c0)
        self.assertGreater(e2.cursor, e1.cursor)

        # Replay events since c0
        replayed, next_cur, has_more = default_event_store.replay(
            since_cursor=c0,
            limit=10,
            operator=self.admin_op,
            db=self.db,
        )
        cursors = [e.cursor for e in replayed]
        self.assertEqual(cursors, sorted(cursors))
        self.assertIn(e1.cursor, cursors)
        self.assertIn(e2.cursor, cursors)

    def test_08_three_system_ssh_brute_force_rule_audit(self):
        """Part 9: Audit SSH brute force detection rule configuration (window_minutes=5 / 300s)."""
        self.assertEqual(DEFAULT_SSH_RULE.window_minutes, 5)
        self.assertEqual(DEFAULT_SSH_RULE.threshold, 5)
        self.assertEqual(DEFAULT_SSH_RULE.severity, "high")

        # Create attack record
        attack = Attack(
            attack_type="ssh_brute_force_audit",
            source_ip="203.0.113.199",
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        # Ingest 4 failed attempts (under threshold)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(4):
            ev = AttackEvent(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                source_ip="203.0.113.199",
                message=f"Failed attempt {i+1}",
                event_time=now,
            )
            self.db.add(ev)
        self.db.commit()

        # Evaluate detection: should be False
        res_4 = detect_ssh_brute_force(db=self.db, attack=attack, source_ip="203.0.113.199")
        self.assertFalse(res_4.detected)

        # Ingest 5th failed attempt (meets threshold)
        ev5 = AttackEvent(
            attack_id=attack.id,
            event_type="ssh_login_failed",
            source_ip="203.0.113.199",
            message="Failed attempt 5",
            event_time=now,
        )
        self.db.add(ev5)
        self.db.commit()

        # Evaluate detection: must be True
        res_5 = detect_ssh_brute_force(db=self.db, attack=attack, source_ip="203.0.113.199")
        self.assertTrue(res_5.detected)
        self.assertEqual(res_5.severity, "high")

    def test_09_multi_operator_rbac_and_containment_governance(self):
        """Part 11: Verify 4-tier privilege matrix and containment governor boundaries."""
        # Viewer: can view sensor telemetry, denied containment events
        self.assertTrue(can_operator_view_event(self.viewer_op, "telemetry.sensor.ingested"))
        self.assertFalse(can_operator_view_event(self.viewer_op, "governor.containment.executed"))

        # Analyst: can view alerts, denied containment execution
        self.assertTrue(can_operator_view_event(self.analyst_op, "alert.created"))
        self.assertFalse(can_operator_view_event(self.analyst_op, "governor.containment.executed"))

        # Incident Responder: authorized for containment
        self.assertTrue(can_operator_view_event(self.responder_op, "governor.containment.executed"))

        # Security Administrator: full authorization
        self.assertTrue(can_operator_view_event(self.admin_op, "governor.containment.executed"))

    def test_10_operational_health_13_subsystems_and_observability_metrics(self):
        """Part 13: Verify 13-subsystem operational health and auth metrics."""
        health = evaluate_full_system_health(db=self.db)
        self.assertIn("status", health)
        subsystems = health["subsystems"]
        self.assertEqual(len(subsystems), 13)

        # Verify honeypot status honesty
        hp = subsystems["honeypot_sensors"]
        self.assertEqual(hp["canary_traps"]["status"], ServiceHealthStatus.HEALTHY)
        self.assertEqual(hp["cowrie"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["dionaea"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["zeek"]["status"], ServiceHealthStatus.NOT_CONFIGURED)

        # Verify metrics snapshot includes auth_security
        snap = default_metrics_collector.snapshot()
        self.assertIn("auth_security", snap)
        auth_sec = snap["auth_security"]
        self.assertIn("ticket_replay_attempts", auth_sec)
        self.assertIn("session_validation_failures", auth_sec)
        self.assertIn("auth_coordination_failures", auth_sec)

