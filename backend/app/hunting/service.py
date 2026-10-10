"""Threat Hunting Lifecycle, Concurrency, Governance, & Promotion Service (Module 3.11).

Implements:
- Deterministic hypothesis lifecycle state machine:
  DRAFT -> SCHEDULED -> RUNNING -> COMPLETED -> CONCLUDED -> ARCHIVED.
- Single-flight global concurrency lock (max 1 concurrent execution).
- Per-operator rate limit (1 execution / 10s).
- Governor Tier-2 evaluated promotions to Module 3.3 Draft Rules and Module 3.6 Incident Cases.
- Immutable SystemEvent compliance audit logging.
- EventBus publication and loop-prevention filter.
- Zero containment authority.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
import time
import threading
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.registry import Operator
from app.cases.service import default_case_service
from app.hunting.engine import RetrospectiveQueryEngine
from app.hunting.storage import HuntStore, default_hunt_store
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import default_governor
from app.multi_vector_detection.models import DetectionRule
from app.multi_vector_detection.registry import default_registry
from app.schemas import (
    CaseCreateRequest,
    HuntCreateRequest,
    HuntDossier,
    HuntEvidenceRecord,
    HuntExecutionResponse,
    HuntNote,
    HuntPromotionResponse,
    HuntQuerySpec,
    HuntUpdateRequest,
)

logger = logging.getLogger(__name__)

# Execution rate limit: 1 execution per 10s per operator
OPERATOR_RATE_LIMIT_SECONDS: float = 10.0


def make_hunt_id(title: str, creator: str, timestamp: str) -> str:
    """Generate deterministic hunt identifier: hunt-[12 hex]."""
    seed = f"{title.strip().lower()}:{creator.strip().lower()}:{timestamp}"
    hex_digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12]
    return f"hunt-{hex_digest}"


class HuntService:
    """Core domain service for threat hunting lifecycle and execution."""

    def __init__(self, store: HuntStore | None = None) -> None:
        self.store = store or default_hunt_store
        self._flight_lock = threading.Lock()
        self._rate_lock = threading.Lock()
        self._operator_last_execution: dict[str, float] = {}

        # Register EventBus subscriber with strict recursion prevention
        default_event_bus.register_listener(self.handle_event_bus_message)

    def handle_event_bus_message(self, event_type: str, payload: dict[str, Any]) -> None:
        """Handle incoming EventBus events with strict recursion prevention.

        Invariants:
        - Any event prefixed with hunt.* or system.* is immediately ignored.
        - campaign.detected and canary.tripwire generate DRAFT hypotheses only.
        - Automated suggestions are NEVER executed.
        """
        # Strict loop prevention filter
        if event_type.startswith("hunt.") or event_type.startswith("system."):
            return

        if event_type in ("campaign.detected", "canary.tripwire"):
            try:
                now_iso = datetime.now(timezone.utc).isoformat()
                target_id = payload.get("campaign_id") or payload.get("canary_id") or "telemetry"
                title = f"Suggested Hunt: Investigate {event_type} on {target_id}"[:150]
                hunt_id = make_hunt_id(title, "system_advisor", now_iso)

                if self.store.get_hunt(hunt_id) is not None:
                    return

                dossier = HuntDossier(
                    hunt_id=hunt_id,
                    title=title,
                    description=f"Automated threat hypothesis suggested following {event_type} event: {json.dumps(payload)[:500]}",
                    status="draft",
                    severity=payload.get("severity", "medium"),
                    mitre_tactics=["Initial Access", "Execution"] if event_type == "canary.tripwire" else ["Command and Control"],
                    mitre_techniques=[],
                    query_spec=HuntQuerySpec(
                        canary_ids=[str(payload.get("canary_id"))] if payload.get("canary_id") else [],
                        campaign_ids=[str(payload.get("campaign_id"))] if payload.get("campaign_id") else [],
                    ),
                    evidence=[],
                    forensic_notes=[],
                    conclusion_summary=None,
                    verdict=None,
                    promoted_rule_ids=[],
                    promoted_case_ids=[],
                    execution_count=0,
                    last_executed_at=None,
                    is_automated_suggestion=True,
                    created_by="system_advisor",
                    created_at=now_iso,
                    updated_at=now_iso,
                )
                self.store.save_hunt(dossier, is_new=True)
                logger.info("Recorded automated draft hunt suggestion %s from %s", hunt_id, event_type)
            except Exception as e:
                logger.warning("Failed processing event suggestion %s: %s", event_type, e)

    def create_hunt(
        self,
        payload: HuntCreateRequest,
        operator: Operator,
        db: Session,
    ) -> HuntDossier:
        """Create a new threat hunt hypothesis draft."""
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_title = payload.title.strip()
        if len(clean_title) < 10 or len(clean_title) > 150:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Title must be between 10 and 150 characters",
            )

        hunt_id = make_hunt_id(clean_title, operator.username, now_iso)

        # Build query spec
        q_spec = payload.query_spec or HuntQuerySpec()

        dossier = HuntDossier(
            hunt_id=hunt_id,
            title=clean_title,
            description=payload.description.strip(),
            status="draft",
            severity=payload.severity.lower(),
            mitre_tactics=payload.mitre_tactics,
            mitre_techniques=payload.mitre_techniques,
            query_spec=q_spec,
            evidence=[],
            forensic_notes=[],
            conclusion_summary=None,
            verdict=None,
            promoted_rule_ids=[],
            promoted_case_ids=[],
            execution_count=0,
            last_executed_at=None,
            is_automated_suggestion=False,
            created_by=operator.username,
            created_at=now_iso,
            updated_at=now_iso,
        )

        saved = self.store.save_hunt(dossier, is_new=True)

        # Audit emission
        record_operator_audit(
            db=db,
            event_type="HUNT_CREATED",
            source="threat_hunting",
            severity="info",
            message=f"Operator {operator.username} created threat hunt {hunt_id}: {clean_title}",
        )

        # EventBus publish
        default_event_bus.publish_event(
            event_type="hunt.created",
            payload={
                "hunt_id": hunt_id,
                "title": clean_title,
                "severity": dossier.severity,
                "created_by": operator.username,
            },
        )

        return saved

    def get_hunt(self, hunt_id: str) -> HuntDossier:
        """Retrieve full hunt dossier or raise 404."""
        hunt = self.store.get_hunt(hunt_id)
        if hunt is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threat hunt '{hunt_id}' not found",
            )
        return hunt

    def update_hunt(
        self,
        hunt_id: str,
        payload: HuntUpdateRequest,
        operator: Operator,
        db: Session,
    ) -> HuntDossier:
        """Update hunt metadata, query spec, conclusion, or append notes."""
        hunt = self.get_hunt(hunt_id)

        if hunt.status == "archived":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Hunt '{hunt_id}' is archived and immutable. No modifications permitted.",
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        # Analyst ownership check: only creator or admin may edit core hypothesis/query
        is_admin = operator.has_permission("hunt:admin")
        is_creator = hunt.created_by == operator.username

        if payload.title or payload.description or payload.query_spec:
            if not (is_creator or is_admin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Only the hypothesis creator '{hunt.created_by}' or a Security Administrator may edit core hypothesis fields",
                )

        if payload.title:
            if len(payload.title.strip()) < 10 or len(payload.title.strip()) > 150:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Title must be between 10 and 150 characters",
                )
            hunt.title = payload.title.strip()

        if payload.description:
            hunt.description = payload.description.strip()

        if payload.severity:
            hunt.severity = payload.severity.lower()

        if payload.mitre_tactics is not None:
            hunt.mitre_tactics = payload.mitre_tactics

        if payload.mitre_techniques is not None:
            hunt.mitre_techniques = payload.mitre_techniques

        if payload.query_spec is not None:
            hunt.query_spec = payload.query_spec

        # Forensic Note Composer (collaborative: any analyst/responder can append notes)
        if payload.note:
            note_text = payload.note.strip()
            if note_text:
                seed = f"{operator.username}:{now_iso}:{note_text}"
                note_id = f"note-{hashlib.sha256(seed.encode('utf-8')).hexdigest()[:8]}"
                note = HuntNote(
                    note_id=note_id,
                    operator_id=operator.username,
                    role=operator.role,
                    message=note_text,
                    created_at=now_iso,
                )
                hunt.forensic_notes.append(note)

        # Concluding Verdict
        if payload.verdict or payload.conclusion_summary:
            if hunt.status not in ("completed", "concluded"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hunt must be executed to 'completed' status before concluding with a verdict",
                )

            clean_summary = payload.conclusion_summary.strip() if payload.conclusion_summary else (hunt.conclusion_summary or "")
            if len(clean_summary) < 10:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Conclusion summary must be at least 10 characters",
                )

            verdict = payload.verdict or hunt.verdict
            if not verdict or verdict not in ("malicious_confirmed", "benign_activity", "inconclusive"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Verdict must be one of: malicious_confirmed, benign_activity, inconclusive",
                )

            hunt.conclusion_summary = clean_summary
            hunt.verdict = verdict
            hunt.status = "concluded"

            # Audit emission
            record_operator_audit(
                db=db,
                event_type="HUNT_CONCLUDED",
                source="threat_hunting",
                severity="warning",
                message=f"Operator {operator.username} concluded hunt {hunt_id} with verdict {verdict}",
            )

            # EventBus publish
            default_event_bus.publish_event(
                event_type="hunt.concluded",
                payload={
                    "hunt_id": hunt_id,
                    "verdict": verdict,
                    "operator_id": operator.username,
                },
            )

        hunt.updated_at = now_iso
        return self.store.save_hunt(hunt)

    def execute_hunt(
        self,
        hunt_id: str,
        operator: Operator,
        db: Session,
    ) -> HuntExecutionResponse:
        """Deterministically execute retrospective query scan."""
        hunt = self.get_hunt(hunt_id)

        if hunt.status == "archived":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Hunt '{hunt_id}' is archived and cannot be executed",
            )

        if hunt.status not in ("draft", "completed", "concluded"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hunt cannot be executed from status '{hunt.status}'. Allowed: draft, completed, concluded.",
            )

        now = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Operator Rate Limit (1 execution per 10s)
        with self._rate_lock:
            last_op_time = self._operator_last_execution.get(operator.username, 0.0)
            elapsed = now - last_op_time
            if elapsed < OPERATOR_RATE_LIMIT_SECONDS:
                remaining = OPERATOR_RATE_LIMIT_SECONDS - elapsed
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Operator '{operator.username}' execution rate limit exceeded (1 per 10s). Wait {remaining:.1f}s.",
                )

        # 2. Single-flight platform mutex (HTTP 409)
        acquired = self._flight_lock.acquire(blocking=False)
        if not acquired:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another threat hunt execution is currently running. Single-flight concurrency limit enforced.",
            )

        start_timer = time.time()
        try:
            with self._rate_lock:
                self._operator_last_execution[operator.username] = now

            # Transition state to running
            hunt.status = "running"
            self.store.save_hunt(hunt)

            # Execute query compilation and search
            evidence = RetrospectiveQueryEngine.execute_query(hunt.query_spec, db)

            duration_ms = round((time.time() - start_timer) * 1000.0, 2)

            hunt.evidence = evidence
            hunt.status = "completed"
            hunt.execution_count += 1
            hunt.last_executed_at = now_iso
            hunt.updated_at = now_iso
            self.store.save_hunt(hunt)

            # Audit emission
            record_operator_audit(
                db=db,
                event_type="HUNT_EXECUTED",
                source="threat_hunting",
                severity="info",
                message=f"Operator {operator.username} executed hunt {hunt_id}: {len(evidence)} records matched in {duration_ms}ms",
            )

            # EventBus publish
            default_event_bus.publish_event(
                event_type="hunt.executed",
                payload={
                    "hunt_id": hunt_id,
                    "matched_count": len(evidence),
                    "duration_ms": duration_ms,
                    "operator_id": operator.username,
                },
            )

            return HuntExecutionResponse(
                hunt_id=hunt_id,
                status=hunt.status,
                matched_count=len(evidence),
                duration_ms=duration_ms,
                evidence=evidence,
                execution_count=hunt.execution_count,
                executed_at=now_iso,
            )
        except Exception:
            hunt.status = "draft"
            self.store.save_hunt(hunt)
            raise
        finally:
            self._flight_lock.release()

    def archive_hunt(
        self,
        hunt_id: str,
        operator: Operator,
        db: Session,
    ) -> HuntDossier:
        """Terminal transition moving concluded hunt into read-only archive."""
        hunt = self.get_hunt(hunt_id)

        if hunt.status != "concluded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only hunts in 'concluded' state can be archived (current status: '{hunt.status}')",
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        hunt.status = "archived"
        hunt.updated_at = now_iso
        saved = self.store.save_hunt(hunt)

        # Audit emission
        record_operator_audit(
            db=db,
            event_type="HUNT_ARCHIVED",
            source="threat_hunting",
            severity="info",
            message=f"Administrator {operator.username} archived hunt {hunt_id}",
        )

        return saved

    def promote_to_rule(
        self,
        hunt_id: str,
        justification: str,
        operator: Operator,
        db: Session,
    ) -> HuntPromotionResponse:
        """Closed-loop promotion of hunt findings into a Module 3.3 Draft Detection Rule."""
        hunt = self.get_hunt(hunt_id)

        if hunt.status not in ("completed", "concluded"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hunt must be in 'completed' or 'concluded' status to promote findings to detection rules",
            )

        if len(hunt.evidence) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot promote hunt with zero evidence records",
            )

        clean_just = justification.strip()
        if len(clean_just) < 10:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Promotion justification must be at least 10 characters",
            )

        # Deterministic rule identifier
        seed = f"{hunt_id}:rule"
        rule_suffix = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8].upper()
        rule_id = f"DET-HUNT-{rule_suffix}"

        now_iso = datetime.now(timezone.utc).isoformat()

        # Idempotency check: if already promoted, return existing immediately without re-triggering Governor cooldown
        if rule_id in hunt.promoted_rule_ids:
            return HuntPromotionResponse(
                hunt_id=hunt_id,
                promotion_type="rule",
                target_id=rule_id,
                message=f"Rule {rule_id} was already promoted from this hunt (idempotent)",
                promoted_at=now_iso,
            )

        # Evaluate Governor Level-2 Policy
        default_governor.evaluate_command_policy(
            action="HUNT_PROMOTION_DISPATCH",
            target_id=hunt_id,
            operator_id=operator.username,
            justification=clean_just,
        )

        # Mint declarative DetectionRule
        match_token = hunt.query_spec.payload_substring or (hunt.query_spec.source_ips[0] if hunt.query_spec.source_ips else "threat_hunt_signature")
        new_rule = DetectionRule(
            rule_id=rule_id,
            name=f"Hunt Derived Rule: {hunt.title[:40]}",
            vector="web",
            description=f"[Derived from Threat Hunt {hunt_id} by {operator.username}] {hunt.description[:150]}",
            severity=hunt.severity,
            base_risk_score=7.5,
            rule_type="signature",
            target_event_types=("web_access", "web_probe", "http_request"),
            window_minutes=15,
            threshold_count=1,
            match_tokens=(match_token,),
        )

        # Register in Module 3.3 Rule Registry
        default_registry._rules[rule_id] = new_rule

        # Record governor execution timestamp for rate limiting & cooldown
        default_governor.record_action_executed(
            action="HUNT_PROMOTION_DISPATCH",
            target_id=hunt_id,
            operator_id=operator.username,
        )

        hunt.promoted_rule_ids.append(rule_id)
        hunt.updated_at = now_iso
        self.store.save_hunt(hunt)

        # Audit emission
        record_operator_audit(
            db=db,
            event_type="HUNT_RULE_PROMOTION",
            source="threat_hunting",
            severity="warning",
            message=f"Operator {operator.username} promoted hunt {hunt_id} to draft detection rule {rule_id}",
        )

        # EventBus publish
        default_event_bus.publish_event(
            event_type="hunt.promoted",
            payload={
                "hunt_id": hunt_id,
                "target_type": "rule",
                "target_id": rule_id,
                "operator_id": operator.username,
            },
        )

        return HuntPromotionResponse(
            hunt_id=hunt_id,
            promotion_type="rule",
            target_id=rule_id,
            message=f"Draft detection rule {rule_id} created in DetectionRuleRegistry. Inactive by default; test via Replay before activating.",
            promoted_at=now_iso,
        )

    def promote_to_case(
        self,
        hunt_id: str,
        justification: str,
        operator: Operator,
        db: Session,
    ) -> HuntPromotionResponse:
        """Closed-loop promotion of confirmed malicious hunt findings into an Incident Case (Module 3.6)."""
        hunt = self.get_hunt(hunt_id)

        if hunt.status not in ("completed", "concluded"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hunt must be in 'completed' or 'concluded' status to escalate to incident case",
            )

        if hunt.verdict != "malicious_confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Escalation to Incident Case requires verdict 'malicious_confirmed' (current verdict: '{hunt.verdict}')",
            )

        clean_just = justification.strip()
        if len(clean_just) < 10:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Promotion justification must be at least 10 characters",
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        # Idempotency check: if case already created, return existing immediately without re-triggering Governor cooldown
        if hunt.promoted_case_ids:
            existing_case_id = hunt.promoted_case_ids[0]
            return HuntPromotionResponse(
                hunt_id=hunt_id,
                promotion_type="case",
                target_id=existing_case_id,
                message=f"Incident Case {existing_case_id} was already escalated from this hunt (idempotent)",
                promoted_at=now_iso,
            )

        # Evaluate Governor Level-2 Policy
        default_governor.evaluate_command_policy(
            action="HUNT_PROMOTION_DISPATCH",
            target_id=hunt_id,
            operator_id=operator.username,
            justification=clean_just,
        )

        # Collect alert IDs from evidence
        alert_ids: list[int] = []
        for ev in hunt.evidence:
            if ev.entity_type == "alert":
                try:
                    alert_ids.append(int(ev.entity_id))
                except (ValueError, TypeError):
                    pass

        # Identify primary source IP from evidence if available
        primary_ip = next((ev.source_ip for ev in hunt.evidence if ev.source_ip), None)

        case_req = CaseCreateRequest(
            title=f"[Hunt Escalation] {hunt.title}"[:200],
            description=f"Automated case escalation from confirmed threat hunt {hunt_id}: {hunt.description}"[:2000],
            severity=hunt.severity,
            source_ip=primary_ip,
            target_id=None,
            initial_alert_ids=alert_ids,
            playbook_template="ADVANCED_THREAT_HUNT_DISCOVERY",
            assigned_to=operator.username,
            initial_note=f"Threat Hunt Escalation Note: Verdict confirmed malicious by {operator.username}. Justification: {clean_just}",
        )

        created_case = default_case_service.create_case(
            payload=case_req,
            operator=operator,
            db=db,
        )

        case_id = created_case.case_id

        # Record governor execution timestamp for rate limiting & cooldown
        default_governor.record_action_executed(
            action="HUNT_PROMOTION_DISPATCH",
            target_id=hunt_id,
            operator_id=operator.username,
        )

        hunt.promoted_case_ids.append(case_id)
        hunt.updated_at = now_iso
        self.store.save_hunt(hunt)

        # Audit emission
        record_operator_audit(
            db=db,
            event_type="HUNT_CASE_PROMOTION",
            source="threat_hunting",
            severity="high",
            message=f"Operator {operator.username} promoted hunt {hunt_id} to incident case {case_id}",
        )

        # EventBus publish
        default_event_bus.publish_event(
            event_type="hunt.promoted",
            payload={
                "hunt_id": hunt_id,
                "target_type": "case",
                "target_id": case_id,
                "operator_id": operator.username,
            },
        )

        return HuntPromotionResponse(
            hunt_id=hunt_id,
            promotion_type="case",
            target_id=case_id,
            message=f"Incident Case {case_id} initialized with playbook ADVANCED_THREAT_HUNT_DISCOVERY and {len(alert_ids)} linked alerts.",
            promoted_at=now_iso,
        )


# Default singleton instance
default_hunt_service = HuntService()
