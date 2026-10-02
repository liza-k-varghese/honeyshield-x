"""Risk scoring service for HoneyShield X (Module 2.4).

Combines deterministic detection results and local threat intelligence
to produce a bounded (0-100), explainable risk score and severity band.
"""

from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.detection.service import detect_ssh_brute_force
from app.models import Attack
from app.threat_intelligence.service import enrich_attack

# Severity band thresholds
BAND_LOW_MAX: float = 24.9
BAND_MEDIUM_MAX: float = 49.9
BAND_HIGH_MAX: float = 74.9

# Detection rule severity point weights (max 50)
DETECTION_SEVERITY_WEIGHTS: dict[str, float] = {
    "low": 20.0,
    "medium": 30.0,
    "high": 40.0,
    "critical": 50.0,
}

# Threat intelligence level point weights (max 40)
THREAT_INTEL_WEIGHTS: dict[str, float] = {
    "low": 10.0,
    "medium": 20.0,
    "high": 30.0,
    "critical": 40.0,
    "unknown": 10.0,
}


def get_severity_band(score: float) -> str:
    """Map a 0-100 numerical risk score into standardized severity bands:
    - 0-24   = low
    - 25-49  = medium
    - 50-74  = high
    - 75-100 = critical
    """
    if score < 25.0:
        return "low"
    elif score < 50.0:
        return "medium"
    elif score < 75.0:
        return "high"
    else:
        return "critical"


def calculate_attack_risk(
    db: Session,
    attack_id: int,
) -> dict[str, Any]:
    """Calculate an explainable, deterministic risk score for an attack container.

    Combines:
    1. Detection engine findings (rule severity + event volume)
    2. Threat intelligence matches (threat level * confidence)

    Updates Attack.risk_score and Attack.severity in PostgreSQL.
    """
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    factors: list[dict[str, Any]] = []
    raw_score: float = 0.0

    # 1. Detection Engine Evaluation
    detection_res = detect_ssh_brute_force(db=db, attack=attack)
    if detection_res.detected:
        sev_key = (detection_res.severity or "high").lower()
        rule_pts = DETECTION_SEVERITY_WEIGHTS.get(sev_key, 40.0)
        raw_score += rule_pts
        factors.append({
            "factor": "detection_rule",
            "contribution": rule_pts,
            "reason": (
                f"Detection rule '{detection_res.detection_type}' triggered with"
                f" severity '{detection_res.severity}'"
            ),
        })

    # Evidence volume contribution (up to 10 points)
    if detection_res.evidence_count > 0:
        vol_pts = min(10.0, round(detection_res.evidence_count * 2.0, 1))
        raw_score += vol_pts
        factors.append({
            "factor": "event_volume",
            "contribution": vol_pts,
            "reason": (
                f"Observed {detection_res.evidence_count} correlated security"
                " events within detection window"
            ),
        })

    # 2. Threat Intelligence Evaluation
    ti_res = enrich_attack(db=db, attack_id=attack.id)
    if ti_res.get("found"):
        ti_level = (ti_res.get("threat_level") or "unknown").lower()
        base_ti = THREAT_INTEL_WEIGHTS.get(ti_level, 10.0)
        confidence = ti_res.get("confidence")
        if confidence is None or confidence < 0.0:
            confidence = 0.5
        ti_contrib = round(base_ti * confidence, 1)
        raw_score += ti_contrib
        factors.append({
            "factor": "threat_intelligence",
            "contribution": ti_contrib,
            "reason": (
                f"Threat intelligence match for source IP"
                f" '{ti_res.get('indicator_value')}': threat level"
                f" '{ti_res.get('threat_level')}' with {confidence} confidence"
                f" (source: {ti_res.get('source')})"
            ),
        })

    # Bounded between 0.0 and 100.0
    final_score = round(min(100.0, max(0.0, raw_score)), 1)
    severity_band = get_severity_band(final_score)

    # Persist updated risk score and severity to PostgreSQL
    attack.risk_score = final_score
    attack.severity = severity_band
    db.commit()
    db.refresh(attack)

    return {
        "attack_id": attack.id,
        "risk_score": final_score,
        "severity": severity_band,
        "factors": factors,
    }
