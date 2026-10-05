"""Pipeline router for HoneyShield X (Module 2.7)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.pipeline.service import execute_pipeline
from app.schemas import PipelineExecutionResult

router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline Orchestrator"],
)


@router.post(
    "/process/{attack_id}",
    response_model=PipelineExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Process an attack container through the automated security pipeline",
)
def process_pipeline_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> PipelineExecutionResult:
    """Execute the end-to-end security pipeline for an attack container.

    Chains the frozen Phase 2 modules in sequence:
    1. Detection Engine (analyzes SSH brute force pattern)
    2. Threat Intelligence (enriches source IP from local IOC database)
    3. Risk Scoring (calculates deterministic bounded 0-100 risk score and severity)
    4. Alert Manager (evaluates risk threshold >= 50.0 and deduplicates active alerts)
    5. Notification Dispatch (safely transmits alert if alert exists, preserving duplicate protection)
    """
    result = execute_pipeline(db=db, attack_id=attack_id)
    return PipelineExecutionResult(**result)
