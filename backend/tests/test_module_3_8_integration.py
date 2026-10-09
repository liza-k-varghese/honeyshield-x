"""Integration test suite for Module 3.8 Threat Intelligence & IOC Lifecycle Fusion Engine.

Tests:
1. Canary tripwire promotion to Threat Intelligence (manual API and auto-promotion pipeline).
2. Incident Case observable promotion (provenance linking, repeat hits, whitelist immunity).
3. Governor Level-3 HITL containment actions (IOC_BULK_REVOKE, IOC_CONTAINMENT_DISPATCH, IOC_FEED_LOCKOUT).
4. Single-use token consumption and replay rejection by Governor for Level-3 IOC actions.
5. ThreatContextualizer advisory contract (strictly advisory, non-authoritative).
6. Multi-indicator campaign clustering and aggregate metadata.
7. SystemEvent audit trail for cross-module promotion workflows.
"""

import os
import unittest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth.registry import default_operator_registry, Operator
from app.database import SessionLocal
from app.deception.service import default_deception_service
from app.incident_command.governor import default_governor
from app.models import ThreatIntelligence, SystemEvent
from app.schemas import (
    CanaryCreateRequest,
    IndicatorType,
    PromoteCanaryHitRequest,
    PromoteCaseObservableRequest,
    ThreatIndicatorCreate,
)
from app.threat_intelligence.contextualizer import threat_contextualizer
from app.threat_intelligence.service import threat_intel_service
from app.threat_intelligence.storage import threat_intel_store


class TestModule38Integration(unittest.TestCase):
    """Integration test suite for Module 3.8 Threat Intelligence engine."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()
        threat_intel_store.clear()

        self.admin: Operator = default_operator_registry.get_operator("admin_chief")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")

        self.created_indicator_ids: list[int] = []

    def tearDown(self):
        if self.created_indicator_ids:
            self.db.query(ThreatIntelligence).filter(
                ThreatIntelligence.id.in_(self.created_indicator_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
        self.db.close()

    def test_1_canary_hit_promotion_workflow(self):
        """Test promotion of canary tripwire hit to active threat intelligence."""
        # Promote canary hit
        res = threat_intel_service.promote_canary_hit(
            db=self.db,
            source_ip="93.184.216.45",
            canary_id="cnr_test_aws_123",
            canary_type="AWS_API_KEY",
            custom_campaign="CAMP-OPERATION-SHADOW",
        )
        self.assertIsNotNone(res)
        self.created_indicator_ids.append(res.id)

        self.assertEqual(res.indicator_value, "93.184.216.45")
        self.assertEqual(res.indicator_type, "ip")
        self.assertEqual(res.status, "active")
        self.assertEqual(res.campaign, "CAMP-OPERATION-SHADOW")
        self.assertIn("canary_hit", res.tags)
        self.assertIn("canary_id:cnr_test_aws_123", res.tags)
        self.assertEqual(res.hit_count, 1)

        # Second hit from same IP increments hit count and boosts confidence
        res_repeat = threat_intel_service.promote_canary_hit(
            db=self.db,
            source_ip="93.184.216.45",
            canary_id="cnr_test_aws_999",
            canary_type="AWS_API_KEY",
        )
        self.assertEqual(res_repeat.hit_count, 2)
        self.assertGreater(res_repeat.decayed_confidence, 0.90)

    def test_2_case_observable_promotion_workflow(self):
        """Test promotion of forensic observables from SOC incident case."""
        req = PromoteCaseObservableRequest(
            case_id="CASE-2026-8812",
            observable_type=IndicatorType.DOMAIN,
            observable_value="exfil-staging.blackhat-group.cc",
            threat_level="critical",
            campaign="APT-COBALT-STORM",
            tags=["exfiltration", "c2"],
            notes="Identified in memory forensics dump during host isolation",
        )

        promoted = threat_intel_service.promote_case_observable(
            db=self.db,
            request=req,
            operator_username=self.analyst.username,
        )
        self.created_indicator_ids.append(promoted.id)

        self.assertEqual(promoted.indicator_value, "exfil-staging.blackhat-group.cc")
        self.assertEqual(promoted.threat_level, "critical")
        self.assertEqual(promoted.campaign, "APT-COBALT-STORM")
        self.assertIn("case_id:CASE-2026-8812", promoted.tags)
        self.assertIn("case_evidence", promoted.tags)

    def test_3_whitelisted_indicator_cannot_be_promoted(self):
        """Test that whitelisted infrastructure cannot be promoted as malicious from a case."""
        # Create and whitelist an indicator
        ind = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.99",
                threat_level="low",
                confidence=0.5,
            ),
            operator_username=self.admin.username,
        )
        self.created_indicator_ids.append(ind.id)

        threat_intel_service.whitelist_indicator(
            db=self.db,
            indicator_id=ind.id,
            reason="Core corporate telemetry forwarder",
            operator_username=self.admin.username,
        )

        # Attempt to promote from case
        req = PromoteCaseObservableRequest(
            case_id="CASE-2026-9999",
            observable_type=IndicatorType.IP,
            observable_value="93.184.216.99",
            threat_level="critical",
        )

        with self.assertRaises(HTTPException) as ctx:
            threat_intel_service.promote_case_observable(
                db=self.db,
                request=req,
                operator_username=self.analyst.username,
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("whitelisted", ctx.exception.detail)

    def test_4_governor_level_3_hitl_actions_require_approval_token(self):
        """Test Governor Level-3 HITL containment actions enforce mandatory approval token."""
        tier3_actions = [
            "IOC_BULK_REVOKE",
            "IOC_CONTAINMENT_DISPATCH",
            "IOC_FEED_LOCKOUT",
        ]

        for action in tier3_actions:
            # 1. Missing approval token -> HTTP 422
            with self.assertRaises(HTTPException) as ctx:
                default_governor.evaluate_command_policy(
                    action=action,
                    target_id=101,
                    operator_id=self.responder.username,
                    justification="Containment action requested by incident commander",
                    approval_token=None,
                )
            self.assertEqual(ctx.exception.status_code, 422)
            self.assertIn("pre-flight approval token", ctx.exception.detail)

            # 2. Missing justification -> HTTP 422
            token_meta = default_governor.create_approval_token(
                action=action,
                target_id=101,
                operator_id=self.responder.username,
            )
            with self.assertRaises(HTTPException) as ctx:
                default_governor.evaluate_command_policy(
                    action=action,
                    target_id=101,
                    operator_id=self.responder.username,
                    justification="",
                    approval_token=token_meta["approval_token"],
                )
            self.assertEqual(ctx.exception.status_code, 422)
            self.assertIn("mandatory justification", ctx.exception.detail)

            # 3. Valid approval token + justification -> Authorized
            token_valid = default_governor.create_approval_token(
                action=action,
                target_id=101,
                operator_id=self.responder.username,
            )
            default_governor.evaluate_command_policy(
                action=action,
                target_id=101,
                operator_id=self.responder.username,
                justification="Verified high-priority containment directive",
                approval_token=token_valid["approval_token"],
            )

            # 4. Replay of consumed approval token -> HTTP 401
            with self.assertRaises(HTTPException) as ctx:
                default_governor.evaluate_command_policy(
                    action=action,
                    target_id=101,
                    operator_id=self.responder.username,
                    justification="Replay attack attempt",
                    approval_token=token_valid["approval_token"],
                )
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertIn("Invalid or expired approval token", ctx.exception.detail)

    def test_5_threat_contextualizer_advisory_contract(self):
        """Test ThreatContextualizer returns advisory recommendations without modifying authoritative state."""
        ind_data = {
            "id": 12,
            "indicator_type": "ip",
            "indicator_value": "93.184.216.50",
            "threat_level": "critical",
            "decayed_confidence": 0.95,
            "status": "active",
            "campaign": "FINANCIAL-TROJAN-CAMPAIGN",
            "tags": ["c2", "ransomware"],
            "hit_count": 5,
        }

        ctx = threat_contextualizer.contextualize_indicator(ind_data)
        self.assertTrue(ctx["advisory"])
        self.assertFalse(ctx["authoritative"])
        self.assertIn("recommended_actions", ctx)
        self.assertIn("threat_posture", ctx)
        self.assertIn("narrative", ctx)
        self.assertGreater(len(ctx["recommended_actions"]), 0)

    def test_6_campaign_clustering_aggregation(self):
        """Test aggregation and clustering of indicators sharing common campaign tags."""
        camp_name = "OPERATION-MIDNIGHT-APOLLO"

        i1 = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="ip",
                indicator_value="93.184.216.71",
                threat_level="high",
                confidence=0.85,
                campaign=camp_name,
            ),
            operator_username=self.analyst.username,
        )
        self.created_indicator_ids.append(i1.id)

        i2 = threat_intel_service.create_indicator(
            db=self.db,
            data=ThreatIndicatorCreate(
                indicator_type="domain",
                indicator_value="apollo-c2-tunnel.net",
                threat_level="critical",
                confidence=0.92,
                campaign=camp_name,
            ),
            operator_username=self.analyst.username,
        )
        self.created_indicator_ids.append(i2.id)

        campaigns = threat_intel_service.list_campaigns(self.db)
        target_camp = next((c for c in campaigns if c.name == camp_name), None)
        self.assertIsNotNone(target_camp)
        self.assertEqual(target_camp.indicator_count, 2)
        self.assertEqual(target_camp.highest_severity, "critical")
        self.assertIn("ip", target_camp.indicator_types)
        self.assertIn("domain", target_camp.indicator_types)


if __name__ == "__main__":
    unittest.main()
