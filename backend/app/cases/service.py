"""Incident Case Management & Playbook Orchestrator Service (Module 3.6).

Implements:
- Deterministic case lifecycle state machine.
- Binding of alerts and IOCs to structured incident dossiers.
- Interactive SANS/NIST playbook progression.
- Integration with Module 3.4 Governor & SSE bus.
- Compliance audit emission to PostgreSQL 'system_events'.
- Zero-migration Redis persistence with resilient in-memory fallback.
"""

from datetime import datetime, timezone
import json
import logging
import secrets
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.registry import Operator
from app.cases.contextualizer import generate_advisory_summary, generate_post_incident_report
from app.cases.playbooks import get_playbook_tasks_for_template
from app.cases.storage import CaseStore, default_case_store
from app.incident_command.bus import default_event_bus
from app.models import Alert, Attack
from app.schemas import (
    CaseCreateRequest,
    CaseNote,
    CaseTaskCompleteRequest,
    CaseUpdateRequest,
    IncidentCase,
    PostIncidentReportResponse,
)

logger = logging.getLogger(__name__)

VALID_CASE_STATUSES: set[str] = {
    "new",
    "investigating",
    "containment_in_progress",
    "contained",
    "resolved",
    "closed",
}

VALID_SEVERITIES: set[str] = {"low", "medium", "high", "critical"}

# Deterministic status transition rules
VALID_TRANSITIONS: dict[str, set[str]] = {
    "new": {"investigating", "closed"},
    "investigating": {"containment_in_progress", "contained", "resolved", "closed"},
    "containment_in_progress": {"contained", "investigating", "closed"},
    "contained": {"resolved", "investigating", "closed"},
    "resolved": {"closed", "investigating"},
    "closed": set(),  # Terminal state
}


class CaseManagementService:
    """Core service for managing incident cases and response playbooks."""

    def __init__(self, store: CaseStore | None = None) -> None:
        self.store = store or default_case_store
        self._counter: int = 1

    def _generate_case_id(self) -> str:
        """Generate a deterministic, unique case identifier."""
        year = datetime.now(timezone.utc).year
        # Try sequentially or random fallback to prevent collision
        for _ in range(50):
            cid = f"CASE-{year}-{secrets.randbelow(9000) + 1000}"
            if self.store.get_case(cid) is None:
                return cid
        return f"CASE-{year}-{uuid.uuid4().hex[:6].upper()}"

    def create_case(
        self,
        payload: CaseCreateRequest,
        operator: Operator,
        db: Session,
    ) -> IncidentCase:
        """Create a new incident case or promote existing alerts into a case."""
        case_id = self._generate_case_id()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Sanitize and validate inputs
        clean_title = payload.title.strip()
        if len(clean_title) < 3 or len(clean_title) > 200:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Title must be between 3 and 200 characters",
            )

        clean_severity = payload.severity.lower().strip()
        if clean_severity not in VALID_SEVERITIES:
            clean_severity = "medium"

        # Resolve initial alert references and extract metadata if available
        source_ip = payload.source_ip.strip() if payload.source_ip else None
        target_id = payload.target_id
        valid_alert_ids: list[int] = []

        if payload.initial_alert_ids:
            try:
                db_alerts = db.query(Alert).filter(Alert.id.in_(payload.initial_alert_ids)).all()
                for a in db_alerts:
                    valid_alert_ids.append(a.id)
                    if not source_ip and a.attack_id:
                        att = db.query(Attack).filter(Attack.id == a.attack_id).first()
                        if att and att.source_ip:
                            source_ip = att.source_ip
                    if target_id is None:
                        target_id = a.attack_id or a.id
            except Exception as e:
                logger.warning("Failed querying alert references for case %s: %s", case_id, str(e))
                valid_alert_ids = list(payload.initial_alert_ids)

        # Resolve playbook tasks
        tasks = get_playbook_tasks_for_template(payload.playbook_template)

        # Initial notes
        notes: list[CaseNote] = []
        if payload.initial_note and payload.initial_note.strip():
            notes.append(
                CaseNote(
                    note_id=str(uuid.uuid4())[:8],
                    operator_id=operator.username,
                    role=operator.role,
                    message=payload.initial_note.strip(),
                    created_at=now_iso,
                )
            )

        new_case = IncidentCase(
            case_id=case_id,
            title=clean_title,
            description=payload.description.strip() if payload.description else None,
            severity=clean_severity,
            status="new",
            assigned_to=payload.assigned_to.strip() if payload.assigned_to else operator.username,
            source_ip=source_ip,
            target_id=target_id,
            alert_ids=valid_alert_ids,
            playbook_template=payload.playbook_template.strip().upper(),
            tasks=tasks,
            notes=notes,
            created_by=operator.username,
            created_at=now_iso,
            updated_at=now_iso,
            closed_at=None,
            closed_by=None,
            playbook_progress=0.0,
            advisory_summary=None,
        )

        new_case.advisory_summary = generate_advisory_summary(new_case)
        saved = self.store.save_case(new_case)

        # Audit emission
        try:
            record_operator_audit(
                db=db,
                event_type="CASE_CREATED",
                source="case_management",
                severity="info",
                message=json.dumps({
                    "case_id": saved.case_id,
                    "title": saved.title,
                    "severity": saved.severity,
                    "operator_id": operator.username,
                    "assigned_to": saved.assigned_to,
                    "playbook_template": saved.playbook_template,
                    "alert_ids": saved.alert_ids,
                }),
            )
        except Exception as e:
            logger.error("Failed recording CASE_CREATED audit: %s", str(e))

        # Real-time event publishing
        try:
            default_event_bus.publish(
                event_type="system.case.created",
                payload={
                    "case_id": saved.case_id,
                    "title": saved.title,
                    "severity": saved.severity,
                    "status": saved.status,
                    "assigned_to": saved.assigned_to,
                    "operator_id": operator.username,
                },
            )
        except Exception:
            pass

        return saved

    def get_case(self, case_id: str) -> IncidentCase:
        """Retrieve full incident case by ID."""
        clean_id = case_id.strip()
        case = self.store.get_case(clean_id)
        if case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident case '{clean_id}' not found",
            )
        return case

    def list_cases(
        self,
        status_filter: str | None = None,
        severity_filter: str | None = None,
        handler_filter: str | None = None,
        limit: Any = 50,
        offset: Any = 0,
    ) -> tuple[list[IncidentCase], int]:
        """List cases with filtering and pagination."""
        try:
            num_limit = int(limit)
        except Exception:
            num_limit = 50
        try:
            num_offset = int(offset)
        except Exception:
            num_offset = 0
        safe_limit = min(max(1, num_limit), 200)
        safe_offset = max(0, num_offset)
        clean_status = str(status_filter) if status_filter and not hasattr(status_filter, "default") else None
        clean_severity = str(severity_filter) if severity_filter and not hasattr(severity_filter, "default") else None
        clean_handler = str(handler_filter) if handler_filter and not hasattr(handler_filter, "default") else None
        return self.store.list_cases(
            status=clean_status,
            severity=clean_severity,
            handler=clean_handler,
            limit=safe_limit,
            offset=safe_offset,
        )

    def update_case(
        self,
        case_id: str,
        payload: CaseUpdateRequest,
        operator: Operator,
        db: Session,
    ) -> IncidentCase:
        """Update case metadata, assigned handler, or transition lifecycle status."""
        case = self.get_case(case_id)
        now_iso = datetime.now(timezone.utc).isoformat()
        status_changed = False
        old_status = case.status

        # 1. Update Title if supplied
        if payload.title is not None:
            clean_title = payload.title.strip()
            if len(clean_title) < 3 or len(clean_title) > 200:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Title must be between 3 and 200 characters",
                )
            case.title = clean_title

        # 2. Update Severity if supplied
        if payload.severity is not None:
            clean_sev = payload.severity.lower().strip()
            if clean_sev in VALID_SEVERITIES:
                case.severity = clean_sev

        # 3. Update Assignee if supplied
        if payload.assigned_to is not None:
            case.assigned_to = payload.assigned_to.strip() or None

        # 4. Status Transition Evaluation
        if payload.status is not None:
            target_status = payload.status.lower().strip()
            if target_status not in VALID_CASE_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid status '{target_status}'. Must be one of {sorted(list(VALID_CASE_STATUSES))}",
                )

            if target_status != case.status:
                # Terminal closed state protection
                if case.status == "closed":
                    if operator.role != "security_administrator":
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Case is closed. Only a Security Administrator can reopen closed cases.",
                        )

                allowed_next = VALID_TRANSITIONS.get(case.status, set())
                # Reopen exception for admin
                if case.status == "closed" and operator.role == "security_administrator":
                    allowed_next = {"investigating"}

                if target_status not in allowed_next:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Invalid status transition from '{case.status}' to '{target_status}'. Allowed: {sorted(list(allowed_next))}",
                    )

                case.status = target_status
                status_changed = True

                if target_status == "closed":
                    case.closed_at = now_iso
                    case.closed_by = operator.username
                elif old_status == "closed":
                    case.closed_at = None
                    case.closed_by = None

        case.updated_at = now_iso
        case.advisory_summary = generate_advisory_summary(case)
        saved = self.store.save_case(case)

        # Audit emission
        audit_event_type = "CASE_CLOSED" if (status_changed and saved.status == "closed") else "CASE_UPDATED"
        try:
            record_operator_audit(
                db=db,
                event_type=audit_event_type,
                source="case_management",
                severity="info",
                message=json.dumps({
                    "case_id": saved.case_id,
                    "old_status": old_status,
                    "new_status": saved.status,
                    "assigned_to": saved.assigned_to,
                    "operator_id": operator.username,
                }),
            )
        except Exception as e:
            logger.error("Failed recording %s audit: %s", audit_event_type, str(e))

        # Real-time event publishing
        try:
            default_event_bus.publish(
                event_type="system.case.updated",
                payload={
                    "case_id": saved.case_id,
                    "status": saved.status,
                    "assigned_to": saved.assigned_to,
                    "operator_id": operator.username,
                },
            )
        except Exception:
            pass

        return saved

    def complete_task(
        self,
        case_id: str,
        task_id: str,
        payload: CaseTaskCompleteRequest,
        operator: Operator,
        db: Session,
    ) -> IncidentCase:
        """Mark a playbook SOP task complete or skipped."""
        case = self.get_case(case_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Find target task
        target_task = None
        for t in case.tasks:
            if t.task_id == task_id:
                target_task = t
                break

        if target_task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found in case '{case_id}'",
            )

        # Target status
        clean_task_status = payload.status.lower().strip()
        if clean_task_status not in ("completed", "skipped"):
            clean_task_status = "completed"

        # Idempotency check: already in target state
        if target_task.status == clean_task_status and target_task.completed_by:
            if payload.notes:
                target_task.notes = payload.notes[:1000]
            if payload.command_execution_id:
                target_task.command_execution_id = payload.command_execution_id[:128]
            case.updated_at = now_iso
            return self.store.save_case(case)

        target_task.status = clean_task_status
        target_task.completed_by = operator.username
        target_task.completed_at = now_iso
        if payload.notes:
            target_task.notes = payload.notes[:1000]
        if payload.command_execution_id:
            target_task.command_execution_id = payload.command_execution_id[:128]

        # Recalculate playbook progress
        completed_count = len([t for t in case.tasks if t.status == "completed"])
        total_count = max(1, len(case.tasks))
        case.playbook_progress = round(completed_count / total_count, 2)
        case.updated_at = now_iso
        case.advisory_summary = generate_advisory_summary(case)

        saved = self.store.save_case(case)

        # Audit emission
        try:
            record_operator_audit(
                db=db,
                event_type="CASE_TASK_COMPLETED",
                source="case_management",
                severity="info",
                message=json.dumps({
                    "case_id": saved.case_id,
                    "task_id": target_task.task_id,
                    "task_title": target_task.title,
                    "task_status": target_task.status,
                    "operator_id": operator.username,
                    "command_execution_id": target_task.command_execution_id,
                    "playbook_progress": saved.playbook_progress,
                }),
            )
        except Exception as e:
            logger.error("Failed recording CASE_TASK_COMPLETED audit: %s", str(e))

        # Real-time event publishing
        try:
            default_event_bus.publish(
                event_type="system.case.task_completed",
                payload={
                    "case_id": saved.case_id,
                    "task_id": target_task.task_id,
                    "task_status": target_task.status,
                    "playbook_progress": saved.playbook_progress,
                    "operator_id": operator.username,
                },
            )
        except Exception:
            pass

        return saved

    def add_note(
        self,
        case_id: str,
        message: str,
        operator: Operator,
        db: Session,
    ) -> CaseNote:
        """Append an investigation journal note to an incident case."""
        case = self.get_case(case_id)
        clean_msg = message.strip()
        if not clean_msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Note message cannot be empty",
            )
        if len(clean_msg) > 5000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Note message cannot exceed 5000 characters",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        note = CaseNote(
            note_id=str(uuid.uuid4())[:8],
            operator_id=operator.username,
            role=operator.role,
            message=clean_msg,
            created_at=now_iso,
        )

        case.notes.append(note)
        case.updated_at = now_iso
        case.advisory_summary = generate_advisory_summary(case)
        self.store.save_case(case)

        # Audit emission
        try:
            record_operator_audit(
                db=db,
                event_type="CASE_NOTE_ADDED",
                source="case_management",
                severity="info",
                message=json.dumps({
                    "case_id": case.case_id,
                    "note_id": note.note_id,
                    "operator_id": operator.username,
                    "preview": note.message[:120],
                }),
            )
        except Exception as e:
            logger.error("Failed recording CASE_NOTE_ADDED audit: %s", str(e))

        # Real-time event publishing
        try:
            default_event_bus.publish(
                event_type="system.case.updated",
                payload={
                    "case_id": case.case_id,
                    "note_added": note.note_id,
                    "operator_id": operator.username,
                },
            )
        except Exception:
            pass

        return note

    def generate_pir_report(
        self,
        case_id: str,
        operator: Operator,
    ) -> PostIncidentReportResponse:
        """Generate a deterministic Post-Incident Review (PIR) report for a case."""
        case = self.get_case(case_id)
        return generate_post_incident_report(case, operator.username)


default_case_service = CaseManagementService()
