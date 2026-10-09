"""Deterministic Cross-Module Campaign Clustering Engine (Module 3.10).

Implements:
- Feature extraction across attacks, alerts, canary tripwires, threat intel IOCs, and cases.
- Strict infrastructure stop-lists to prevent cluster poisoning and false merges.
- Mathematical weighted Jaccard similarity and sliding temporal windowing (<= 4 hours).
- Deterministic Disjoint Set Union (DSU) with path compression and lexicographic tie-breaking.
- Deterministic campaign ID generation formatted as 'camp-[12 hex chars]'.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import ipaddress
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Feature Weights
FEATURE_WEIGHTS: dict[str, float] = {
    "canary_id": 3.0,
    "ioc_value": 2.5,
    "source_ip": 2.0,
    "case_id": 2.0,
    "rule_id": 1.5,
    "attack_type": 1.0,
    "mitre_technique": 1.0,
    "subnet_cidr": 0.5,
    "destination_ip": 0.5,
    "user_agent": 0.5,
}

# Bounds
MAX_INPUT_EVENTS_PER_RUN: int = 1000
MAX_PAIR_COMPARISONS: int = 500000
TEMPORAL_WINDOW_SECONDS: float = 14400.0  # 4 hours
MAX_LOOKBACK_SECONDS: float = 604800.0  # 7 days
JACCARD_THRESHOLD: float = 0.60

# Stop-lists: IP addresses that must NEVER be used for campaign clustering
STOPLIST_IPS: set[str] = {
    "8.8.8.8",
    "8.8.4.4",
    "1.1.1.1",
    "1.0.0.1",
    "9.9.9.9",
    "208.67.222.222",
    "208.67.220.220",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "192.168.1.1",
    "192.168.0.1",
    "10.0.0.1",
    "172.16.0.1",
}

# Generic User-Agents to ignore
GENERIC_UA_REGEX = re.compile(
    r"^(?:curl/.*|python-requests/.*|wget/.*|mozilla/5\.0.*|user-agent.*|unknown.*|\s*)$",
    re.IGNORECASE,
)


def parse_iso_timestamp(ts: Any) -> float:
    """Parse string or datetime to epoch seconds."""
    if isinstance(ts, (int, float)):
        return float(ts)
    if isinstance(ts, datetime):
        return ts.timestamp()
    if isinstance(ts, str):
        try:
            # Handle ISO 8601 strings
            clean_ts = ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            return dt.timestamp()
        except Exception:
            pass
    return 0.0


def extract_subnet_cidr(ip_str: str) -> str | None:
    """Extract /24 for IPv4 or /64 for IPv6 without throwing."""
    if not ip_str or ip_str in STOPLIST_IPS:
        return None
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_loopback or ip.is_unspecified or ip.is_multicast:
            return None
        if ip.version == 4:
            net = ipaddress.ip_network(f"{ip_str}/24", strict=False)
            return str(net)
        else:
            net = ipaddress.ip_network(f"{ip_str}/64", strict=False)
            return str(net)
    except ValueError:
        return None


@dataclass
class EventEntityRecord:
    """Standardized entity record for clustering analysis."""

    event_id: str
    event_type: str  # attack, alert, canary, ioc, case
    timestamp: float
    source_ip: str | None = None
    destination_ip: str | None = None
    user_agent: str | None = None
    attack_type: str | None = None
    rule_id: str | None = None
    mitre_technique: str | None = None
    canary_id: str | None = None
    ioc_value: str | None = None
    case_id: str | None = None
    severity: str = "medium"
    raw_payload: dict[str, Any] = field(default_factory=dict)

    def extract_features(self) -> dict[str, set[str]]:
        """Extract multi-attribute feature sets filtering stop-lists."""
        feats: dict[str, set[str]] = defaultdict(set)

        # 1. Strong Anchors
        if self.canary_id:
            feats["canary_id"].add(self.canary_id.strip())
        if self.ioc_value:
            clean_ioc = self.ioc_value.strip().lower()
            if clean_ioc not in STOPLIST_IPS:
                feats["ioc_value"].add(clean_ioc)

        # 2. Source IP & Subnet CIDR
        if self.source_ip:
            clean_ip = self.source_ip.strip()
            if clean_ip not in STOPLIST_IPS:
                feats["source_ip"].add(clean_ip)
                cidr = extract_subnet_cidr(clean_ip)
                if cidr:
                    feats["subnet_cidr"].add(cidr)

        # 3. Case ID
        if self.case_id:
            feats["case_id"].add(self.case_id.strip())

        # 4. Moderate Links
        if self.rule_id:
            feats["rule_id"].add(self.rule_id.strip().upper())
        if self.attack_type:
            feats["attack_type"].add(self.attack_type.strip().lower())
        if self.mitre_technique:
            feats["mitre_technique"].add(self.mitre_technique.strip().upper())

        # 5. Destination IP
        if self.destination_ip:
            clean_dst = self.destination_ip.strip()
            if clean_dst not in STOPLIST_IPS:
                feats["destination_ip"].add(clean_dst)

        # 6. User Agent (filtering generic UA regex)
        if self.user_agent and not GENERIC_UA_REGEX.match(self.user_agent.strip()):
            feats["user_agent"].add(self.user_agent.strip()[:100])

        return feats


class DisjointSetUnion:
    """Disjoint Set Union (DSU) with path compression and lexicographic tie-breaking."""

    def __init__(self) -> None:
        self.parent: dict[str, str] = {}
        self.rank: dict[str, int] = {}

    def find(self, x: str) -> str:
        """Find representative with path compression."""
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
            return x
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str) -> str:
        """Union two sets with deterministic lexicographic tie-breaking on equal rank."""
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x == root_y:
            return root_x

        # Rank-based union
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
            return root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
            return root_x
        else:
            # Deterministic tie-breaking: lexicographically smaller identifier becomes root
            if root_x < root_y:
                self.parent[root_y] = root_x
                self.rank[root_x] += 1
                return root_x
            else:
                self.parent[root_x] = root_y
                self.rank[root_y] += 1
                return root_y


def compute_weighted_jaccard(
    feats_a: dict[str, set[str]],
    feats_b: dict[str, set[str]],
) -> float:
    """Compute weighted Jaccard similarity across all feature types."""
    all_keys = set(feats_a.keys()) | set(feats_b.keys())
    if not all_keys:
        return 0.0

    weighted_intersection = 0.0
    weighted_union = 0.0

    for k in all_keys:
        weight = FEATURE_WEIGHTS.get(k, 1.0)
        set_a = feats_a.get(k, set())
        set_b = feats_b.get(k, set())

        intersection_len = len(set_a & set_b)
        union_len = len(set_a | set_b)

        weighted_intersection += weight * intersection_len
        weighted_union += weight * union_len

    if weighted_union == 0.0:
        return 0.0
    return weighted_intersection / weighted_union


def generate_deterministic_campaign_id(seed_items: list[str]) -> str:
    """Derive deterministic 'camp-[12 hex chars]' ID from sorted canonical seeds."""
    sorted_seeds = sorted(list(set(seed_items)))
    raw_str = "|".join(sorted_seeds)
    digest = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
    return f"camp-{digest[:12]}"


class DeterministicClusterer:
    """Deterministic Union-Find clustering engine for HoneyShield-X."""

    def __init__(self, now_ts: float | None = None) -> None:
        self.now_ts = now_ts or datetime.now(timezone.utc).timestamp()

    def cluster_events(
        self,
        records: list[EventEntityRecord],
    ) -> list[list[EventEntityRecord]]:
        """Group records into connected campaign clusters.

        Guarantees:
        - Max 1,000 input events
        - Temporal distance <= 4h
        - Max 7 days lookback
        - Strict DSU determinism
        """
        # 1. Bounded filter on lookback window
        valid_records: list[EventEntityRecord] = []
        for r in records:
            if self.now_ts - r.timestamp <= MAX_LOOKBACK_SECONDS:
                valid_records.append(r)

        # Sort chronologically, then by event_id for deterministic evaluation
        valid_records.sort(key=lambda x: (x.timestamp, x.event_id))
        valid_records = valid_records[:MAX_INPUT_EVENTS_PER_RUN]

        if not valid_records:
            return []

        # 2. Extract features
        precomputed_features: dict[str, dict[str, set[str]]] = {}
        for r in valid_records:
            precomputed_features[r.event_id] = r.extract_features()

        dsu = DisjointSetUnion()
        comparisons = 0

        # 3. Inverted index for candidate pairing
        feature_to_events: dict[tuple[str, str], list[str]] = defaultdict(list)
        for r in valid_records:
            f_map = precomputed_features[r.event_id]
            for f_type, f_vals in f_map.items():
                for val in f_vals:
                    feature_to_events[(f_type, val)].append(r.event_id)

        # Build candidate pairs sharing at least one feature
        candidate_pairs: set[tuple[str, str]] = set()
        for events_list in feature_to_events.values():
            if len(events_list) > 1:
                for i in range(len(events_list)):
                    for j in range(i + 1, len(events_list)):
                        e1, e2 = events_list[i], events_list[j]
                        if e1 > e2:
                            e1, e2 = e2, e1
                        candidate_pairs.add((e1, e2))
                        if len(candidate_pairs) >= MAX_PAIR_COMPARISONS:
                            break
                    if len(candidate_pairs) >= MAX_PAIR_COMPARISONS:
                        break

        record_map = {r.event_id: r for r in valid_records}

        # 4. Evaluate candidate pairs
        # Deterministic sorting of candidate pairs
        sorted_pairs = sorted(list(candidate_pairs))

        for id_a, id_b in sorted_pairs:
            comparisons += 1
            if comparisons > MAX_PAIR_COMPARISONS:
                break

            rec_a = record_map[id_a]
            rec_b = record_map[id_b]

            # Temporal distance check: <= 4 hours
            if abs(rec_a.timestamp - rec_b.timestamp) > TEMPORAL_WINDOW_SECONDS:
                continue

            feats_a = precomputed_features[id_a]
            feats_b = precomputed_features[id_b]

            # Check strong anchor
            has_canary_anchor = bool(feats_a.get("canary_id") and feats_b.get("canary_id") and (feats_a["canary_id"] & feats_b["canary_id"]))
            has_ioc_anchor = bool(feats_a.get("ioc_value") and feats_b.get("ioc_value") and (feats_a["ioc_value"] & feats_b["ioc_value"]))

            should_cluster = False
            if has_canary_anchor or has_ioc_anchor:
                should_cluster = True
            else:
                sim = compute_weighted_jaccard(feats_a, feats_b)
                if sim >= JACCARD_THRESHOLD:
                    should_cluster = True

            if should_cluster:
                dsu.union(id_a, id_b)

        # 5. Group by DSU root
        clusters_by_root: dict[str, list[EventEntityRecord]] = defaultdict(list)
        for r in valid_records:
            root = dsu.find(r.event_id)
            clusters_by_root[root].append(r)

        # 6. Sort clusters deterministically
        cluster_list = list(clusters_by_root.values())
        for c in cluster_list:
            c.sort(key=lambda x: (x.timestamp, x.event_id))

        # Sort clusters by (-record_count, earliest_timestamp, root_id)
        cluster_list.sort(key=lambda x: (-len(x), x[0].timestamp, x[0].event_id))
        return cluster_list
