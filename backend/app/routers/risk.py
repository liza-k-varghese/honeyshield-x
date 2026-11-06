"""Risk scoring router for HoneyShield X (Module 2.4)."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attack
from app.risk.service import calculate_attack_risk
from app.schemas import RiskAnalysisResult, RiskScoreExplanationResponse

router = APIRouter(
    prefix="/risk",
    tags=["Risk Scoring"],
)


@router.post(
    "/analyze/{attack_id}",
    response_model=RiskAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Calculate explainable risk score and severity for an attack",
)
def analyze_risk_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> RiskAnalysisResult:
    """Evaluate an attack container to calculate deterministic risk score.

    1. Loads attack container from PostgreSQL (HTTP 404 if absent)
    2. Gathers detection results and threat intelligence
    3. Calculates deterministic, explainable risk score (0-100)
    4. Categorizes score into severity bands (low, medium, high, critical)
    5. Updates Attack.risk_score and Attack.severity in PostgreSQL
    6. Returns structured breakdown with contributing factors
    """
    result = calculate_attack_risk(
        db=db,
        attack_id=attack_id,
    )
    return RiskAnalysisResult(**result)


@router.get(
    "/explain/{attack_id}",
    response_model=RiskScoreExplanationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get server-side deterministic risk score breakdown and explanation",
)
def explain_risk_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> RiskScoreExplanationResponse:
    """Inspect the server-side mathematical breakdown of an attack risk score.

    Traces exact weights:
    - Detection vector points (0-50)
    - Threat intelligence reputation points (0-40)
    - Frequency multiplier points (0-10)
    - Canary multiplier when applicable
    """
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack #{attack_id} not found",
        )

    # Calculate or inspect breakdown
    analysis = calculate_attack_risk(db=db, attack_id=attack_id)
    factors = analysis.get("contributing_factors", {})

    detection_pts = float(factors.get("detection_severity_points", 20.0))
    intel_pts = float(factors.get("threat_intel_points", 10.0))
    frequency_pts = float(factors.get("frequency_points", 0.0))
    final_score = float(analysis.get("risk_score", attack.risk_score))
    severity = str(analysis.get("severity", attack.severity))

    narrative = (
        f"Server-derived risk score {final_score:.1f} ({severity.upper()}) for attack #{attack_id} ({attack.attack_type}). "
        f"Components: Detection Vector Weight: {detection_pts:.1f} pts, "
        f"Threat Intel Reputation: {intel_pts:.1f} pts, "
        f"Frequency Scaling: {frequency_pts:.1f} pts. "
        f"Enforced under Deterministic Scoring Model v1.0."
    )

    norm_10 = round(final_score / 10.0, 1) if final_score > 10.0 else round(final_score, 1)
    scale_label = "0-100" if final_score > 10.0 else "0-10"

    return RiskScoreExplanationResponse(
        attack_id=attack_id,
        final_score=final_score,
        severity=severity,
        model_version="v1.0-deterministic",
        breakdown={
            "detection_vector_points": detection_pts,
            "threat_intel_points": intel_pts,
            "frequency_points": frequency_pts,
            "total_score": final_score,
        },
        narrative_explanation=narrative,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        scale=scale_label,
        normalized_score_10=norm_10,
    )

