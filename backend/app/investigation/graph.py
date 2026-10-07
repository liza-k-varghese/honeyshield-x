"""Pure derived read-model graph generator for HoneyShield X (Module 3.2).

Transforms chronological Attack and AttackEvent records into a structured
Directed Acyclic Graph (DAG) mapped to MITRE ATT&CK stages on-the-fly.
Zero database writes or persistent graph storage.
"""

from datetime import datetime
from typing import Any

from app.investigation.mitre import (
    TACTIC_KILLCHAIN_ORDER,
    map_event_to_mitre,
    map_rule_to_mitre,
)
from app.models import Alert, Attack, AttackEvent


SEVERITY_WEIGHTS: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}


def _higher_severity(sev1: str, sev2: str) -> str:
    """Return the higher of two severity strings."""
    w1 = SEVERITY_WEIGHTS.get(sev1.lower(), 1)
    w2 = SEVERITY_WEIGHTS.get(sev2.lower(), 1)
    return sev1.lower() if w1 >= w2 else sev2.lower()


def build_attack_graph(
    entity_id: str,
    entity_type: str,
    events: list[AttackEvent],
    alerts: list[Alert],
    attack: Attack | None = None,
    threat_intel: dict[str, Any] | None = None,
    rules_triggered: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Derive an Attack-Chain DAG read-model from existing security events.

    Guarantees:
    - Max 50 nodes
    - Deterministic sorting by kill-chain order and timestamp
    - Pure in-memory computation
    - Safe string handling (zero code execution)
    """
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    # 1. Attacker Entity Node
    source_ip = attack.source_ip if attack else entity_id
    base_severity = attack.severity if attack else "low"
    base_risk = attack.risk_score if attack else 0.0

    entity_meta: dict[str, Any] = {
        "entity_type": entity_type,
        "source_ip": source_ip,
    }
    if attack:
        entity_meta["destination_ip"] = attack.destination_ip
        entity_meta["protocol"] = attack.protocol
        entity_meta["attack_type"] = attack.attack_type

    if threat_intel and threat_intel.get("found"):
        entity_meta["threat_level"] = threat_intel.get("threat_level")
        entity_meta["threat_source"] = threat_intel.get("source")
        entity_meta["threat_confidence"] = threat_intel.get("confidence")
        if threat_intel.get("threat_level") in ("high", "critical"):
            base_severity = _higher_severity(base_severity, threat_intel.get("threat_level", "low"))

    entity_node_id = f"node-entity-{source_ip or 'unknown'}"
    nodes.append(
        {
            "id": entity_node_id,
            "type": "entity",
            "label": source_ip or "Attacker IP",
            "stage": "Attacker Entity",
            "tactic_id": None,
            "technique_id": None,
            "technique_name": None,
            "severity": base_severity,
            "risk_score": round(base_risk, 1),
            "event_count": len(events),
            "evidence_ids": [e.id for e in events[:20]],
            "first_seen": events[0].event_time if events else None,
            "last_seen": events[-1].event_time if events else None,
            "metadata": entity_meta,
        }
    )

    # 2. Stage grouping by MITRE Tactic
    # Index triggered rules by their rule_id
    triggered_map: dict[str, dict[str, Any]] = {}
    if rules_triggered:
        for r in rules_triggered:
            triggered_map[r.get("rule_id", "")] = r

    # Group events by tactic
    stage_events: dict[str, list[AttackEvent]] = {}
    stage_techniques: dict[str, dict[str, Any]] = {}

    for event in events:
        mapping = map_event_to_mitre(event.event_type)
        tactic_id = mapping.tactic_id

        if tactic_id not in stage_events:
            stage_events[tactic_id] = []
            stage_techniques[tactic_id] = {
                "tactic_name": mapping.tactic_name,
                "technique_id": mapping.technique_id,
                "technique_name": mapping.technique_name,
                "severity": "low",
                "rules": [],
            }

        stage_events[tactic_id].append(event)

    # Enhance stage techniques with triggered rules
    for rule_id, rule_data in triggered_map.items():
        rule_mapping = map_rule_to_mitre(rule_id)
        if rule_mapping:
            tid = rule_mapping.tactic_id
            if tid not in stage_techniques:
                stage_techniques[tid] = {
                    "tactic_name": rule_mapping.tactic_name,
                    "technique_id": rule_mapping.technique_id,
                    "technique_name": rule_mapping.technique_name,
                    "severity": rule_data.get("severity", "medium"),
                    "rules": [rule_id],
                }
                stage_events[tid] = []
            else:
                stage_techniques[tid]["rules"].append(rule_id)
                stage_techniques[tid]["severity"] = _higher_severity(
                    stage_techniques[tid]["severity"],
                    rule_data.get("severity", "medium"),
                )

    # Sort active tactics by canonical Kill-Chain order
    sorted_tactics = sorted(
        stage_techniques.keys(),
        key=lambda tid: TACTIC_KILLCHAIN_ORDER.get(tid, 99),
    )

    # Create stage nodes
    stage_node_ids: list[str] = []
    has_execution = False

    for tid in sorted_tactics:
        tech_info = stage_techniques[tid]
        ev_list = stage_events.get(tid, [])
        ev_count = len(ev_list)

        if tid == "TA0002":
            has_execution = True

        stage_first_seen = ev_list[0].event_time if ev_list else None
        stage_last_seen = ev_list[-1].event_time if ev_list else None

        node_id = f"node-stage-{tid}"
        stage_node_ids.append(node_id)

        # Determine stage severity
        stage_sev = tech_info["severity"]
        if tid in ("TA0001", "TA0002") and stage_sev in ("low", "info"):
            stage_sev = "high"

        nodes.append(
            {
                "id": node_id,
                "type": "tactic_stage",
                "label": tech_info["tactic_name"],
                "stage": tech_info["tactic_name"],
                "tactic_id": tid,
                "technique_id": tech_info["technique_id"],
                "technique_name": tech_info["technique_name"],
                "severity": stage_sev,
                "risk_score": None,
                "event_count": ev_count,
                "evidence_ids": [e.id for e in ev_list[:30]],
                "first_seen": stage_first_seen,
                "last_seen": stage_last_seen,
                "metadata": {
                    "matched_rules": tech_info["rules"],
                    "tactic_order": TACTIC_KILLCHAIN_ORDER.get(tid, 99),
                },
            }
        )

    # 3. Alert Nodes (max 3 alerts to bound node count)
    alert_node_ids: list[str] = []
    for alert in alerts[:3]:
        alert_node_id = f"node-alert-{alert.id}"
        alert_node_ids.append(alert_node_id)
        nodes.append(
            {
                "id": alert_node_id,
                "type": "alert",
                "label": f"Alert: {alert.alert_type}",
                "stage": "Alert & Impact",
                "tactic_id": None,
                "technique_id": None,
                "technique_name": None,
                "severity": alert.severity,
                "risk_score": None,
                "event_count": 0,
                "evidence_ids": [],
                "first_seen": alert.created_at,
                "last_seen": alert.created_at,
                "metadata": {
                    "alert_id": alert.id,
                    "status": alert.status,
                    "message": alert.message,
                },
            }
        )

    # Enforce maximum 50 nodes limit
    if len(nodes) > 50:
        nodes = nodes[:50]

    # 4. Construct Edges
    # Edge from Entity -> First Stage
    if stage_node_ids:
        edges.append(
            {
                "id": f"edge-entity-{stage_node_ids[0]}",
                "source": entity_node_id,
                "target": stage_node_ids[0],
                "label": "Inbound Probing",
                "transition_type": "chronological",
            }
        )

        # Edges between consecutive stages
        for i in range(len(stage_node_ids) - 1):
            src_id = stage_node_ids[i]
            dst_id = stage_node_ids[i + 1]
            edges.append(
                {
                    "id": f"edge-progression-{i}",
                    "source": src_id,
                    "target": dst_id,
                    "label": "Escalated Stage",
                    "transition_type": "escalation",
                }
            )

        # Edges from last stage to Alert nodes
        last_stage_id = stage_node_ids[-1]
        for a_id in alert_node_ids:
            edges.append(
                {
                    "id": f"edge-alert-{a_id}",
                    "source": last_stage_id,
                    "target": a_id,
                    "label": "Triggered Alert",
                    "transition_type": "impact",
                }
            )
    elif alert_node_ids:
        # If no stages detected, connect entity directly to alerts
        for a_id in alert_node_ids:
            edges.append(
                {
                    "id": f"edge-direct-alert-{a_id}",
                    "source": entity_node_id,
                    "target": a_id,
                    "label": "Generated Alert",
                    "transition_type": "impact",
                }
            )

    # 5. Graph Summary
    highest_sev = base_severity
    for n in nodes:
        highest_sev = _higher_severity(highest_sev, n.get("severity", "low"))

    summary = {
        "stages_observed": len(stage_node_ids),
        "total_events": len(events),
        "highest_severity": highest_sev,
        "has_execution": has_execution,
        "risk_score": round(base_risk, 1),
    }

    return {
        "entity_id": entity_id,
        "entity_type": entity_type,
        "nodes": nodes,
        "edges": edges,
        "summary": summary,
    }
