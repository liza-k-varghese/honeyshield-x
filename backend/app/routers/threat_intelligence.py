from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ThreatIntelligenceResult
from app.threat_intelligence.service import enrich_attack, lookup_indicator

router = APIRouter(
    prefix="/threat-intelligence",
    tags=["Threat Intelligence"],
)


@router.get(
    "/lookup",
    response_model=ThreatIntelligenceResult,
    status_code=status.HTTP_200_OK,
    summary="Look up an indicator in local threat intelligence",
)
def lookup_indicator_endpoint(
    indicator_value: str = Query(
        ...,
        description="Indicator value to look up (e.g. IP address)",
    ),
    indicator_type: str = Query(
        default="ip",
        description="Type of indicator (e.g. 'ip')",
    ),
    db: Session = Depends(get_db),
) -> ThreatIntelligenceResult:
    """Query local threat intelligence database for matching indicator."""
    try:
        result = lookup_indicator(
            db=db,
            indicator_type=indicator_type,
            indicator_value=indicator_value,
        )
        return ThreatIntelligenceResult(**result)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )


@router.post(
    "/enrich/{attack_id}",
    response_model=ThreatIntelligenceResult,
    status_code=status.HTTP_200_OK,
    summary="Enrich an attack with local threat intelligence",
)
def enrich_attack_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> ThreatIntelligenceResult:
    """Enrich an existing attack container with local threat intelligence."""
    result = enrich_attack(
        db=db,
        attack_id=attack_id,
    )
    return ThreatIntelligenceResult(**result)
