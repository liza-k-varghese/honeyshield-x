"""Detection Rules & Efficacy API Router for HoneyShield X (Module 3.3)."""

import logging
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.multi_vector_detection.efficacy import calculate_rule_efficacy
from app.multi_vector_detection.models import CANONICAL_VECTORS, DetectionRule
from app.multi_vector_detection.registry import default_registry
from app.schemas import (
    DetectionRuleSummary,
    DetectionSimulationRequest,
    DetectionSimulationResponse,
    RuleCatalogResponse,
    RuleEfficacyResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/detection/rules",
    tags=["Detection Rules & Efficacy"],
)


def _serialize_rule(rule: DetectionRule) -> DetectionRuleSummary:
    """Safely serialize an immutable DetectionRule dataclass into a response schema."""
    regex_strs = [p.pattern for p in rule.regex_patterns]
    return DetectionRuleSummary(
        rule_id=rule.rule_id,
        name=rule.name,
        vector=rule.vector,
        description=rule.description,
        severity=rule.severity,
        base_risk_score=rule.base_risk_score,
        rule_type=rule.rule_type,
        target_event_types=list(rule.target_event_types),
        window_minutes=rule.window_minutes,
        threshold_count=rule.threshold_count,
        match_tokens=list(rule.match_tokens),
        regex_patterns=regex_strs,
        is_active=True,
        is_immutable=True,
    )


@router.get(
    "",
    response_model=RuleCatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="List all registered declarative detection rules",
)
def list_rules_endpoint(
    vector: str | None = Query(
        default=None,
        description="Filter by canonical vector category ('auth', 'web', 'network')",
    ),
    rule_type: str | None = Query(
        default=None,
        description="Filter by rule type ('threshold' or 'signature')",
    ),
) -> RuleCatalogResponse:
    """Retrieve catalog of declarative detection rules with optional filtering."""
    # Handle direct function invocations in test harnesses where Query() is default
    v_clean = vector if isinstance(vector, str) else None
    rt_clean = rule_type if isinstance(rule_type, str) else None

    if v_clean is not None and v_clean not in CANONICAL_VECTORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid vector '{v_clean}'. Must be one of {CANONICAL_VECTORS}",
        )

    if rt_clean is not None and rt_clean not in ("threshold", "signature"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid rule_type '{rt_clean}'. Must be 'threshold' or 'signature'",
        )

    all_rules = default_registry.get_all_rules()

    filtered = all_rules
    if v_clean:
        filtered = [r for r in filtered if r.vector == v_clean]
    if rt_clean:
        filtered = [r for r in filtered if r.rule_type == rt_clean]

    summaries = [_serialize_rule(r) for r in filtered]
    return RuleCatalogResponse(
        total_rules=len(summaries),
        rules=summaries,
    )


@router.get(
    "/{rule_id}",
    response_model=DetectionRuleSummary,
    status_code=status.HTTP_200_OK,
    summary="Get detailed specification for a specific detection rule",
)
def get_rule_detail_endpoint(
    rule_id: str,
) -> DetectionRuleSummary:
    """Retrieve comprehensive criteria, patterns, and thresholds for a single detection rule."""
    rule = default_registry.get_rule(rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection rule '{rule_id}' not found in registry",
        )
    return _serialize_rule(rule)


@router.get(
    "/{rule_id}/efficacy",
    response_model=RuleEfficacyResponse,
    status_code=status.HTTP_200_OK,
    summary="Get empirical performance and trigger statistics for a detection rule",
)
def get_rule_efficacy_endpoint(
    rule_id: str,
    time_range_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Lookback window in hours (1-168)",
    ),
    db: Session = Depends(get_db),
) -> RuleEfficacyResponse:
    """Retrieve empirical performance metrics, trigger counts, and heuristic false-positive indicators."""
    result = calculate_rule_efficacy(
        db=db,
        rule_id=rule_id,
        time_range_hours=time_range_hours,
    )
    return RuleEfficacyResponse(**result)


@router.post(
    "/{rule_id}/simulate",
    response_model=DetectionSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Safely simulate detection rule against test datasets without live containment or alerts",
)
def simulate_detection_rule(
    rule_id: str,
    payload: DetectionSimulationRequest,
) -> DetectionSimulationResponse:
    """Evaluate a detection rule against synthetic test events in a read-only laboratory sandbox.

    Guarantees:
    - Zero live database mutation.
    - Zero active alerts emitted to transactional outbox.
    - Zero live containment actions triggered.
    - Computes precision, recall, and false positive metrics when ground-truth labels exist.
    """
    rule = default_registry.get_rule(rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection rule '{rule_id}' not found in registry",
        )

    matched_events: list[dict[str, Any]] = []
    unmatched_events: list[dict[str, Any]] = []
    candidate_alerts: list[dict[str, Any]] = []

    tp = 0
    fp = 0
    tn = 0
    fn = 0
    has_labels = False

    for ev in payload.test_events:
        # Check matching criteria
        msg = str(ev.get("message", "") or "")
        payload_data = str(ev.get("payload", "") or "")
        target_type = str(ev.get("event_type", "") or "")
        source_ip = ev.get("source_ip", "127.0.0.1")

        is_match = False

        # Match token check
        if rule.match_tokens:
            for tok in rule.match_tokens:
                if tok.lower() in msg.lower() or tok.lower() in payload_data.lower():
                    is_match = True
                    break

        # Regex check
        if not is_match and rule.regex_patterns:
            for pattern in rule.regex_patterns:
                if pattern.search(msg) or pattern.search(payload_data):
                    is_match = True
                    break

        # Event type filter
        if rule.target_event_types and target_type:
            target_norm = target_type.lower().replace("-", "_").replace(" ", "_")
            for t in rule.target_event_types:
                t_norm = t.lower().replace("-", "_").replace(" ", "_")
                if target_norm == t_norm or target_norm.startswith(t_norm) or t_norm.startswith(target_norm) or (("auth" in target_norm) and ("auth" in t_norm)):
                    is_match = True
                    break

        if is_match:
            matched_events.append(ev)
            candidate_alerts.append({
                "rule_id": rule.rule_id,
                "rule_name": rule.name,
                "severity": rule.severity,
                "base_risk_score": rule.base_risk_score,
                "matched_event": ev,
                "simulated_alert_type": f"SIM_{rule.rule_id.upper()}",
            })
        else:
            unmatched_events.append(ev)

        # Ground truth metric calculation if label present
        if "ground_truth_malicious" in ev:
            has_labels = True
            is_malicious = bool(ev["ground_truth_malicious"])
            if is_match and is_malicious:
                tp += 1
            elif is_match and not is_malicious:
                fp += 1
            elif not is_match and not is_malicious:
                tn += 1
            elif not is_match and is_malicious:
                fn += 1

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else (1.0 if has_labels else None)
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else (1.0 if has_labels else None)
    fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else (0.0 if has_labels else None)
    f1 = round(2 * (precision * recall) / (precision + recall), 4) if (precision is not None and recall is not None and (precision + recall) > 0) else (0.0 if has_labels else None)

    metrics = {
        "true_positives": tp if has_labels else None,
        "false_positives": fp if has_labels else None,
        "true_negatives": tn if has_labels else None,
        "false_negatives": fn if has_labels else None,
        "precision": precision,
        "recall": recall,
        "false_positive_rate": fpr,
        "f1_score": f1,
    }

    return DetectionSimulationResponse(
        rule_id=rule.rule_id,
        rule_name=rule.name,
        total_evaluated=len(payload.test_events),
        matched_count=len(matched_events),
        unmatched_count=len(unmatched_events),
        metrics=metrics,
        matched_events=matched_events,
        candidate_alerts=candidate_alerts,
        simulation_mode=True,
    )

