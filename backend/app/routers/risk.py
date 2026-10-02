"""Risk scoring router for HoneyShield X (Module 2.4)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.risk.service import calculate_attack_risk
from app.schemas import RiskAnalysisResult

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
