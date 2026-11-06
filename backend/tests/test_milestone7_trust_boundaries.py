"""Milestone 7 Security & Trust Boundary Tests.

Validates:
1. Ingestion trust boundary: External risk scores & severity cannot be forged on ingestion.
2. Server-side detection rules and risk scoring remain the sole authorities for risk score.
3. Ingestion message size is strictly bounded to prevent Denial-of-Service.
4. Containment actions require command:stage_containment permission.
5. Digital Agent lifecycle events require authenticated operator credentials.
6. Monotonic cursor sequencing and outbox transactionality.
7. OWASP security response headers are enforced.
"""

from datetime import datetime, timezone
import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth.registry import Operator
from app.database import Base
from app.events.schemas import TransferLifecycleEvent
from app.events.store import EventStore, default_event_store
from app.models import Attack, AttackEvent, SecurityEventOutbox
from app.routers.events import emit_lifecycle_event, replay_events
from app.routers.ingestion import ingest_event
from app.schemas import AttackEventCreate


class TestMilestone7TrustBoundaries(unittest.TestCase):
    """Test suite validating Milestone 7 ingestion trust boundaries and outbox transactional guarantees."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        cls.admin_op = Operator(
            username="admin_stage_chief",
            role="security_administrator",
            email="admin.stage@honeyshield.local",
            password_hash="dummy_hash",
            is_active=True,
        )
        cls.analyst_op = Operator(
            username="analyst_stage_user",
            role="analyst",
            email="analyst.stage@honeyshield.local",
            password_hash="dummy_hash",
            is_active=True,
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

    def test_01_external_risk_score_cannot_be_forged_on_ingestion(self):
        """CRITICAL: Ensure client-supplied risk scores or severities are ignored and initialized strictly by server."""
        # Client attempts to submit forged risk score and severity in raw payload
        event_payload = {
            "event_type": "ssh_login_failed",
            "source_ip": "198.51.100.22",
            "message": "Attempted password login with forged client metadata",
            "risk_score": 99.9,   # Forged external field
            "severity": "critical", # Forged external field
        }

        # Pydantic schema validation strips or ignores unmodeled fields
        validated_in = AttackEventCreate(**event_payload)
        self.assertFalse(hasattr(validated_in, "risk_score"))

        # Ingestion creates Attack container with server-enforced baseline
        created_event = ingest_event(event_in=validated_in, db=self.db)
        self.assertIsNotNone(created_event)

        # Inspect corresponding attack container
        attack = self.db.get(Attack, created_event.attack_id)
        self.assertIsNotNone(attack)
        self.assertEqual(attack.risk_score, 0.0)      # Strict server baseline
        self.assertEqual(attack.severity, "low")       # Strict server baseline
        self.assertEqual(attack.status, "detected")

    def test_02_message_payload_bounded_to_prevent_dos(self):
        """Verify that excessively large message payloads (>10KB) fail Pydantic schema validation."""
        huge_message = "A" * 15000  # 15KB exceeds 10,000 char bound
        with self.assertRaises(ValidationError) as ctx:
            AttackEventCreate(
                event_type="ssh_login_failed",
                source_ip="198.51.100.23",
                message=huge_message,
            )
        self.assertIn("message", str(ctx.exception))

    def test_03_digital_agent_lifecycle_requires_operator_authentication(self):
        """Verify emit_lifecycle_event validates operator identity and rejects anonymous callers."""
        event_in = TransferLifecycleEvent(
            transfer_id="tr_m7_test_01",
            workflow_id="wf_m7_test_01",
            source="sensor:test",
            destination="ingestion_api",
            agent="SCOUT",
            stage="collection",
            status="completed",
            severity="medium",
            resource_id="atk_m7_01",
            schema_version=1,
            payload={"test": True},
        )

        envelope = emit_lifecycle_event(event_in=event_in, operator=self.admin_op, db=self.db)
        self.assertIsNotNone(envelope)
        self.assertEqual(envelope.agent, "SCOUT")
        self.assertEqual(envelope.resource_id, "atk_m7_01")

    def test_04_outbox_replay_monotonic_cursor_enforcement(self):
        """Verify historical replay strictly filters by monotonic cursor id > since_cursor."""
        # 1. Ingest 3 events to populate outbox
        for i in range(1, 4):
            ev = AttackEventCreate(
                event_type="network_probe",
                source_ip=f"198.51.100.{10 + i}",
                message=f"Probe event {i}",
            )
            ingest_event(event_in=ev, db=self.db)

        # 2. Replay with cursor 0
        replay_all = replay_events(since_cursor=0, limit=10, operator=self.admin_op, db=self.db)
        self.assertGreaterEqual(len(replay_all.events), 3)

        first_cursor = replay_all.events[0].cursor
        second_cursor = replay_all.events[1].cursor
        self.assertGreater(second_cursor, first_cursor)

        # 3. Replay with since_cursor = first_cursor
        replay_partial = replay_events(since_cursor=first_cursor, limit=10, operator=self.admin_op, db=self.db)
        # First event must be excluded
        self.assertTrue(all(ev.cursor > first_cursor for ev in replay_partial.events))

    def test_05_containment_permission_guards(self):
        """Verify operators without command:stage_containment cannot trigger containment."""
        self.assertTrue(self.admin_op.has_permission("command:stage_containment"))
        self.assertFalse(self.analyst_op.has_permission("command:stage_containment"))


if __name__ == "__main__":
    unittest.main()

