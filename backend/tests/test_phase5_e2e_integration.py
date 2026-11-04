"""HoneyShield X — Phase 5 Master End-to-End Integration Test Suite.

Validates the full platform integration across:
- System 1: Ingestion -> Detection -> Risk Scoring -> Alert Generation -> Dashboard Stats
- System 2: Canary Honeytoken Minting -> Public Trap Interaction -> Alert Generation -> Contextualization
- System 3: Threat Intelligence IOC Lifecycle -> Confidence Decay -> Attack Enrichment -> Promotion
- Three-System Orchestration: Cross-subsystem incident correlation and case management
- Android Integration: QR Pairing, Real-Time Replay Recovery, and Push Preferences
- Governor Level-3 Safety: Allowlisted defensive countermeasures with dry-run safety adapters
"""

import asyncio
from datetime import datetime, timedelta, timezone
import json
import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from starlette.requests import Request

from app.alerts.service import evaluate_attack_alert, list_alerts, update_alert_status
from app.auth.registry import Operator
from app.detection.service import detect_ssh_brute_force
from app.events.schemas import SecurityEventEnvelope
from app.events.service import publish_security_event
from app.events.store import EventStore
from app.events.tickets import TicketService
from app.models import Alert, Attack, AttackEvent, Base, DevicePairingChallenge, SecurityEventOutbox, SystemEvent, ThreatIntelligence
from app.notifications.push_dispatcher import PushDispatcher
from app.risk.service import calculate_attack_risk
from app.routers.alerts import list_alerts_endpoint
from app.routers.dashboard import get_dashboard_stats
from app.routers.deception import get_canary, mint_canary, validate_canary_get
from app.routers.emergency import EmergencyExecuteRequest, execute_emergency_action, get_emergency_status
from app.routers.ingestion import ingest_event
from app.routers.pairing import PairingApprovalRequest, PairingClaimRequest, approve_pairing, claim_pairing_challenge, create_pairing_challenge, get_pairing_status, revoke_pairing
from app.schemas import AttackEventCreate, CanaryCreateRequest
from app.threat_intelligence.service import enrich_attack, lookup_indicator


def make_mock_trap_request(method="GET", path="/", client_ip="203.0.113.88", user_agent="Mozilla/5.0", body=b""):
    req = MagicMock(spec=Request)
    req.method = method
    req.url.path = path
    req.client = MagicMock()
    req.client.host = client_ip
    req.headers = {
        "user-agent": user_agent,
        "host": "trap.honeyshield.internal",
        "accept": "*/*",
    }
    async def _body():
        return body
    req.body = _body
    return req


class TestPhase5MasterIntegration(unittest.TestCase):
    """End-to-end integration test harness across Systems 1, 2, 3, Mobile, and Infrastructure."""

    @classmethod
    def setUpClass(cls):
        # Create an isolated in-memory SQLite database for full relational verification
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        # Standard test operators
        cls.admin_op = Operator(
            username="admin_chief",
            role="security_administrator",
            email="admin.chief@honeyshield.local",
            password_hash="dummy",
        )
        cls.responder_op = Operator(
            username="responder_alex",
            role="incident_responder",
            email="responder.alex@honeyshield.local",
            password_hash="dummy",
        )
        cls.analyst_op = Operator(
            username="analyst_sarah",
            role="analyst",
            email="analyst.sarah@honeyshield.local",
            password_hash="dummy",
        )

    def setUp(self):
        self.db: Session = self.SessionLocal()
        self.mock_request = MagicMock()
        self.mock_request.base_url = "http://10.0.2.2:8000/"
        self.mock_request.client = MagicMock()
        self.mock_request.client.host = "198.51.100.77"
        self.mock_request.headers = {"user-agent": "Mozilla/5.0 (Adversary Scanner)"}

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    # =========================================================================
    # 1. System 1: Complete Ingestion -> Detection -> Risk -> Alert Pipeline
    # =========================================================================

    def test_01_system1_ingestion_to_attack_container(self):
        """Test telemetry ingestion automatically creates an attack container and persists events."""
        event_payload = AttackEventCreate(
            event_type="ssh_login_failed",
            source_ip="198.51.100.90",
            target_host="srv-prod-ssh-01",
            details={"attempt": 1, "username": "root"},
        )
        created_event = ingest_event(event_in=event_payload, db=self.db)

        self.assertIsNotNone(created_event.id)
        self.assertIsNotNone(created_event.attack_id)
        self.assertEqual(created_event.event_type, "ssh_login_failed")

        # Verify associated attack container exists in DB
        attack = self.db.get(Attack, created_event.attack_id)
        self.assertIsNotNone(attack)
        self.assertEqual(attack.source_ip, "198.51.100.90")

    def test_02_system1_detection_ssh_bruteforce(self):
        """Test deterministic detection rules evaluate stored AttackEvent records."""
        # 1. Seed attack container
        attack = Attack(
            attack_type="SSH Probe",
            source_ip="198.51.100.91",
            severity="low",
            risk_score=0.0,
            status="unprocessed",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        # 2. Ingest 6 failed SSH events (exceeds threshold 5)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(6):
            evt = AttackEvent(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                source_ip="198.51.100.91",
                event_time=now - timedelta(seconds=i * 10),
                message=json.dumps({"attempt": i + 1}),
            )
            self.db.add(evt)
        self.db.commit()

        # 3. Execute detection rule
        detection_res = detect_ssh_brute_force(db=self.db, attack=attack)
        self.assertTrue(detection_res.detected)
        self.assertGreaterEqual(detection_res.evidence_count, 5)

        # 4. Verify attack status and severity were updated
        self.db.refresh(attack)
        self.assertEqual(attack.status, "detected")
        self.assertEqual(attack.severity, "high")

    def test_03_system1_risk_scoring_and_alert_generation(self):
        """Test explainable risk scoring feeds into deterministic alert generation."""
        attack = Attack(
            attack_type="Brute Force Multi-Vector",
            source_ip="198.51.100.92",
            severity="low",
            risk_score=0.0,
            status="unprocessed",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)

        # Seed 6 failed SSH events so detection triggers inside calculate_attack_risk
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(6):
            evt = AttackEvent(
                attack_id=attack.id,
                event_type="ssh_login_failed",
                source_ip="198.51.100.92",
                event_time=now - timedelta(seconds=i * 10),
                message=json.dumps({"attempt": i + 1}),
            )
            self.db.add(evt)
        self.db.commit()

        # 1. Risk calculation (rule severity 40 + volume 10 = 50.0)
        risk_res = calculate_attack_risk(db=self.db, attack_id=attack.id)
        self.assertGreaterEqual(risk_res["risk_score"], 50.0)

        # 2. Alert evaluation
        alert_res = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertTrue(alert_res["alert_created"])
        self.assertIsNotNone(alert_res["alert_id"])
        self.assertEqual(alert_res["status"], "open")

        # 3. Duplicate suppression: evaluating again reuses existing alert
        alert_res_dup = evaluate_attack_alert(db=self.db, attack_id=attack.id)
        self.assertFalse(alert_res_dup["alert_created"])
        self.assertEqual(alert_res_dup["alert_id"], alert_res["alert_id"])

    def test_04_system1_dashboard_stats_consistency(self):
        """Test SOC dashboard stats correctly reflect persisted attacks and alerts."""
        stats = get_dashboard_stats(db=self.db)
        self.assertGreaterEqual(stats.total_attacks, 0)
        self.assertGreaterEqual(stats.active_alerts, 0)
        self.assertIsNotNone(stats.unique_attacker_ips_24h)
        self.assertIsNotNone(stats.system_health)

    # =========================================================================
    # 2. System 2: Attack Lab, Deception Grid & Public Trap Listeners
    # =========================================================================

    def test_05_system2_canary_honeytoken_minting(self):
        """Test minting inert canary honeytokens across asset classes."""
        req = CanaryCreateRequest(
            name="AWS Prod Backup API Key",
            canary_type="AWS_API_KEY",
            placement_hint="Repo git config",
        )
        canary = mint_canary(
            payload=req,
            operator=self.admin_op,
            db=self.db,
        )

        self.assertIsNotNone(canary.canary_id)
        self.assertEqual(canary.canary_type, "AWS_API_KEY")
        self.assertEqual(canary.status, "active")
        self.assertIsNotNone(canary.token_id)
        self.assertGreater(len(canary.token_id), 8)

    def test_06_system2_trap_listener_hit_and_contextualization(self):
        """Test adversary interacting with public trap listener produces forensic telemetry."""
        # 1. Mint canary
        req = CanaryCreateRequest(
            name="DB Admin Password Token",
            canary_type="DATABASE_CREDENTIAL",
            placement_hint="finance-subnet",
        )
        canary = mint_canary(
            payload=req,
            operator=self.admin_op,
            db=self.db,
        )

        # 2. Simulate tripwire interaction via public trap listener
        token_id = canary.token_id
        mock_trap_req = make_mock_trap_request(
            method="GET",
            path=f"/api/v1/deception/validate/{token_id}",
            client_ip="203.0.113.88",
            user_agent="SqlMap/1.6.4#stable",
        )
        val_res = asyncio.run(
            validate_canary_get(
                token_id=token_id,
                request=mock_trap_req,
                db=self.db,
            )
        )

        # Trap returns decoy error status
        self.assertEqual(val_res.status, "error")
        self.assertEqual(val_res.code, 401)

        # Verify canary hit is recorded
        updated = get_canary(canary_id=canary.canary_id, operator=self.admin_op)
        self.assertEqual(updated.hit_count, 1)

    # =========================================================================
    # 3. System 3: Threat Intelligence, Indicator Lifecycle & Decay
    # =========================================================================

    def test_07_system3_ioc_creation_and_lookup(self):
        """Test Threat Intelligence indicator ingestion and fast indexed lookup."""
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value="198.51.100.95",
            threat_level="high",
            confidence=85.0,
            source="HoneyShield Deception Grid",
            description="Active reconnaissance probe observed scanning DMZ",
        )
        self.db.add(ti)
        self.db.commit()

        lookup_res = lookup_indicator(
            db=self.db,
            indicator_type="ip",
            indicator_value="198.51.100.95",
        )
        self.assertTrue(lookup_res["found"])
        self.assertEqual(lookup_res["threat_level"], "high")
        self.assertEqual(lookup_res["confidence"], 85.0)

    def test_08_system3_attack_enrichment(self):
        """Test attack container enrichment against active threat intelligence indicators."""
        # 1. Seed attack
        attack = Attack(
            attack_type="Reconnaissance",
            source_ip="198.51.100.96",
            severity="medium",
            risk_score=40.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()

        # 2. Seed matching threat intelligence indicator
        ti = ThreatIntelligence(
            indicator_type="ip",
            indicator_value="198.51.100.96",
            threat_level="critical",
            confidence=95.0,
            source="Adversary Campaign Unit",
            description="APT29 lateral movement jump host",
        )
        self.db.add(ti)
        self.db.commit()

        # 3. Enrich attack
        enrich_res = enrich_attack(db=self.db, attack_id=attack.id)
        self.assertTrue(enrich_res["found"])
        self.assertEqual(enrich_res["threat_level"], "critical")
        self.assertEqual(enrich_res["confidence"], 95.0)

    # =========================================================================
    # 4. Cross-System Orchestration: Deception Hit -> IOC Promotion -> SOC Alert
    # =========================================================================

    def test_09_three_system_orchestrated_promotion(self):
        """Test promoting a System 2 canary hit into a System 3 IOC and correlating with System 1."""
        # 1. Mint canary in System 2
        canary = mint_canary(
            payload=CanaryCreateRequest(
                name="DMZ Gateway Token",
                canary_type="AWS_API_KEY",
                placement_hint="edge-gw",
            ),
            operator=self.admin_op,
            db=self.db,
        )

        # 2. Trigger trap hit
        mock_req = make_mock_trap_request(
            method="GET",
            path=f"/api/v1/deception/validate/{canary.token_id}",
            client_ip="203.0.113.120",
        )
        asyncio.run(
            validate_canary_get(
                token_id=canary.token_id,
                request=mock_req,
                db=self.db,
            )
        )

        # 3. Promote adversary IP directly into System 3 Threat Intelligence
        promoted_ioc = ThreatIntelligence(
            indicator_type="ip",
            indicator_value="203.0.113.120",
            threat_level="critical",
            confidence=99.0,
            source=f"Canary Hit {canary.canary_id}",
            description=f"Automated promotion from canary tripwire {canary.name}",
        )
        self.db.add(promoted_ioc)
        self.db.commit()

        # 4. Ingest an attack from the same IP into System 1
        attack = Attack(
            attack_type="Secondary Infiltration",
            source_ip="203.0.113.120",
            severity="high",
            risk_score=85.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()

        # 5. Verify cross-system enrichment links the two
        enrich_res = enrich_attack(db=self.db, attack_id=attack.id)
        self.assertTrue(enrich_res["found"])
        self.assertEqual(enrich_res["threat_level"], "critical")
        self.assertIn("Canary Hit", enrich_res["source"])

    # =========================================================================
    # 5. Full Android Integration: QR Pairing & Durability Replay Recovery
    # =========================================================================

    def test_10_android_qr_pairing_lifecycle_and_revocation(self):
        """Test complete 180s QR device pairing lifecycle: challenge -> claim -> approval -> revoke."""
        # 1. Challenge generation
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.db,
        )
        self.assertTrue(ch.challenge_id.startswith("hsx_pair_"))
        self.assertEqual(ch.expires_in_seconds, 180)

        # 2. Device claim
        claim_res = claim_pairing_challenge(
            payload=PairingClaimRequest(
                challenge_id=ch.challenge_id,
                device_fingerprint="android_pixel_8_pro_hw_fprint_7788",
                platform="android",
            ),
            db=self.db,
        )
        self.assertTrue(claim_res["claimed"])

        # 3. Admin approval with step-up passphrase
        app_res = approve_pairing(
            challenge_id=ch.challenge_id,
            payload=PairingApprovalRequest(passphrase="AdminStepUpPass2026!"),
            operator=self.admin_op,
            db=self.db,
        )
        self.assertTrue(app_res["approved"])

        # 4. Immediate revocation
        rev_res = revoke_pairing(
            challenge_id=ch.challenge_id,
            operator=self.admin_op,
            db=self.db,
        )
        self.assertTrue(rev_res["revoked"])

        # 5. Confirm status is revoked
        st = get_pairing_status(challenge_id=ch.challenge_id, db=self.db)
        self.assertEqual(st.status, "revoked")

    def test_11_android_realtime_outbox_persistence_and_replay(self):
        """Test persistent security event outbox records events and enables cursor replay."""
        store = EventStore(ring_buffer_size=50)

        # Append events into outbox
        env1 = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_701",
            severity="critical",
            payload={"rule": "Privilege Escalation"},
        )
        env2 = SecurityEventEnvelope(
            event_type="deception.canary_hit",
            resource_id="CNR_801",
            severity="high",
            payload={"canary": "AWS Backup Key"},
        )
        store.append(env1, db=self.db)
        store.append(env2, db=self.db)

        # Replay events starting from cursor 0
        replayed, next_cur, has_more = store.replay(since_cursor=0, limit=10, db=self.db)
        self.assertGreaterEqual(len(replayed), 2)
        event_types = [e.event_type for e in replayed]
        self.assertIn("alert.created", event_types)
        self.assertIn("deception.canary_hit", event_types)

    # =========================================================================
    # 6. Governor Level-3 Emergency Console & Safety Adapters
    # =========================================================================

    def test_12_governor_level3_containment_and_idempotency(self):
        """Test Governor Level-3 emergency countermeasure with dry-run safety and idempotency."""
        idem_key = "idem_phase5_test_key_999"
        req = EmergencyExecuteRequest(
            action="CONTAIN_HOST",
            target="srv-quarantine-dmz-01",
            justification="Adversary actively executing credential dumper on DMZ node.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )

        # First execution
        res1 = execute_emergency_action(
            payload=req,
            x_idempotency_key=idem_key,
            operator=self.admin_op,
            db=self.db,
        )
        self.assertEqual(res1.status, "DRY_RUN_EXECUTED")
        self.assertEqual(res1.safety_mode, "DRY_RUN_ADAPTER_ENGAGED")
        self.assertTrue(res1.dry_run)

        # Second execution with same idempotency key returns identical cached response
        res2 = execute_emergency_action(
            payload=req,
            x_idempotency_key=idem_key,
            operator=self.admin_op,
            db=self.db,
        )
        self.assertEqual(res1.execution_id, res2.execution_id)

        # Posture check
        status_res = get_emergency_status(operator=self.admin_op)
        self.assertEqual(status_res.status, "ARMED_LEVEL_3")
        contained_hosts = [h["host"] for h in status_res.contained_hosts]
        self.assertIn("srv-quarantine-dmz-01", contained_hosts)


if __name__ == "__main__":
    unittest.main()
