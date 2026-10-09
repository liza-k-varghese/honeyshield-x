"""Deterministic Threat Intelligence Contextualizer (Module 3.8).

Provides:
- Non-authoritative advisory context for threat indicators and campaign clusters.
- Deterministic rule-based infrastructure analysis and threat actor hints.
- Explicit 'advisory=True' annotation: never controls Governor, HITL, or state transitions.
"""

from datetime import datetime, timezone
from typing import Any


class ThreatContextualizer:
    """Generates read-only, non-authoritative advisory context for SOC analysts."""

    @staticmethod
    def contextualize_indicator(indicator: dict[str, Any]) -> dict[str, Any]:
        """Derive contextual threat intelligence narrative for an indicator."""
        ind_type = indicator.get("indicator_type", "unknown")
        ind_val = indicator.get("indicator_value", "")
        source = indicator.get("source", "unknown")
        confidence = float(indicator.get("decayed_confidence", indicator.get("base_confidence", 0.5)))
        hit_count = int(indicator.get("hit_count", 1))
        campaign = indicator.get("campaign")
        tags = indicator.get("tags", [])

        # Deterministic assessment heuristics
        assessment_points: list[str] = []
        if source == "canary_tripwire":
            assessment_points.append(
                "High-confidence tripwire interaction: entity engaged with an inert synthetic decoy credential."
            )
        elif source == "honeypot_trap":
            assessment_points.append(
                "Direct honeypot interaction: entity performed suspicious scans or exploits against instrumented traps."
            )
        elif source == "incident_case":
            assessment_points.append(
                "Forensic case observable: entity was curated and confirmed malicious by a SOC incident responder."
            )

        if hit_count > 5:
            assessment_points.append(
                f"Persistent automated scanner pattern: observed across {hit_count} distinct intrusion encounters."
            )
        elif hit_count > 1:
            assessment_points.append(f"Repeat adversary probe: observed {hit_count} times.")
        else:
            assessment_points.append("Single encounter observed to date.")

        if campaign:
            assessment_points.append(f"Associated with tracked campaign cluster '{campaign}'.")

        if confidence >= 0.85:
            threat_posture = "Critical - Immediate perimeter mitigation candidate."
        elif confidence >= 0.65:
            threat_posture = "High - Active threat requiring prioritized investigation."
        elif confidence >= 0.40:
            threat_posture = "Medium - Decaying/historical indicator under passive monitoring."
        else:
            threat_posture = "Low - Stale or low-confidence indicator approaching retirement."

        narrative = " ".join(assessment_points)

        return {
            "advisory": True,
            "authoritative": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "indicator_value": ind_val,
            "indicator_type": ind_type,
            "threat_posture": threat_posture,
            "narrative": narrative,
            "tags_annotated": tags,
            "recommended_actions": [
                "Review associated honeypot alerts and attack graphs.",
                "Export to firewall External Dynamic List (EDL) if confidence >= 0.70.",
                "Correlate against internal DNS and proxy logs for lateral movement.",
            ],
        }

    @staticmethod
    def contextualize_campaign(campaign: dict[str, Any], indicators: list[dict[str, Any]]) -> dict[str, Any]:
        """Derive advisory campaign infrastructure summary."""
        c_name = campaign.get("name", "Unknown Campaign")
        ind_count = len(indicators)
        types = list({ind.get("indicator_type", "unknown") for ind in indicators})
        avg_conf = (
            sum(float(ind.get("decayed_confidence", ind.get("base_confidence", 0.5))) for ind in indicators) / ind_count
            if ind_count > 0
            else 0.0
        )

        insights = [
            f"Campaign '{c_name}' spans {ind_count} observable infrastructure assets across {len(types)} indicator types ({', '.join(types)}).",
            f"Aggregate confidence score is {round(avg_conf, 2)}.",
        ]

        if "canary_token" in types or any("canary_hit" in (ind.get("tags") or []) for ind in indicators):
            insights.append("Campaign has triggered active canary honeytokens.")

        return {
            "advisory": True,
            "authoritative": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "campaign_id": campaign.get("campaign_id"),
            "campaign_name": c_name,
            "insights": insights,
            "recommendation": "Maintain edge blocking on active indicators; observe lateral movement on honeypot sensors.",
        }


# Global Singleton Contextualizer
threat_contextualizer = ThreatContextualizer()
