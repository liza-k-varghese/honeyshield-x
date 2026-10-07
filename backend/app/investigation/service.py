"""Investigation service for HoneyShield X (Module 3.2).

Aggregates Threat Intelligence, Cross-Attack Correlation, Multi-Vector Detection,
and Attack-Chain Graph projections without duplicating Phase 2 logic or modifying frozen schemas.
"""

from datetime import datetime, timedelta, timezone
import ipaddress
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.correlation.service import correlate_source_ip
from app.investigation.graph import build_attack_graph
from app.investigation.mitre import map_event_to_mitre
from app.models import Alert, Attack, AttackEvent
from app.multi_vector_detection.service import evaluate_attack_rules, evaluate_ip_rules
from app.threat_intelligence.service import lookup_indicator


def validate_ip_address(ip_str: str) -> str:
    """Validate that a string is a valid IPv4 or IPv6 address.

    Raises HTTPException 422 if invalid.
    """
    cleaned = ip_str.strip()
    try:
        ipaddress.ip_address(cleaned)
        return cleaned
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid IP address format: '{ip_str}'",
        )


def get_ip_dossier(
    db: Session,
    source_ip: str,
    window_hours: int = 24,
) -> dict[str, Any]:
    """Compile a comprehensive Attacker Entity Dossier for a source IP."""
    valid_ip = validate_ip_address(source_ip)
    wh = window_hours if isinstance(window_hours, int) else int(getattr(window_hours, "default", 24))
    window_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=wh)

    # 1. Fetch attacks associated with source_ip
    attacks_stmt = (
        select(Attack)
        .where(
            Attack.source_ip == valid_ip,
            Attack.detected_at >= window_start,
        )
        .order_by(Attack.detected_at.desc())
    )
    attacks = list(db.scalars(attacks_stmt).all())
    attack_ids = [a.id for a in attacks]
    attack_types = list({a.attack_type for a in attacks})

    # First and last seen across attacks
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    highest_severity = "low"
    highest_risk_score = 0.0

    if attacks:
        last_seen = attacks[0].detected_at
        first_seen = attacks[-1].detected_at
        for a in attacks:
            if a.risk_score > highest_risk_score:
                highest_risk_score = a.risk_score
            if a.severity in ("critical", "high") and highest_severity != "critical":
                highest_severity = a.severity

    # 2. Total events count for this source IP
    events_count_stmt = select(func.count(AttackEvent.id)).where(
        AttackEvent.source_ip == valid_ip,
        AttackEvent.event_time >= window_start,
    )
    total_events = db.scalar(events_count_stmt) or 0

    # 3. Threat Intelligence lookup (Module 2.3)
    ti_result = lookup_indicator(
        db=db,
        indicator_type="ip",
        indicator_value=valid_ip,
    )

    # 4. Behavioral Correlation (Module 2.8)
    corr_result = correlate_source_ip(
        db=db,
        source_ip=valid_ip,
        window_hours=wh,
    )

    # 5. Multi-Vector Detection Rules (Module 2.9)
    mv_result = evaluate_ip_rules(
        db=db,
        source_ip=valid_ip,
        window_minutes=min(wh * 60, 60),
    )

    # 6. Active Alerts associated with this IP's attacks
    alerts: list[Alert] = []
    if attack_ids:
        alerts_stmt = (
            select(Alert)
            .where(Alert.attack_id.in_(attack_ids))
            .order_by(Alert.created_at.desc())
            .limit(20)
        )
        alerts = list(db.scalars(alerts_stmt).all())

    active_alerts_count = sum(1 for a in alerts if a.status in ("open", "acknowledged"))

    return {
        "source_ip": valid_ip,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "total_attacks": len(attacks),
        "total_events": total_events,
        "attack_ids": attack_ids,
        "attack_types": attack_types,
        "highest_severity": highest_severity,
        "highest_risk_score": round(highest_risk_score, 1),
        "threat_intelligence": ti_result,
        "correlation": corr_result,
        "multi_vector": mv_result,
        "active_alerts_count": active_alerts_count,
        "alerts": alerts,
    }


def get_attack_graph(
    db: Session,
    attack_id: int,
) -> dict[str, Any]:
    """Derive Attack-Chain DAG for a single Attack container."""
    attack = db.get(Attack, attack_id)
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    # Query chronological events, capped at 200
    events_stmt = (
        select(AttackEvent)
        .where(AttackEvent.attack_id == attack_id)
        .order_by(AttackEvent.event_time.asc(), AttackEvent.id.asc())
        .limit(200)
    )
    events = list(db.scalars(events_stmt).all())

    # Query alerts for this attack
    alerts_stmt = (
        select(Alert)
        .where(Alert.attack_id == attack_id)
        .order_by(Alert.created_at.asc())
    )
    alerts = list(db.scalars(alerts_stmt).all())

    # Run multi-vector rules evaluation (Module 2.9)
    rules_triggered: list[dict[str, Any]] = []
    try:
        mv_eval = evaluate_attack_rules(db=db, attack_id=attack_id, window_minutes=60)
        rules_triggered = mv_eval.get("rules_triggered", [])
    except Exception:
        rules_triggered = []

    # Run threat intelligence lookup (Module 2.3)
    ti_data: dict[str, Any] = {}
    if attack.source_ip:
        try:
            ti_data = lookup_indicator(db=db, indicator_type="ip", indicator_value=attack.source_ip)
        except Exception:
            ti_data = {}

    return build_attack_graph(
        entity_id=str(attack_id),
        entity_type="attack",
        events=events,
        alerts=alerts,
        attack=attack,
        threat_intel=ti_data,
        rules_triggered=rules_triggered,
    )


def get_ip_graph(
    db: Session,
    source_ip: str,
    window_hours: int = 24,
) -> dict[str, Any]:
    """Derive Attack-Chain DAG across all attacks for a given source IP."""
    valid_ip = validate_ip_address(source_ip)
    wh = window_hours if isinstance(window_hours, int) else int(getattr(window_hours, "default", 24))
    window_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=wh)

    # Query chronological events across attacks for this IP, capped at 200
    events_stmt = (
        select(AttackEvent)
        .where(
            AttackEvent.source_ip == valid_ip,
            AttackEvent.event_time >= window_start,
        )
        .order_by(AttackEvent.event_time.asc(), AttackEvent.id.asc())
        .limit(200)
    )
    events = list(db.scalars(events_stmt).all())

    # Query attacks in window
    attacks_stmt = (
        select(Attack)
        .where(
            Attack.source_ip == valid_ip,
            Attack.detected_at >= window_start,
        )
        .order_by(Attack.detected_at.desc())
    )
    attacks = list(db.scalars(attacks_stmt).all())
    attack_ids = [a.id for a in attacks]

    # Query alerts for these attacks
    alerts: list[Alert] = []
    if attack_ids:
        alerts_stmt = (
            select(Alert)
            .where(Alert.attack_id.in_(attack_ids))
            .order_by(Alert.created_at.asc())
        )
        alerts = list(db.scalars(alerts_stmt).all())

    # Multi-vector rule evaluation
    rules_triggered: list[dict[str, Any]] = []
    try:
        mv_eval = evaluate_ip_rules(db=db, source_ip=valid_ip, window_minutes=min(wh * 60, 60))
        rules_triggered = mv_eval.get("rules_triggered", [])
    except Exception:
        rules_triggered = []

    # Threat Intelligence lookup
    ti_data: dict[str, Any] = {}
    try:
        ti_data = lookup_indicator(db=db, indicator_type="ip", indicator_value=valid_ip)
    except Exception:
        ti_data = {}

    primary_attack = attacks[0] if attacks else None

    return build_attack_graph(
        entity_id=valid_ip,
        entity_type="source_ip",
        events=events,
        alerts=alerts,
        attack=primary_attack,
        threat_intel=ti_data,
        rules_triggered=rules_triggered,
    )


def get_cross_attack_events(
    db: Session,
    source_ip: str,
    window_hours: int = 24,
    skip: int = 0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Retrieve chronological attack events across all attacks for a source IP.

    Guarantees:
    - Chronological ascending ordering
    - Bounded result set (max 200 events)
    - Attached MITRE ATT&CK taxonomy
    - Attacker strings returned as plain text
    """
    valid_ip = validate_ip_address(source_ip)
    wh = window_hours if isinstance(window_hours, int) else int(getattr(window_hours, "default", 24))
    sk = skip if isinstance(skip, int) else int(getattr(skip, "default", 0))
    raw_limit = limit if isinstance(limit, int) else int(getattr(limit, "default", 50))
    bounded_limit = min(max(raw_limit, 1), 200)
    window_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=wh)

    events_stmt = (
        select(AttackEvent)
        .where(
            AttackEvent.source_ip == valid_ip,
            AttackEvent.event_time >= window_start,
        )
        .order_by(AttackEvent.event_time.asc(), AttackEvent.id.asc())
        .offset(sk)
        .limit(bounded_limit)
    )
    events = list(db.scalars(events_stmt).all())

    results: list[dict[str, Any]] = []
    for ev in events:
        mitre_map = map_event_to_mitre(ev.event_type)
        results.append(
            {
                "id": ev.id,
                "attack_id": ev.attack_id,
                "event_type": ev.event_type,
                "source_ip": ev.source_ip,
                "message": ev.message,
                "event_time": ev.event_time,
                "mitre": {
                    "tactic_id": mitre_map.tactic_id,
                    "tactic_name": mitre_map.tactic_name,
                    "technique_id": mitre_map.technique_id,
                    "technique_name": mitre_map.technique_name,
                    "confidence": mitre_map.confidence,
                    "source": f"event:{ev.event_type}",
                    "evidence_ids": [ev.id],
                },
            }
        )

    return results
