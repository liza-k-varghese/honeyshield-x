"""Authentication and Authorization Router for HoneyShield-X (Module 3.5).

Provides:
- POST /api/v1/auth/login: Operator login with PBKDF2 verification and rate limiting.
- POST /api/v1/auth/logout: Revoke active session token.
- GET /api/v1/auth/me: Inspect current authenticated operator profile.
- POST /api/v1/auth/break-glass: Controlled emergency access with 30m maximum session.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_operator
from app.auth.registry import Operator
from app.auth.service import default_auth_service
from app.database import get_db
from app.schemas import (
    BreakGlassRequest,
    BreakGlassResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    OperatorProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication & Authorization"],
)


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Operator login and bearer session token issuance",
)
def login_endpoint(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """Authenticate operator credentials using PBKDF2-HMAC-SHA256 and issue a bearer session token.

    Enforces:
    - 5 requests / minute / source IP rate limiting.
    - 5 failed attempts -> 15-minute account lockout.
    - Opaque 256-bit CSPRNG bearer session tokens.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")

    result = default_auth_service.login(
        username=credentials.username,
        password=credentials.password,
        client_ip=client_ip,
        user_agent=user_agent,
        db=db,
    )
    return LoginResponse(**result)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke active operator bearer session",
)
def logout_endpoint(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """Atomically invalidate operator's active session token."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    result = default_auth_service.logout(
        token=token,
        client_ip=client_ip,
        db=db,
    )
    return LogoutResponse(**result)


@router.get(
    "/me",
    response_model=OperatorProfile,
    status_code=status.HTTP_200_OK,
    summary="Retrieve current authenticated operator profile and permissions",
)
def get_current_operator_endpoint(
    operator: Operator = Depends(get_current_operator),
) -> OperatorProfile:
    """Return active authenticated operator identity and RBAC permission list."""
    return OperatorProfile(**operator.to_profile_dict())


@router.post(
    "/break-glass",
    response_model=BreakGlassResponse,
    status_code=status.HTTP_200_OK,
    summary="Controlled emergency break-glass procedure",
)
def break_glass_endpoint(
    payload: BreakGlassRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BreakGlassResponse:
    """Emergency access for critical SOC operational recovery.

    Requires:
    - Minimum 20-character operational justification.
    - Sealed offline emergency passphrase.
    - Creates a time-boxed 30-minute Security Administrator session.
    - Broadcasts high-priority event across active dashboard connections.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")

    result = default_auth_service.break_glass(
        passphrase=payload.passphrase,
        justification=payload.justification,
        client_ip=client_ip,
        user_agent=user_agent,
        db=db,
    )
    return BreakGlassResponse(**result)
