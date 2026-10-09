"""Incident Command Service Layer (Module 3.4).

Implements:
- Governed command execution with row locks, Governor policy checks, circuit breaker tracking,
  and immutable SystemEvent auditing.
- Virtual Incident aggregation over existing Alert and Attack models with zero schema migrations.
- Allowlisted action catalog and parameter specifications.
"""

from datetime import datetime, timezone
import json
import logging
import time
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import (
    ALLOWED_ACTIONS,
    BLAST_RADIUS_TIERS,
    ENTITY_COOLDOWN_SECONDS,
    default_governor,
)
from app.models import Alert, Attack, AttackEvent
from app.notifications.service import dispatch_alert_notification
from app.schemas import (
    ActionCatalogResponse,
    AllowlistedActionItem,
    IncidentCommandRequest,
    IncidentCommandResponse,
    VirtualIncidentItem,
    VirtualIncidentsResponse,
)

logger = logging.getLogger(__name__)

ACTION_DESCRIPTIONS: dict[str, str] = {
    "ALERT_ACKNOWLEDGE": "Transitions alert lifecycle status from 'open' to 'acknowledged'.",
    "ALERT_RESOLVE": "Transitions alert lifecycle status to 'resolved' with mandatory operator rationale.",
    "ALERT_ESCALATE": "Elevates alert severity to the next band (low -> medium -> high -> critical).",
    "NOTIFICATION_DISPATCH": "Dispatches alert notification to configured outbound webhook under Circuit Breaker.",
    "NOTIFICATION_SUPPRESS": "Suppresses outbound notification dispatch for the target alert.",
    "CONTAINMENT_STAGING_REQUEST": "Stages an IP containment recommendation and audit record without kernel tampering.",
    "GOVERNOR_LOCKOUT_ENGAGE": "Engages system-wide emergency freeze on all outbound notification dispatches.",
    "GOVERNOR_LOCKOUT_RELEASE": "Releases emergency outbound dispatch freeze.",
    "SOAR_BLOCK_DISPATCH": "Dispatches external containment action to configured SOAR platform with Tier-3 Governor governance.",
}

def _circuit_breaker_transition_listener(prev: str, curr: str, reason: str) -> None:
    """Publish circuit breaker transitions to the event bus."""
    event_type = "breaker.tripped" if curr == "OPEN" else "breaker.recovered"
    default_event_bus.publish_event(
        event_type,
        {
            "previous_state": prev,
            "current_state": curr,
            "reason": reason,
        },
    )

default_governor.circuit_breaker.register_transition_listener(_circuit_breaker_transition_listener)

SEVERITY_ESCALATION_MAP: dict[str, str] = {
    "low": "medium",
    "medium": "high",
    "high": "critical",
    "critical": "critical",
    "unknown": "medium",
}


def get_allowlisted_actions_catalog() -> ActionCatalogResponse:
    """Return catalog of all allowlisted actions and their governance constraints."""
    items: list[AllowlistedActionItem] = []
    for action in sorted(ALLOWED_ACTIONS):
        blast_tier = BLAST_RADIUS_TIERS.get(action, 1)
        requires_just = blast_tier >= 2 and action not in ("GOVERNOR_LOCKOUT_ENGAGE", "GOVERNOR_LOCKOUT_RELEASE")
        cooldown = 0.0 if action.startswith("GOVERNOR_LOCKOUT") else ENTITY_COOLDOWN_SECONDS
        desc = ACTION_DESCRIPTIONS.get(action, "Governed incident command action.")
        items.append(
            AllowlistedActionItem(
                action=action,
                blast_tier=blast_tier,
                requires_justification=requires_just,
                cooldown_seconds=cooldown,
                description=desc,
            )
        )
    return ActionCatalogResponse(total_actions=len(items), actions=items)


def execute_incident_command(
    db: Session,
    request: IncidentCommandRequest,
    idempotency_key: str,
    operator_id: str = "default_operator",
) -> IncidentCommandResponse:
    """Execute a governed incident command with row locks, policy enforcement, and audit durability."""
    start_time = time.time()
    command_id = f"cmd-{uuid.uuid4().hex[:12]}"

    # 1. Validate & check idempotency key
    clean_idem_key = default_governor.validate_idempotency_key(idempotency_key)
    cached_response = default_governor.check_idempotency(clean_idem_key)
    if cached_response is not None:
        logger.info("Returning cached response for idempotency key '%s'", clean_idem_key)
        return IncidentCommandResponse(**cached_response)

    # 2. Evaluate Governor Policy (allowlist, rate limit, cooldown, lockout, breaker)
    try:
        default_governor.evaluate_command_policy(
            action=request.action,
            target_id=request.target_id,
            operator_id=operator_id,
            justification=request.justification,
            approval_token=request.approval_token,
        )
    except HTTPException as e:
        # Release in-progress reservation so client can retry with same key after resolving issue
        default_governor.release_idempotency_key(clean_idem_key)

        # Audit rejected command
        audit_payload = {
            "command_id": command_id,
            "idempotency_key": clean_idem_key,
            "action": request.action,
            "target_id": request.target_id,
            "operator_id": operator_id,
            "rejected_status_code": e.status_code,
            "rejection_reason": e.detail,
        }
        record_operator_audit(
            db=db,
            event_type="INCIDENT_COMMAND_REJECTED",
            message=json.dumps(audit_payload),
            source="incident_command",
            severity="warning",
        )
        default_event_bus.publish_event(
            "command.rejected",
            {
                "command_id": command_id,
                "action": request.action,
                "target_id": request.target_id,
                "operator_id": operator_id,
                "reason": e.detail,
            },
        )
        raise e

    # 3. Execute Allowlisted Action Logic
    action = request.action
    target_id = request.target_id
    new_status: str | None = None
    msg: str = "Command executed successfully"
    previous_state: dict[str, Any] = {}

    try:
        if action == "ALERT_ACKNOWLEDGE":
            alert = (
                db.query(Alert)
                .filter(Alert.id == target_id)
                .with_for_update()
                .first()
            )
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            if alert.status == "resolved":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Alert #{target_id} is in terminal 'resolved' state and cannot be acknowledged.",
                )
            previous_state = {"status": alert.status}
            alert.status = "acknowledged"
            db.commit()
            db.refresh(alert)
            new_status = "acknowledged"
            msg = f"Alert #{target_id} acknowledged by {operator_id}"

        elif action == "ALERT_RESOLVE":
            alert = (
                db.query(Alert)
                .filter(Alert.id == target_id)
                .with_for_update()
                .first()
            )
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            if alert.status == "resolved":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Alert #{target_id} is already in terminal 'resolved' state.",
                )
            previous_state = {"status": alert.status}
            alert.status = "resolved"
            db.commit()
            db.refresh(alert)
            new_status = "resolved"
            msg = f"Alert #{target_id} resolved: {request.justification}"

        elif action == "ALERT_ESCALATE":
            alert = (
                db.query(Alert)
                .filter(Alert.id == target_id)
                .with_for_update()
                .first()
            )
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            if alert.status == "resolved":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Alert #{target_id} is in terminal 'resolved' state and cannot be escalated.",
                )
            cur_sev = (alert.severity or "low").lower()
            previous_state = {"severity": alert.severity}
            next_sev = SEVERITY_ESCALATION_MAP.get(cur_sev, "critical")
            alert.severity = next_sev
            db.commit()
            db.refresh(alert)
            new_status = f"severity:{next_sev}"
            msg = f"Alert #{target_id} escalated from {cur_sev} to {next_sev}"

        elif action == "NOTIFICATION_DISPATCH":
            alert = db.query(Alert).filter(Alert.id == target_id).first()
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            previous_state = {"notification_status": alert.notification_status}
            # Execute Module 2.6 dispatch under circuit breaker tracking
            dispatch_result = dispatch_alert_notification(db=db, alert_id=target_id)
            if dispatch_result.get("sent"):
                default_governor.circuit_breaker.record_success()
                new_status = "delivered"
                msg = f"Notification for Alert #{target_id} dispatched successfully"
            else:
                default_governor.circuit_breaker.record_failure(
                    dispatch_result.get("message", "dispatch failed")
                )
                new_status = "failed"
                msg = f"Notification dispatch failed: {dispatch_result.get('message')}"

        elif action == "NOTIFICATION_SUPPRESS":
            alert = (
                db.query(Alert)
                .filter(Alert.id == target_id)
                .with_for_update()
                .first()
            )
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            previous_state = {"notification_status": alert.notification_status}
            alert.notification_status = "suppressed"
            db.commit()
            db.refresh(alert)
            new_status = "suppressed"
            msg = f"Notification for Alert #{target_id} suppressed by {operator_id}"

        elif action == "CONTAINMENT_STAGING_REQUEST":
            alert = db.query(Alert).filter(Alert.id == target_id).first()
            if not alert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Alert #{target_id} not found",
                )
            attacker_ip = "unknown"
            if alert.attack_id:
                atk = db.query(Attack).filter(Attack.id == alert.attack_id).first()
                if atk and atk.source_ip:
                    attacker_ip = atk.source_ip

            previous_state = {"containment": "uncontained"}
            new_status = "staged_containment"
            msg = (
                f"Containment recommendation staged for Alert #{target_id} (IP: {attacker_ip}). "
                f"Blocklist artifact generated in audit log. (Host kernel routing untouched)."
            )

        elif action == "GOVERNOR_LOCKOUT_ENGAGE":
            previous_state = {"lockout": default_governor.is_lockout_engaged}
            default_governor.set_lockout(True)
            new_status = "lockout_engaged"
            msg = f"Emergency outbound lockout engaged by {operator_id}: {request.justification}"
            default_event_bus.publish_event("governor.lockout", {"engaged": True, "operator_id": operator_id})

        elif action == "GOVERNOR_LOCKOUT_RELEASE":
            previous_state = {"lockout": default_governor.is_lockout_engaged}
            default_governor.set_lockout(False)
            new_status = "lockout_released"
            msg = f"Emergency outbound lockout released by {operator_id}"
            default_event_bus.publish_event("governor.lockout", {"engaged": False, "operator_id": operator_id})

        elif action == "SOAR_BLOCK_DISPATCH":
            previous_state = {"containment": "uncontained"}
            new_status = "soar_containment_staged"
            msg = (
                f"External SOAR containment dispatch executed for target '{target_id}' "
                f"by {operator_id}. (Tier-3 Governor validated, host kernel routing untouched)."
            )
            default_event_bus.publish_event(
                "soar.containment.dispatched",
                {
                    "target_id": str(target_id),
                    "operator_id": operator_id,
                    "justification": request.justification,
                },
            )

    except HTTPException as e:
        default_governor.release_idempotency_key(clean_idem_key)
        audit_payload = {
            "command_id": command_id,
            "idempotency_key": clean_idem_key,
            "action": action,
            "target_id": target_id,
            "operator_id": operator_id,
            "rejected_status_code": e.status_code,
            "rejection_reason": e.detail,
        }
        record_operator_audit(
            db=db,
            event_type="INCIDENT_COMMAND_REJECTED",
            message=json.dumps(audit_payload),
            source="incident_command",
            severity="warning",
        )
        default_event_bus.publish_event(
            "command.rejected",
            {
                "command_id": command_id,
                "action": action,
                "target_id": target_id,
                "operator_id": operator_id,
                "reason": e.detail,
            },
        )
        raise e
    except Exception as e:
        default_governor.release_idempotency_key(clean_idem_key)
        logger.error("Unexpected error executing action '%s': %s", action, e, exc_info=True)
        audit_payload = {
            "command_id": command_id,
            "idempotency_key": clean_idem_key,
            "action": action,
            "target_id": target_id,
            "operator_id": operator_id,
            "rejected_status_code": 500,
            "rejection_reason": f"Internal error executing command: {type(e).__name__}",
        }
        record_operator_audit(
            db=db,
            event_type="INCIDENT_COMMAND_REJECTED",
            message=json.dumps(audit_payload),
            source="incident_command",
            severity="error",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing command: {type(e).__name__}",
        )

    # 4. Record action execution in Governor (rate limit and cooldown)
    default_governor.record_action_executed(action, target_id, operator_id)

    # 5. Persist Immutable SystemEvent Audit Record
    duration_ms = round((time.time() - start_time) * 1000, 2)
    audit_data = {
        "command_id": command_id,
        "idempotency_key": clean_idem_key,
        "action": action,
        "target_id": target_id,
        "operator_id": operator_id,
        "justification": request.justification,
        "previous_state": previous_state,
        "new_status": new_status,
        "execution_duration_ms": duration_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    audit_row = record_operator_audit(
        db=db,
        event_type="INCIDENT_COMMAND_EXECUTED",
        message=json.dumps(audit_data),
        source="incident_command",
        severity="info",
    )
    audit_event_id = audit_row.id if audit_row else None

    # 6. Publish to Real-Time EventBus
    default_event_bus.publish_event(
        "command.completed",
        {
            "command_id": command_id,
            "action": action,
            "target_id": target_id,
            "new_status": new_status,
            "operator_id": operator_id,
        },
    )
    if action in ("ALERT_ACKNOWLEDGE", "ALERT_RESOLVE", "ALERT_ESCALATE"):
        default_event_bus.publish_event(
            "alert.updated",
            {"alert_id": target_id, "new_status": new_status, "action": action},
        )

    # 7. Construct & Cache Response
    response_obj = IncidentCommandResponse(
        command_id=command_id,
        success=True,
        action=action,
        target_id=target_id,
        new_status=new_status,
        message=msg,
        governor_status="ALLOWED",
        audit_event_id=audit_event_id,
        execution_duration_ms=duration_ms,
    )

    default_governor.record_idempotency_completion(clean_idem_key, response_obj.model_dump())
    return response_obj


def get_virtual_incidents(
    db: Session,
    status_filter: str | None = None,
    limit: int = 50,
) -> VirtualIncidentsResponse:
    """Project existing Alert and Attack database records into virtual incidents without schema changes."""
    bounded_limit = min(max(1, limit), 200)

    # Query Alerts with optional status filter
    alert_query = db.query(Alert)
    if status_filter and status_filter.lower() != "all":
        alert_query = alert_query.filter(Alert.status == status_filter.lower().strip())

    alerts = alert_query.order_by(Alert.id.desc()).limit(bounded_limit).all()

    # Pre-fetch associated Attacks
    attack_ids = [a.attack_id for a in alerts if a.attack_id is not None]
    attacks_map: dict[int, Attack] = {}
    if attack_ids:
        attacks = db.query(Attack).filter(Attack.id.in_(attack_ids)).all()
        attacks_map = {atk.id: atk for atk in attacks}

    # Pre-count AttackEvents
    event_counts: dict[int, int] = {}
    if attack_ids:
        counts = (
            db.query(AttackEvent.attack_id, func.count(AttackEvent.id))
            .filter(AttackEvent.attack_id.in_(attack_ids))
            .group_by(AttackEvent.attack_id)
            .all()
        )
        event_counts = {atk_id: count for atk_id, count in counts}

    items: list[VirtualIncidentItem] = []
    for a in alerts:
        atk = attacks_map.get(a.attack_id) if a.attack_id else None
        source_ip = atk.source_ip if (atk and atk.source_ip) else "unknown"
        attack_type = atk.attack_type if (atk and atk.attack_type) else a.alert_type
        risk_score = atk.risk_score if (atk and atk.risk_score is not None) else 0.0
        ev_count = event_counts.get(a.attack_id, 0) if a.attack_id else 0

        items.append(
            VirtualIncidentItem(
                incident_id=f"INC-{a.id}",
                alert_id=a.id,
                attack_id=a.attack_id,
                source_ip=source_ip,
                attack_type=attack_type,
                severity=a.severity,
                status=a.status,
                risk_score=risk_score,
                notification_status=a.notification_status,
                event_count=ev_count,
                created_at=a.created_at,
            )
        )

    return VirtualIncidentsResponse(total_incidents=len(items), incidents=items)
