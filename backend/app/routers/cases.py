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

import csv
import hashlib
import io
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.cases.service import default_case_service
from app.database import get_db
from app.evidence.service import default_evidence_service
from app.schemas import (
    CaseCreateRequest,
    CaseListResponse,
    CaseNote,
    CaseNoteCreateRequest,
    CaseTaskCompleteRequest,
    CaseUpdateRequest,
    ForensicEvidence,
    ForensicEvidenceCreateRequest,
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


def _escape_csv_cell(val: Any) -> str:
    """Prevent CSV formula injection by prepending single quote if cell starts with =, +, -, @."""
    text = str(val) if val is not None else ""
    if text and text[0] in ("=", "+", "-", "@"):
        return f"'{text}"
    return text


@router.post(
    "/{case_id}/evidence",
    response_model=ForensicEvidence,
    status_code=status.HTTP_201_CREATED,
    summary="Attach forensic evidence snapshot to case",
)
def attach_case_evidence(
    case_id: str,
    payload: ForensicEvidenceCreateRequest,
    operator: Operator = Depends(require_permission("case:update")),
    db: Session = Depends(get_db),
) -> ForensicEvidence:
    """Attach an immutable forensic snapshot to an incident case with SHA-256 integrity."""
    return default_evidence_service.attach_evidence(
        case_id=case_id,
        payload=payload,
        operator=operator,
        db=db,
    )


@router.get(
    "/{case_id}/evidence",
    response_model=list[ForensicEvidence],
    status_code=status.HTTP_200_OK,
    summary="List all forensic evidence attached to case",
)
def list_case_evidence(
    case_id: str,
    operator: Operator = Depends(require_permission("case:view")),
) -> list[ForensicEvidence]:
    """Retrieve all evidence items attached to an incident case."""
    return default_evidence_service.list_case_evidence(
        case_id=case_id,
        operator=operator,
    )


@router.get(
    "/{case_id}/export",
    summary="Export authorized incident investigation dossier with integrity digest",
)
def export_case_investigation(
    case_id: str,
    export_format: str = Query("json", alias="format", description="Export format: 'json' or 'csv'"),
    operator: Operator = Depends(require_permission("case:view")),
) -> Response:
    """Export complete case dossier, tasks, notes, and evidence with formula-injection defense."""
    case = default_case_service.get_case(case_id=case_id)
    evidence_items = default_evidence_service.list_case_evidence(case_id=case_id, operator=operator)

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Header metadata section
        writer.writerow(["# HoneyShield-X Forensic Case Export", case_id])
        writer.writerow(["Title", _escape_csv_cell(case.title)])
        writer.writerow(["Severity", _escape_csv_cell(case.severity)])
        writer.writerow(["Status", _escape_csv_cell(case.status)])
        assignee_val = getattr(case, "assigned_to", getattr(case, "assignee", "unassigned")) or "unassigned"
        writer.writerow(["Assignee", _escape_csv_cell(assignee_val)])
        writer.writerow(["Created At", case.created_at])
        writer.writerow([])

        # Evidence table
        writer.writerow(["--- FORENSIC EVIDENCE RECORDS ---"])
        writer.writerow(["Evidence ID", "Source Type", "Source Record ID", "Description", "SHA-256 Digest", "Collected At"])
        for ev in evidence_items:
            writer.writerow([
                ev.evidence_id,
                _escape_csv_cell(ev.source_type),
                _escape_csv_cell(ev.source_record_id),
                _escape_csv_cell(ev.description),
                ev.sha256_digest,
                ev.collected_at,
            ])
        writer.writerow([])

        # Notes table
        writer.writerow(["--- INVESTIGATION NOTES ---"])
        writer.writerow(["Note ID", "Author", "Timestamp", "Message"])
        for n in case.notes:
            author_val = getattr(n, "operator_id", getattr(n, "author", "unknown"))
            writer.writerow([
                n.note_id,
                _escape_csv_cell(author_val),
                n.created_at,
                _escape_csv_cell(n.message),
            ])

        csv_content = output.getvalue()
        sha256_digest = hashlib.sha256(csv_content.encode("utf-8")).hexdigest()

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=case_{case_id}_export.csv",
                "X-Content-SHA256": sha256_digest,
            },
        )

    # Default to JSON export
    dossier = {
        "case": case.model_dump(),
        "evidence": [ev.model_dump() for ev in evidence_items],
        "exported_by": operator.username,
        "exported_at": case.updated_at,
    }
    json_bytes = json.dumps(dossier, sort_keys=True, indent=2).encode("utf-8")
    sha256_digest = hashlib.sha256(json_bytes).hexdigest()

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=case_{case_id}_export.json",
            "X-Content-SHA256": sha256_digest,
        },
    )

