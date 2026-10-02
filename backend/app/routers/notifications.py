"""Notification router for HoneyShield X (Module 2.6)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.notifications.service import dispatch_alert_notification
from app.schemas import NotificationDispatchResult

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.post(
    "/alerts/{alert_id}",
    response_model=NotificationDispatchResult,
    status_code=status.HTTP_200_OK,
    summary="Dispatch an alert notification to configured external channel",
)
def dispatch_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db),
) -> NotificationDispatchResult:
    """Dispatch an existing alert to the configured external notification provider.

    - If alert does not exist: returns HTTP 404
    - If notification provider is not configured: returns HTTP 200 with sent=False
    - If dispatch succeeds: returns HTTP 200 with sent=True
    - If dispatch fails: returns HTTP 200 with sent=False and sanitized error message
    """
    result = dispatch_alert_notification(db=db, alert_id=alert_id)
    return NotificationDispatchResult(**result)
