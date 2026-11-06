"""FastAPI Router for Production Observability, Health and Operational Alarms (Milestone 8).

Endpoints:
- GET /api/v1/system/health/detailed
- GET /api/v1/system/metrics
- GET /api/v1/system/alerts/operational
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_operator
from app.auth.registry import Operator
from app.database import get_db
from app.observability.alerts import default_alert_manager
from app.observability.health import evaluate_full_system_health
from app.observability.metrics import default_metrics_collector

router = APIRouter(
    prefix="/system",
    tags=["Production Observability & SRE Operations"],
)


@router.get(
    "/health/detailed",
    status_code=status.HTTP_200_OK,
    summary="Retrieve full operational health across all 13 HoneyShield X subsystems",
)
def get_detailed_system_health(
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Inspect status of backend, PostgreSQL, Redis, Outbox, WebSockets, Detection, Deception, Intel, and Agents."""
    return evaluate_full_system_health(db=db)


@router.get(
    "/metrics",
    status_code=status.HTTP_200_OK,
    summary="Retrieve system telemetry, latency distributions, and queue indicators",
)
def get_system_metrics(
    format: str | None = Query(default="json", description="Export format: json or prometheus"),
    operator: Operator = Depends(get_current_operator),
) -> Any:
    """Retrieve operational telemetry in JSON format or Prometheus exposition standard."""
    if format == "prometheus":
        prom_text = default_metrics_collector.to_prometheus()
        return Response(content=prom_text, media_type="text/plain; version=0.0.4")
    return default_metrics_collector.snapshot()


@router.get(
    "/alerts/operational",
    status_code=status.HTTP_200_OK,
    summary="Retrieve active infrastructure alerts and SRE on-call diagnostics",
)
def get_operational_alarms(
    operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Evaluate current telemetry and active failures to produce actionable on-call alerts."""
    health_data = evaluate_full_system_health(db=db)
    alarms = default_alert_manager.evaluate_alarms(health_data=health_data)
    return [
        {
            "alarm_id": a.alarm_id,
            "severity": a.severity.value,
            "title": a.title,
            "description": a.description,
            "affected_component": a.affected_component,
            "recommended_action": a.recommended_action,
            "runbook_section": a.runbook_section,
            "triggered_at": a.triggered_at,
        }
        for a in alarms
    ]

