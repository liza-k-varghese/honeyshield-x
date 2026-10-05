"""Automated Pipeline Orchestrator service for HoneyShield X (Module 2.7).

Orchestrates the frozen Phase 2 modules in strict sequence:
1. Detection (Module 2.2)
2. Threat Intelligence (Module 2.3)
3. Risk Scoring (Module 2.4)
4. Alert Manager (Module 2.5)
5. Notification Dispatch (Module 2.6)

Preserves existing idempotency, duplicate protection, and error handling.
Records audit telemetry to the existing SystemEvent table without schema modifications.
"""

import time
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.alerts.service import evaluate_attack_alert
from app.detection.service import detect_ssh_brute_force
from app.models import Attack, SystemEvent
from app.notifications.base import BaseNotificationProvider
from app.notifications.service import dispatch_alert_notification
from app.risk.service import calculate_attack_risk
from app.threat_intelligence.service import enrich_attack


def execute_pipeline(
    db: Session,
    attack_id: int,
    notification_provider: BaseNotificationProvider | None = None,
) -> dict[str, Any]:
    """Execute the complete end-to-end security pipeline for an attack container.

    Stages:
    -------
    Stage 1: Detection Engine (detect_ssh_brute_force)
    Stage 2: Threat Intelligence (enrich_attack)
    Stage 3: Risk Scoring (calculate_attack_risk)
    Stage 4: Alert Manager (evaluate_attack_alert)
    Stage 5: Notification Dispatch (dispatch_alert_notification if alert exists)

    Returns:
        Structured dictionary matching PipelineExecutionResult schema.
    """
    start_time = time.perf_counter()

    # Verify attack existence (HTTP 404 if missing)
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    try:
        # =====================================================================
        # Stage 1 — Detection Engine (Module 2.2)
        # =====================================================================
        detection_res = detect_ssh_brute_force(db=db, attack=attack)
        stage_detection = {
            "detected": detection_res.detected,
            "detection_type": detection_res.detection_type,
            "severity": detection_res.severity,
            "risk_score": detection_res.risk_score,
            "evidence_count": detection_res.evidence_count,
            "message": detection_res.message,
        }

        # =====================================================================
        # Stage 2 — Threat Intelligence (Module 2.3)
        # =====================================================================
        ti_res = enrich_attack(db=db, attack_id=attack.id)
        stage_threat_intel = {
            "found": ti_res.get("found", False),
            "indicator_value": ti_res.get("indicator_value"),
            "threat_level": ti_res.get("threat_level"),
            "confidence": ti_res.get("confidence"),
            "source": ti_res.get("source"),
        }

        # =====================================================================
        # Stage 3 — Risk Scoring (Module 2.4)
        # =====================================================================
        risk_res = calculate_attack_risk(db=db, attack_id=attack.id)
        stage_risk = {
            "risk_score": risk_res["risk_score"],
            "severity": risk_res["severity"],
            "factors": risk_res.get("factors", []),
        }

        # =====================================================================
        # Stage 4 — Alert Manager (Module 2.5)
        # =====================================================================
        alert_res = evaluate_attack_alert(db=db, attack_id=attack.id)
        target_alert_id = alert_res.get("alert_id")
        stage_alert = {
            "alert_created": alert_res.get("alert_created", False),
            "alert_id": target_alert_id,
            "severity": alert_res.get("severity"),
            "status": alert_res.get("status"),
            "reason": alert_res.get("reason", ""),
        }

        # =====================================================================
        # Stage 5 — Notification Dispatch (Module 2.6)
        # =====================================================================
        if target_alert_id is not None:
            notif_res = dispatch_alert_notification(
                db=db,
                alert_id=target_alert_id,
                provider=notification_provider,
            )
            stage_notification = {
                "attempted": True,
                "alert_id": notif_res.get("alert_id"),
                "provider": notif_res.get("provider"),
                "sent": notif_res.get("sent", False),
                "message": notif_res.get("message", ""),
            }
        else:
            stage_notification = {
                "attempted": False,
                "alert_id": None,
                "provider": None,
                "sent": False,
                "message": "Notification skipped: no alert created or required",
            }

        # =====================================================================
        # Audit Telemetry: Record Run in existing SystemEvent table
        # =====================================================================
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        notif_state_str = (
            "sent"
            if stage_notification["sent"]
            else ("skipped" if not stage_notification["attempted"] else "failed")
        )
        audit_msg = (
            f"Pipeline processed Attack #{attack.id}: detection={stage_detection['detected']}, "
            f"risk={stage_risk['risk_score']} ({stage_risk['severity']}), "
            f"alert_id={stage_alert['alert_id']}, notification={notif_state_str}"
        )
        sys_event = SystemEvent(
            event_type="pipeline_execution",
            source="pipeline_orchestrator",
            severity="info" if stage_alert["alert_id"] else "low",
            message=audit_msg,
        )
        db.add(sys_event)
        db.commit()

        return {
            "attack_id": attack.id,
            "pipeline_status": "completed",
            "detection": stage_detection,
            "threat_intelligence": stage_threat_intel,
            "risk_scoring": stage_risk,
            "alert": stage_alert,
            "notification": stage_notification,
            "execution_time_ms": duration_ms,
        }

    except HTTPException:
        raise
    except Exception as e:
        # Audit failure to SystemEvent without exposing secrets or stack traces
        try:
            err_event = SystemEvent(
                event_type="pipeline_execution_failure",
                source="pipeline_orchestrator",
                severity="error",
                message=f"Pipeline execution failed for Attack #{attack_id}: {type(e).__name__}",
            )
            db.add(err_event)
            db.commit()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {type(e).__name__}",
        )
