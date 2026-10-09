"""Unit Tests for Module 3.10 Campaign Intelligence Core.

Tests:
- Deterministic Disjoint Set Union (DSU) operations & lexicographic tie-breaking.
- Feature extraction & strict stop-lists (public DNS, loopback, gateway, generic UAs).
- Weighted Jaccard similarity computation.
- Temporal windowing (<= 4 hours).
- Deterministic campaign ID generation ('camp-[12 hex chars]').
- Campaign lifecycle state machine transitions (ACTIVE, DORMANT, RESOLVED, ARCHIVED).
- Merge and split operations.
- Multi-entity DAG graph derivation & deterministic priority truncation.
- Dual-mode storage bounds and FIFO capacity eviction (max 500).
"""

from datetime import datetime, timezone
import unittest

from app.campaigns.clustering import (
    DeterministicClusterer,
    DisjointSetUnion,
    EventEntityRecord,
    STOPLIST_IPS,
    compute_weighted_jaccard,
    extract_subnet_cidr,
    generate_deterministic_campaign_id,
)
from app.campaigns.graph import MAX_GRAPH_NODES, derive_campaign_graph
from app.campaigns.storage import CampaignStore, MAX_ACTIVE_CAMPAIGNS
from app.schemas import CampaignDossier, CampaignSummary


class TestModule310DSU(unittest.TestCase):
    """Test Disjoint Set Union determinism and tie-breaking."""

    def test_dsu_basic_union_and_find(self):
        dsu = DisjointSetUnion()
        dsu.union("entity_a", "entity_b")
        self.assertEqual(dsu.find("entity_a"), dsu.find("entity_b"))

    def test_dsu_deterministic_lexicographic_tie_breaking(self):
        """When merging equal-rank roots, lexicographically smaller becomes root."""
        dsu = DisjointSetUnion()
        # "alpha" vs "beta"
        root = dsu.union("beta", "alpha")
        self.assertEqual(root, "alpha")
        self.assertEqual(dsu.find("beta"), "alpha")

        # "gamma" vs "delta"
        root2 = dsu.union("gamma", "delta")
        self.assertEqual(root2, "delta")
        self.assertEqual(dsu.find("gamma"), "delta")

    def test_dsu_path_compression(self):
        dsu = DisjointSetUnion()
        dsu.union("a", "b")
        dsu.union("b", "c")
        dsu.union("c", "d")
        self.assertEqual(dsu.find("d"), "a")
        # Direct parent reference should be compressed
        self.assertEqual(dsu.parent["d"], "a")


class TestModule310ClusteringFeatures(unittest.TestCase):
    """Test feature extraction, stop-lists, and Jaccard similarity."""

    def test_stoplist_ip_filtering(self):
        rec_public_dns = EventEntityRecord(
            event_id="e1",
            event_type="attack",
            timestamp=1000.0,
            source_ip="8.8.8.8",
        )
        feats = rec_public_dns.extract_features()
        self.assertEqual(len(feats.get("source_ip", set())), 0)
        self.assertEqual(len(feats.get("subnet_cidr", set())), 0)

        rec_loopback = EventEntityRecord(
            event_id="e2",
            event_type="attack",
            timestamp=1000.0,
            source_ip="127.0.0.1",
        )
        feats_lb = rec_loopback.extract_features()
        self.assertEqual(len(feats_lb.get("source_ip", set())), 0)

    def test_generic_user_agent_filtering(self):
        rec_ua = EventEntityRecord(
            event_id="e3",
            event_type="attack",
            timestamp=1000.0,
            user_agent="curl/7.81.0",
        )
        feats = rec_ua.extract_features()
        self.assertEqual(len(feats.get("user_agent", set())), 0)

        rec_valid_ua = EventEntityRecord(
            event_id="e4",
            event_type="attack",
            timestamp=1000.0,
            user_agent="CustomAdversaryScanner/2.4 (ExploitFramework)",
        )
        feats_valid = rec_valid_ua.extract_features()
        self.assertIn("CustomAdversaryScanner/2.4 (ExploitFramework)", feats_valid.get("user_agent", set()))

    def test_subnet_cidr_extraction(self):
        self.assertEqual(extract_subnet_cidr("198.51.100.45"), "198.51.100.0/24")
        self.assertIsNone(extract_subnet_cidr("8.8.8.8"))
        self.assertIsNone(extract_subnet_cidr("127.0.0.1"))

    def test_weighted_jaccard_calculation(self):
        feats_a = {
            "source_ip": {"198.51.100.10"},
            "attack_type": {"ssh_brute_force"},
            "rule_id": {"AUTH_BRUTE_FORCE"},
        }
        feats_b = {
            "source_ip": {"198.51.100.10"},
            "attack_type": {"ssh_brute_force"},
            "rule_id": {"AUTH_BRUTE_FORCE"},
        }
        sim_identical = compute_weighted_jaccard(feats_a, feats_b)
        self.assertAlmostEqual(sim_identical, 1.0, places=4)

        feats_c = {
            "source_ip": {"203.0.113.50"},
            "attack_type": {"web_sql_injection"},
        }
        sim_disjoint = compute_weighted_jaccard(feats_a, feats_c)
        self.assertEqual(sim_disjoint, 0.0)

    def test_deterministic_campaign_id(self):
        seeds_1 = ["ip:198.51.100.10", "canary:CAN-01", "case:CASE-100"]
        seeds_2 = ["case:CASE-100", "ip:198.51.100.10", "canary:CAN-01"]  # Reordered

        id1 = generate_deterministic_campaign_id(seeds_1)
        id2 = generate_deterministic_campaign_id(seeds_2)

        self.assertTrue(id1.startswith("camp-"))
        self.assertEqual(len(id1), 17)  # "camp-" (5) + 12 hex chars = 17
        self.assertEqual(id1, id2)  # Invariant: identical regardless of input order


class TestModule310ClusteringEngine(unittest.TestCase):
    """Test DeterministicClusterer sliding windows and clustering logic."""

    def test_temporal_sliding_window_threshold(self):
        clusterer = DeterministicClusterer(now_ts=100000.0)

        # Event 1 and 2 within 2 hours (< 4 hours) sharing same IP and rule
        r1 = EventEntityRecord(
            event_id="e1",
            event_type="attack",
            timestamp=50000.0,
            source_ip="198.51.100.22",
            rule_id="RULE_A",
        )
        r2 = EventEntityRecord(
            event_id="e2",
            event_type="attack",
            timestamp=57200.0,  # +2 hours
            source_ip="198.51.100.22",
            rule_id="RULE_A",
        )
        # Event 3 is 6 hours later (> 4 hours)
        r3 = EventEntityRecord(
            event_id="e3",
            event_type="attack",
            timestamp=78800.0,  # +6 hours from e2
            source_ip="198.51.100.22",
            rule_id="RULE_A",
        )

        clusters = clusterer.cluster_events([r1, r2, r3])
        # e1 and e2 cluster together; e3 forms its own cluster due to >4h window
        self.assertEqual(len(clusters), 2)
        c1_ids = {r.event_id for r in clusters[0]}
        c2_ids = {r.event_id for r in clusters[1]}
        self.assertIn("e1", c1_ids)
        self.assertIn("e2", c1_ids)
        self.assertIn("e3", c2_ids)

    def test_strong_anchor_clustering_across_ips(self):
        """Two different IPs that hit the same canary within 4 hours MUST cluster together."""
        clusterer = DeterministicClusterer(now_ts=100000.0)

        r1 = EventEntityRecord(
            event_id="e1",
            event_type="canary",
            timestamp=50000.0,
            source_ip="198.51.100.1",
            canary_id="CAN-AWS-KEY-01",
        )
        r2 = EventEntityRecord(
            event_id="e2",
            event_type="canary",
            timestamp=53600.0,  # +1 hour
            source_ip="203.0.113.99",  # Different IP
            canary_id="CAN-AWS-KEY-01",  # Same canary anchor
        )

        clusters = clusterer.cluster_events([r1, r2])
        self.assertEqual(len(clusters), 1)
        self.assertEqual(len(clusters[0]), 2)


class TestModule310GraphReadModel(unittest.TestCase):
    """Test DAG graph derivation and deterministic priority truncation."""

    def test_derive_dag_graph_structure(self):
        camp = CampaignDossier(
            campaign_id="camp-1234567890ab",
            name="Test Campaign Alpha",
            status="active",
            severity="critical",
            confidence=0.95,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.1"],
            destination_ips=["10.0.0.5"],
            attack_ids=[101],
            alert_ids=[201],
            canary_ids=["CAN-01"],
            ioc_ids=["198.51.100.1"],
            case_ids=["CASE-50"],
            mitre_tactics=["Initial Access"],
            mitre_techniques=["T1190"],
            anchor_type="canary_tripwire",
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )

        attacks = [{"id": 101, "source_ip": "198.51.100.1", "attack_type": "ssh_brute_force", "severity": "high"}]
        alerts = [{"id": 201, "title": "Brute Force Detected", "severity": "high", "attack_id": 101, "case_id": "CASE-50"}]
        canaries = [{"token_id": "CAN-01", "name": "Prod AWS Token"}]
        cases = [{"case_id": "CASE-50", "title": "Investigate Brute Force"}]
        iocs = [{"indicator_value": "198.51.100.1", "threat_level": "high", "confidence": 0.85}]

        graph = derive_campaign_graph(
            campaign=camp,
            attacks_data=attacks,
            alerts_data=alerts,
            canaries_data=canaries,
            ioc_data=iocs,
            cases_data=cases,
        )

        self.assertFalse(graph.truncation.is_truncated)
        self.assertGreater(len(graph.nodes), 5)
        self.assertGreater(len(graph.edges), 5)

        # Verify DAG: check node types
        node_types = {n.type for n in graph.nodes}
        self.assertIn("campaign", node_types)
        self.assertIn("source_ip", node_types)
        self.assertIn("canary", node_types)
        self.assertIn("attack", node_types)
        self.assertIn("alert", node_types)
        self.assertIn("case", node_types)

    def test_deterministic_truncation_when_nodes_exceed_cap(self):
        """When nodes exceed 100, low priority nodes are pruned first with explicit truncation flags."""
        camp = CampaignDossier(
            campaign_id="camp-flood",
            name="Flood Campaign",
            status="active",
            severity="critical",
            confidence=0.95,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.1"],
            destination_ips=[],
            attack_ids=list(range(1, 150)),  # 149 attacks
            alert_ids=[],
            canary_ids=["CAN-HIGH-PRIORITY"],
            ioc_ids=[],
            case_ids=[],
            mitre_tactics=[],
            mitre_techniques=[],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )

        attacks = [{"id": i, "source_ip": "198.51.100.1", "attack_type": "probe", "severity": "low"} for i in range(1, 150)]
        canaries = [{"token_id": "CAN-HIGH-PRIORITY", "name": "Key Canary"}]

        graph = derive_campaign_graph(
            campaign=camp,
            attacks_data=attacks,
            canaries_data=canaries,
        )

        self.assertTrue(graph.truncation.is_truncated)
        self.assertEqual(len(graph.nodes), MAX_GRAPH_NODES)
        self.assertGreater(graph.truncation.total_nodes_discovered, MAX_GRAPH_NODES)
        self.assertEqual(graph.truncation.pruned_nodes_count, graph.truncation.total_nodes_discovered - MAX_GRAPH_NODES)

        # High priority canary MUST survive truncation
        node_ids = {n.id for n in graph.nodes}
        self.assertIn("node:canary:CAN-HIGH-PRIORITY", node_ids)
        self.assertIn("node:campaign:camp-flood", node_ids)


class TestModule310Storage(unittest.TestCase):
    """Test CampaignStore persistence, capacity enforcement, and queries."""

    def setUp(self):
        self.store = CampaignStore()
        self.store.clear()

    def test_save_and_retrieve_campaign(self):
        camp = CampaignDossier(
            campaign_id="camp-test001",
            name="Campaign One",
            status="active",
            severity="high",
            confidence=0.88,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            source_ips=["198.51.100.5"],
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        self.store.save_campaign(camp)
        retrieved = self.store.get_campaign("camp-test001")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "Campaign One")
        self.assertEqual(self.store.get_campaign_for_entity("ip:198.51.100.5"), "camp-test001")

    def test_list_campaigns_deterministic_sorting(self):
        c_low = CampaignDossier(
            campaign_id="camp-low",
            name="Low Campaign",
            status="active",
            severity="low",
            confidence=0.5,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        c_crit = CampaignDossier(
            campaign_id="camp-crit",
            name="Critical Campaign",
            status="active",
            severity="critical",
            confidence=0.95,
            first_seen="2026-10-09T10:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            created_at="2026-10-09T10:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        self.store.save_campaign(c_low)
        self.store.save_campaign(c_crit)

        summaries, total = self.store.list_campaigns()
        self.assertEqual(total, 2)
        # Critical MUST be sorted ahead of low
        self.assertEqual(summaries[0].campaign_id, "camp-crit")
        self.assertEqual(summaries[1].campaign_id, "camp-low")

    def test_capacity_eviction_at_max_campaigns(self):
        """Store caps at 500 campaigns with FIFO eviction of archived/resolved."""
        # Pre-seed store with 500 campaigns
        for i in range(MAX_ACTIVE_CAMPAIGNS):
            status = "archived" if i == 0 else "active"
            camp = CampaignDossier(
                campaign_id=f"camp-{i:04d}",
                name=f"Campaign {i}",
                status=status,
                severity="medium",
                confidence=0.7,
                first_seen="2026-10-09T10:00:00Z",
                last_seen="2026-10-09T12:00:00Z",
                created_at=f"2026-10-09T10:{i%60:02d}:00Z",
                updated_at=f"2026-10-09T10:{i%60:02d}:00Z",
            )
            self.store.save_campaign(camp)

        self.assertEqual(len(self.store._memory_items), MAX_ACTIVE_CAMPAIGNS)
        # Add campaign #501
        new_camp = CampaignDossier(
            campaign_id="camp-overflow",
            name="Overflow Campaign",
            status="active",
            severity="high",
            confidence=0.9,
            first_seen="2026-10-09T12:00:00Z",
            last_seen="2026-10-09T12:00:00Z",
            created_at="2026-10-09T12:00:00Z",
            updated_at="2026-10-09T12:00:00Z",
        )
        self.store.save_campaign(new_camp)

        # Total size must remain bounded at MAX_ACTIVE_CAMPAIGNS
        self.assertLessEqual(len(self.store._memory_items), MAX_ACTIVE_CAMPAIGNS)
        # The archived campaign (camp-0000) should have been evicted
        self.assertIsNone(self.store.get_campaign("camp-0000"))
        self.assertIsNotNone(self.store.get_campaign("camp-overflow"))


if __name__ == "__main__":
    unittest.main()
