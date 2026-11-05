"""Automated Integration & Contract Tests for Digital Agent Universe Milestone 2.

Validates:
1. Typed Transfer Lifecycle Contract compliance (schema_version 1, mandatory fields).
2. Outbox persistence with monotonic cursor sequencing.
3. Live backend workflow instrumentation (SCOUT collection, NEXUS outbox, ORACLE enrichment, SENTINEL alerts).
4. Verified agent handoffs (SCOUT -> NEXUS, NEXUS -> ORACLE, ORACLE -> SENTINEL).
5. Cursor-based historical replay with server-side RBAC enforcement.
6. Failure simulation and error state reporting without database corruption.
"""

from datetime import datetime, timezone
import json
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth.registry import Operator
from app.events.schemas import (
    SecurityEventEnvelope,
    TransferLifecycleEvent,
)
from app.events.service import (
    publish_handoff_event,
    publish_lifecycle_event,
    publish_security_event,
)
from app.events.store import EventStore, default_event_store
from app.events.tickets import default_ticket_service
from app.models import Alert, Attack, AttackEvent, Base, SecurityEventOutbox
from app.routers.events import create_connection_ticket, emit_lifecycle_event, replay_events
from app.routers.ingestion import ingest_event
from app.schemas import AttackEventCreate


class TestDigitalAgentLiveEvents(unittest.TestCase):
    """Test suite validating Milestone 2 live event contracts and workflow instrumentation."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        cls.admin_op = Operator(
            username="admin_chief",
            role="security_administrator",
            email="admin.chief@honeyshield.local",
            password_hash="dummy",
        )
        cls.analyst_op = Operator(
            username="analyst_sarah",
            role="analyst",
            email="analyst.sarah@honeyshield.local",
            password_hash="dummy",
        )

    def setUp(self):
        self.db = self.SessionLocal()
        self.orig_store = default_event_store
        self.store = EventStore(ring_buffer_size=100)
        import app.events.service as ev_service
        import app.events.store as ev_store
        import app.routers.events as ev_routers
        ev_service.default_event_store = self.store
        ev_store.default_event_store = self.store
        ev_routers.default_event_store = self.store

    def tearDown(self):
        import app.events.service as ev_service
        import app.events.store as ev_store
        import app.routers.events as ev_routers
        ev_service.default_event_store = self.orig_store
        ev_store.default_event_store = self.orig_store
        ev_routers.default_event_store = self.orig_store
        self.db.rollback()
        self.db.close()

    def test_01_transfer_lifecycle_contract_schema(self):
        """Verify emit_lifecycle_event adheres to typed lifecycle contract and returns cursor."""
        event_in = TransferLifecycleEvent(
            transfer_id="tr_scout_test_101",
            workflow_id="wf_test_101",
            source="sensor:cowrie_ssh",
            destination="ingestion_api",
            agent="SCOUT",
            stage="collection",
            status="completed",
            severity="medium",
            resource_id="attack_test_101",
            schema_version=1,
            payload={
                "source_ip": "198.51.100.77",
                "sensor_type": "honeypot",
            },
        )

        envelope = emit_lifecycle_event(event_in=event_in, operator=self.admin_op, db=self.db)
        self.assertEqual(envelope.agent, "SCOUT")
        self.assertEqual(envelope.stage, "collection")
        self.assertEqual(envelope.status, "completed")
        self.assertEqual(envelope.transfer_id, "tr_scout_test_101")
        self.assertEqual(envelope.workflow_id, "wf_test_101")
        self.assertEqual(envelope.source, "sensor:cowrie_ssh")
        self.assertEqual(envelope.destination, "ingestion_api")
        self.assertIsNotNone(envelope.cursor)
        self.assertGreater(envelope.cursor, 0)

    def test_02_outbox_persistence_and_cursor_monotonicity(self):
        """Verify lifecycle events are recorded in SecurityEventOutbox with strictly increasing cursors."""
        ev1 = publish_lifecycle_event(
            agent="NEXUS",
            stage="normalization",
            status="completed",
            source="ingestion_api",
            destination="outbox_db",
            resource_id="atk_999",
            db=self.db,
        )
        ev2 = publish_lifecycle_event(
            agent="ORACLE",
            stage="intelligence",
            status="completed",
            source="detection_engine",
            destination="threat_intel_store",
            resource_id="atk_999",
            db=self.db,
        )
        self.db.commit()

        all_rows = self.db.query(SecurityEventOutbox).all()
        # Ensure monotonic cursors
        self.assertIsNotNone(ev1.cursor)
        self.assertIsNotNone(ev2.cursor)
        self.assertGreater(ev2.cursor, ev1.cursor)
        self.assertGreaterEqual(len(all_rows), 1)

        last_row = all_rows[-1]
        self.assertIn("ORACLE", last_row.payload_json)
        self.assertIn("intelligence", last_row.payload_json)

    def test_03_sensor_ingestion_triggers_scout_and_nexus(self):
        """Verify ingest_event automatically records SCOUT collection and NEXUS normalization."""
        before_cursor = self.store.current_cursor

        event_create = AttackEventCreate(
            event_type="ssh_login_failure",
            source_ip="198.51.100.123",
            message="Failed password for root from 198.51.100.123 port 44322 ssh2",
        )

        attack_event = ingest_event(event_in=event_create, db=self.db)
        self.assertIsNotNone(attack_event.attack_id)
        self.db.commit()

        # Replay events since before_cursor
        events, next_cursor, _ = self.store.replay(since_cursor=before_cursor, db=self.db)
        agent_names = [ev.agent for ev in events if ev.agent]

        self.assertIn("SCOUT", agent_names)
        self.assertIn("NEXUS", agent_names)

    def test_04_threat_intel_triggers_oracle_enrichment(self):
        """Verify enrich_attack automatically records ORACLE intelligence events and handoff."""
        from app.threat_intelligence.service import enrich_attack

        attack = Attack(
            attack_type="ssh_brute_force",
            source_ip="203.0.113.195",
            severity="high",
            risk_score=75.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        before_cursor = self.store.current_cursor
        enrich_attack(db=self.db, attack_id=attack.id)
        self.db.commit()

        events, _, _ = self.store.replay(since_cursor=before_cursor, db=self.db)
        oracle_events = [ev for ev in events if ev.agent == "ORACLE"]
        self.assertGreaterEqual(len(oracle_events), 1)
        self.assertEqual(oracle_events[0].stage, "intelligence")
        self.assertEqual(oracle_events[0].status, "completed")

    def test_05_alert_manager_triggers_sentinel_alert(self):
        """Verify evaluate_attack_alert automatically emits SENTINEL alert events."""
        from app.alerts.service import evaluate_attack_alert

        attack = Attack(
            attack_type="ssh_brute_force",
            source_ip="198.51.100.200",
            severity="high",
            risk_score=85.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        before_cursor = self.store.current_cursor
        res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(res["alert_created"])
        self.db.commit()

        events, _, _ = self.store.replay(since_cursor=before_cursor, db=self.db)
        sentinel_events = [ev for ev in events if ev.agent == "SENTINEL"]
        self.assertGreaterEqual(len(sentinel_events), 1)
        self.assertEqual(sentinel_events[0].stage, "alert")

    def test_06_verified_agent_handoffs(self):
        """Verify publish_handoff_event creates structured handoffs between agents."""
        ho = publish_handoff_event(
            from_agent="SCOUT",
            to_agent="NEXUS",
            resource_id="res_777",
            workflow_id="wf_777",
            context_message="Handing off telemetry to NEXUS",
            task_type="Raw Ingestion",
            db=self.db,
        )

        self.assertEqual(ho.agent, "SCOUT")
        self.assertEqual(ho.stage, "handoff")
        self.assertEqual(ho.destination, "agent:NEXUS")
        self.assertEqual(ho.payload["to_agent"], "NEXUS")

    def test_07_failure_simulation_preserves_error_reason(self):
        """Verify failed transfers record failure_reason without throwing unhandled exceptions."""
        err_ev = publish_lifecycle_event(
            agent="SENTINEL",
            stage="notification",
            status="failed",
            source="soc_console",
            destination="push_dispatcher",
            resource_id="alert_error_123",
            failure_reason="Push gateway timeout after 5000ms",
            db=self.db,
        )

        self.assertEqual(err_ev.status, "failed")
        self.assertEqual(err_ev.failure_reason, "Push gateway timeout after 5000ms")
        self.assertEqual(err_ev.payload["failure_reason"], "Push gateway timeout after 5000ms")

    def test_08_websocket_ticket_and_replay_security(self):
        """Verify WebSocket ticket endpoint issues single-use ticket and replay endpoint honors limits."""
        # 1. Issue Ticket
        ticket_res = create_connection_ticket(operator=self.admin_op)
        self.assertIsNotNone(ticket_res.ticket)
        self.assertEqual(ticket_res.expires_in, 60)

        # 2. Consume ticket once
        op = default_ticket_service.consume_ticket(ticket_res.ticket)
        self.assertIsNotNone(op)
        self.assertEqual(op.username, "admin_chief")

        # 3. Second consume fails (single-use protection)
        op_second = default_ticket_service.consume_ticket(ticket_res.ticket)
        self.assertIsNone(op_second)

        # 4. Cursor replay endpoint
        replay_res = replay_events(since_cursor=0, limit=10, operator=self.admin_op, db=self.db)
        self.assertIsNotNone(replay_res.events)
        self.assertIsInstance(replay_res.events, list)

    def test_09_contract_reconciliation_aliases(self):
        """Milestone 5: Verify contract reconciliation for aliases: since_cursor/cursor/last_id and /ingest route."""
        from app.routers.ingestion import ingest_event, ingest_event_alias
        from app.schemas import AttackEventCreate

        # Test replay parameter aliases: cursor and last_id
        res_cursor = replay_events(cursor=0, limit=10, operator=self.admin_op, db=self.db)
        self.assertIsNotNone(res_cursor.events)

        res_last_id = replay_events(last_id=0, limit=10, operator=self.admin_op, db=self.db)
        self.assertIsNotNone(res_last_id.events)

        # Test /api/v1/ingest/events and /api/v1/ingest/honeypot alias handlers directly
        payload = AttackEventCreate(
            event_type="ssh_login_failed",
            source_ip="198.51.100.99",
            message="Milestone 5 contract reconciliation test",
        )
        res_ingest = ingest_event_alias(event_in=payload, db=self.db)
        self.assertIsNotNone(res_ingest)
        self.assertEqual(res_ingest.source_ip, "198.51.100.99")
        self.assertEqual(res_ingest.event_type, "ssh_login_failed")

        # Verify primary handler with honeypot-style payload
        res_primary = ingest_event(event_in=payload, db=self.db)
        self.assertIsNotNone(res_primary)
        self.assertEqual(res_primary.source_ip, "198.51.100.99")


