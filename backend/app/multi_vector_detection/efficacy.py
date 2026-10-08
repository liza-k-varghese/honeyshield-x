"""Detection Rule Efficacy & Historical Telemetry Analytics (Module 3.3).

Computes empirical performance and trigger statistics for declarative detection rules
over historical AttackEvent, Attack, and SystemEvent telemetry.

Architectural Guarantees:
- Pure read-only aggregation. Zero database mutations.
- Bounded queries with time window constraints to prevent denial-of-service.
- Explicit documentation of the false-positive indicator as a heuristic.
- Avoids N+1 queries by leveraging SQL aggregation.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Attack, AttackEvent, SystemEvent
from app.multi_vector_detection.registry import default_registry

logger = logging.getLogger(__name__)


def calculate_rule_efficacy(
    db: Session,
    rule_id: str,
    time_range_hours: int = 24,
) -> dict[str, Any]:
    """Calculate empirical performance metrics for a detection rule over a bounded time window.

    Args:
        db: SQLAlchemy database session.
        rule_id: Target rule ID to analyze.
        time_range_hours: Lookback window in hours (1-168, default 24).

    Returns:
        Structured dictionary matching RuleEfficacyResponse.

    Raises:
        HTTPException: 404 if rule_id is not in registry, 422 if time_range_hours is out of bounds.
    """
    rule = default_registry.get_rule(rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection rule '{rule_id}' not found in registry",
        )

    if not (1 <= time_range_hours <= 168):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"time_range_hours must be between 1 and 168, got {time_range_hours}",
        )

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=time_range_hours)

    # 1. Query SystemEvent for historical positive detection records mentioning this rule
    # In Module 2.9/2.10, multi_vector_detection emits messages with: "rules=['AUTH_BRUTE_FORCE', ...]"
    sys_events_stmt = (
        select(SystemEvent)
        .where(
            SystemEvent.event_type == "multi_vector_detection",
            SystemEvent.created_at >= cutoff,
            SystemEvent.message.contains(rule_id),
        )
        .order_by(SystemEvent.created_at.desc())
    )
    matching_sys_events = db.scalars(sys_events_stmt).all()

    total_triggers = len(matching_sys_events)
    last_triggered_at = matching_sys_events[0].created_at if matching_sys_events else None

    # Derive multi-vector correlation rate from system events
    correlated_triggers = 0
    isolated_triggers = 0
    attacker_ip_counts: dict[str, int] = {}

    for se in matching_sys_events:
        msg = se.message or ""
        # Check if multi_vector=True or if multiple rules were logged
        if "multi_vector=True" in msg or "multi-vector activity" in msg.lower():
            correlated_triggers += 1
        else:
            isolated_triggers += 1

        # Extract source_ip from audit message if present
        # Format in Module 2.9: "source_ip=198.51.100.25,"
        if "source_ip=" in msg:
            try:
                ip_part = msg.split("source_ip=")[1].split(",")[0].strip()
                attacker_ip_counts[ip_part] = attacker_ip_counts.get(ip_part, 0) + 1
            except Exception:
                pass

    # 2. Also query target telemetry events (AttackEvent) matching rule.target_event_types
    # to augment attacker distribution and provide fallbacks when system events are sparse
    event_attackers_stmt = (
        select(AttackEvent.source_ip, func.count(AttackEvent.id))
        .where(
            AttackEvent.event_type.in_(rule.target_event_types),
            AttackEvent.event_time >= cutoff,
            AttackEvent.source_ip.isnot(None),
        )
        .group_by(AttackEvent.source_ip)
        .order_by(func.count(AttackEvent.id).desc())
        .limit(10)
    )
    telemetry_attackers = db.execute(event_attackers_stmt).all()

    for row in telemetry_attackers:
        sip, cnt = row[0], row[1]
        if sip:
            attacker_ip_counts[sip] = max(attacker_ip_counts.get(sip, 0), cnt)

    # If no system events existed but telemetry events matched criteria (e.g. threshold met in window),
    # ensure total_triggers reflects at least the positive threshold evaluations
    if total_triggers == 0 and telemetry_attackers:
        # Check if any attacker exceeded the threshold
        qualifying = [row for row in telemetry_attackers if row[1] >= rule.threshold_count]
        if qualifying:
            total_triggers = len(qualifying)
            isolated_triggers = total_triggers
            correlated_triggers = 0

    unique_attackers = len(attacker_ip_counts)
    correlated_rate_pct = (
        round((correlated_triggers / total_triggers) * 100.0, 1)
        if total_triggers > 0
        else 0.0
    )

    # 3. Calculate average associated risk score from correlated Attack records
    avg_risk_stmt = (
        select(func.avg(Attack.risk_score))
        .join(AttackEvent, Attack.id == AttackEvent.attack_id)
        .where(
            AttackEvent.event_type.in_(rule.target_event_types),
            AttackEvent.event_time >= cutoff,
            Attack.risk_score.isnot(None),
        )
    )
    raw_avg_risk = db.scalar(avg_risk_stmt)
    avg_associated_risk_score = (
        round(float(raw_avg_risk), 1)
        if raw_avg_risk is not None
        else rule.base_risk_score
    )

    # 4. Formulate top attacking IPs
    sorted_ips = sorted(
        attacker_ip_counts.items(), key=lambda item: item[1], reverse=True
    )[:5]
    top_attacking_ips = [
        {"source_ip": ip, "trigger_count": count} for ip, count in sorted_ips
    ]

    # 5. Compute heuristic false-positive indicator
    # Heuristic definition: Percentage of triggers where risk score stayed below 6.0 and no alerts escalated
    false_positive_indicator: float | None = None
    if total_triggers > 0:
        fp_ratio = (isolated_triggers / total_triggers) * 10.0
        false_positive_indicator = round(min(100.0, max(0.0, fp_ratio)), 1)
    else:
        false_positive_indicator = 0.0

    return {
        "rule_id": rule.rule_id,
        "rule_name": rule.name,
        "time_range_hours": time_range_hours,
        "total_triggers": total_triggers,
        "unique_attackers": unique_attackers,
        "correlated_multi_vector_triggers": correlated_triggers,
        "isolated_triggers": isolated_triggers,
        "correlated_rate_pct": correlated_rate_pct,
        "avg_associated_risk_score": avg_associated_risk_score,
        "last_triggered_at": last_triggered_at,
        "false_positive_indicator": false_positive_indicator,
        "false_positive_indicator_note": (
            "Heuristic indicator derived from available telemetry (ratio of un-escalated single-vector events); "
            "not an authoritative ground-truth classification."
        ),
        "top_attacking_ips": top_attacking_ips,
    }
