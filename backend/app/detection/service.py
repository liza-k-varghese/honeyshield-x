"""Detection service for HoneyShield X (Module 2.2)."""

from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.detection.rules import DEFAULT_SSH_RULE, SSHBruteForceConfig
from app.models import Attack, AttackEvent
from app.schemas import DetectionResult


def detect_ssh_brute_force(
    db: Session,
    attack: Attack,
    source_ip: str | None = None,
    config: SSHBruteForceConfig = DEFAULT_SSH_RULE,
) -> DetectionResult:
    """Analyze an attack's events for an SSH brute-force pattern.

    1. Determines effective source IP: prefers explicitly provided source_ip,
       otherwise falls back to attack.source_ip (safely handles None).
    2. Calculates time cutoff based on configurable window_minutes.
    3. Performs an efficient COUNT query in PostgreSQL filtered by:
       - attack_id
       - event_type == config.event_type ("ssh_login_failed")
       - event_time >= cutoff
       - source_ip == effective_source_ip (if available)
    4. If count >= threshold (default 5):
       - Updates the associated Attack:
         - status = "detected"
         - severity = config.severity ("high")
         - risk_score = config.risk_score (8.0)
       - Commits update to the database.
       - Returns structured DetectionResult with detected=True.
    5. If count < threshold:
       - Does not modify the Attack record.
       - Returns structured DetectionResult with detected=False.
    """
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        minutes=config.window_minutes
    )

    effective_source_ip = source_ip if source_ip is not None else attack.source_ip

    query = select(func.count(AttackEvent.id)).where(
        AttackEvent.attack_id == attack.id,
        AttackEvent.event_type == config.event_type,
        AttackEvent.event_time >= cutoff,
    )

    if effective_source_ip:
        query = query.where(AttackEvent.source_ip == effective_source_ip)

    count = db.scalar(query) or 0

    if count >= config.threshold:
        # Update associated Attack in PostgreSQL
        attack.status = "detected"
        attack.severity = config.severity
        attack.risk_score = config.risk_score
        db.commit()
        db.refresh(attack)

        return DetectionResult(
            detected=True,
            detection_type=config.detection_type,
            severity=config.severity,
            risk_score=config.risk_score,
            evidence_count=count,
            source_ip=effective_source_ip,
            attack_id=attack.id,
            message=config.detected_message,
        )

    return DetectionResult(
        detected=False,
        detection_type=None,
        severity=None,
        risk_score=None,
        evidence_count=count,
        source_ip=effective_source_ip,
        attack_id=attack.id,
        message=config.not_detected_message,
    )
