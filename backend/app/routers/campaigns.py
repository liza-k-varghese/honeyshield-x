"""Cross-Module Campaign Intelligence REST API Router (Module 3.10).

Provides:
- GET /api/v1/campaigns: List campaigns with pagination and filtering.
- GET /api/v1/campaigns/metrics: High-level KPI metrics for SOC dashboard ribbon.
- POST /api/v1/campaigns/cluster: Trigger on-demand deterministic re-clustering analysis.
- POST /api/v1/campaigns/merge: Administratively merge two campaigns into one.
- GET /api/v1/campaigns/{campaign_id}: Retrieve single campaign dossier.
- PATCH /api/v1/campaigns/{campaign_id}: Update campaign metadata, notes, or status.
- GET /api/v1/campaigns/{campaign_id}/graph: Retrieve derived multi-entity DAG graph.
- GET /api/v1/campaigns/{campaign_id}/timeline: Chronological sequence of campaign events.
- POST /api/v1/campaigns/{campaign_id}/contain: Governor Level-3 guarded bulk containment.
- POST /api/v1/campaigns/{campaign_id}/cases/{case_id}: Link incident case to campaign.
- DELETE /api/v1/campaigns/{campaign_id}/cases/{case_id}: Unlink incident case from campaign.
"""

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.campaigns.service import default_campaign_service
from app.database import get_db
from app.schemas import (
    CampaignClusterRequest,
    CampaignClusterResponse,
    CampaignContainmentRequest,
    CampaignContainmentResponse,
    CampaignDossier,
    CampaignGraphResponse,
    CampaignListResponse,
    CampaignMergeRequest,
    CampaignMetricsResponse,
    CampaignTimelineResponse,
    CampaignUpdateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/campaigns",
    tags=["Campaign Intelligence & Graph Correlation"],
)


@router.get(
    "",
    response_model=CampaignListResponse,
    summary="List attack campaigns with filtering and pagination",
)
def list_campaigns(
    status: str | None = Query(None, description="Filter by status: active, dormant, resolved, archived"),
    severity: str | None = Query(None, description="Filter by severity: low, medium, high, critical"),
    limit: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    operator: Operator = Depends(require_permission("campaign:view")),
) -> CampaignListResponse:
    """Retrieve list of threat campaigns with deterministic sorting."""
    status_val = status if isinstance(status, str) else None
    severity_val = severity if isinstance(severity, str) else None
    limit_val = limit if isinstance(limit, int) else 50
    offset_val = offset if isinstance(offset, int) else 0

    summaries, total = default_campaign_service.list_campaigns(
        status_filter=status_val,
        severity=severity_val,
        limit=limit_val,
        offset=offset_val,
    )
    return CampaignListResponse(
        campaigns=summaries,
        total=total,
        limit=limit_val,
        offset=offset_val,
    )


@router.get(
    "/metrics",
    response_model=CampaignMetricsResponse,
    summary="Campaign operational metrics for SOC dashboard KPI ribbon",
)
def get_campaign_metrics(
    operator: Operator = Depends(require_permission("campaign:view")),
) -> CampaignMetricsResponse:
    """Return campaign metrics including active/critical counts, dwell time, and MITRE coverage."""
    return default_campaign_service.get_metrics()


@router.post(
    "/cluster",
    response_model=CampaignClusterResponse,
    summary="Trigger deterministic re-clustering analysis",
)
def trigger_clustering(
    payload: CampaignClusterRequest | None = None,
    operator: Operator = Depends(require_permission("campaign:update")),
    db: Session = Depends(get_db),
) -> CampaignClusterResponse:
    """Execute single-flight Union-Find clustering across active telemetry."""
    lookback = payload.lookback_hours if payload and payload.lookback_hours else 168
    return default_campaign_service.cluster_now(
        db=db,
        operator_id=operator.username,
        lookback_hours=lookback,
    )


@router.post(
    "/merge",
    response_model=CampaignDossier,
    summary="Merge two campaigns into one (Administrator only)",
)
def merge_campaigns(
    payload: CampaignMergeRequest,
    operator: Operator = Depends(require_permission("campaign:admin")),
    db: Session = Depends(get_db),
) -> CampaignDossier:
    """Merge secondary campaign into primary campaign, transferring all entity associations."""
    return default_campaign_service.merge_campaigns(
        primary_id=payload.primary_campaign_id,
        secondary_id=payload.secondary_campaign_id,
        justification=payload.justification,
        operator=operator,
        db=db,
    )


@router.get(
    "/{campaign_id}",
    response_model=CampaignDossier,
    summary="Retrieve full campaign dossier",
)
def get_campaign(
    campaign_id: str,
    operator: Operator = Depends(require_permission("campaign:view")),
) -> CampaignDossier:
    """Retrieve full campaign dossier including all associated entities."""
    return default_campaign_service.get_campaign(campaign_id)


@router.patch(
    "/{campaign_id}",
    response_model=CampaignDossier,
    summary="Update campaign metadata, notes, or status",
)
def update_campaign(
    campaign_id: str,
    payload: CampaignUpdateRequest,
    operator: Operator = Depends(require_permission("campaign:update")),
    db: Session = Depends(get_db),
) -> CampaignDossier:
    """Update campaign fields or lifecycle status."""
    return default_campaign_service.update_campaign(
        campaign_id=campaign_id,
        req=payload,
        operator=operator,
        db=db,
    )


@router.get(
    "/{campaign_id}/graph",
    response_model=CampaignGraphResponse,
    summary="Retrieve derived multi-entity DAG graph",
)
def get_campaign_graph(
    campaign_id: str,
    operator: Operator = Depends(require_permission("campaign:view")),
    db: Session = Depends(get_db),
) -> CampaignGraphResponse:
    """Derive topological DAG attack graph correlating entities, killchain stages, and alerts."""
    return default_campaign_service.get_graph(
        campaign_id=campaign_id,
        db=db,
    )


@router.get(
    "/{campaign_id}/timeline",
    response_model=CampaignTimelineResponse,
    summary="Retrieve chronological attack timeline",
)
def get_campaign_timeline(
    campaign_id: str,
    limit: int = Query(100, ge=1, le=200, description="Max timeline events (max 200)"),
    operator: Operator = Depends(require_permission("campaign:view")),
    db: Session = Depends(get_db),
) -> CampaignTimelineResponse:
    """Chronologically sorted sequence of attacks, alerts, and canary interactions."""
    limit_val = limit if isinstance(limit, int) else 100
    return default_campaign_service.get_timeline(
        campaign_id=campaign_id,
        limit=limit_val,
        db=db,
    )


@router.post(
    "/{campaign_id}/contain",
    response_model=CampaignContainmentResponse,
    summary="Governor Level-3 guarded bulk containment dispatch",
)
def contain_campaign(
    campaign_id: str,
    payload: CampaignContainmentRequest,
    x_idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
    operator: Operator = Depends(require_permission("campaign:admin")),
    db: Session = Depends(get_db),
) -> CampaignContainmentResponse:
    """Dispatch bulk containment across all campaign attacker endpoints guarded by Governor Level-3 HITL."""
    if not operator.has_permission("command:stage_containment"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator lacks 'command:stage_containment' permission required for bulk containment.",
        )

    if not x_idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Header 'X-Idempotency-Key' is required and must be a valid UUID v4.",
        )

    res = default_campaign_service.contain_campaign(
        campaign_id=campaign_id,
        req=payload,
        operator=operator,
        idempotency_key=x_idempotency_key,
        db=db,
    )
    return CampaignContainmentResponse(**res)


@router.post(
    "/{campaign_id}/cases/{case_id}",
    response_model=CampaignDossier,
    summary="Link an incident case to a campaign",
)
def link_case(
    campaign_id: str,
    case_id: str,
    operator: Operator = Depends(require_permission("campaign:update")),
    db: Session = Depends(get_db),
) -> CampaignDossier:
    """Link an incident case to a campaign."""
    return default_campaign_service.link_case(
        campaign_id=campaign_id,
        case_id=case_id,
        operator=operator,
        db=db,
    )


@router.delete(
    "/{campaign_id}/cases/{case_id}",
    response_model=CampaignDossier,
    summary="Unlink an incident case from a campaign",
)
def unlink_case(
    campaign_id: str,
    case_id: str,
    operator: Operator = Depends(require_permission("campaign:update")),
    db: Session = Depends(get_db),
) -> CampaignDossier:
    """Unlink an incident case from a campaign."""
    return default_campaign_service.unlink_case(
        campaign_id=campaign_id,
        case_id=case_id,
        operator=operator,
        db=db,
    )
