"""FastAPI Router for Threat Intelligence & IOC Lifecycle Fusion (Module 3.8).

Security Contracts:
- All management endpoints require Module 3.5 Bearer authentication and 4-tier RBAC.
- Permissions:
    - threat_intel:view   -> viewer, analyst, incident_responder, security_administrator
    - threat_intel:create -> analyst, incident_responder, security_administrator
    - threat_intel:update -> analyst, incident_responder, security_administrator
    - threat_intel:revoke -> incident_responder, security_administrator
    - threat_intel:admin  -> security_administrator only
    - threat_intel:export -> analyst, incident_responder, security_administrator
- Preserves legacy Phase 2 / Module 2.3 lookup and enrichment endpoints.
- Defensive export endpoints support authenticated sessions or validated feed tokens.
"""

import hmac
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator, default_operator_registry
from app.auth.session import default_session_store
from app.database import get_db
from app.schemas import (
    CampaignListResponse,
    DefensiveFeedResponse,
    PromoteCanaryHitRequest,
    PromoteCaseObservableRequest,
    ThreatIndicatorCreate,
    ThreatIndicatorListResponse,
    ThreatIndicatorResponse,
    ThreatIndicatorUpdate,
    ThreatIntelligenceResult,
)
from app.threat_intelligence.contextualizer import threat_contextualizer
from app.threat_intelligence.service import (
    enrich_attack,
    lookup_indicator,
    threat_intel_service,
)

router = APIRouter(
    prefix="/threat-intelligence",
    tags=["Threat Intelligence"],
)


def verify_feed_access(
    request: Request,
    token: str | None = Query(default=None, description="Export feed authentication token"),
) -> str:
    """Verify authorization for feed exports via operator session or feed token."""
    # 1. Bearer session token authentication
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        sess_token = auth_header.split(" ", 1)[1].strip()
        session = default_session_store.get_session(sess_token)
        if session:
            op = default_operator_registry.get_operator(session.operator_id)
            if op and op.has_permission("threat_intel:export"):
                return op.username

    # 2. Configured feed token query parameter authentication
    feed_token = os.getenv("HONEYSHIELD_FEED_TOKEN", "hsx_feed_token_default")
    if token and hmac.compare_digest(token, feed_token):
        return "automated_feed_poller"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required: Provide valid Bearer session with 'threat_intel:export' or valid '?token=' parameter",
    )


# =============================================================================
# Legacy Invariant Endpoints (Phase 2 / Module 2.3)
# =============================================================================

@router.get(
    "/lookup",
    response_model=ThreatIntelligenceResult,
    status_code=status.HTTP_200_OK,
    summary="Look up an indicator in local threat intelligence (Phase 2 legacy)",
)
def lookup_indicator_endpoint(
    indicator_value: str = Query(..., description="Indicator value to look up (e.g. IP address)"),
    indicator_type: str = Query(default="ip", description="Type of indicator (e.g. 'ip')"),
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
    summary="Enrich an attack with local threat intelligence (Phase 2 legacy)",
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


# =============================================================================
# Module 3.8 IOC Management & Lifecycle Endpoints
# =============================================================================

@router.get(
    "/indicators",
    response_model=ThreatIndicatorListResponse,
    status_code=status.HTTP_200_OK,
    summary="List and filter threat indicators",
)
def list_indicators_endpoint(
    status: str | None = Query(default=None, description="Filter by status (active, decaying, retired, revoked, whitelisted)"),
    indicator_type: str | None = Query(default=None, description="Filter by indicator type"),
    campaign: str | None = Query(default=None, description="Filter by campaign"),
    min_confidence: float | None = Query(default=None, ge=0.0, le=1.0, description="Minimum decayed confidence"),
    search: str | None = Query(default=None, description="Search term"),
    skip: int = Query(default=0, ge=0, description="Offset"),
    limit: int = Query(default=50, ge=1, le=200, description="Limit"),
    operator: Operator = Depends(require_permission("threat_intel:view")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorListResponse:
    """Retrieve paginated catalog of threat intelligence indicators with dynamic decay."""
    indicators, total = threat_intel_service.list_indicators(
        db=db,
        status=status,
        indicator_type=indicator_type,
        campaign=campaign,
        min_confidence=min_confidence,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ThreatIndicatorListResponse(
        indicators=indicators,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        page_size=limit,
    )


@router.get(
    "/indicators/{indicator_id}",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single threat indicator dossier",
)
def get_indicator_endpoint(
    indicator_id: int,
    operator: Operator = Depends(require_permission("threat_intel:view")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Retrieve full indicator details including real-time decay and hit counts."""
    return threat_intel_service.get_indicator(db=db, indicator_id=indicator_id)


@router.get(
    "/indicators/{indicator_id}/context",
    status_code=status.HTTP_200_OK,
    summary="Get advisory contextual intelligence for an indicator",
)
def get_indicator_context_endpoint(
    indicator_id: int,
    operator: Operator = Depends(require_permission("threat_intel:view")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve read-only, non-authoritative advisory contextualization for an indicator."""
    ind = threat_intel_service.get_indicator(db=db, indicator_id=indicator_id)
    return threat_contextualizer.contextualize_indicator(ind.model_dump())


@router.post(
    "/indicators",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new threat indicator",
)
def create_indicator_endpoint(
    data: ThreatIndicatorCreate,
    operator: Operator = Depends(require_permission("threat_intel:create")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Register a new threat intelligence indicator with validation and initial scoring."""
    try:
        return threat_intel_service.create_indicator(
            db=db,
            data=data,
            operator_username=operator.username,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.put(
    "/indicators/{indicator_id}",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Update indicator metadata",
)
def update_indicator_endpoint(
    indicator_id: int,
    data: ThreatIndicatorUpdate,
    operator: Operator = Depends(require_permission("threat_intel:update")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Update indicator campaign, threat level, decay parameters, or notes."""
    return threat_intel_service.update_indicator(
        db=db,
        indicator_id=indicator_id,
        data=data,
        operator_username=operator.username,
    )


@router.post(
    "/indicators/{indicator_id}/revoke",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke an indicator",
)
def revoke_indicator_endpoint(
    indicator_id: int,
    reason: str = Query(default="Decommissioned / false positive", description="Revocation rationale"),
    operator: Operator = Depends(require_permission("threat_intel:revoke")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Revoke indicator, dropping effective confidence to 0.0 and removing from feeds."""
    return threat_intel_service.revoke_indicator(
        db=db,
        indicator_id=indicator_id,
        reason=reason,
        operator_username=operator.username,
    )


@router.post(
    "/indicators/{indicator_id}/whitelist",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Whitelist an indicator (Admin only)",
)
def whitelist_indicator_endpoint(
    indicator_id: int,
    reason: str = Query(default="Verified internal or authorized infrastructure", description="Whitelist rationale"),
    operator: Operator = Depends(require_permission("threat_intel:admin")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Whitelist indicator with absolute precedence over alerts and feeds."""
    return threat_intel_service.whitelist_indicator(
        db=db,
        indicator_id=indicator_id,
        reason=reason,
        operator_username=operator.username,
    )


# =============================================================================
# Promotions (Module 3.6 Cases Integration)
# =============================================================================

@router.post(
    "/indicators/promote-case",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Promote an observable from an incident case to threat intelligence",
)
def promote_case_observable_endpoint(
    data: PromoteCaseObservableRequest,
    operator: Operator = Depends(require_permission("threat_intel:create")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Explicitly promote a verified incident case observable into active threat intelligence."""
    try:
        return threat_intel_service.promote_case_observable(
            db=db,
            request=data,
            operator_username=operator.username,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.post(
    "/indicators/promote-canary",
    response_model=ThreatIndicatorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Promote a canary token hit into active threat intelligence",
)
def promote_canary_hit_endpoint(
    data: PromoteCanaryHitRequest,
    operator: Operator = Depends(require_permission("threat_intel:create")),
    db: Session = Depends(get_db),
) -> ThreatIndicatorResponse:
    """Promote an adversary interaction with a canary token into active threat intelligence."""
    try:
        return threat_intel_service.promote_canary_hit(
            db=db,
            source_ip=data.source_ip,
            canary_id=data.canary_id,
            canary_type=data.canary_type,
            custom_campaign=data.campaign,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


# =============================================================================
# Campaigns
# =============================================================================

@router.get(
    "/campaigns",
    response_model=CampaignListResponse,
    status_code=status.HTTP_200_OK,
    summary="List tracked adversary campaigns",
)
def list_campaigns_endpoint(
    operator: Operator = Depends(require_permission("threat_intel:view")),
    db: Session = Depends(get_db),
) -> CampaignListResponse:
    """Retrieve aggregated threat campaigns with indicator counts and peak severities."""
    campaigns = threat_intel_service.list_campaigns(db=db)
    return CampaignListResponse(
        campaigns=campaigns,
        total=len(campaigns),
    )


# =============================================================================
# Defensive Feed Exports
# =============================================================================

@router.get(
    "/export/json",
    status_code=status.HTTP_200_OK,
    summary="Export defensive JSON threat feed",
)
def export_json_feed_endpoint(
    min_confidence: float = Query(default=0.65, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    indicator_type: str | None = Query(default=None, description="Filter by indicator type"),
    campaign: str | None = Query(default=None, description="Filter by campaign"),
    username: str = Depends(verify_feed_access),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Export machine-readable JSON blocklist of active indicators."""
    return threat_intel_service.export_json_feed(
        db=db,
        min_confidence=min_confidence,
        indicator_type=indicator_type,
        campaign=campaign,
    )


@router.get(
    "/export/csv",
    status_code=status.HTTP_200_OK,
    summary="Export Firewall External Dynamic List (EDL) CSV feed",
)
def export_csv_feed_endpoint(
    min_confidence: float = Query(default=0.65, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    indicator_type: str | None = Query(default=None, description="Filter by indicator type"),
    campaign: str | None = Query(default=None, description="Filter by campaign"),
    include_headers: bool = Query(default=True, description="Include CSV column headers"),
    username: str = Depends(verify_feed_access),
    db: Session = Depends(get_db),
) -> Response:
    """Export sanitized CSV feed formatted for Palo Alto, Fortinet, and edge firewall EDLs."""
    csv_content = threat_intel_service.export_csv_feed(
        db=db,
        min_confidence=min_confidence,
        indicator_type=indicator_type,
        campaign=campaign,
        include_headers=include_headers,
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=honeyshield_threat_feed.csv"},
    )


@router.get(
    "/export/stix",
    status_code=status.HTTP_200_OK,
    summary="Export STIX 2.1-compliant JSON bundle",
)
def export_stix_bundle_endpoint(
    min_confidence: float = Query(default=0.65, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    indicator_type: str | None = Query(default=None, description="Filter by indicator type"),
    campaign: str | None = Query(default=None, description="Filter by campaign"),
    username: str = Depends(verify_feed_access),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Export standard STIX 2.1 JSON bundle with indicator objects."""
    return threat_intel_service.export_stix_bundle(
        db=db,
        min_confidence=min_confidence,
        indicator_type=indicator_type,
        campaign=campaign,
    )
