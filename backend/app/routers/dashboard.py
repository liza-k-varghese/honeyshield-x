"""Dashboard metrics router for HoneyShield X SOC Workspace (Module 3.1)."""

from datetime import datetime, timedelta, timezone
import os
from fastapi import APIRouter, Depends, status
import redis
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Attack, AttackEvent, SecurityEventOutbox
from app.schemas import (
    AlertSeverityCounts,
    DashboardStatsResponse,
    DeceptionSensorSummary,
    SystemHealthSummary,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["SOC Dashboard"],
)

REDIS_HOST = os.getenv("REDIS_HOST", os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1"))
REDIS_PORT = int(os.getenv("REDIS_PORT", os.getenv("HONEYSHIELD_REDIS_PORT", "6379")))


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

    # 5. Authoritative 24-hour event calculation from persistent event tables
    events_outbox_24h = 0
    try:
        events_outbox_24h_stmt = select(func.count(SecurityEventOutbox.id)).where(
            SecurityEventOutbox.created_at >= window_start
        )
        events_outbox_24h = db.scalar(events_outbox_24h_stmt) or 0
    except Exception:
        events_outbox_24h = 0

    attack_events_24h = 0
    try:
        attack_events_24h_stmt = select(func.count(AttackEvent.id)).where(
            AttackEvent.event_time >= window_start
        )
        attack_events_24h = db.scalar(attack_events_24h_stmt) or 0
    except Exception:
        attack_events_24h = 0

    events_processed_24h = events_outbox_24h + attack_events_24h

    # 6. Authoritative Deception Sensor Health (Truth reporting)
    sensor_health_summary = None
    try:
        from app.observability.health import check_honeypots_health
        honeypot_eval = check_honeypots_health()
        active_canary_count = honeypot_eval.get("canary_traps", {}).get("active_tokens", 0)

        external_sensors = [
            {"name": "canary_tokens", "display_name": "Canary Honeytokens", "status": honeypot_eval.get("canary_traps", {}).get("status", "HEALTHY"), "configured": True, "active": True},
            {"name": "cowrie", "display_name": "Cowrie SSH/Telnet", "status": honeypot_eval.get("cowrie", {}).get("status", "NOT_CONFIGURED"), "configured": False, "active": False},
            {"name": "dionaea", "display_name": "Dionaea Malware Trap", "status": honeypot_eval.get("dionaea", {}).get("status", "NOT_CONFIGURED"), "configured": False, "active": False},
            {"name": "opencanary", "display_name": "OpenCanary Multi-Protocol", "status": honeypot_eval.get("opencanary", {}).get("status", "NOT_CONFIGURED"), "configured": False, "active": False},
            {"name": "zeek", "display_name": "Zeek Network Monitor", "status": honeypot_eval.get("zeek", {}).get("status", "NOT_CONFIGURED"), "configured": False, "active": False},
            {"name": "suricata", "display_name": "Suricata Network Probe", "status": honeypot_eval.get("suricata", {}).get("status", "NOT_CONFIGURED"), "configured": False, "active": False},
        ]
        configured_ext_count = sum(1 for s in external_sensors if s["configured"] and s["active"] and s["name"] != "canary_tokens")
        unconfigured_ext_count = sum(1 for s in external_sensors if not s["configured"])

        overall_sensor_status = "active_with_unconfigured" if (active_canary_count > 0 and unconfigured_ext_count > 0) else "healthy" if unconfigured_ext_count == 0 else "unconfigured"

        sensor_health_summary = DeceptionSensorSummary(
            status=overall_sensor_status,
            active_canary_tokens=active_canary_count,
            configured_external_sensors=configured_ext_count,
            unconfigured_external_sensors=unconfigured_ext_count,
            sensor_inventory=external_sensors,
        )
    except Exception as err:
        sensor_health_summary = DeceptionSensorSummary(
            status="unavailable",
            active_canary_tokens=0,
            configured_external_sensors=0,
            unconfigured_external_sensors=0,
            sensor_inventory=[],
        )

    # 7. Infrastructure Health checks
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

    healthy_count = 1  # FastAPI is healthy
    degraded_count = 0
    offline_count = 0

    if postgres_status in ("connected", "healthy"):
        healthy_count += 1
    else:
        offline_count += 1

    if redis_status in ("connected", "healthy"):
        healthy_count += 1
    elif "error" in redis_status or redis_status == "disconnected":
        degraded_count += 1
    else:
        degraded_count += 1

    health = SystemHealthSummary(
        api="healthy",
        postgresql=postgres_status,
        redis=redis_status,
        total_services=3,
        healthy_services=healthy_count,
        degraded_services=degraded_count,
        offline_services=offline_count,
    )

    return DashboardStatsResponse(
        total_attacks=total_attacks,
        active_alerts=active_alerts,
        active_alerts_by_severity=severity_counts,
        unique_attacker_ips_24h=unique_ips_24h,
        events_processed_24h=events_processed_24h,
        system_health=health,
        sensor_health=sensor_health_summary,
    )
