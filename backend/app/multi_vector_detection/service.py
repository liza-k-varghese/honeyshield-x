"""Multi-Vector Detection Engine & Vector Classifier service (Module 2.9).

Evaluates declarative detection rules across canonical vectors (auth, web, network)
at both attack-container scope and entity (source IP) scope.

Guarantees:
- Database-side SQL aggregation for threshold rules (O(1) memory).
- Bounded payload inspection for signature rules (LIMIT 200, 4KB truncation).
- Deterministic multi-vector synthesis (len(vectors) >= 2).
- Zero modifications to frozen Modules 2.1 - 2.8.
- Audit telemetry recording in SystemEvent table for positive detections.
"""

from datetime import datetime, timedelta, timezone
import ipaddress
import logging
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Attack, AttackEvent, SystemEvent
from app.multi_vector_detection.models import (
    DEFAULT_WINDOW_MINUTES,
    MAX_PAYLOAD_EVENTS,
    MAX_SCAN_LENGTH,
    MAX_WINDOW_MINUTES,
    MIN_WINDOW_MINUTES,
    DetectionRule,
    TriggeredRule,
)
from app.multi_vector_detection.registry import default_registry

logger = logging.getLogger(__name__)

SEVERITY_ORDER: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def scan_payload(payload: str | None, rule: DetectionRule) -> list[str]:
    """Inspect event payload safely against rule tokens and regexes with bounded input."""
    if not payload:
        return []

    # 1. Enforce strict input truncation to prevent ReDoS / CPU spike
    truncated = payload[:MAX_SCAN_LENGTH]
    lower_payload = truncated.lower()
    matches: list[str] = []

    # 2. Fast substring matching
    for token in rule.match_tokens:
        if token.lower() in lower_payload:
            matches.append(token)

    # 3. Linear non-backtracking regex scanning
    for pattern in rule.regex_patterns:
        m = pattern.search(truncated)
        if m:
            matched_val = m.group(0).strip()[:64]
            if matched_val and matched_val not in matches:
                matches.append(matched_val)

    return matches


def evaluate_attack_rules(
    db: Session,
    attack_id: int,
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
) -> dict[str, Any]:
    """Evaluate detection rules against events within a single Attack container.

    Args:
        db: SQLAlchemy database session.
        attack_id: Target attack ID to analyze.
        window_minutes: Sliding time window in minutes (1-60).

    Returns:
        Structured MultiVectorDetectionResponse dictionary.

    Raises:
        HTTPException(404): If attack_id does not exist.
        HTTPException(422): If window_minutes is out of bounds.
    """
    if not (MIN_WINDOW_MINUTES <= window_minutes <= MAX_WINDOW_MINUTES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_minutes must be between {MIN_WINDOW_MINUTES} and {MAX_WINDOW_MINUTES}, got {window_minutes}",
        )

    attack = db.get(Attack, attack_id)
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack {attack_id} not found",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_cutoff = now - timedelta(minutes=window_minutes)

    # Total events in the window for this attack
    total_events = (
        db.scalar(
            select(func.count(AttackEvent.id)).where(
                AttackEvent.attack_id == attack_id,
                AttackEvent.event_time >= window_cutoff,
            )
        )
        or 0
    )

    all_rules = default_registry.get_all_rules()
    triggered_rules: list[TriggeredRule] = []

    # 1. Evaluate Threshold Rules via SQL Aggregation
    threshold_rules = [r for r in all_rules if r.rule_type == "threshold"]
    for rule in threshold_rules:
        rule_cutoff = now - timedelta(minutes=min(window_minutes, rule.window_minutes))
        if rule.rule_id == "PORT_SCAN_SWEEP":
            count = (
                db.scalar(
                    select(func.count(func.distinct(AttackEvent.message))).where(
                        AttackEvent.attack_id == attack_id,
                        AttackEvent.event_type.in_(rule.target_event_types),
                        AttackEvent.event_time >= rule_cutoff,
                        AttackEvent.message.isnot(None),
                    )
                )
                or 0
            )
        else:
            count = (
                db.scalar(
                    select(func.count(AttackEvent.id)).where(
                        AttackEvent.attack_id == attack_id,
                        AttackEvent.event_type.in_(rule.target_event_types),
                        AttackEvent.event_time >= rule_cutoff,
                    )
                )
                or 0
            )

        if count >= rule.threshold_count:
            triggered_rules.append(
                TriggeredRule(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    vector=rule.vector,
                    severity=rule.severity,
                    risk_score=rule.base_risk_score,
                    evidence_count=count,
                    matched_patterns=[],
                    description=f"{count} evidence events observed for {rule.name} (threshold: {rule.threshold_count})",
                )
            )

    # 2. Evaluate Signature Rules on Bounded Payload Subset
    sig_rules = [r for r in all_rules if r.rule_type == "signature"]
    sig_event_types = tuple(set(t for r in sig_rules for t in r.target_event_types))

    total_sig_events = (
        db.scalar(
            select(func.count(AttackEvent.id)).where(
                AttackEvent.attack_id == attack_id,
                AttackEvent.event_type.in_(sig_event_types),
                AttackEvent.event_time >= window_cutoff,
                AttackEvent.message.isnot(None),
            )
        )
        or 0
    )

    sig_events = db.scalars(
        select(AttackEvent)
        .where(
            AttackEvent.attack_id == attack_id,
            AttackEvent.event_type.in_(sig_event_types),
            AttackEvent.event_time >= window_cutoff,
            AttackEvent.message.isnot(None),
        )
        .order_by(AttackEvent.event_time.desc())
        .limit(MAX_PAYLOAD_EVENTS)
    ).all()

    truncated = total_sig_events > MAX_PAYLOAD_EVENTS
    if truncated:
        analyzed_event_count = max(0, total_events - (total_sig_events - MAX_PAYLOAD_EVENTS))
    else:
        analyzed_event_count = total_events

    for rule in sig_rules:
        matched_count = 0
        matched_patterns_set: set[str] = set()

        for event in sig_events:
            if event.event_type in rule.target_event_types:
                matches = scan_payload(event.message, rule)
                if matches:
                    matched_count += 1
                    matched_patterns_set.update(matches)

        if matched_count >= rule.threshold_count:
            triggered_rules.append(
                TriggeredRule(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    vector=rule.vector,
                    severity=rule.severity,
                    risk_score=rule.base_risk_score,
                    evidence_count=matched_count,
                    matched_patterns=sorted(list(matched_patterns_set))[:10],
                    description=f"{matched_count} matching payloads for {rule.name}",
                )
            )

    # 3. Synthesize Multi-Vector Results
    detected = len(triggered_rules) > 0
    vectors_detected = sorted(list(set(r.vector for r in triggered_rules)))
    is_multi_vector = len(vectors_detected) >= 2

    if detected:
        highest_severity = max(
            (r.severity for r in triggered_rules),
            key=lambda s: SEVERITY_ORDER.get(s, 0),
        )
        max_base_risk = max(r.risk_score for r in triggered_rules)
        suggested_risk_score = min(
            10.0,
            round(max_base_risk + (0.5 if is_multi_vector else 0.0), 1),
        )
        if is_multi_vector:
            message = (
                f"Multi-vector attack detected for attack {attack_id}: {len(vectors_detected)} "
                f"vectors ({', '.join(vectors_detected)}) with {len(triggered_rules)} rules triggered"
            )
        else:
            message = (
                f"Single-vector detection for attack {attack_id}: vector '{vectors_detected[0]}' "
                f"with {len(triggered_rules)} rules triggered"
            )

        # Audit telemetry: record SystemEvent for positive detection
        audit_msg = (
            f"Multi-vector detection: attack_id={attack_id}, multi_vector={is_multi_vector}, "
            f"vectors={vectors_detected}, rules={[r.rule_id for r in triggered_rules]}, "
            f"score={suggested_risk_score}"
        )
        sys_event = SystemEvent(
            event_type="multi_vector_detection",
            source="multi_vector_detection_engine",
            severity=highest_severity,
            message=audit_msg,
        )
        db.add(sys_event)
        db.commit()
    else:
        highest_severity = "low"
        suggested_risk_score = 0.0
        message = f"No detection rules triggered for attack {attack_id} within {window_minutes}m window"

    return {
        "detected": detected,
        "is_multi_vector": is_multi_vector,
        "vectors_detected": vectors_detected,
        "rules_triggered": [r.to_dict() for r in triggered_rules],
        "suggested_risk_score": suggested_risk_score,
        "severity": highest_severity,
        "analyzed_event_count": analyzed_event_count,
        "total_event_count": total_events,
        "truncated": truncated,
        "message": message,
        "attack_id": attack_id,
        "source_ip": attack.source_ip,
        "window_minutes": window_minutes,
        "attack_ids": [attack_id],
    }


def evaluate_ip_rules(
    db: Session,
    source_ip: str,
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
) -> dict[str, Any]:
    """Evaluate detection rules across all events for a given source IP.

    Args:
        db: SQLAlchemy database session.
        source_ip: Source IP address (IPv4 or IPv6) to analyze.
        window_minutes: Sliding time window in minutes (1-60).

    Returns:
        Structured MultiVectorDetectionResponse dictionary.

    Raises:
        HTTPException(422): If source_ip is invalid or window_minutes is out of bounds.
    """
    if not (MIN_WINDOW_MINUTES <= window_minutes <= MAX_WINDOW_MINUTES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_minutes must be between {MIN_WINDOW_MINUTES} and {MAX_WINDOW_MINUTES}, got {window_minutes}",
        )

    try:
        ipaddress.ip_address(source_ip)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid IP address: '{source_ip}'",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_cutoff = now - timedelta(minutes=window_minutes)

    # Collect associated attack IDs
    attacks_stmt = select(Attack.id).where(
        Attack.source_ip == source_ip,
        Attack.detected_at >= window_cutoff,
    )
    attack_ids_set = set(db.scalars(attacks_stmt).all())

    event_attacks_stmt = (
        select(AttackEvent.attack_id)
        .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
        .where(
            or_(
                AttackEvent.source_ip == source_ip,
                Attack.source_ip == source_ip,
            ),
            AttackEvent.event_time >= window_cutoff,
        )
    )
    for aid in db.scalars(event_attacks_stmt).all():
        if aid is not None:
            attack_ids_set.add(aid)

    correlated_attack_ids = sorted(list(attack_ids_set))

    # Total events in window for this source IP
    total_events_stmt = (
        select(func.count(AttackEvent.id))
        .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
        .where(
            or_(
                AttackEvent.source_ip == source_ip,
                Attack.source_ip == source_ip,
            ),
            AttackEvent.event_time >= window_cutoff,
        )
    )
    total_events = db.scalar(total_events_stmt) or 0

    all_rules = default_registry.get_all_rules()
    triggered_rules: list[TriggeredRule] = []

    # 1. Evaluate Threshold Rules for IP via SQL Aggregation
    threshold_rules = [r for r in all_rules if r.rule_type == "threshold"]
    for rule in threshold_rules:
        rule_cutoff = now - timedelta(minutes=min(window_minutes, rule.window_minutes))
        if rule.rule_id == "PORT_SCAN_SWEEP":
            count = (
                db.scalar(
                    select(func.count(func.distinct(AttackEvent.message)))
                    .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
                    .where(
                        or_(
                            AttackEvent.source_ip == source_ip,
                            Attack.source_ip == source_ip,
                        ),
                        AttackEvent.event_type.in_(rule.target_event_types),
                        AttackEvent.event_time >= rule_cutoff,
                        AttackEvent.message.isnot(None),
                    )
                )
                or 0
            )
        else:
            count = (
                db.scalar(
                    select(func.count(AttackEvent.id))
                    .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
                    .where(
                        or_(
                            AttackEvent.source_ip == source_ip,
                            Attack.source_ip == source_ip,
                        ),
                        AttackEvent.event_type.in_(rule.target_event_types),
                        AttackEvent.event_time >= rule_cutoff,
                    )
                )
                or 0
            )

        if count >= rule.threshold_count:
            triggered_rules.append(
                TriggeredRule(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    vector=rule.vector,
                    severity=rule.severity,
                    risk_score=rule.base_risk_score,
                    evidence_count=count,
                    matched_patterns=[],
                    description=f"{count} evidence events observed for {rule.name} (threshold: {rule.threshold_count})",
                )
            )

    # 2. Evaluate Signature Rules for IP on Bounded Payload Subset
    sig_rules = [r for r in all_rules if r.rule_type == "signature"]
    sig_event_types = tuple(set(t for r in sig_rules for t in r.target_event_types))

    total_sig_events = (
        db.scalar(
            select(func.count(AttackEvent.id))
            .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
            .where(
                or_(
                    AttackEvent.source_ip == source_ip,
                    Attack.source_ip == source_ip,
                ),
                AttackEvent.event_type.in_(sig_event_types),
                AttackEvent.event_time >= window_cutoff,
                AttackEvent.message.isnot(None),
            )
        )
        or 0
    )

    sig_events = db.scalars(
        select(AttackEvent)
        .outerjoin(Attack, AttackEvent.attack_id == Attack.id)
        .where(
            or_(
                AttackEvent.source_ip == source_ip,
                Attack.source_ip == source_ip,
            ),
            AttackEvent.event_type.in_(sig_event_types),
            AttackEvent.event_time >= window_cutoff,
            AttackEvent.message.isnot(None),
        )
        .order_by(AttackEvent.event_time.desc())
        .limit(MAX_PAYLOAD_EVENTS)
    ).all()

    truncated = total_sig_events > MAX_PAYLOAD_EVENTS
    if truncated:
        analyzed_event_count = max(0, total_events - (total_sig_events - MAX_PAYLOAD_EVENTS))
    else:
        analyzed_event_count = total_events

    for rule in sig_rules:
        matched_count = 0
        matched_patterns_set: set[str] = set()

        for event in sig_events:
            if event.event_type in rule.target_event_types:
                matches = scan_payload(event.message, rule)
                if matches:
                    matched_count += 1
                    matched_patterns_set.update(matches)

        if matched_count >= rule.threshold_count:
            triggered_rules.append(
                TriggeredRule(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    vector=rule.vector,
                    severity=rule.severity,
                    risk_score=rule.base_risk_score,
                    evidence_count=matched_count,
                    matched_patterns=sorted(list(matched_patterns_set))[:10],
                    description=f"{matched_count} matching payloads for {rule.name}",
                )
            )

    # 3. Synthesize Multi-Vector Results
    detected = len(triggered_rules) > 0
    vectors_detected = sorted(list(set(r.vector for r in triggered_rules)))
    is_multi_vector = len(vectors_detected) >= 2

    if detected:
        highest_severity = max(
            (r.severity for r in triggered_rules),
            key=lambda s: SEVERITY_ORDER.get(s, 0),
        )
        max_base_risk = max(r.risk_score for r in triggered_rules)
        suggested_risk_score = min(
            10.0,
            round(max_base_risk + (0.5 if is_multi_vector else 0.0), 1),
        )
        if is_multi_vector:
            message = (
                f"Multi-vector activity detected from {source_ip}: {len(vectors_detected)} "
                f"vectors ({', '.join(vectors_detected)}) with {len(triggered_rules)} rules triggered"
            )
        else:
            message = (
                f"Single-vector activity detected from {source_ip}: vector '{vectors_detected[0]}' "
                f"with {len(triggered_rules)} rules triggered"
            )

        # Audit telemetry: record SystemEvent for positive detection
        audit_msg = (
            f"Multi-vector detection: source_ip={source_ip}, multi_vector={is_multi_vector}, "
            f"vectors={vectors_detected}, rules={[r.rule_id for r in triggered_rules]}, "
            f"score={suggested_risk_score}"
        )
        sys_event = SystemEvent(
            event_type="multi_vector_detection",
            source="multi_vector_detection_engine",
            severity=highest_severity,
            message=audit_msg,
        )
        db.add(sys_event)
        db.commit()
    else:
        highest_severity = "low"
        suggested_risk_score = 0.0
        message = f"No detection rules triggered for {source_ip} within {window_minutes}m window"

    return {
        "detected": detected,
        "is_multi_vector": is_multi_vector,
        "vectors_detected": vectors_detected,
        "rules_triggered": [r.to_dict() for r in triggered_rules],
        "suggested_risk_score": suggested_risk_score,
        "severity": highest_severity,
        "analyzed_event_count": analyzed_event_count,
        "total_event_count": total_events,
        "truncated": truncated,
        "message": message,
        "attack_id": None,
        "source_ip": source_ip,
        "window_minutes": window_minutes,
        "attack_ids": correlated_attack_ids,
    }
