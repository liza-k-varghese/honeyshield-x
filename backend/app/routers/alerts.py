"""Alert Manager router for HoneyShield X (Module 2.5)."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.alerts.service import (
    evaluate_attack_alert,
    get_alert,
    list_alerts,
    update_alert_status,
)
from app.database import get_db
from app.schemas import AlertEvaluationResult, AlertResponse, AlertStatusUpdate

router = APIRouter(
    prefix="/alerts",
    tags=["Alert Manager"],
)


@router.post(
    "/evaluate/{attack_id}",
    response_model=AlertEvaluationResult,
    status_code=status.HTTP_200_OK,
    summary="Evaluate an attack container and generate/reuse an alert",
)
def evaluate_alert_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> AlertEvaluationResult:
    """Evaluate an attack container against the alert threshold (risk_score >= 50.0).

    - If attack doesn't exist: HTTP 404
    - If risk scoring has not been performed: HTTP 400
    - If risk_score < 50.0: returns alert_created=False
    - If risk_score >= 50.0: creates a new alert or reuses an existing active one
    """
    result = evaluate_attack_alert(
        db=db,
        attack_id=attack_id,
    )
    return AlertEvaluationResult(**result)


@router.get(
    "",
    response_model=list[AlertResponse],
    status_code=status.HTTP_200_OK,
    summary="List all security alerts",
)
@router.get(
    "/",
    response_model=list[AlertResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def list_alerts_endpoint(
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by lifecycle status (open, acknowledged, resolved)",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AlertResponse]:
    """Retrieve all stored alerts with optional status filtering."""
    alerts = list_alerts(db=db, status_filter=status_filter, limit=limit)
    return [AlertResponse.model_validate(a) for a in alerts]


@router.get(
    "/{alert_id}",
    response_model=AlertResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single alert by ID",
)
def get_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db),
) -> AlertResponse:
    """Retrieve an alert by ID."""
    alert = get_alert(db=db, alert_id=alert_id)
    return AlertResponse.model_validate(alert)


@router.patch(
    "/{alert_id}/status",
    response_model=AlertResponse,
    status_code=status.HTTP_200_OK,
    summary="Update alert lifecycle status",
)
def update_alert_status_endpoint(
    alert_id: int,
    update_data: AlertStatusUpdate,
    db: Session = Depends(get_db),
) -> AlertResponse:
    """Update alert lifecycle status (open, acknowledged, resolved)."""
    alert = update_alert_status(
        db=db,
        alert_id=alert_id,
        new_status=update_data.status,
    )
    return AlertResponse.model_validate(alert)
