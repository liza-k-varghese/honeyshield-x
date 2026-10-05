"""Security Event Correlation Engine router for HoneyShield X (Module 2.8)."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.correlation.service import correlate_attack, correlate_source_ip
from app.database import get_db
from app.schemas import CorrelationResultResponse

router = APIRouter(
    prefix="/correlation",
    tags=["Correlation Engine"],
)


@router.post(
    "/analyze/{attack_id}",
    response_model=CorrelationResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Correlate security events for an attack container",
)
def correlate_attack_endpoint(
    attack_id: int,
    window_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Sliding correlation window in hours (1-168)",
    ),
    db: Session = Depends(get_db),
) -> CorrelationResultResponse:
    """Correlate attack events across containers for the source IP of a given attack."""
    result = correlate_attack(
        db=db,
        attack_id=attack_id,
        window_hours=window_hours,
    )
    return CorrelationResultResponse(**result)


@router.get(
    "/ip/{source_ip}",
    response_model=CorrelationResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Correlate security events for a source IP",
)
def correlate_ip_endpoint(
    source_ip: str,
    window_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Sliding correlation window in hours (1-168)",
    ),
    db: Session = Depends(get_db),
) -> CorrelationResultResponse:
    """Correlate attack events across containers for a given source IP."""
    result = correlate_source_ip(
        db=db,
        source_ip=source_ip,
        window_hours=window_hours,
    )
    return CorrelationResultResponse(**result)
