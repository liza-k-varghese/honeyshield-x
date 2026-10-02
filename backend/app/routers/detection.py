"""Detection router for HoneyShield X (Module 2.2)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.detection.service import detect_ssh_brute_force
from app.models import Attack
from app.schemas import DetectionResult

router = APIRouter(
    prefix="/detection",
    tags=["Detection Engine"],
)


@router.post(
    "/analyze/{attack_id}",
    response_model=DetectionResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze an attack for suspicious activity patterns",
)
def analyze_attack(
    attack_id: int,
    db: Session = Depends(get_db),
) -> DetectionResult:
    """Analyze an attack's stored events against deterministic detection rules.

    - Validates attack existence (HTTP 404 if not found)
    - Correlates AttackEvent records by attack_id and source_ip
    - Applies configurable SSH brute-force detection rule
    - Updates the associated Attack in PostgreSQL if detection triggers
    - Returns structured DetectionResult
    """
    attack = db.get(Attack, attack_id)
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    return detect_ssh_brute_force(db=db, attack=attack)
