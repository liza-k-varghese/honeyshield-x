"""SOC Incident Case Management API Router (Module 3.6).

Provides:
- GET /api/v1/cases: List and filter incident cases with pagination.
- POST /api/v1/cases: Create new incident case or promote alerts into a case.
- GET /api/v1/cases/{case_id}: Retrieve full case dossier including playbook and notes.
- PATCH /api/v1/cases/{case_id}: Update case metadata, assignee, or lifecycle state.
- POST /api/v1/cases/{case_id}/tasks/{task_id}/complete: Progress playbook tasks.
- POST /api/v1/cases/{case_id}/notes: Append forensic investigation notes.
- GET /api/v1/cases/{case_id}/report: Generate Post-Incident Review (PIR) report.
"""

import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.cases.service import default_case_service
from app.database import get_db
from app.schemas import (
    CaseCreateRequest,
    CaseListResponse,
    CaseNote,
    CaseNoteCreateRequest,
    CaseTaskCompleteRequest,
    CaseUpdateRequest,
    IncidentCase,
    PostIncidentReportResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/cases",
    tags=["Incident Case Management"],
)


@router.get(
    "",
    response_model=CaseListResponse,
    summary="List incident cases with filtering and pagination",
)
def list_cases(
    status: str | None = Query(None, description="Filter by case status"),
    severity: str | None = Query(None, description="Filter by severity"),
    handler_id: str | None = Query(None, description="Filter by assigned handler"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    operator: Operator = Depends(require_permission("case:view")),
) -> CaseListResponse:
    """Retrieve list of incident cases with role-based access control."""
    status_val = status if isinstance(status, str) else None
    severity_val = severity if isinstance(severity, str) else None
    handler_val = handler_id if isinstance(handler_id, str) else None
    limit_val = limit if isinstance(limit, int) else 50
    offset_val = offset if isinstance(offset, int) else 0

    cases, total = default_case_service.list_cases(
        status_filter=status_val,
        severity_filter=severity_val,
        handler_filter=handler_val,
        limit=limit_val,
        offset=offset_val,
    )
    return CaseListResponse(cases=cases, total=total)


@router.post(
    "",
    response_model=IncidentCase,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new incident case or promote alerts",
)
def create_case(
    payload: CaseCreateRequest,
    operator: Operator = Depends(require_permission("case:create")),
    db: Session = Depends(get_db),
) -> IncidentCase:
    """Create a new incident case or promote one or more alerts into a case."""
    return default_case_service.create_case(
        payload=payload,
        operator=operator,
        db=db,
    )


@router.get(
    "/{case_id}",
    response_model=IncidentCase,
    summary="Retrieve full incident case dossier",
)
def get_case(
    case_id: str,
    operator: Operator = Depends(require_permission("case:view")),
) -> IncidentCase:
    """Retrieve full incident case dossier by case identifier."""
    return default_case_service.get_case(case_id=case_id)


@router.patch(
    "/{case_id}",
    response_model=IncidentCase,
    summary="Update case metadata, assigned handler, or transition lifecycle status",
)
def update_case(
    case_id: str,
    payload: CaseUpdateRequest,
    operator: Operator = Depends(require_permission("case:update")),
    db: Session = Depends(get_db),
) -> IncidentCase:
    """Update case status or handler with deterministic state machine verification."""
    return default_case_service.update_case(
        case_id=case_id,
        payload=payload,
        operator=operator,
        db=db,
    )


@router.post(
    "/{case_id}/tasks/{task_id}/complete",
    response_model=IncidentCase,
    summary="Mark a playbook task complete or skipped",
)
def complete_playbook_task(
    case_id: str,
    task_id: str,
    payload: CaseTaskCompleteRequest,
    operator: Operator = Depends(require_permission("case:respond")),
    db: Session = Depends(get_db),
) -> IncidentCase:
    """Progress an interactive response playbook task and update completion metrics."""
    return default_case_service.complete_task(
        case_id=case_id,
        task_id=task_id,
        payload=payload,
        operator=operator,
        db=db,
    )


@router.post(
    "/{case_id}/notes",
    response_model=CaseNote,
    status_code=status.HTTP_201_CREATED,
    summary="Append an investigation journal note to an incident case",
)
def add_case_note(
    case_id: str,
    payload: CaseNoteCreateRequest,
    operator: Operator = Depends(require_permission("case:update")),
    db: Session = Depends(get_db),
) -> CaseNote:
    """Add a timestamped forensic investigation note with authenticated operator attribution."""
    return default_case_service.add_note(
        case_id=case_id,
        message=payload.message,
        operator=operator,
        db=db,
    )


@router.get(
    "/{case_id}/report",
    response_model=PostIncidentReportResponse,
    summary="Generate a deterministic Post-Incident Review (PIR) report",
)
def get_post_incident_report(
    case_id: str,
    operator: Operator = Depends(require_permission("case:view")),
) -> PostIncidentReportResponse:
    """Generate an executive-ready Post-Incident Review (PIR) closure report."""
    return default_case_service.generate_pir_report(
        case_id=case_id,
        operator=operator,
    )
