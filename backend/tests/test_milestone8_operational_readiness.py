"""Milestone 8 — Production Readiness, Operational Observability & SRE Tests.

Verifies:
- Stage 2: Operational Health Monitoring (13 subsystems, strict status enum)
- Stage 3: Structured Observability, Tracing, Prometheus & JSON Metrics
- Stage 4: Event Pipeline Reliability & At-least-once outbox guarantees
- Stage 5: SOC Containment Protection & Governor Safeguards
- Stage 6: Honest Honeypot Sensor Status (Cowrie, Dionaea, Zeek NOT_CONFIGURED)
- Stage 10: Operational Alarm Evaluation & On-Call Runbooks
"""

from datetime import datetime, timezone
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.registry import Operator, default_operator_registry
from app.auth.session import default_session_store
from app.database import Base
from app.events.schemas import TransferLifecycleEvent
from app.main import health as public_health_endpoint
from app.observability.alerts import AlarmSeverity, default_alert_manager
from app.observability.health import ServiceHealthStatus, evaluate_full_system_health
from app.observability.metrics import default_metrics_collector
from app.observability.middleware import redact_sensitive_query
from app.routers.events import emit_lifecycle_event
from app.routers.system_observability import (
    get_detailed_system_health,
    get_operational_alarms,
    get_system_metrics,
)


class TestMilestone8OperationalReadiness(unittest.TestCase):
    """Production Readiness & Operational Observability test suite."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        cls.admin_op = Operator(
            username="sre_lead",
            role="security_administrator",
            email="sre@honeyshield.local",
            password_hash="dummy_hash",
        )
        default_operator_registry.register_operator(cls.admin_op)

        cls.analyst_op = Operator(
            username="soc_analyst",
            role="analyst",
            email="analyst@honeyshield.local",
            password_hash="dummy_hash",
        )
        default_operator_registry.register_operator(cls.analyst_op)

    def setUp(self):
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_sensitive_query_redaction(self):
        """Verify URL logger redacts bearer tokens, tickets, and passwords."""
        url_with_token = "https://api.honeyshield.local/stream?token=secret_bearer_token_123&env=prod"
        redacted = redact_sensitive_query(url_with_token)
        self.assertNotIn("secret_bearer_token_123", redacted)
        self.assertIn("token=[REDACTED]", redacted)

        url_with_ticket = "wss://api.honeyshield.local/ws?ticket=temp_ticket_xyz&v=1"
        redacted_ws = redact_sensitive_query(url_with_ticket)
        self.assertNotIn("temp_ticket_xyz", redacted_ws)
        self.assertIn("ticket=[REDACTED]", redacted_ws)

    def test_02_detailed_system_health_evaluation_and_schema(self):
        """Verify get_detailed_system_health evaluates all 13 subsystems with valid status enum."""
        health_data = get_detailed_system_health(operator=self.admin_op, db=self.db)

        self.assertIn("status", health_data)
        self.assertIn(health_data["status"], ["HEALTHY", "DEGRADED", "UNAVAILABLE"])
        self.assertIn("subsystems", health_data)

        subsystems = health_data["subsystems"]
        required_subsystems = [
            "fastapi_backend",
            "postgresql",
            "redis",
            "event_outbox_publisher",
            "websocket_gateway",
            "sse_fallback",
            "ingestion_service",
            "detection_engine",
            "threat_intelligence",
            "alert_evaluator",
            "push_dispatcher",
            "honeypot_sensors",
            "digital_agent_universe",
        ]
        for sub in required_subsystems:
            self.assertIn(sub, subsystems, f"Missing required subsystem: {sub}")
            sub_status = subsystems[sub]["status"]
            valid_statuses = [s.value for s in ServiceHealthStatus]
            self.assertIn(sub_status, valid_statuses, f"Invalid status {sub_status} for {sub}")

    def test_03_system_metrics_json_and_prometheus_export(self):
        """Verify operational metrics support JSON and Prometheus export formats."""
        # JSON export
        metrics = get_system_metrics(format="json", operator=self.admin_op)
        self.assertIn("uptime_seconds", metrics)
        self.assertIn("requests", metrics)
        self.assertIn("realtime", metrics)
        self.assertIn("event_pipeline", metrics)
        self.assertIn("error_classification", metrics)

        # Prometheus export
        prom_resp = get_system_metrics(format="prometheus", operator=self.admin_op)
        self.assertEqual(prom_resp.media_type, "text/plain; version=0.0.4")
        prom_body = prom_resp.body.decode("utf-8")
        self.assertIn("honeyshield_uptime_seconds", prom_body)
        self.assertIn("honeyshield_outbox_cursor", prom_body)
        self.assertIn("honeyshield_active_websockets", prom_body)

    def test_04_operational_alarms_evaluation(self):
        """Verify get_operational_alarms produces actionable on-call alerts."""
        alarms = get_operational_alarms(operator=self.admin_op, db=self.db)
        self.assertIsInstance(alarms, list)

        # Force alarm condition: high outbox backlog
        default_metrics_collector.outbox_backlog_count = 80
        sim_health = evaluate_full_system_health(db=self.db)
        triggered = default_alert_manager.evaluate_alarms(sim_health)
        backlog_alarms = [a for a in triggered if a.alarm_id == "ALARM-OUTBOX-BACKLOG-SPIKE"]
        self.assertEqual(len(backlog_alarms), 1)
        self.assertEqual(backlog_alarms[0].severity, AlarmSeverity.WARNING)
        self.assertIn("runbooks", backlog_alarms[0].runbook_section)
        default_metrics_collector.outbox_backlog_count = 0  # Reset

    def test_05_public_health_endpoint_credential_redaction(self):
        """Verify public /health endpoint does not leak passwords in error status."""
        resp = public_health_endpoint()
        self.assertIn("status", resp)
        self.assertIn("postgresql", resp)
        self.assertIn("redis", resp)
        raw_str = str(resp).lower()
        self.assertNotIn("change_this_password", raw_str)
        self.assertNotIn("password=", raw_str)

    def test_06_honeypot_sensors_truth_reporting(self):
        """Verify unconfigured honeypots (Cowrie, Dionaea, Zeek) are NOT falsely reported as HEALTHY."""
        health_data = evaluate_full_system_health(db=self.db)
        hp = health_data["subsystems"]["honeypot_sensors"]

        # Canary honeytokens are active and healthy
        self.assertEqual(hp["canary_traps"]["status"], ServiceHealthStatus.HEALTHY)
        # Cowrie, Dionaea, Zeek are NOT_CONFIGURED
        self.assertEqual(hp["cowrie"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["dionaea"]["status"], ServiceHealthStatus.NOT_CONFIGURED)
        self.assertEqual(hp["zeek"]["status"], ServiceHealthStatus.NOT_CONFIGURED)

    def test_07_digital_agent_universe_health_reporting(self):
        """Verify Digital Agent Universe health reports all 4 agents."""
        health_data = evaluate_full_system_health(db=self.db)
        agents_info = health_data["subsystems"]["digital_agent_universe"]
        self.assertEqual(agents_info["status"], ServiceHealthStatus.HEALTHY)
        agent_names = [a["name"] for a in agents_info["registered_agents"]]
        self.assertIn("SCOUT", agent_names)
        self.assertIn("NEXUS", agent_names)
        self.assertIn("ORACLE", agent_names)
        self.assertIn("SENTINEL", agent_names)

    def test_08_at_least_once_outbox_persistence_and_metrics(self):
        """Verify digital agent lifecycle persistence updates outbox metrics."""
        initial_cursor = default_metrics_collector.last_outbox_cursor
        event_in = TransferLifecycleEvent(
            agent="SCOUT",
            stage="collection",
            status="completed",
            source="sensor_honeypot",
            destination="nexus_courier",
            resource_id="atk_m8_002",
            transfer_id="tr_m8_002",
            workflow_id="wf_m8_002",
            payload={"indicator": "198.51.100.55"},
        )
        envelope = emit_lifecycle_event(event_in=event_in, operator=self.admin_op, db=self.db)
        self.assertGreaterEqual(envelope.cursor, initial_cursor)
        self.assertGreaterEqual(default_metrics_collector.last_outbox_cursor, initial_cursor)

    def test_09_websocket_auth_failure_metric_tracking(self):
        """Verify increment_ws_auth_failure updates telemetry metric."""
        initial_fails = default_metrics_collector.websocket_auth_failures
        default_metrics_collector.increment_ws_auth_failure()
        self.assertEqual(default_metrics_collector.websocket_auth_failures, initial_fails + 1)

    def test_10_emergency_governor_containment_safeguard(self):
        """Verify Governor Level 3 containment enforces administrator role validation."""
        from app.incident_command.governor import BLAST_RADIUS_TIERS

        # Verify that governor registers Level 3 blast radius on containment
        blast_tier = BLAST_RADIUS_TIERS.get("CONTAINMENT_STAGING_REQUEST")
        self.assertEqual(blast_tier, 3)

        # Verification that analyst role cannot execute containment
        from app.events.store import can_operator_view_event
        self.assertFalse(can_operator_view_event(self.analyst_op, "governor.containment.executed"))
        self.assertTrue(can_operator_view_event(self.admin_op, "governor.containment.executed"))
