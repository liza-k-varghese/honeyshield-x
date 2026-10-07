"""Unified Security Processing Engine router for HoneyShield X (Module 2.10)."""

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AttackEventCreate, UnifiedSecurityProcessingResponse
from app.unified_orchestrator.models import (
    DEFAULT_WINDOW_HOURS,
    DEFAULT_WINDOW_MINUTES,
    MAX_WINDOW_HOURS,
    MAX_WINDOW_MINUTES,
    MIN_WINDOW_HOURS,
    MIN_WINDOW_MINUTES,
)
from app.unified_orchestrator.service import (
    execute_unified_pipeline,
    ingest_and_process_event,
)

router = APIRouter(
    prefix="/orchestrator",
    tags=["Unified Security Processing Engine"],
)


@router.post(
    "/process/{attack_id}",
    response_model=UnifiedSecurityProcessingResponse,
    status_code=status.HTTP_200_OK,
    summary="Process an attack container through the unified security processing engine",
)
def process_attack_endpoint(
    attack_id: int = Path(..., description="Target attack container ID to process"),
    window_minutes: int = Query(
        default=DEFAULT_WINDOW_MINUTES,
        ge=MIN_WINDOW_MINUTES,
        le=MAX_WINDOW_MINUTES,
        description=f"Evaluation window in minutes for multi-vector detection ({MIN_WINDOW_MINUTES}-{MAX_WINDOW_MINUTES})",
    ),
    window_hours: int = Query(
        default=DEFAULT_WINDOW_HOURS,
        ge=MIN_WINDOW_HOURS,
        le=MAX_WINDOW_HOURS,
        description=f"Evaluation window in hours for cross-attack correlation ({MIN_WINDOW_HOURS}-{MAX_WINDOW_HOURS})",
    ),
    db: Session = Depends(get_db),
) -> UnifiedSecurityProcessingResponse:
    """Execute the complete Phase 2 capstone unified pipeline for an attack container.

    Chains:
    1. Ingestion Context Verification
    2. Dual Detection (Module 2.2 SSH + Module 2.9 Multi-Vector)
    3. Threat Intelligence Enrichment (Module 2.3)
    4. Cross-Attack Behavioral Correlation (Module 2.8)
    5. Operational Risk Composition & Persistence (Module 2.4 Baseline + Module 2.10 Composite)
    6. Alert Evaluation & Deduplication (Module 2.5)
    7. Notification Dispatch with Idempotent Row-Lock Protection (Module 2.6)
    8. Consolidated Audit Telemetry in SystemEvent
    """
    result = execute_unified_pipeline(
        db=db,
        attack_id=attack_id,
        window_minutes=window_minutes,
        window_hours=window_hours,
    )
    return UnifiedSecurityProcessingResponse(**result)


@router.post(
    "/ingest-and-process",
    response_model=UnifiedSecurityProcessingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a security event and trigger unified pipeline processing",
)
def ingest_and_process_endpoint(
    event_in: AttackEventCreate,
    window_minutes: int = Query(
        default=DEFAULT_WINDOW_MINUTES,
        ge=MIN_WINDOW_MINUTES,
        le=MAX_WINDOW_MINUTES,
        description=f"Evaluation window in minutes for multi-vector detection ({MIN_WINDOW_MINUTES}-{MAX_WINDOW_MINUTES})",
    ),
    window_hours: int = Query(
        default=DEFAULT_WINDOW_HOURS,
        ge=MIN_WINDOW_HOURS,
        le=MAX_WINDOW_HOURS,
        description=f"Evaluation window in hours for cross-attack correlation ({MIN_WINDOW_HOURS}-{MAX_WINDOW_HOURS})",
    ),
    db: Session = Depends(get_db),
) -> UnifiedSecurityProcessingResponse:
    """Ingest a security event and immediately run the unified pipeline.

    - If attack_id is provided, validates that the Attack exists (404 if missing).
    - If attack_id is omitted, dynamically creates a default Attack container.
    - Persists the AttackEvent to PostgreSQL (Transaction 1).
    - Executes the unified pipeline on the associated attack container (Transactions 2-5).
    """
    result = ingest_and_process_event(
        db=db,
        event_in=event_in,
        window_minutes=window_minutes,
        window_hours=window_hours,
    )
    return UnifiedSecurityProcessingResponse(**result)
