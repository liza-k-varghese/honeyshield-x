"""Deterministic Historical Replay & Candidate Simulation API Router for HoneyShield X (Module 3.3)."""

import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.replay.service import (
    replay_attack_events,
    replay_ip_events,
    simulate_candidate_rule,
)
from app.schemas import (
    ReplayExecutionResponse,
    ReplayRequest,
    SimulationExecutionResponse,
    SimulationRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Historical Replay & Candidate Simulation"],
)


@router.post(
    "/replay/attack/{attack_id}",
    response_model=ReplayExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Deterministically replay historical events for an Attack container",
)
def replay_attack_endpoint(
    attack_id: int,
    request: ReplayRequest | None = None,
    db: Session = Depends(get_db),
) -> ReplayExecutionResponse:
    """Execute isolated, deterministic dry-run replay of historical events within an Attack container."""
    req = request or ReplayRequest()
    result = replay_attack_events(
        db=db,
        attack_id=attack_id,
        window_minutes=req.window_minutes,
        max_events=req.max_events,
        record_audit=req.record_audit,
    )
    return ReplayExecutionResponse(**result)


@router.post(
    "/replay/ip/{source_ip}",
    response_model=ReplayExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Deterministically replay historical events for a source IP across attacks",
)
def replay_ip_endpoint(
    source_ip: str,
    request: ReplayRequest | None = None,
    db: Session = Depends(get_db),
) -> ReplayExecutionResponse:
    """Execute isolated, deterministic dry-run replay of historical events for a source IP."""
    req = request or ReplayRequest()
    result = replay_ip_events(
        db=db,
        source_ip=source_ip,
        window_minutes=req.window_minutes,
        max_events=req.max_events,
        record_audit=req.record_audit,
        start_time=req.start_time,
        end_time=req.end_time,
    )
    return ReplayExecutionResponse(**result)


@router.post(
    "/simulation/rule-test",
    response_model=SimulationExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute dry-run candidate rule simulation against historical events",
)
def simulate_candidate_rule_endpoint(
    request: SimulationRequest,
    db: Session = Depends(get_db),
) -> SimulationExecutionResponse:
    """Evaluate candidate rule criteria, thresholds, or regexes against historical telemetry without mutating production state."""
    result = simulate_candidate_rule(
        db=db,
        target_scope=request.target_scope,
        target_identifier=request.target_identifier,
        candidate_spec=request.candidate_rule,
        window_minutes=request.window_minutes,
    )
    return SimulationExecutionResponse(**result)
