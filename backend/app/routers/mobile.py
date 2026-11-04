"""Mobile Device Management & Push Notification Gateway for HoneyShield-X (Phase 3).

Provides:
- POST /api/v1/mobile/device/register: Register Android device push token & hardware metadata
- POST /api/v1/mobile/device/unregister: Unregister device on sign out
- GET /api/v1/mobile/preferences: Retrieve operator notification filter preferences
- PUT /api/v1/mobile/preferences: Update operator notification filter preferences
- GET /api/v1/mobile/push-logs: Observable push dispatch ledger
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_operator
from app.auth.registry import Operator
from app.notifications.push_dispatcher import (
    OperatorNotificationPreferences,
    PushDeliveryLog,
    default_push_dispatcher,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/mobile",
    tags=["Mobile Device & Push Gateway"],
)


class DeviceRegistrationRequest(BaseModel):
    push_token: str = Field(..., min_length=10)
    platform: str = "android"
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post(
    "/device/register",
    status_code=status.HTTP_200_OK,
    summary="Register Android device push token and hardware metadata",
)
def register_device(
    payload: DeviceRegistrationRequest,
    operator: Operator = Depends(get_current_operator),
) -> dict[str, Any]:
    """Link mobile push token to operator profile."""
    rec = default_push_dispatcher.register_device(
        push_token=payload.push_token,
        operator=operator.username,
        platform=payload.platform,
        metadata=payload.metadata,
    )
    return {
        "registered": True,
        "operator": operator.username,
        "registered_at": rec.registered_at,
    }


@router.post(
    "/device/unregister",
    status_code=status.HTTP_200_OK,
    summary="Unregister Android device push token upon sign-out",
)
def unregister_device(
    payload: DeviceRegistrationRequest,
    operator: Operator = Depends(get_current_operator),
) -> dict[str, Any]:
    """Remove mobile push token from active dispatch registry."""
    success = default_push_dispatcher.unregister_device(
        push_token=payload.push_token,
        operator=operator.username,
    )
    return {"unregistered": success}


@router.get(
    "/preferences",
    response_model=OperatorNotificationPreferences,
    summary="Retrieve operator mobile notification preferences",
)
def get_preferences(
    operator: Operator = Depends(get_current_operator),
) -> OperatorNotificationPreferences:
    """Retrieve active operator mobile notification filters."""
    return default_push_dispatcher.get_preferences(operator.username)


@router.put(
    "/preferences",
    response_model=OperatorNotificationPreferences,
    summary="Update operator mobile notification preferences",
)
def update_preferences(
    payload: OperatorNotificationPreferences,
    operator: Operator = Depends(get_current_operator),
) -> OperatorNotificationPreferences:
    """Persist updated mobile notification filters for authenticated operator."""
    return default_push_dispatcher.update_preferences(operator.username, payload)


@router.get(
    "/push-logs",
    response_model=list[PushDeliveryLog],
    summary="Retrieve recent push delivery observability records",
)
def get_push_delivery_logs(
    limit: int = Query(default=50, ge=1, le=200),
    operator: Operator = Depends(get_current_operator),
) -> list[PushDeliveryLog]:
    """Inspect recent push notification delivery audit logs."""
    return default_push_dispatcher.get_logs(limit=limit)
