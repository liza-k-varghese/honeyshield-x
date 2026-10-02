"""Alert Manager service for HoneyShield X (Module 2.5).

Converts verified detection and risk scoring results into persistent alerts.
Enforces alert threshold (risk_score >= 50.0) and duplicate protection.
"""

from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Alert, Attack

ALERT_THRESHOLD_SCORE: float = 50.0
VALID_ALERT_STATUSES: set[str] = {"open", "acknowledged", "resolved"}


def evaluate_attack_alert(
    db: Session,
    attack_id: int,
) -> dict[str, Any]:
    """Evaluate whether an attack's risk score warrants an alert.

    1. Validates attack existence (HTTP 404 if absent)
    2. Validates risk analysis was performed (HTTP 400 if risk_score is None)
    3. If risk_score < 50.0: returns alert_created=False
    4. If risk_score >= 50.0:
       - Checks for existing active alert (status in open, acknowledged)
       - If active alert exists: reuses it and suppresses duplicate
       - If no active alert: creates and persists new Alert with status='open'
    """
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    # Verify upstream risk scoring has been performed
    if (
        attack.risk_score is None
        or attack.severity is None
        or attack.status in ["unscored", "unprocessed", "pending_analysis"]
        or attack.severity in ["unscored", "pending"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Risk analysis has not been performed for attack with ID {attack_id}",
        )

    # Threshold evaluation (< 50 -> low/medium -> no alert)
    if attack.risk_score < ALERT_THRESHOLD_SCORE:
        return {
            "attack_id": attack.id,
            "alert_created": False,
            "alert_id": None,
            "risk_score": attack.risk_score,
            "severity": attack.severity,
            "status": None,
            "reason": "Risk score below alert threshold (< 50.0)",
        }

    # Duplicate Protection: search for existing active alert
    existing_alert = (
        db.query(Alert)
        .filter(
            Alert.attack_id == attack.id,
            Alert.status.in_(["open", "acknowledged"]),
        )
        .order_by(Alert.id.desc())
        .first()
    )

    if existing_alert:
        return {
            "attack_id": attack.id,
            "alert_created": False,
            "alert_id": existing_alert.id,
            "risk_score": attack.risk_score,
            "severity": attack.severity,
            "status": existing_alert.status,
            "reason": (
                f"Active alert #{existing_alert.id} already exists for this attack"
                f" (status: {existing_alert.status})"
            ),
        }

    # Create new Alert record in PostgreSQL
    new_alert = Alert(
        attack_id=attack.id,
        alert_type=attack.attack_type or "Security Alert",
        severity=attack.severity,
        message=(
            f"Security Alert: {attack.attack_type} detected with {attack.severity.upper()} risk "
            f"(score: {attack.risk_score}/100.0) from source IP {attack.source_ip or 'unknown'}."
        ),
        status="open",
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return {
        "attack_id": attack.id,
        "alert_created": True,
        "alert_id": new_alert.id,
        "risk_score": attack.risk_score,
        "severity": attack.severity,
        "status": new_alert.status,
        "reason": f"Risk score {attack.risk_score} meets or exceeds alert threshold (>= 50.0)",
    }


def get_alert(db: Session, alert_id: int) -> Alert:
    """Retrieve an alert record by ID."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found",
        )
    return alert


def list_alerts(
    db: Session,
    status_filter: str | None = None,
    limit: int = 100,
) -> list[Alert]:
    """List stored alerts with optional status filtering."""
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter.lower().strip())
    return query.order_by(Alert.id.desc()).limit(limit).all()


def update_alert_status(
    db: Session,
    alert_id: int,
    new_status: str,
) -> Alert:
    """Update lifecycle status of an existing alert (open, acknowledged, resolved)."""
    alert = get_alert(db=db, alert_id=alert_id)
    clean_status = new_status.lower().strip()
    if clean_status not in VALID_ALERT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid alert status '{new_status}'. Allowed statuses:"
                f" {', '.join(sorted(VALID_ALERT_STATUSES))}"
            ),
        )
    alert.status = clean_status
    db.commit()
    db.refresh(alert)
    return alert
