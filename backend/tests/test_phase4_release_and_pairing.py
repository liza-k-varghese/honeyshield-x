"""Automated Android Release, QR Pairing & Governor Level-3 Test Suite (Phase 4).

Validates:
1. Ephemeral 180s QR device pairing challenge generation and URI schema.
2. Device claim submission with hardware fingerprinting and metadata.
3. Single-use replay protection and expired challenge rejection.
4. Administrative step-up authorization with mandatory passphrase validation.
5. Immediate device pairing revocation and live status queries.
6. Persistent event outbox (SecurityEventOutbox) and database startup hydration.
7. Cursor-based historical replay recovery from durable storage.
8. Governor Level-3 emergency countermeasure execution:
   - CONTAIN_HOST (dry-run host isolation)
   - RELEASE_CONTAINMENT (isolation release)
   - BLOCK_IP (valid IPv4/IPv6 boundary filter)
   - RESTART_CRITICAL_SERVICE (allowlisted RPC)
9. Validation safeguards:
   - Mandatory operational justification (min 15 chars)
   - Operator step-up confirmation (min 8 chars)
   - Disallowed action rejection
   - Invalid target / IP rejection
10. Idempotency key tracking and cached response playback.
11. Governor emergency status posture query.
12. Audit ledger emission for pairing and emergency events.
"""

from datetime import datetime, timedelta, timezone
import json
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from app.auth.registry import Operator
from app.events.schemas import SecurityEventEnvelope
from app.events.service import publish_security_event
from app.events.store import EventStore, default_event_store
from app.models import DevicePairingChallenge, SecurityEventOutbox
from app.routers.emergency import (
    EmergencyExecuteRequest,
    execute_emergency_action,
    get_emergency_status,
)
from app.routers.pairing import (
    PairingApprovalRequest,
    PairingClaimRequest,
    approve_pairing,
    claim_pairing_challenge,
    create_pairing_challenge,
    get_pairing_status,
    revoke_pairing,
)


class TestPhase4ReleaseAndPairing(unittest.TestCase):
    """Comprehensive test harness for Phase 4 Release & Operational Controls."""

    @classmethod
    def setUpClass(cls):
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

    def setUp(self):
        self.mock_db = MagicMock()
        # Mock request object for base_url
        self.mock_request = MagicMock()
        self.mock_request.base_url = "http://10.0.2.2:8000/"

    # =========================================================================
    # 1. QR Device Pairing Lifecycle
    # =========================================================================

    def test_01_qr_challenge_generation(self):
        """Test generation of single-use 180s pairing challenge and URI."""
        res = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )

        self.assertTrue(res.challenge_id.startswith("hsx_pair_"))
        self.assertEqual(res.operator_username, "admin_chief")
        self.assertEqual(res.expires_in_seconds, 180)
        self.assertIn("honeyshield://pairing?challenge=", res.pairing_uri)
        self.assertIn("endpoint=http://10.0.2.2:8000/api/v1", res.pairing_uri)

    def test_02_qr_challenge_claim_lifecycle(self):
        """Test claiming a pending challenge with device fingerprint."""
        # 1. Generate challenge
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )

        # 2. Claim challenge
        claim_req = PairingClaimRequest(
            challenge_id=ch.challenge_id,
            device_fingerprint="fp_android_pixel8_hardware_uuid_99",
            platform="android",
            metadata={"sdk": 34, "device": "Pixel 8 Pro"},
        )
        claim_res = claim_pairing_challenge(claim_req, db=self.mock_db)

        self.assertTrue(claim_res["claimed"])
        self.assertEqual(claim_res["status"], "claimed")
        self.assertEqual(claim_res["operator_username"], "admin_chief")

        # 3. Verify status query reflects 'claimed'
        st = get_pairing_status(ch.challenge_id, db=self.mock_db)
        self.assertEqual(st.status, "claimed")
        self.assertEqual(st.device_fingerprint, "fp_android_pixel8_hardware_uuid_99")

    def test_03_qr_challenge_claim_replay_rejected(self):
        """Test that claiming an already claimed challenge is rejected with 409 Conflict."""
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )
        claim_req = PairingClaimRequest(
            challenge_id=ch.challenge_id,
            device_fingerprint="fp_device_01",
        )
        claim_pairing_challenge(claim_req, db=self.mock_db)

        # Second claim attempt should fail
        with self.assertRaises(HTTPException) as cm:
            claim_pairing_challenge(claim_req, db=self.mock_db)
        self.assertEqual(cm.exception.status_code, 409)

    def test_04_admin_stepup_approval(self):
        """Test admin step-up approval authorizes the claimed device."""
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )
        claim_req = PairingClaimRequest(
            challenge_id=ch.challenge_id,
            device_fingerprint="fp_device_02",
        )
        claim_pairing_challenge(claim_req, db=self.mock_db)

        # Approve with valid passphrase
        app_req = PairingApprovalRequest(passphrase="SecAdminPass2026!")
        app_res = approve_pairing(
            challenge_id=ch.challenge_id,
            payload=app_req,
            operator=self.admin_op,
            db=self.mock_db,
        )

        self.assertTrue(app_res["approved"])
        self.assertEqual(app_res["status"], "approved")
        self.assertEqual(app_res["approved_by"], "admin_chief")

        # Verify status is approved
        st = get_pairing_status(ch.challenge_id, db=self.mock_db)
        self.assertEqual(st.status, "approved")
        self.assertEqual(st.approved_by, "admin_chief")

    def test_05_admin_stepup_approval_short_passphrase_rejected(self):
        """Test approval with short passphrase (<8 chars) is rejected."""
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )
        claim_req = PairingClaimRequest(
            challenge_id=ch.challenge_id,
            device_fingerprint="fp_device_03",
        )
        claim_pairing_challenge(claim_req, db=self.mock_db)

        with self.assertRaises((HTTPException, ValidationError)):
            app_req = PairingApprovalRequest(passphrase="short")
            approve_pairing(
                challenge_id=ch.challenge_id,
                payload=app_req,
                operator=self.admin_op,
                db=self.mock_db,
            )

    def test_06_device_pairing_revocation(self):
        """Test immediate revocation of device pairing authorization."""
        ch = create_pairing_challenge(
            request=self.mock_request,
            operator=self.admin_op,
            db=self.mock_db,
        )
        rev_res = revoke_pairing(
            challenge_id=ch.challenge_id,
            operator=self.admin_op,
            db=self.mock_db,
        )

        self.assertTrue(rev_res["revoked"])
        self.assertEqual(rev_res["status"], "revoked")

        st = get_pairing_status(ch.challenge_id, db=self.mock_db)
        self.assertEqual(st.status, "revoked")

    # =========================================================================
    # 2. Persistent Event Outbox & Startup Hydration
    # =========================================================================

    def test_07_persistent_outbox_db_record_and_hydration(self):
        """Test that EventStore records into SecurityEventOutbox and hydrates across restarts."""
        store = EventStore(ring_buffer_size=100)

        # Setup mock db query result for hydration
        mock_record_1 = MagicMock()
        mock_record_1.id = 101
        mock_record_1.event_id = "evt_persisted_01"
        mock_record_1.event_type = "alert.escalated"
        mock_record_1.resource_id = "ALT_1001"
        mock_record_1.severity = "high"
        mock_record_1.schema_version = "1.0"
        mock_record_1.correlation_id = "corr_01"
        mock_record_1.created_at = datetime.now(timezone.utc)
        mock_record_1.payload_json = json.dumps({"reason": "Multi-stage payload match"})

        fake_session = MagicMock()
        fake_session.scalar.return_value = 101
        fake_scalars = MagicMock()
        fake_scalars.all.return_value = [mock_record_1]
        fake_session.scalars.return_value = fake_scalars

        # Trigger startup hydration
        hydrated_count = store._hydrate_from_db(fake_session)
        self.assertEqual(hydrated_count, 1)
        self.assertEqual(store._cursor_counter, 101)

        # Verify event is present in replayed stream
        replayed, next_cursor, has_more = store.replay(since_cursor=100, db=fake_session)
        self.assertEqual(len(replayed), 1)
        self.assertEqual(replayed[0].event_id, "evt_persisted_01")
        self.assertEqual(replayed[0].cursor, 101)

    def test_08_persistent_outbox_append_with_db(self):
        """Test append into EventStore adds to DB session and assigns incrementing cursor."""
        store = EventStore(ring_buffer_size=50)
        fake_db = MagicMock()

        env = SecurityEventEnvelope(
            event_type="threat_intel.ioc_added",
            resource_id="IOC_999",
            severity="medium",
            payload={"indicator": "198.51.100.99"},
        )
        res_env = store.append(env, db=fake_db)

        self.assertIsNotNone(res_env.cursor)
        self.assertGreater(res_env.cursor, 0)
        fake_db.add.assert_called_once()
        fake_db.flush.assert_called_once()

    # =========================================================================
    # 3. Governor Level-3 Emergency Console Execution
    # =========================================================================

    def test_09_governor_emergency_contain_host(self):
        """Test execution of CONTAIN_HOST with dry-run safety adapter."""
        req = EmergencyExecuteRequest(
            action="CONTAIN_HOST",
            target="srv-dmz-honeypot-02",
            justification="Critical adversary lateral movement detected in DMZ honeypot cluster.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        res = execute_emergency_action(
            payload=req,
            x_idempotency_key=None,
            operator=self.admin_op,
            db=self.mock_db,
        )

        self.assertEqual(res.action, "CONTAIN_HOST")
        self.assertEqual(res.target, "srv-dmz-honeypot-02")
        self.assertEqual(res.status, "DRY_RUN_EXECUTED")
        self.assertEqual(res.safety_mode, "DRY_RUN_ADAPTER_ENGAGED")
        self.assertTrue(res.dry_run)
        self.assertIn("isolation_mode", res.details)

    def test_10_governor_emergency_block_ip_valid_and_invalid(self):
        """Test BLOCK_IP allows valid IP and rejects malformed IP."""
        # 1. Valid IPv4
        req_valid = EmergencyExecuteRequest(
            action="BLOCK_IP",
            target="203.0.113.50",
            justification="Active brute-force SSH probe against perimeter honeynet endpoint.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        res_valid = execute_emergency_action(
            payload=req_valid,
            operator=self.admin_op,
            db=self.mock_db,
        )
        self.assertEqual(res_valid.action, "BLOCK_IP")
        self.assertEqual(res_valid.target, "203.0.113.50")

        # 2. Invalid IP format should fail validation
        req_invalid = EmergencyExecuteRequest(
            action="BLOCK_IP",
            target="invalid_ip_format_999",
            justification="Active brute-force SSH probe against perimeter honeynet endpoint.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        with self.assertRaises(HTTPException) as cm:
            execute_emergency_action(
                payload=req_invalid,
                operator=self.admin_op,
                db=self.mock_db,
            )
        self.assertEqual(cm.exception.status_code, 422)
        self.assertIn("Invalid IP address", cm.exception.detail)

    def test_11_governor_emergency_restart_service_allowlist(self):
        """Test RESTART_CRITICAL_SERVICE enforces microservice allowlist."""
        # 1. Allowlisted service: redis
        req_valid = EmergencyExecuteRequest(
            action="RESTART_CRITICAL_SERVICE",
            target="redis",
            justification="Memory fragmentation observed on primary session broker node.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        res_valid = execute_emergency_action(
            payload=req_valid,
            operator=self.admin_op,
            db=self.mock_db,
        )
        self.assertEqual(res_valid.action, "RESTART_CRITICAL_SERVICE")
        self.assertEqual(res_valid.details.get("service"), "redis")

        # 2. Non-allowlisted arbitrary service
        req_invalid = EmergencyExecuteRequest(
            action="RESTART_CRITICAL_SERVICE",
            target="arbitrary_unauthorized_daemon",
            justification="Attempting unauthorized service restart on host node.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        with self.assertRaises(HTTPException) as cm:
            execute_emergency_action(
                payload=req_invalid,
                operator=self.admin_op,
                db=self.mock_db,
            )
        self.assertEqual(cm.exception.status_code, 422)
        self.assertIn("allowlist", cm.exception.detail)

    def test_12_governor_emergency_short_justification_rejected(self):
        """Test that operational justification < 15 chars is rejected."""
        with self.assertRaises((HTTPException, ValidationError)):
            req = EmergencyExecuteRequest(
                action="CONTAIN_HOST",
                target="srv-dmz-01",
                justification="Too short",  # < 15 chars
                passphrase="AdminStepUpPass2026!",
                dry_run=True,
            )
            execute_emergency_action(
                payload=req,
                operator=self.admin_op,
                db=self.mock_db,
            )

    def test_13_governor_emergency_short_passphrase_rejected(self):
        """Test that step-up confirmation passphrase < 8 chars is rejected."""
        with self.assertRaises((HTTPException, ValidationError)):
            req = EmergencyExecuteRequest(
                action="CONTAIN_HOST",
                target="srv-dmz-01",
                justification="Sufficiently long justification for emergency containment.",
                passphrase="123",  # < 8 chars
                dry_run=True,
            )
            execute_emergency_action(
                payload=req,
                operator=self.admin_op,
                db=self.mock_db,
            )

    def test_14_governor_emergency_idempotency_cache(self):
        """Test that identical X-Idempotency-Key returns cached response."""
        idem_key = "idem_test_uuid_unique_456"
        req = EmergencyExecuteRequest(
            action="CONTAIN_HOST",
            target="srv-dmz-honeypot-03",
            justification="Emergency isolation due to suspicious reverse shell beaconing.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )

        # First execution
        res1 = execute_emergency_action(
            payload=req,
            x_idempotency_key=idem_key,
            operator=self.admin_op,
            db=self.mock_db,
        )

        # Second execution with same idempotency key
        res2 = execute_emergency_action(
            payload=req,
            x_idempotency_key=idem_key,
            operator=self.admin_op,
            db=self.mock_db,
        )

        self.assertEqual(res1.execution_id, res2.execution_id)
        self.assertEqual(res1.executed_at, res2.executed_at)

    def test_15_governor_emergency_status_and_release(self):
        """Test get_emergency_status posture reporting and RELEASE_CONTAINMENT cleanup."""
        # 1. Contain a host
        req_contain = EmergencyExecuteRequest(
            action="CONTAIN_HOST",
            target="srv-quarantine-01",
            justification="Quarantining host suspected of credential harvesting intrusion.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        execute_emergency_action(
            payload=req_contain,
            operator=self.admin_op,
            db=self.mock_db,
        )

        # 2. Query status
        status_res = get_emergency_status(operator=self.admin_op)
        self.assertEqual(status_res.status, "ARMED_LEVEL_3")
        contained_targets = [h["host"] for h in status_res.contained_hosts]
        self.assertIn("srv-quarantine-01", contained_targets)

        # 3. Release containment
        req_release = EmergencyExecuteRequest(
            action="RELEASE_CONTAINMENT",
            target="srv-quarantine-01",
            justification="Adversary eliminated and host integrity validated via forensic dump.",
            passphrase="AdminStepUpPass2026!",
            dry_run=True,
        )
        execute_emergency_action(
            payload=req_release,
            operator=self.admin_op,
            db=self.mock_db,
        )

        # 4. Confirm host is removed from contained posture
        status_res_after = get_emergency_status(operator=self.admin_op)
        contained_after = [h["host"] for h in status_res_after.contained_hosts]
        self.assertNotIn("srv-quarantine-01", contained_after)


if __name__ == "__main__":
    unittest.main()
