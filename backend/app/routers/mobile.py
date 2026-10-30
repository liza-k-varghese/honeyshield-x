"""Mobile Device Management & Push Notification Gateway for HoneyShield-X.

Provides:
- POST /api/v1/mobile/device/register: Register Android device push token & hardware metadata
- POST /api/v1/mobile/device/unregister: Unregister device on sign out
- GET /api/v1/mobile/preferences: Mobile notification filter preferences
"""

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_operator
from app.auth.registry import Operator

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/mobile",
    tags=["Mobile Device & Push Gateway"],
)


class DeviceRegistrationRequest(BaseModel):
    push_token: str = Field(..., min_length=10)
    platform: str = "android"
    metadata: dict[str, Any] = Field(default_factory=dict)


class MobilePreferences(BaseModel):
    min_alert_severity: str = "HIGH"
    enable_canary_push: bool = True
    enable_governor_stepup_push: bool = True
    quiet_hours_enabled: bool = False


# In-memory registry for device tokens
_REGISTERED_DEVICES: dict[str, dict[str, Any]] = {}


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
    _REGISTERED_DEVICES[payload.push_token] = {
        "operator": operator.username,
        "platform": payload.platform,
        "metadata": payload.metadata,
        "registered_at": time.time(),
    }
    logger.info(
        "MOBILE_DEVICE_REGISTER operator=%s platform=%s token_prefix=%s",
        operator.username,
        payload.platform,
        payload.push_token[:12],
    )
    return {
        "registered": True,
        "operator": operator.username,
        "device_count": len(_REGISTERED_DEVICES),
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
    if payload.push_token in _REGISTERED_DEVICES:
        del _REGISTERED_DEVICES[payload.push_token]
    return {"unregistered": True}


@router.get(
    "/preferences",
    response_model=MobilePreferences,
    summary="Retrieve operator mobile notification preferences",
)
def get_preferences(
    operator: Operator = Depends(get_current_operator),
) -> MobilePreferences:
    """Retrieve active operator mobile notification filters."""
    return MobilePreferences()

