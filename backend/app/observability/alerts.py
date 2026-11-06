"""Operational Platform Anomaly Detection & On-Call Alerting for HoneyShield X (Milestone 8).

Monitors platform infrastructure and emits actionable, non-recursive operational alarms.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from app.observability.health import ServiceHealthStatus
from app.observability.metrics import default_metrics_collector


class AlarmSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass
class OperationalAlarm:
    alarm_id: str
    severity: AlarmSeverity
    title: str
    description: str
    affected_component: str
    recommended_action: str
    runbook_section: str
    triggered_at: str


class OperationalAlertManager:
    """Evaluates telemetry thresholds and generates actionable infrastructure alerts."""

    def evaluate_alarms(self, health_data: dict[str, Any] | None = None) -> list[OperationalAlarm]:
        if health_data is None:
            from app.observability.health import evaluate_full_system_health
            health_data = evaluate_full_system_health()

        alarms: list[OperationalAlarm] = []
        now_iso = datetime.now(timezone.utc).isoformat()
        subsystems = health_data.get("subsystems", {})

        # 1. PostgreSQL Unhealthy Check
        pg = subsystems.get("postgresql", {})
        if pg.get("status") == ServiceHealthStatus.UNAVAILABLE:
            alarms.append(
                OperationalAlarm(
                    alarm_id="ALARM-PG-UNAVAILABLE",
                    severity=AlarmSeverity.CRITICAL,
                    title="PostgreSQL Database Cluster Unreachable",
                    description="FastAPI cannot execute queries against PostgreSQL database.",
                    affected_component="postgresql",
                    recommended_action="Inspect PostgreSQL container or host daemon (`systemctl status postgresql` or `docker compose logs staging-postgres`).",
                    runbook_section="docs/release/milestone8_oncall_runbooks.md#database-failure",
                    triggered_at=now_iso,
                )
            )

        # 2. Redis Degraded Check
        redis_info = subsystems.get("redis", {})
        if redis_info.get("status") == ServiceHealthStatus.DEGRADED:
            alarms.append(
                OperationalAlarm(
                    alarm_id="ALARM-REDIS-DEGRADED",
                    severity=AlarmSeverity.WARNING,
                    title="Redis Distributed Cache Offline - Outbox Fallback Active",
                    description="Real-time Redis broker is unresponsive; HoneyShield X has engaged PostgreSQL outbox fallback.",
                    affected_component="redis",
                    recommended_action="Restart Redis service (`docker compose restart staging-redis` or `systemctl restart redis`).",
                    runbook_section="docs/release/milestone8_oncall_runbooks.md#redis-failure",
                    triggered_at=now_iso,
                )
            )

        # 3. Outbox Backlog Spike
        outbox = subsystems.get("event_outbox_publisher", {})
        backlog = outbox.get("backlog_count", 0)
        if backlog >= 50:
            alarms.append(
                OperationalAlarm(
                    alarm_id="ALARM-OUTBOX-BACKLOG-SPIKE",
                    severity=AlarmSeverity.WARNING,
                    title="Transactional Outbox Backlog Accumulation",
                    description=f"Outbox publisher backlog reached {backlog} unconfirmed events.",
                    affected_component="event_outbox_publisher",
                    recommended_action="Verify consumer throughput and network socket latency.",
                    runbook_section="docs/release/milestone8_oncall_runbooks.md#outbox-backlog",
                    triggered_at=now_iso,
                )
            )

        # 4. WebSocket Auth Failure Spike
        metrics = default_metrics_collector.snapshot()
        ws_auth_fails = metrics["realtime"]["auth_failures"]
        if ws_auth_fails >= 10:
            alarms.append(
                OperationalAlarm(
                    alarm_id="ALARM-WS-AUTH-FAILURE-SPIKE",
                    severity=AlarmSeverity.WARNING,
                    title="Elevated WebSocket Authentication Failures",
                    description=f"Recorded {ws_auth_fails} failed WebSocket ticket authentications.",
                    affected_component="websocket_gateway",
                    recommended_action="Investigate potential brute-force or stale client ticket generation loops.",
                    runbook_section="docs/release/milestone8_oncall_runbooks.md#websocket-auth-failures",
                    triggered_at=now_iso,
                )
            )

        # 5. Ingestion Error Spike
        ingest_errors = metrics["event_pipeline"]["ingestion_errors_total"]
        if ingest_errors >= 20:
            alarms.append(
                OperationalAlarm(
                    alarm_id="ALARM-INGESTION-ERROR-SPIKE",
                    severity=AlarmSeverity.WARNING,
                    title="Elevated Ingestion Schema Rejections",
                    description=f"Recorded {ingest_errors} malformed or oversized payload rejections.",
                    affected_component="ingestion_service",
                    recommended_action="Check sensor payload format compliance and field bounding constraints.",
                    runbook_section="docs/release/milestone8_oncall_runbooks.md#ingestion-errors",
                    triggered_at=now_iso,
                )
            )

        return alarms


default_alert_manager = OperationalAlertManager()

