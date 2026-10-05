"""Security Event Correlation Engine service for HoneyShield X (Module 2.8).

Operates across Attack containers to correlate activity by source IP within
configurable sliding time windows (1 <= window_hours <= 168).

Supported directives in priority order:
1. multi_vector: activity spanning multiple event/attack types (distinct vectors >= 2, events >= 2).
2. distributed_burst: activity distributed across multiple Attack containers (attacks >= 3, events >= 5).
3. persistent_attacker: repeated activity across attack containers (attacks >= 2, events >= 2).
4. none: below correlation thresholds.

Audit telemetry:
Meaningful correlation findings (confidence >= 0.7) are persisted to the existing
SystemEvent table with event_type="correlation_detected" and source="correlation_engine".
"""

from datetime import datetime, timedelta, timezone
import ipaddress
import logging
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Attack, AttackEvent, SystemEvent

logger = logging.getLogger(__name__)

# Configurable bounds for correlation window (in hours)
MIN_WINDOW_HOURS = 1
MAX_WINDOW_HOURS = 168
DEFAULT_WINDOW_HOURS = 24


def correlate_source_ip(
    db: Session,
    source_ip: str,
    window_hours: int = DEFAULT_WINDOW_HOURS,
) -> dict[str, Any]:
    """Correlate security events and attack containers for a given source IP.

    Args:
        db: SQLAlchemy database session.
        source_ip: Source IP address (IPv4 or IPv6) to analyze.
        window_hours: Sliding time window in hours (1-168).

    Returns:
        Structured correlation result dictionary.

    Raises:
        HTTPException(422): If source_ip is invalid or window_hours is out of bounds.
        HTTPException(500): On sanitized internal error.
    """
    # 1. Validate window_hours
    if not (MIN_WINDOW_HOURS <= window_hours <= MAX_WINDOW_HOURS):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_hours must be between {MIN_WINDOW_HOURS} and {MAX_WINDOW_HOURS}, got {window_hours}",
        )

    # 2. Validate source IP format using standard library ipaddress
    try:
        ipaddress.ip_address(source_ip)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid IP address: '{source_ip}'",
        )

    # 3. Calculate naive UTC sliding window cutoff
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now - timedelta(hours=window_hours)

    try:
        # 4. Query attack events matching source_ip within the window
        events_stmt = (
            select(AttackEvent)
            .join(Attack, AttackEvent.attack_id == Attack.id)
            .where(
                or_(
                    AttackEvent.source_ip == source_ip,
                    Attack.source_ip == source_ip,
                ),
                AttackEvent.event_time >= cutoff,
            )
            .order_by(AttackEvent.event_time.asc())
        )
        events = db.scalars(events_stmt).all()

        # 5. Query attack containers matching source_ip within the window
        attacks_stmt = (
            select(Attack)
            .where(
                Attack.source_ip == source_ip,
                Attack.detected_at >= cutoff,
            )
        )
        attacks = db.scalars(attacks_stmt).all()

        # 6. Aggregate unique attack container IDs
        attack_ids_set = set()
        for a in attacks:
            attack_ids_set.add(a.id)
        for e in events:
            attack_ids_set.add(e.attack_id)

        correlated_attack_ids = sorted(list(attack_ids_set))
        total_attacks = len(correlated_attack_ids)
        total_events = len(events)

        # 7. Collect distinct vectors observed
        if events:
            vectors = set(e.event_type for e in events if e.event_type)
        elif attacks:
            vectors = set(a.attack_type for a in attacks if a.attack_type)
        else:
            vectors = set()

        attack_types = sorted(list(vectors))
        distinct_vectors = len(attack_types)

        min_time = events[0].event_time if events else None
        max_time = events[-1].event_time if events else None

        # 8. Evaluate correlation directives (priority: multi_vector > distributed_burst > persistent_attacker > none)
        if distinct_vectors >= 2 and total_events >= 2:
            correlation_type = "multi_vector"
            correlated = True
            confidence = min(
                1.0,
                round(
                    0.70 + 0.10 * (distinct_vectors - 2) + 0.05 * min(total_events - 2, 4),
                    2,
                ),
            )
            reason = (
                f"Multi-vector activity detected from {source_ip}: {distinct_vectors} distinct vectors "
                f"({', '.join(attack_types)}) across {total_events} events"
            )
        elif total_attacks >= 3 and total_events >= 5:
            correlation_type = "distributed_burst"
            correlated = True
            confidence = min(
                1.0,
                round(
                    0.70 + 0.05 * (total_attacks - 3) + 0.05 * min(total_events - 5, 4),
                    2,
                ),
            )
            reason = (
                f"Distributed burst activity detected from {source_ip}: {total_events} events "
                f"distributed across {total_attacks} attack containers"
            )
        elif total_attacks >= 2 and total_events >= 2:
            correlation_type = "persistent_attacker"
            correlated = True
            confidence = min(
                1.0,
                round(
                    0.70 + 0.05 * (total_attacks - 2) + 0.03 * min(total_events - 2, 5),
                    2,
                ),
            )
            span_seconds = int((max_time - min_time).total_seconds()) if max_time and min_time else 0
            span_str = f"{span_seconds}s" if span_seconds < 3600 else f"{round(span_seconds / 3600.0, 1)}h"
            reason = (
                f"Persistent attacker activity detected from {source_ip}: {total_events} events "
                f"across {total_attacks} attack containers over {span_str}"
            )
        else:
            correlation_type = "none"
            correlated = False
            confidence = 0.0
            reason = (
                f"No correlation detected for {source_ip}: {total_events} events "
                f"across {total_attacks} attack containers below correlation thresholds"
            )

        # 9. Audit telemetry: record SystemEvent for high-confidence correlation (confidence >= 0.7)
        if confidence >= 0.7:
            audit_msg = (
                f"Correlation detected: source_ip={source_ip}, type={correlation_type}, "
                f"confidence={confidence:.2f}, attacks={total_attacks}, events={total_events}"
            )
            sys_event = SystemEvent(
                event_type="correlation_detected",
                source="correlation_engine",
                severity="high" if confidence >= 0.85 else "warning",
                message=audit_msg,
            )
            db.add(sys_event)
            db.commit()

        return {
            "source_ip": source_ip,
            "window_hours": window_hours,
            "total_attacks": total_attacks,
            "total_events": total_events,
            "attack_types": attack_types,
            "correlated": correlated,
            "correlation_type": correlation_type,
            "confidence": confidence,
            "correlated_attack_ids": correlated_attack_ids,
            "reason": reason,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Correlation analysis failed for source IP: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Correlation analysis failed due to an internal error",
        )


def correlate_attack(
    db: Session,
    attack_id: int,
    window_hours: int = DEFAULT_WINDOW_HOURS,
) -> dict[str, Any]:
    """Correlate security events across containers for the source IP of a given attack.

    Args:
        db: SQLAlchemy database session.
        attack_id: Primary key ID of the target Attack container.
        window_hours: Sliding time window in hours (1-168).

    Returns:
        Structured correlation result dictionary.

    Raises:
        HTTPException(404): If attack_id is not found.
        HTTPException(422): If window_hours is out of bounds.
    """
    if not (MIN_WINDOW_HOURS <= window_hours <= MAX_WINDOW_HOURS):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_hours must be between {MIN_WINDOW_HOURS} and {MAX_WINDOW_HOURS}, got {window_hours}",
        )

    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    if not attack.source_ip:
        return {
            "source_ip": "",
            "window_hours": window_hours,
            "total_attacks": 1,
            "total_events": 0,
            "attack_types": [attack.attack_type] if attack.attack_type else [],
            "correlated": False,
            "correlation_type": "none",
            "confidence": 0.0,
            "correlated_attack_ids": [attack.id],
            "reason": f"Attack #{attack_id} has no source IP for correlation",
        }

    result = correlate_source_ip(
        db=db,
        source_ip=attack.source_ip,
        window_hours=window_hours,
    )

    # Ensure target attack ID is accounted for in correlated_attack_ids if not already present
    if attack_id not in result["correlated_attack_ids"]:
        result["correlated_attack_ids"] = sorted(result["correlated_attack_ids"] + [attack_id])
        result["total_attacks"] = len(result["correlated_attack_ids"])

    return result
