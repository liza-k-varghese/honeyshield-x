"""Unified Security Processing Engine & Capstone Orchestrator service (Module 2.10).

Unifies Modules 2.1 through 2.9 into an automated, idempotent security processing pipeline:
1. Ingestion Context Retrieval & Validation
2. Dual Detection Execution (Module 2.2 SSH + Module 2.9 Multi-Vector)
3. Threat Intelligence Enrichment (Module 2.3)
4. Cross-Attack Behavioral Correlation (Module 2.8)
5. Operational Risk Composition & Persistence (Module 2.4 Baseline + Module 2.10 Composite)
6. Alert Evaluation & Deduplication (Module 2.5)
7. Notification Dispatch with Idempotent Row-Lock Protection (Module 2.6)
8. Consolidated Audit Telemetry in SystemEvent
9. Response Assembly

Architectural Guarantees:
- Strict preservation of all frozen module contracts (2.1 - 2.9).
- Module 2.7 is NOT invoked internally.
- Alert.status is NEVER modified by notification outcomes.
- Notification deduplication and idempotency are strictly governed by Module 2.6 row locks.
"""

from datetime import datetime
import logging
import time
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.alerts.service import evaluate_attack_alert
from app.correlation.service import correlate_attack, correlate_source_ip
from app.detection.service import detect_ssh_brute_force
from app.models import Attack, AttackEvent, SystemEvent
from app.multi_vector_detection.service import evaluate_attack_rules
from app.notifications.base import BaseNotificationProvider
from app.notifications.service import dispatch_alert_notification
from app.risk.service import calculate_attack_risk
from app.schemas import AttackEventCreate
from app.threat_intelligence.service import enrich_attack
from app.unified_orchestrator.models import (
    DEFAULT_WINDOW_HOURS,
    DEFAULT_WINDOW_MINUTES,
    MAX_WINDOW_HOURS,
    MAX_WINDOW_MINUTES,
    MIN_WINDOW_HOURS,
    MIN_WINDOW_MINUTES,
    compose_operational_risk,
)

logger = logging.getLogger(__name__)


def execute_unified_pipeline(
    db: Session,
    attack_id: int,
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
    window_hours: int = DEFAULT_WINDOW_HOURS,
    notification_provider: BaseNotificationProvider | None = None,
) -> dict[str, Any]:
    """Execute the unified security processing capstone pipeline for an attack container.

    Args:
        db: SQLAlchemy database session.
        attack_id: Primary key of target Attack container.
        window_minutes: Evaluation window for multi-vector detection (1-60).
        window_hours: Evaluation window for behavioral correlation (1-168).
        notification_provider: Optional custom notification provider for dispatch.

    Returns:
        Structured dictionary matching UnifiedSecurityProcessingResponse schema.

    Raises:
        HTTPException(404): If attack_id is not found.
        HTTPException(422): If window parameters are out of bounds.
        HTTPException(500): On unexpected pipeline failure (with sanitized SystemEvent).
    """
    start_time = time.perf_counter()

    # 1. Validate window bounds
    if not (MIN_WINDOW_MINUTES <= window_minutes <= MAX_WINDOW_MINUTES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_minutes must be between {MIN_WINDOW_MINUTES} and {MAX_WINDOW_MINUTES}, got {window_minutes}",
        )
    if not (MIN_WINDOW_HOURS <= window_hours <= MAX_WINDOW_HOURS):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"window_hours must be between {MIN_WINDOW_HOURS} and {MAX_WINDOW_HOURS}, got {window_hours}",
        )

    # 2. Stage 1 — Ingestion Context Validation
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    try:
        # =====================================================================
        # Stage 2 — Dual Detection Stage
        # =====================================================================
        # A. Module 2.2 SSH Detection
        det_ssh = detect_ssh_brute_force(db=db, attack=attack)
        stage_detection_ssh = {
            "detected": det_ssh.detected,
            "detection_type": det_ssh.detection_type,
            "severity": det_ssh.severity,
            "risk_score": det_ssh.risk_score,
            "evidence_count": det_ssh.evidence_count,
            "message": det_ssh.message,
        }

        # B. Module 2.9 Multi-Vector Detection
        det_mv = evaluate_attack_rules(
            db=db,
            attack_id=attack.id,
            window_minutes=window_minutes,
        )
        stage_detection_mv = {
            "detected": det_mv.get("detected", False),
            "is_multi_vector": det_mv.get("is_multi_vector", False),
            "vectors_detected": det_mv.get("vectors_detected", []),
            "rules_triggered": det_mv.get("rules_triggered", []),
            "suggested_risk_score": det_mv.get("suggested_risk_score", 0.0),
            "severity": det_mv.get("severity", "low"),
            "message": det_mv.get("message", ""),
        }

        # =====================================================================
        # Stage 3 — Threat Intelligence Enrichment (Module 2.3)
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
        # Stage 4 — Cross-Attack Behavioral Correlation (Module 2.8)
        # =====================================================================
        if attack.source_ip:
            corr_res = correlate_source_ip(
                db=db,
                source_ip=attack.source_ip,
                window_hours=window_hours,
            )
        else:
            corr_res = correlate_attack(
                db=db,
                attack_id=attack.id,
                window_hours=window_hours,
            )
        stage_correlation = {
            "correlated": corr_res.get("correlated", False),
            "correlation_type": corr_res.get("correlation_type", "none"),
            "confidence": corr_res.get("confidence", 0.0),
            "total_attacks": corr_res.get("total_attacks", 1),
            "total_events": corr_res.get("total_events", 0),
            "reason": corr_res.get("reason", ""),
        }

        # =====================================================================
        # Stage 5 — Operational Risk Composition & Persistence (Modules 2.4 & 2.10)
        # =====================================================================
        baseline_res = calculate_attack_risk(db=db, attack_id=attack.id)
        baseline_score = float(baseline_res.get("risk_score", 0.0))

        composite = compose_operational_risk(
            baseline_score=baseline_score,
            suggested_risk_score=stage_detection_mv["suggested_risk_score"],
            rules_triggered=stage_detection_mv["detected"],
            rules_count=len(stage_detection_mv["rules_triggered"]),
            correlation_type=stage_correlation["correlation_type"],
            correlation_confidence=stage_correlation["confidence"],
        )

        # Persist operational risk & severity to PostgreSQL
        attack.risk_score = composite.operational_risk
        attack.severity = composite.operational_severity
        db.commit()

        stage_risk_composition = {
            "baseline_risk": composite.baseline_risk,
            "detection_risk": composite.detection_risk,
            "correlation_boost": composite.correlation_boost,
            "operational_risk": composite.operational_risk,
            "severity": composite.operational_severity,
        }

        # =====================================================================
        # Stage 6 — Alert Evaluation & Deduplication (Module 2.5)
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
        # Stage 7 — Notification Dispatch (Module 2.6)
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
        # Stage 8 — Consolidated Audit Telemetry (SystemEvent)
        # =====================================================================
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        notif_state = (
            "sent"
            if stage_notification["sent"]
            else ("skipped" if not stage_notification["attempted"] else "failed")
        )
        audit_msg = (
            f"Unified processing for Attack #{attack.id} (source_ip={attack.source_ip}): "
            f"detections={stage_detection_mv['vectors_detected']}, "
            f"correlation={stage_correlation['correlation_type']} (conf={stage_correlation['confidence']}), "
            f"baseline_risk={composite.baseline_risk}, operational_risk={composite.operational_risk} "
            f"({composite.operational_severity}), alert_id={stage_alert['alert_id']}, "
            f"notification={notif_state}"
        )
        sys_event = SystemEvent(
            event_type="unified_security_processing",
            source="unified_orchestrator",
            severity=composite.operational_severity,
            message=audit_msg,
        )
        db.add(sys_event)
        db.commit()

        # =====================================================================
        # Stage 9 — Response Assembly
        # =====================================================================
        return {
            "attack_id": attack.id,
            "pipeline_status": "completed",
            "source_ip": attack.source_ip,
            "attack_type": attack.attack_type,
            "provenance": composite.to_dict(),
            "detection_ssh": stage_detection_ssh,
            "detection_multi_vector": stage_detection_mv,
            "threat_intelligence": stage_threat_intel,
            "correlation": stage_correlation,
            "risk_composition": stage_risk_composition,
            "alert": stage_alert,
            "notification": stage_notification,
            "execution_time_ms": duration_ms,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unified security processing failed for attack %s", attack_id)
        try:
            err_event = SystemEvent(
                event_type="unified_security_processing_failure",
                source="unified_orchestrator",
                severity="error",
                message=f"Unified security processing failed for Attack #{attack_id}: {type(e).__name__}",
            )
            db.add(err_event)
            db.commit()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified pipeline execution failed: {type(e).__name__}",
        )


def ingest_and_process_event(
    db: Session,
    event_in: AttackEventCreate,
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
    window_hours: int = DEFAULT_WINDOW_HOURS,
    notification_provider: BaseNotificationProvider | None = None,
) -> dict[str, Any]:
    """Ingest a security event and immediately execute the unified processing pipeline.

    Semantics:
    1. If attack_id is supplied:
       - Validates Attack container exists (HTTP 404 if absent).
       - Binds event to existing Attack.
    2. If attack_id is omitted:
       - Creates default Attack container with status='detected', severity='low', risk_score=0.0.
       - Binds event to newly created Attack.
    3. Persists AttackEvent to PostgreSQL (Transaction 1).
    4. Triggers execute_unified_pipeline on target Attack container (Transactions 2-5).
    """
    # 1. Container Resolution
    if event_in.attack_id is not None:
        attack = db.query(Attack).filter(Attack.id == event_in.attack_id).first()
        if attack is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attack with ID {event_in.attack_id} not found",
            )
        target_attack_id = attack.id
    else:
        attack = Attack(
            attack_type=event_in.event_type,
            source_ip=event_in.source_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        db.add(attack)
        db.commit()
        db.refresh(attack)
        target_attack_id = attack.id

    # 2. Event Persistence (Transaction 1)
    event_time = (
        event_in.event_time.replace(tzinfo=None)
        if event_in.event_time
        else datetime.utcnow()
    )
    event = AttackEvent(
        attack_id=target_attack_id,
        event_type=event_in.event_type,
        source_ip=event_in.source_ip,
        message=event_in.message,
        event_time=event_time,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 3. Pipeline Execution (Transactions 2 through 5)
    return execute_unified_pipeline(
        db=db,
        attack_id=target_attack_id,
        window_minutes=window_minutes,
        window_hours=window_hours,
        notification_provider=notification_provider,
    )
