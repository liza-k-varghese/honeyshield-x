"""Retrospective Threat Hunting REST API Router (Module 3.11).

Provides:
- GET    /api/v1/hunts                     -> List hunts with filtering and pagination
- POST   /api/v1/hunts                     -> Create new threat hunt hypothesis draft
- GET    /api/v1/hunts/metrics/summary     -> Retrieve high-level KPI metrics for ribbon
- GET    /api/v1/hunts/{hunt_id}           -> Retrieve single hunt dossier
- PATCH  /api/v1/hunts/{hunt_id}           -> Update hypothesis, notes, or conclusion
- POST   /api/v1/hunts/{hunt_id}/execute   -> Run retrospective historical query
- POST   /api/v1/hunts/{hunt_id}/promote/rule -> Mint Module 3.3 Draft Detection Rule
- POST   /api/v1/hunts/{hunt_id}/promote/case -> Mint Module 3.6 Incident Case
- POST   /api/v1/hunts/{hunt_id}/archive   -> Move concluded hunt into terminal archive
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.database import get_db
from app.hunting.service import default_hunt_service
from app.schemas import (
    HuntCreateRequest,
    HuntDossier,
    HuntExecutionResponse,
    HuntMetricsResponse,
    HuntPromotionRequest,
    HuntPromotionResponse,
    HuntUpdateRequest,
    ListHuntResponse,
    SavedHunt,
    SavedHuntCreateRequest,
    ThreatHuntSearchRequest,
    ThreatHuntSearchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/hunts",
    tags=["Threat Hunting & Adversary Hypothesis Engine"],
)


@router.get(
    "",
    response_model=ListHuntResponse,
    summary="List threat hunts with filtering and pagination",
)
def list_hunts(
    status: str | None = Query(None, description="Filter by status: draft, running, completed, concluded, archived"),
    severity: str | None = Query(None, description="Filter by severity: low, medium, high, critical"),
    mitre_tactic: str | None = Query(None, description="Filter by MITRE tactic name"),
    limit: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    operator: Operator = Depends(require_permission("hunt:view")),
) -> ListHuntResponse:
    """Retrieve list of threat hunts with deterministic sorting."""
    s_val = status if isinstance(status, str) else None
    sev_val = severity if isinstance(severity, str) else None
    tactic_val = mitre_tactic if isinstance(mitre_tactic, str) else None
    lim_val = limit if isinstance(limit, int) else 50
    off_val = offset if isinstance(offset, int) else 0

    summaries, total = default_hunt_service.store.list_hunts(
        status=s_val,
        severity=sev_val,
        mitre_tactic=tactic_val,
        limit=lim_val,
        offset=off_val,
    )
    return ListHuntResponse(
        hunts=summaries,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/metrics/summary",
    response_model=HuntMetricsResponse,
    summary="Get threat hunting operational KPIs",
)
def get_hunt_metrics(
    operator: Operator = Depends(require_permission("hunt:view")),
) -> HuntMetricsResponse:
    """Retrieve operational KPIs for SOC console header ribbon."""
    return default_hunt_service.store.get_metrics()


@router.post(
    "/search",
    response_model=ThreatHuntSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Multi-dimensional retrospective search across security events",
)
def search_threat_telemetry(
    payload: ThreatHuntSearchRequest,
    operator: Operator = Depends(require_permission("hunt:view")),
    db: Session = Depends(get_db),
) -> ThreatHuntSearchResponse:
    """Execute high-speed, parameterized search across attacks, alerts, and outbox events."""
    return default_hunt_service.search_telemetry(
        payload=payload,
        db=db,
        operator=operator,
    )


@router.get(
    "/saved",
    response_model=list[SavedHunt],
    status_code=status.HTTP_200_OK,
    summary="List saved threat hunting queries",
)
def list_saved_hunts(
    operator: Operator = Depends(require_permission("hunt:view")),
) -> list[SavedHunt]:
    """Retrieve saved queries accessible to the operator (own private + team queries)."""
    return default_hunt_service.list_saved_hunts(operator=operator)


@router.post(
    "/saved",
    response_model=SavedHunt,
    status_code=status.HTTP_201_CREATED,
    summary="Save a threat hunting search configuration",
)
def create_saved_hunt(
    payload: SavedHuntCreateRequest,
    operator: Operator = Depends(require_permission("hunt:create")),
) -> SavedHunt:
    """Persist an authorized search configuration for team collaboration or scheduled hunting."""
    return default_hunt_service.create_saved_hunt(
        payload=payload,
        operator=operator,
    )


@router.get(
    "/saved/{saved_hunt_id}",
    response_model=SavedHunt,
    status_code=status.HTTP_200_OK,
    summary="Retrieve a single saved threat hunting query",
)
def get_saved_hunt(
    saved_hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:view")),
) -> SavedHunt:
    """Retrieve saved query definition with authorization validation."""
    return default_hunt_service.get_saved_hunt(
        hunt_id=saved_hunt_id,
        operator=operator,
    )


@router.delete(
    "/saved/{saved_hunt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved threat hunting query",
)
def delete_saved_hunt(
    saved_hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:update")),
) -> None:
    """Delete a saved query ensuring only owner or admin can remove."""
    default_hunt_service.delete_saved_hunt(
        hunt_id=saved_hunt_id,
        operator=operator,
    )


@router.post(
    "/saved/{saved_hunt_id}/execute",
    response_model=ThreatHuntSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute a saved threat hunting query",
)
def execute_saved_hunt(
    saved_hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:execute")),
    db: Session = Depends(get_db),
) -> ThreatHuntSearchResponse:
    """Execute a saved search with dynamic operator authorization re-validation."""
    return default_hunt_service.execute_saved_hunt(
        hunt_id=saved_hunt_id,
        db=db,
        operator=operator,
    )


@router.post(
    "",
    response_model=HuntDossier,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new threat hunt hypothesis draft",
)
def create_hunt(
    payload: HuntCreateRequest,
    operator: Operator = Depends(require_permission("hunt:create")),
    db: Session = Depends(get_db),
) -> HuntDossier:
    """Create a new threat hunt hypothesis draft."""
    return default_hunt_service.create_hunt(
        payload=payload,
        operator=operator,
        db=db,
    )


@router.get(
    "/{hunt_id}",
    response_model=HuntDossier,
    summary="Retrieve complete threat hunt dossier",
)
def get_hunt_dossier(
    hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:view")),
) -> HuntDossier:
    """Retrieve full details, query spec, evidence, notes, and promotion state of a hunt."""
    return default_hunt_service.get_hunt(hunt_id)


@router.patch(
    "/{hunt_id}",
    response_model=HuntDossier,
    summary="Update threat hunt hypothesis, append notes, or record conclusion",
)
def update_hunt_dossier(
    hunt_id: str,
    payload: HuntUpdateRequest,
    operator: Operator = Depends(require_permission("hunt:update")),
    db: Session = Depends(get_db),
) -> HuntDossier:
    """Update hunt hypothesis metadata, append collaborative notes, or finalize verdict."""
    return default_hunt_service.update_hunt(
        hunt_id=hunt_id,
        payload=payload,
        operator=operator,
        db=db,
    )


@router.post(
    "/{hunt_id}/execute",
    response_model=HuntExecutionResponse,
    summary="Execute retrospective query scan",
)
def execute_hunt(
    hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:execute")),
    db: Session = Depends(get_db),
) -> HuntExecutionResponse:
    """Run deterministic historical telemetry scan with single-flight mutex protection."""
    return default_hunt_service.execute_hunt(
        hunt_id=hunt_id,
        operator=operator,
        db=db,
    )


@router.post(
    "/{hunt_id}/promote/rule",
    response_model=HuntPromotionResponse,
    summary="Promote hunt findings to Module 3.3 Draft Detection Rule",
)
def promote_to_detection_rule(
    hunt_id: str,
    payload: HuntPromotionRequest,
    operator: Operator = Depends(require_permission("hunt:promote")),
    db: Session = Depends(get_db),
) -> HuntPromotionResponse:
    """Governor-evaluated promotion of hunt findings to a draft detection rule."""
    return default_hunt_service.promote_to_rule(
        hunt_id=hunt_id,
        justification=payload.justification,
        operator=operator,
        db=db,
    )


@router.post(
    "/{hunt_id}/promote/case",
    response_model=HuntPromotionResponse,
    summary="Promote confirmed malicious hunt findings to Module 3.6 Incident Case",
)
def promote_to_incident_case(
    hunt_id: str,
    payload: HuntPromotionRequest,
    operator: Operator = Depends(require_permission("hunt:promote")),
    db: Session = Depends(get_db),
) -> HuntPromotionResponse:
    """Governor-evaluated promotion of confirmed malicious findings to an incident case."""
    return default_hunt_service.promote_to_case(
        hunt_id=hunt_id,
        justification=payload.justification,
        operator=operator,
        db=db,
    )


@router.post(
    "/{hunt_id}/archive",
    response_model=HuntDossier,
    summary="Archive concluded hunt dossier",
)
def archive_hunt(
    hunt_id: str,
    operator: Operator = Depends(require_permission("hunt:admin")),
    db: Session = Depends(get_db),
) -> HuntDossier:
    """Administratively archive a concluded threat hunt dossier (terminal state)."""
    return default_hunt_service.archive_hunt(
        hunt_id=hunt_id,
        operator=operator,
        db=db,
    )
