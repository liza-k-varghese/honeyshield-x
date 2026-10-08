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
