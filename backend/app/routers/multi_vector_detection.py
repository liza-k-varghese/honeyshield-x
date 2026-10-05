"""Multi-Vector Detection Engine & Vector Classifier router for HoneyShield X (Module 2.9)."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.multi_vector_detection.service import (
    evaluate_attack_rules,
    evaluate_ip_rules,
)
from app.schemas import MultiVectorDetectionResponse

router = APIRouter(
    prefix="/detection/multi-vector",
    tags=["Multi-Vector Detection Engine"],
)


@router.post(
    "/analyze/{attack_id}",
    response_model=MultiVectorDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate extended multi-vector rules on an attack container",
)
def analyze_attack_endpoint(
    attack_id: int,
    window_minutes: int = Query(
        default=15,
        ge=1,
        le=60,
        description="Sliding evaluation window in minutes (1-60)",
    ),
    db: Session = Depends(get_db),
) -> MultiVectorDetectionResponse:
    """Evaluate declarative detection rules against events within a single Attack container."""
    result = evaluate_attack_rules(
        db=db,
        attack_id=attack_id,
        window_minutes=window_minutes,
    )
    return MultiVectorDetectionResponse(**result)


@router.get(
    "/ip/{source_ip}",
    response_model=MultiVectorDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate extended multi-vector rules for a source IP",
)
def analyze_ip_endpoint(
    source_ip: str,
    window_minutes: int = Query(
        default=15,
        ge=1,
        le=60,
        description="Sliding evaluation window in minutes (1-60)",
    ),
    db: Session = Depends(get_db),
) -> MultiVectorDetectionResponse:
    """Evaluate declarative detection rules across all events for a given source IP."""
    result = evaluate_ip_rules(
        db=db,
        source_ip=source_ip,
        window_minutes=window_minutes,
    )
    return MultiVectorDetectionResponse(**result)
