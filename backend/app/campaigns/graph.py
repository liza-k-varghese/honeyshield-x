"""Pure Derived Read-Model Multi-Entity DAG Graph Generator (Module 3.10).

Constructs a Directed Acyclic Graph (DAG) correlating attacks, alerts, canary tripwires,
threat intel IOCs, and incident cases into a topological campaign representation.

Guarantees:
- Strict DAG structure (no cycles).
- Hard limits: max 100 nodes, max 200 edges, max 4 traversal hops.
- Deterministic priority truncation with explicit TruncationMeta (zero silent discarding).
- Pure in-memory computation with zero database writes.
"""

from collections import defaultdict
from typing import Any

from app.investigation.mitre import TACTIC_KILLCHAIN_ORDER, map_event_to_mitre, map_rule_to_mitre
from app.schemas import (
    CampaignDossier,
    CampaignGraphResponse,
    GraphEdge,
    GraphNode,
    GraphSummary,
    TruncationMeta,
)

MAX_GRAPH_NODES: int = 100
MAX_GRAPH_EDGES: int = 200
MAX_HOPS: int = 4

NODE_PRIORITY_MAP: dict[str, int] = {
    "campaign": 1,
    "canary": 2,
    "case": 3,
    "ioc": 4,
    "alert": 5,
    "source_ip": 6,
    "mitre_tactic": 7,
    "attack": 8,
    "destination_ip": 9,
    "detection_rule": 10,
    "attack_event": 11,
    "integration_delivery": 12,
}

SEVERITY_WEIGHTS: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}


def derive_campaign_graph(
    campaign: CampaignDossier,
    attacks_data: list[dict[str, Any]] | None = None,
    alerts_data: list[dict[str, Any]] | None = None,
    canaries_data: list[dict[str, Any]] | None = None,
    ioc_data: list[dict[str, Any]] | None = None,
    cases_data: list[dict[str, Any]] | None = None,
    integrations_data: list[dict[str, Any]] | None = None,
) -> CampaignGraphResponse:
    """Derive multi-entity campaign graph read-model."""
    raw_nodes: dict[str, GraphNode] = {}
    raw_edges: list[GraphEdge] = []

    attacks = attacks_data or []
    alerts = alerts_data or []
    canaries = canaries_data or []
    iocs = ioc_data or []
    cases = cases_data or []
    integrations = integrations_data or []

    # 1. Root Campaign Node
    root_node_id = f"node:campaign:{campaign.campaign_id}"
    raw_nodes[root_node_id] = GraphNode(
        id=root_node_id,
        type="campaign",
        label=f"Campaign: {campaign.name}",
        stage="Campaign Root",
        severity=campaign.severity,
        confidence=campaign.confidence,
        first_seen=campaign.first_seen,
        last_seen=campaign.last_seen,
        metadata={
            "campaign_id": campaign.campaign_id,
            "status": campaign.status,
            "anchor_type": campaign.anchor_type,
            "tags": campaign.tags,
        },
    )

    # 2. Source IP Nodes
    for ip in campaign.source_ips:
        ip_node_id = f"node:ip:{ip}"
        raw_nodes[ip_node_id] = GraphNode(
            id=ip_node_id,
            type="source_ip",
            label=f"IP: {ip}",
            stage="Attacker Endpoint",
            severity="high" if campaign.severity in ("critical", "high") else "medium",
            first_seen=campaign.first_seen,
            last_seen=campaign.last_seen,
            metadata={"source_ip": ip},
        )
        raw_edges.append(
            GraphEdge(
                id=f"edge:{root_node_id}->{ip_node_id}",
                source=root_node_id,
                target=ip_node_id,
                label="Attacker Node",
                edge_type="MEMBER_ATTACKER",
                metadata={},
            )
        )

    # 3. Canary Deception Nodes
    for c in canaries:
        cid = str(c.get("token_id") or c.get("id", "canary"))
        c_node_id = f"node:canary:{cid}"
        raw_nodes[c_node_id] = GraphNode(
            id=c_node_id,
            type="canary",
            label=f"Canary: {c.get('name') or cid}",
            stage="Deception Tripwire",
            severity="critical",
            confidence=0.95,
            first_seen=str(c.get("created_at") or campaign.first_seen),
            last_seen=str(c.get("last_tripped_at") or campaign.last_seen),
            metadata={"canary_id": cid, "token_type": c.get("token_type")},
        )
        raw_edges.append(
            GraphEdge(
                id=f"edge:{root_node_id}->{c_node_id}",
                source=root_node_id,
                target=c_node_id,
                label="Tripped Honeytoken",
                edge_type="MEMBER_DECEPTION",
                metadata={},
            )
        )

    # 4. Threat Intel IOC Nodes
    for ioc in iocs:
        ival = str(ioc.get("indicator_value") or ioc.get("value", "ioc"))
        ioc_node_id = f"node:ioc:{ival}"
        raw_nodes[ioc_node_id] = GraphNode(
            id=ioc_node_id,
            type="ioc",
            label=f"IOC: {ival}",
            stage="Threat Intelligence",
            severity=str(ioc.get("threat_level") or "high"),
            confidence=float(ioc.get("decayed_confidence") or ioc.get("confidence", 0.8)),
            first_seen=str(ioc.get("first_seen") or campaign.first_seen),
            last_seen=str(ioc.get("last_seen") or campaign.last_seen),
            metadata={"ioc_value": ival, "indicator_type": ioc.get("indicator_type")},
        )
        # Link source IPs to IOCs
        for ip in campaign.source_ips:
            if ip.lower() in ival.lower():
                ip_node_id = f"node:ip:{ip}"
                raw_edges.append(
                    GraphEdge(
                        id=f"edge:{ip_node_id}->{ioc_node_id}",
                        source=ip_node_id,
                        target=ioc_node_id,
                        label="Matched Indicator",
                        edge_type="MATCHED_INDICATOR",
                        metadata={},
                    )
                )

    # 5. Incident Case Nodes
    for case in cases:
        cs_id = str(case.get("case_id") or case.get("id", "case"))
        case_node_id = f"node:case:{cs_id}"
        raw_nodes[case_node_id] = GraphNode(
            id=case_node_id,
            type="case",
            label=f"Case: {case.get('title') or cs_id}",
            stage="Incident Response",
            severity=str(case.get("severity") or "high"),
            first_seen=str(case.get("created_at") or campaign.first_seen),
            last_seen=str(case.get("updated_at") or campaign.last_seen),
            metadata={"case_id": cs_id, "status": case.get("status")},
        )
        raw_edges.append(
            GraphEdge(
                id=f"edge:{root_node_id}->{case_node_id}",
                source=root_node_id,
                target=case_node_id,
                label="Linked Incident Case",
                edge_type="LINKED_CASE",
                metadata={},
            )
        )

    # 6. Attack Nodes & MITRE Tactic Columns
    tactics_observed: set[str] = set()
    for atk in attacks:
        atk_id = str(atk.get("id", "atk"))
        atk_node_id = f"node:attack:{atk_id}"
        atk_sev = str(atk.get("severity") or "medium")
        raw_nodes[atk_node_id] = GraphNode(
            id=atk_node_id,
            type="attack",
            label=f"Attack: {atk.get('attack_type') or 'Probing'}",
            stage="Attack Session",
            severity=atk_sev,
            confidence=float(atk.get("risk_score", 0.0)) / 100.0 if atk.get("risk_score") else None,
            first_seen=str(atk.get("timestamp") or atk.get("start_time") or campaign.first_seen),
            last_seen=str(atk.get("timestamp") or atk.get("end_time") or campaign.last_seen),
            metadata={"attack_id": atk_id, "protocol": atk.get("protocol")},
        )

        # Link from source IP to Attack
        atk_src = str(atk.get("source_ip", "")).strip()
        if atk_src:
            src_node_id = f"node:ip:{atk_src}"
            if src_node_id in raw_nodes:
                raw_edges.append(
                    GraphEdge(
                        id=f"edge:{src_node_id}->{atk_node_id}",
                        source=src_node_id,
                        target=atk_node_id,
                        label="Originated Session",
                        edge_type="ORIGINATED",
                        metadata={},
                    )
                )

        # Map to MITRE tactic
        atk_type = str(atk.get("attack_type", "unknown"))
        mitre_map = map_event_to_mitre(atk_type)
        tactic_name = mitre_map.tactic_name
        tactics_observed.add(tactic_name)
        tactic_node_id = f"node:tactic:{mitre_map.tactic_id}"
        if tactic_node_id not in raw_nodes:
            raw_nodes[tactic_node_id] = GraphNode(
                id=tactic_node_id,
                type="mitre_tactic",
                label=f"Stage: {tactic_name}",
                stage="Killchain Stage",
                severity="info",
                metadata={"tactic_id": mitre_map.tactic_id, "tactic_name": tactic_name},
            )
        raw_edges.append(
            GraphEdge(
                id=f"edge:{atk_node_id}->{tactic_node_id}",
                source=atk_node_id,
                target=tactic_node_id,
                label="Killchain Stage",
                edge_type="KILLCHAIN_STAGE",
                metadata={},
            )
        )

    # 7. Alert Nodes
    for alt in alerts:
        alt_id = str(alt.get("id", "alt"))
        alt_node_id = f"node:alert:{alt_id}"
        alt_sev = str(alt.get("severity") or "high")
        raw_nodes[alt_node_id] = GraphNode(
            id=alt_node_id,
            type="alert",
            label=f"Alert: {alt.get('title') or alt.get('alert_type', 'Detection')}",
            stage="Triggered Alert",
            severity=alt_sev,
            first_seen=str(alt.get("created_at") or campaign.first_seen),
            last_seen=str(alt.get("created_at") or campaign.last_seen),
            metadata={"alert_id": alt_id, "status": alt.get("status")},
        )
        # Link from attack or campaign to alert
        alt_atk_id = alt.get("attack_id")
        if alt_atk_id and f"node:attack:{alt_atk_id}" in raw_nodes:
            raw_edges.append(
                GraphEdge(
                    id=f"edge:node:attack:{alt_atk_id}->{alt_node_id}",
                    source=f"node:attack:{alt_atk_id}",
                    target=alt_node_id,
                    label="Triggered Alert",
                    edge_type="TRIGGERED_ALERT",
                    metadata={},
                )
            )
        else:
            raw_edges.append(
                GraphEdge(
                    id=f"edge:{root_node_id}->{alt_node_id}",
                    source=root_node_id,
                    target=alt_node_id,
                    label="Associated Alert",
                    edge_type="TRIGGERED_ALERT",
                    metadata={},
                )
            )

        # Link alert to case if applicable
        alt_case_id = alt.get("case_id")
        if alt_case_id and f"node:case:{alt_case_id}" in raw_nodes:
            raw_edges.append(
                GraphEdge(
                    id=f"edge:{alt_node_id}->node:case:{alt_case_id}",
                    source=alt_node_id,
                    target=f"node:case:{alt_case_id}",
                    label="Escalated to Case",
                    edge_type="ESCALATED_TO",
                    metadata={},
                )
            )

    # 8. Outbound Integrations
    for integ in integrations:
        del_id = str(integ.get("delivery_id", "integ"))
        del_node_id = f"node:integration:{del_id}"
        raw_nodes[del_node_id] = GraphNode(
            id=del_node_id,
            type="integration_delivery",
            label=f"SIEM/SOAR: {integ.get('status') or 'Dispatched'}",
            stage="External Dispatch",
            severity="info",
            first_seen=str(integ.get("timestamp") or campaign.last_seen),
            last_seen=str(integ.get("timestamp") or campaign.last_seen),
            metadata={"delivery_id": del_id, "status": integ.get("status")},
        )
        raw_edges.append(
            GraphEdge(
                id=f"edge:{root_node_id}->{del_node_id}",
                source=root_node_id,
                target=del_node_id,
                label="Dispatched Egress",
                edge_type="DISPATCHED_TO",
                metadata={},
            )
        )

    # 9. Deterministic Truncation & Priority Pruning
    total_discovered = len(raw_nodes)
    is_truncated = total_discovered > MAX_GRAPH_NODES
    pruned_by_type: dict[str, int] = defaultdict(int)

    if is_truncated:
        # Sort nodes by priority: campaign -> canary -> case -> ioc -> alert (critical first) -> source_ip -> etc.
        sorted_nodes = sorted(
            raw_nodes.values(),
            key=lambda n: (
                NODE_PRIORITY_MAP.get(n.type, 99),
                -SEVERITY_WEIGHTS.get((n.severity or "").lower(), 0),
                n.id,
            ),
        )
        selected_nodes = sorted_nodes[:MAX_GRAPH_NODES]
        pruned_nodes = sorted_nodes[MAX_GRAPH_NODES:]
        for pn in pruned_nodes:
            pruned_by_type[pn.type] += 1

        allowed_ids = {n.id for n in selected_nodes}
        # Keep only edges connecting allowed nodes
        valid_edges = [
            e for e in raw_edges
            if e.source in allowed_ids and e.target in allowed_ids
        ][:MAX_GRAPH_EDGES]
        rendered_nodes_list = selected_nodes
    else:
        rendered_nodes_list = list(raw_nodes.values())
        valid_edges = raw_edges[:MAX_GRAPH_EDGES]

    pruned_nodes_count = total_discovered - len(rendered_nodes_list)

    # 10. Summary
    highest_sev = campaign.severity
    for n in rendered_nodes_list:
        if SEVERITY_WEIGHTS.get((n.severity or "").lower(), 0) > SEVERITY_WEIGHTS.get(highest_sev.lower(), 0):
            highest_sev = n.severity or "medium"

    summary = GraphSummary(
        total_nodes=len(rendered_nodes_list),
        total_edges=len(valid_edges),
        stages_observed=len(tactics_observed),
        highest_severity=highest_sev,
        has_canary=bool(canaries),
        has_ioc=bool(iocs),
        has_cases=bool(cases),
    )

    truncation_meta = TruncationMeta(
        is_truncated=is_truncated,
        total_nodes_discovered=total_discovered,
        rendered_nodes=len(rendered_nodes_list),
        pruned_nodes_count=pruned_nodes_count,
        pruned_by_type=dict(pruned_by_type),
    )

    return CampaignGraphResponse(
        campaign_id=campaign.campaign_id,
        nodes=rendered_nodes_list,
        edges=valid_edges,
        summary=summary,
        truncation=truncation_meta,
    )
