"""FastAPI Router for Active Deception Grid & Canary Honeytokens (Module 3.7).

Security Contracts:
- All management endpoints require Module 3.5 Bearer authentication and 4-tier RBAC.
- Permissions:
    - deception:view  -> viewer, analyst, incident_responder, security_administrator
    - deception:create -> analyst, incident_responder, security_administrator
    - deception:update -> analyst, incident_responder, security_administrator
    - deception:admin  -> security_administrator only
- Public trap listeners (/validate/{token_id}) are the ONLY intentionally unauthenticated endpoints.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.database import get_db
from app.deception.contextualizer import contextualize_canary_hit
from app.deception.service import default_deception_service
from app.schemas import (
    CanaryCreateRequest,
    CanaryHitEvent,
    CanaryHitListResponse,
    CanaryListResponse,
    CanaryToken,
    CanaryUpdateRequest,
    CanaryValidationResponse,
)

router = APIRouter(
    prefix="/deception",
    tags=["Active Deception Grid"],
)


# ==========================================
# Canary Token Management Endpoints
# ==========================================

@router.get(
    "/canaries",
    response_model=CanaryListResponse,
    summary="List deployed canary tokens with filters",
)
def list_canaries(
    canary_type: str | None = Query(default=None, description="Filter by canary type"),
    status: str | None = Query(default=None, description="Filter by status (active/revoked)"),
    environment: str | None = Query(default=None, description="Filter by environment tag"),
    operator: Operator = Depends(require_permission("deception:view")),
) -> CanaryListResponse:
    """List canary honeytokens deployed across enterprise environments."""
    c_type = canary_type if isinstance(canary_type, str) else None
    c_status = status if isinstance(status, str) else None
    c_env = environment if isinstance(environment, str) else None

    items = default_deception_service.list_canaries(
        canary_type=c_type,
        status_filter=c_status,
        environment=c_env,
    )
    return CanaryListResponse(canaries=items, total=len(items))


@router.post(
    "/canaries",
    response_model=CanaryToken,
    status_code=status.HTTP_201_CREATED,
    summary="Mint a new canary honeytoken",
)
def mint_canary(
    payload: CanaryCreateRequest,
    operator: Operator = Depends(require_permission("deception:create")),
    db: Session = Depends(get_db),
) -> CanaryToken:
    """Mint a new inert canary honeytoken across the 5 approved asset classes."""
    return default_deception_service.mint_canary(
        payload=payload,
        operator=operator,
        db=db,
    )


@router.get(
    "/canaries/{canary_id}",
    response_model=CanaryToken,
    summary="Retrieve detailed canary token dossier",
)
def get_canary(
    canary_id: str,
    operator: Operator = Depends(require_permission("deception:view")),
) -> CanaryToken:
    """Retrieve full metadata for a specific canary honeytoken."""
    return default_deception_service.get_canary(canary_id)


@router.patch(
    "/canaries/{canary_id}",
    response_model=CanaryToken,
    summary="Update canary metadata or lifecycle status",
)
def update_canary(
    canary_id: str,
    payload: CanaryUpdateRequest,
    operator: Operator = Depends(require_permission("deception:update")),
    db: Session = Depends(get_db),
) -> CanaryToken:
    """Update canary name, deployment tags, or toggle active/revoked status."""
    return default_deception_service.update_canary(
        canary_id=canary_id,
        payload=payload,
        operator=operator,
        db=db,
    )


@router.delete(
    "/canaries/{canary_id}",
    response_model=CanaryToken,
    summary="Formally revoke and decommission a canary honeytoken",
)
def revoke_canary(
    canary_id: str,
    operator: Operator = Depends(require_permission("deception:admin")),
    db: Session = Depends(get_db),
) -> CanaryToken:
    """Decommission and permanently revoke a canary honeytoken (Administrator only)."""
    return default_deception_service.revoke_canary(
        canary_id=canary_id,
        operator=operator,
        db=db,
    )


# ==========================================
# Telemetry, Hits & Context Endpoints
# ==========================================

@router.get(
    "/canaries/{canary_id}/hits",
    response_model=CanaryHitListResponse,
    summary="List interaction telemetry for a specific canary",
)
def get_canary_hits(
    canary_id: str,
    operator: Operator = Depends(require_permission("deception:view")),
) -> CanaryHitListResponse:
    """Retrieve forensic tripwire telemetry recorded for a specific canary honeytoken."""
    hits = default_deception_service.get_hits_for_canary(canary_id)
    return CanaryHitListResponse(hits=hits, total=len(hits))


@router.get(
    "/canaries/{canary_id}/context",
    response_model=dict[str, Any],
    summary="Advisory threat contextualization for a canary",
)
def get_canary_context(
    canary_id: str,
    operator: Operator = Depends(require_permission("deception:view")),
) -> dict[str, Any]:
    """Generate read-only advisory threat contextualization and MITRE ATT&CK mapping."""
    canary = default_deception_service.get_canary(canary_id)
    hits = default_deception_service.get_hits_for_canary(canary_id)
    dummy_hit = hits[0] if hits else CanaryHitEvent(
        hit_id="HYPOTHETICAL",
        canary_id=canary.canary_id,
        canary_type=canary.canary_type,
        source_ip="0.0.0.0",
        user_agent=None,
        request_method="GET",
        headers_captured={},
        payload_preview=None,
        alert_id=None,
        case_id=None,
        timestamp=canary.created_at,
    )
    return contextualize_canary_hit(canary, dummy_hit)


@router.get(
    "/hits",
    response_model=CanaryHitListResponse,
    summary="List recent global tripwire interaction events",
)
def list_all_hits(
    limit: int = Query(default=100, ge=1, le=500, description="Maximum hit records to return"),
    operator: Operator = Depends(require_permission("deception:view")),
) -> CanaryHitListResponse:
    """List recent global tripwire encounters across all deployed canaries."""
    limit_val = limit if isinstance(limit, int) else 100
    hits = default_deception_service.list_all_hits(limit=limit_val)
    return CanaryHitListResponse(hits=hits, total=len(hits))


# ==========================================
# Public Hardened Adversary Trap Listeners
# ==========================================

@router.get(
    "/validate/{token_id}",
    response_model=CanaryValidationResponse,
    summary="Public canary validation trap endpoint (GET)",
)
async def validate_canary_get(
    token_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> CanaryValidationResponse:
    """Public trap listener encountered by adversaries or crawlers (GET)."""
    return await default_deception_service.process_trap_hit(
        token_id=token_id,
        request=request,
        db=db,
    )


@router.post(
    "/validate/{token_id}",
    response_model=CanaryValidationResponse,
    summary="Public canary validation trap endpoint (POST)",
)
async def validate_canary_post(
    token_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> CanaryValidationResponse:
    """Public trap listener encountered by adversaries or automated tools (POST)."""
    return await default_deception_service.process_trap_hit(
        token_id=token_id,
        request=request,
        db=db,
    )
