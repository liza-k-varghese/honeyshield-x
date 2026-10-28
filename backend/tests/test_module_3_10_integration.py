"""Integration test suite for Module 3.10 (Campaign Intelligence Core).

Verifies:
1. Multi-vector cross-module telemetry fusion: Attacks + Alerts + Threat Intel.
2. EventBus subscription handling and strict recursive loop prevention.
3. Governor Level-3 Two-Phase HITL bulk containment execution and emergency lockout.
4. Bidirectional case linking and campaign dossier state synchronization.
"""

import os
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from fastapi import HTTPException

os.environ["HONEYSHIELD_TESTING"] = "1"
os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"

from app.auth.registry import default_operator_registry, Operator
from app.auth.session import default_session_store
from app.campaigns.service import default_campaign_service
from app.campaigns.storage import default_campaign_store
from app.cases.storage import default_case_store
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, ThreatIntelligence
from app.routers.campaigns import contain_campaign, link_case, unlink_case
from app.schemas import CampaignContainmentRequest, CampaignDossier
from app.threat_intelligence.storage import serialize_ioc_metadata


class TestModule310Integration(unittest.TestCase):
    """Integration verification across all defensive modules fused into Campaign Intelligence."""

    def setUp(self):
        default_campaign_store.clear()
        default_case_store.clear()
        default_session_store.clear()
        default_operator_registry.reset()

        # Reset Governor singleton
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        # Seed operators
        self.admin = default_operator_registry.get_operator("admin_chief")
        self.analyst = default_operator_registry.get_operator("analyst_sarah")
        self.responder = default_operator_registry.get_operator("responder_alex")

    def tearDown(self):
        default_campaign_store.clear()
        default_case_store.clear()
        default_session_store.clear()

    def test_1_multi_vector_telemetry_clustering_fusion(self):
        """Cross-module telemetry (Attacks, Alerts, Threat Intel) is synthesized into a deterministic campaign."""
        now = datetime.now(timezone.utc)
        shared_ip = "198.51.100.99"
        shared_ua = "APT-Cobalt-Agent/2.4"

        # Construct in-memory model instances
        mock_attack = Attack(
            id=101,
            source_ip=shared_ip,
            destination_ip="10.0.0.1",
            protocol="HTTPS",
            attack_type="SQL_INJECTION",
            severity="critical",
            risk_score=90.0,
            status="detected",
        )
        mock_attack.detected_at = now

        mock_alert = Alert(
            id=202,
            attack_id=101,
            alert_type="BRUTE_FORCE_DETECTED",
            severity="high",
            status="open",
            message=f"Repeated authentication failures from {shared_ip}. UA: {shared_ua}",
            created_at=now,
        )

        mock_ioc = ThreatIntelligence(
            id=303,
            indicator_type="ip",
            indicator_value=shared_ip,
            threat_level="high",
            confidence=90.0,
            source="alienvault",
            description=serialize_ioc_metadata({
                "status": "active",
                "notes": "Known C2 IP associated with Cobalt Strike campaigns",
            }),
            created_at=now,
        )

        # Mock database session
        mock_db = MagicMock()
        def mock_scalars(query):
            mock_res = MagicMock()
            q_str = str(query).lower()
            if "attacks" in q_str:
                mock_res.all.return_value = [mock_attack]
            elif "alerts" in q_str:
                mock_res.all.return_value = [mock_alert]
            elif "threat_intelligence" in q_str:
                mock_res.all.return_value = [mock_ioc]
            else:
                mock_res.all.return_value = []
            return mock_res

        mock_db.scalars.side_effect = mock_scalars
        mock_db.get.side_effect = lambda model, ident: mock_attack if ident == 101 else None

        # Trigger single-flight clustering
        cluster_res = default_campaign_service.cluster_now(
            db=mock_db,
            operator_id=self.analyst.username,
            lookback_hours=24,
        )
        self.assertEqual(cluster_res.status, "completed")
        self.assertGreaterEqual(cluster_res.campaigns_created, 1)

        # Verify synthesized campaign dossier
        campaigns, total = default_campaign_service.list_campaigns()
        self.assertGreaterEqual(total, 1)

        dossiers = [default_campaign_service.get_campaign(c.campaign_id) for c in campaigns]
        target_dossier = next((d for d in dossiers if shared_ip in d.source_ips), None)
        self.assertIsNotNone(target_dossier)
        self.assertIn(shared_ip, target_dossier.source_ips)
        self.assertEqual(target_dossier.severity, "critical")

    def test_2_eventbus_subscription_and_loop_prevention(self):
        """Subscriber ignores campaign.* events preventing recursive event storms."""
        events_fired: list[str] = []

        def tracker(event_type: str, payload: dict):
            events_fired.append(event_type)

        default_event_bus.register_listener(tracker)
        try:
            initial_count = default_campaign_store.count()
            default_event_bus.publish_event(
                "campaign.created",
                {"campaign_id": "camp-testloop", "source_ips": ["198.51.100.100"]},
            )
            # Count must remain unchanged (no recursive self-trigger)
            self.assertEqual(default_campaign_store.count(), initial_count)
            self.assertIn("campaign.created", events_fired)
        finally:
            default_event_bus.unregister_listener(tracker)

    def test_3_governor_level_3_two_phase_bulk_containment(self):
        """Bulk containment enforces Governor Tier-3 approval token validation and lockout."""
        camp_id = "camp-contain001"
        target_ip = "203.0.113.88"
        camp = CampaignDossier(
            campaign_id=camp_id,
            name="Containment Test Campaign",
            status="active",
            severity="critical",
            confidence=0.95,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=[target_ip],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(camp)

        # 1. Attempt containment with invalid token -> Governor rejects with 401
        req_bad = CampaignContainmentRequest(
            action_type="ISOLATE_HOST",
            justification="Critical threat active",
            approval_token="invalid-token-1234",
        )
        idempotency_key = str(uuid.uuid4())
        with self.assertRaises(HTTPException) as ctx:
            contain_campaign(
                campaign_id=camp_id,
                payload=req_bad,
                x_idempotency_key=idempotency_key,
                operator=self.admin,
                db=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid or expired approval token", ctx.exception.detail)

        # 2. Acquire Tier-3 approval token via Governor staging
        action_name = "CAMPAIGN_CONTAINMENT_DISPATCH"
        token_info = default_governor.create_approval_token(
            action=action_name,
            target_id=camp_id,
            operator_id=self.admin.username,
        )
        approval_token = token_info["approval_token"]
        self.assertIsNotNone(approval_token)

        # 3. Execute containment with valid approval token via router endpoint
        req_valid = CampaignContainmentRequest(
            action_type="ISOLATE_HOST",
            justification="Approved containment of adversarial cluster",
            approval_token=approval_token,
        )
        exec_key = str(uuid.uuid4())
        res_exec = contain_campaign(
            campaign_id=camp_id,
            payload=req_valid,
            x_idempotency_key=exec_key,
            operator=self.admin,
            db=None,
        )
        self.assertEqual(res_exec.status, "dispatched")
        self.assertIn(target_ip, res_exec.contained_entities)

        # Campaign status must now be contained
        updated_camp = default_campaign_store.get_campaign(camp_id)
        self.assertEqual(updated_camp.status, "contained")

    def test_4_governor_emergency_lockout_blocks_campaign_containment(self):
        """Emergency lockout fail-closed blocks any containment attempts with 503 Service Unavailable."""
        camp_id = "camp-lockout001"
        camp = CampaignDossier(
            campaign_id=camp_id,
            name="Lockout Campaign",
            status="active",
            severity="high",
            confidence=0.8,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.222"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(camp)

        # Activate emergency lockout
        default_governor.set_lockout(True)

        req = CampaignContainmentRequest(
            action_type="BLOCK_IP",
            justification="Emergency block",
            approval_token="dummy-token",
        )
        with self.assertRaises(HTTPException) as ctx:
            contain_campaign(
                campaign_id=camp_id,
                payload=req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=self.admin,
                db=None,
            )
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("emergency lockout", ctx.exception.detail.lower())

    def test_5_case_bidirectional_linking_and_unlinking(self):
        """Incident cases can be linked and unlinked from campaign dossier."""
        camp_id = "camp-case-sync"
        camp = CampaignDossier(
            campaign_id=camp_id,
            name="Case Linking Test",
            status="active",
            severity="medium",
            confidence=0.7,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["192.0.2.55"],
            case_ids=[],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(camp)

        # Link case-alpha
        dossier_linked = link_case(camp_id, "case-alpha", operator=self.analyst, db=None)
        self.assertIn("case-alpha", dossier_linked.case_ids)

        # Link case-beta
        dossier_linked2 = link_case(camp_id, "case-beta", operator=self.analyst, db=None)
        self.assertIn("case-alpha", dossier_linked2.case_ids)
        self.assertIn("case-beta", dossier_linked2.case_ids)

        # Unlink case-alpha
        dossier_unlinked = unlink_case(camp_id, "case-alpha", operator=self.responder, db=None)
        self.assertNotIn("case-alpha", dossier_unlinked.case_ids)
        self.assertIn("case-beta", dossier_unlinked.case_ids)


if __name__ == "__main__":
    unittest.main()
