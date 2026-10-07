"""Dashboard metrics router for HoneyShield X SOC Workspace (Module 3.1)."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status
import redis
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Attack
from app.schemas import (
    AlertSeverityCounts,
    DashboardStatsResponse,
    SystemHealthSummary,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["SOC Dashboard"],
)

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated SOC dashboard security metrics",
)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStatsResponse:
    """Retrieve real-time aggregated security KPIs for the SOC dashboard.

    Calculates:
    - Total attack containers recorded
    - Total active/open alerts count
    - Active alerts categorized by severity (critical, high, medium, low)
    - Unique attacker IP addresses observed within the last 24 hours
    - System health for API, PostgreSQL, and Redis
    """
    # 1. Total attacks count
    total_attacks_stmt = select(func.count(Attack.id))
    total_attacks = db.scalar(total_attacks_stmt) or 0

    # 2. Total active alerts (status == 'open')
    active_alerts_stmt = select(func.count(Alert.id)).where(Alert.status == "open")
    active_alerts = db.scalar(active_alerts_stmt) or 0

    # 3. Active alerts grouped by severity
    severity_stmt = (
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.status == "open")
        .group_by(Alert.severity)
    )
    severity_rows = db.execute(severity_stmt).all()
    severity_dict: dict[str, int] = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
    }
    for sev, count in severity_rows:
        sev_key = sev.lower() if isinstance(sev, str) else str(sev)
        if sev_key in severity_dict:
            severity_dict[sev_key] = count

    severity_counts = AlertSeverityCounts(**severity_dict)

    # 4. Unique attacker IPs within sliding 24-hour monitoring window
    window_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    unique_ips_stmt = select(
        func.count(func.distinct(Attack.source_ip))
    ).where(
        Attack.detected_at >= window_start,
        Attack.source_ip.isnot(None),
    )
    unique_ips_24h = db.scalar(unique_ips_stmt) or 0

    # 5. Health checks
    postgres_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        postgres_status = "connected"
    except Exception as error:
        postgres_status = f"error: {error}"

    redis_status = "disconnected"
    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_timeout=1.0,
        )
        redis_client.ping()
        redis_status = "connected"
        redis_client.close()
    except Exception as error:
        redis_status = f"error: {error}"

    health = SystemHealthSummary(
        api="healthy",
        postgresql=postgres_status,
        redis=redis_status,
    )

    return DashboardStatsResponse(
        total_attacks=total_attacks,
        active_alerts=active_alerts,
        active_alerts_by_severity=severity_counts,
        unique_attacker_ips_24h=unique_ips_24h,
        system_health=health,
    )
