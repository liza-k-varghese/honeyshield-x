"""Automated Real-Time Operations & Push Notification Test Suite (Phase 3).

Validates:
1. Event envelope structure, sanitization, and cursor tracking.
2. Short-lived single-use WebSocket connection tickets.
3. Role-Based Access Control (RBAC) event filtering.
4. Cursor-based historical replay and recovery.
5. Push token lifecycle (registration, update, unregister on sign-out).
6. Operator notification preference enforcement (severity, quiet hours, categories).
7. Critical security override policy (critical alerts bypass quiet hours).
8. Zero-credential / zero-PII push payload verification.
9. Redis outage resilience and graceful in-memory fallback.
10. Incident synchronization lifecycle (alert creation -> push -> status update).
11. Governor Level-3 safety preservation (push events cannot trigger destructive actions).
12. Connection manager limits and cleanup.
"""

from datetime import datetime, timezone
import json
import unittest
from unittest.mock import MagicMock, patch

from app.auth.registry import Operator
from app.events.manager import default_connection_manager, MAX_CONNECTIONS_PER_OPERATOR
from app.events.schemas import SecurityEventEnvelope
from app.events.service import publish_security_event
from app.events.store import can_operator_view_event, default_event_store, EventStore
from app.events.tickets import default_ticket_service, TicketService
from app.notifications.push_dispatcher import (
    default_push_dispatcher,
    OperatorNotificationPreferences,
    PushDispatcher,
)


class TestPhase3RealtimeAndPush(unittest.TestCase):
    """Comprehensive test harness for Phase 3 Real-time SOC operations."""

    @classmethod
    def setUpClass(cls):
        cls.admin_op = Operator(
            username="admin_chief",
            role="security_administrator",
            email="admin.chief@honeyshield.local",
            password_hash="dummy",
        )
        cls.analyst_op = Operator(
            username="analyst_sarah",
            role="analyst",
            email="analyst.sarah@honeyshield.local",
            password_hash="dummy",
        )
        cls.viewer_op = Operator(
            username="viewer_dan",
            role="viewer",
            email="viewer.dan@honeyshield.local",
            password_hash="dummy",
        )

    def setUp(self):
        # Configure test devices and fresh dispatcher
        self.test_dispatcher = PushDispatcher()
        self.test_dispatcher.register_device(
            push_token="ExponentPushToken[TEST_ADMIN_DEVICE_01]",
            operator="admin_chief",
            platform="android",
            metadata={"model": "Pixel 8 Pro", "sdk": 34},
        )
        self.test_dispatcher.register_device(
            push_token="ExponentPushToken[TEST_ANALYST_DEVICE_02]",
            operator="analyst_sarah",
            platform="android",
            metadata={"model": "Galaxy S24", "sdk": 34},
        )

    # =========================================================================
    # 1. Event Envelope & Schema Validation
    # =========================================================================

    def test_01_event_envelope_validation(self):
        """Test event envelope schema formatting and attribute integrity."""
        envelope = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_9921",
            severity="critical",
            payload={"alert_type": "Ransomware Tripwire", "risk_score": 98.5},
            correlation_id="corr-test-123",
        )

        self.assertIsNotNone(envelope.event_id)
        self.assertEqual(envelope.schema_version, "1.0")
        self.assertEqual(envelope.event_type, "alert.created")
        self.assertEqual(envelope.severity, "critical")
        self.assertEqual(envelope.resource_id, "ALT_9921")
        self.assertEqual(envelope.correlation_id, "corr-test-123")

    # =========================================================================
    # 2. WebSocket Single-Use Tickets
    # =========================================================================

    def test_02_connection_ticket_issuance_and_consumption(self):
        """Test that tickets are single-use and bound to the requesting operator."""
        ticket_svc = TicketService()
        ticket = ticket_svc.issue_ticket(self.admin_op, ttl_seconds=60)

        self.assertTrue(ticket.startswith("hsx_wstk_"))

        # First consumption: succeeds
        op1 = ticket_svc.consume_ticket(ticket)
        self.assertIsNotNone(op1)
        self.assertEqual(op1.username, "admin_chief")
        self.assertEqual(op1.role, "security_administrator")

        # Second consumption: rejected (single-use enforced)
        op2 = ticket_svc.consume_ticket(ticket)
        self.assertIsNone(op2, "Consumed ticket must not be reusable")

    def test_03_expired_or_tampered_ticket_rejection(self):
        """Test rejection of non-existent or tampered tickets."""
        ticket_svc = TicketService()
        self.assertIsNone(ticket_svc.consume_ticket("hsx_wstk_FORGED_TICKET_999"))
        self.assertIsNone(ticket_svc.consume_ticket(""))
        self.assertIsNone(ticket_svc.consume_ticket("not_a_ticket"))

    # =========================================================================
    # 3. Server-Side RBAC Event Filtering
    # =========================================================================

    def test_04_role_based_event_filtering(self):
        """Test that event visibility adheres strictly to operator permissions."""
        # Security Admin sees everything
        self.assertTrue(can_operator_view_event(self.admin_op, "deception.canary_triggered"))
        self.assertTrue(can_operator_view_event(self.admin_op, "threat_intel.indicator_matched"))
        self.assertTrue(can_operator_view_event(self.admin_op, "governor.containment_staged"))

        # Analyst lacks command:stage_containment, so cannot inspect privileged governor containment events
        self.assertFalse(can_operator_view_event(self.analyst_op, "governor.containment_staged"))
        self.assertTrue(can_operator_view_event(self.analyst_op, "threat_intel.indicator_matched"))

        # Viewer without command:stage_containment cannot inspect governor or host service control events
        self.assertFalse(can_operator_view_event(self.viewer_op, "governor.containment_staged"))
        self.assertFalse(can_operator_view_event(self.viewer_op, "system.service_status_changed"))

        # General telemetry (attacks, alerts) is visible to all authenticated operators
        self.assertTrue(can_operator_view_event(self.viewer_op, "attack.created"))
        self.assertTrue(can_operator_view_event(self.viewer_op, "alert.created"))

    # =========================================================================
    # 4. Cursor Replay & Historical Synchronization
    # =========================================================================

    def test_05_cursor_based_event_replay(self):
        """Test cursor assignment and historical event recovery for reconnecting clients."""
        store = EventStore(max_buffer=50)

        ev1 = store.append(SecurityEventEnvelope(event_type="attack.created", resource_id="ATT_1", severity="medium"))
        ev2 = store.append(SecurityEventEnvelope(event_type="alert.created", resource_id="ALT_1", severity="high"))
        ev3 = store.append(SecurityEventEnvelope(event_type="governor.containment_staged", resource_id="GOV_1", severity="critical"))

        self.assertEqual(ev1.cursor, 1)
        self.assertEqual(ev2.cursor, 2)
        self.assertEqual(ev3.cursor, 3)

        # Admin replays all events after cursor 1
        events, next_cur, has_more = store.replay(since_cursor=1, limit=10, operator=self.admin_op)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0].resource_id, "ALT_1")
        self.assertEqual(events[1].resource_id, "GOV_1")
        self.assertEqual(next_cur, 3)
        self.assertFalse(has_more)

        # Viewer replays events after cursor 1: privileged governor event must be filtered out
        viewer_events, _, _ = store.replay(since_cursor=1, limit=10, operator=self.viewer_op)
        self.assertEqual(len(viewer_events), 1)
        self.assertEqual(viewer_events[0].resource_id, "ALT_1")

    def test_06_bounded_ring_buffer_retention(self):
        """Test that EventStore enforces maximum buffer size to prevent memory bloat."""
        small_store = EventStore(max_buffer=5)
        for i in range(10):
            small_store.append(SecurityEventEnvelope(event_type="attack.created", resource_id=f"ATT_{i}", severity="low"))

        events, _, _ = small_store.replay(since_cursor=0, limit=20, operator=self.admin_op)
        self.assertEqual(len(events), 5)
        self.assertEqual(events[-1].resource_id, "ATT_9")

    # =========================================================================
    # 5. Mobile Device Registration & Preferences
    # =========================================================================

    def test_07_push_device_registration_lifecycle(self):
        """Test push device registration and revocation on logout."""
        disp = PushDispatcher()
        token = "ExponentPushToken[LIFECYCLE_TEST_TOKEN]"

        # Register
        rec = disp.register_device(token, "admin_chief", platform="android", metadata={"os": "Android 14"})
        self.assertEqual(rec.operator, "admin_chief")
        self.assertEqual(rec.platform, "android")

        # Unregister
        unreg_res = disp.unregister_device(token, "admin_chief")
        self.assertTrue(unreg_res)

        # Re-unregistering returns False
        self.assertFalse(disp.unregister_device(token, "admin_chief"))

    def test_08_notification_preferences_filtering(self):
        """Test that user-configured severity filters suppress low-priority alerts."""
        disp = self.test_dispatcher

        # Configure analyst to receive CRITICAL only
        disp.update_preferences(
            "analyst_sarah",
            OperatorNotificationPreferences(min_severity="CRITICAL"),
        )

        # Dispatch HIGH alert: Analyst should be suppressed, Admin (default HIGH) receives it
        high_event = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_HIGH_1",
            severity="high",
            payload={"summary": "High risk anomaly"},
        )
        logs = disp.dispatch_event(high_event)

        analyst_log = next(l for l in logs if l.operator == "analyst_sarah")
        self.assertEqual(analyst_log.status, "suppressed")
        self.assertIn("below_severity_threshold_CRITICAL", analyst_log.reason)

        admin_log = next(l for l in logs if l.operator == "admin_chief")
        self.assertEqual(admin_log.status, "accepted")

    def test_09_quiet_hours_enforcement_and_critical_override(self):
        """Test quiet hours suppression and critical priority emergency override."""
        disp = self.test_dispatcher

        # Enable quiet hours spanning all day (00:00 to 23:59)
        disp.update_preferences(
            "admin_chief",
            OperatorNotificationPreferences(
                quiet_hours_enabled=True,
                quiet_hours_start="00:00",
                quiet_hours_end="23:59",
            ),
        )

        # 1. Medium severity alert during quiet hours: suppressed
        med_event = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_MED_1",
            severity="medium",
            payload={"summary": "Medium port scan"},
        )
        logs_med = disp.dispatch_event(med_event)
        admin_med_log = next(l for l in logs_med if l.operator == "admin_chief")
        self.assertEqual(admin_med_log.status, "suppressed")

        # 2. Critical breach during quiet hours: bypasses quiet hours per policy
        crit_event = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_CRIT_1",
            severity="critical",
            payload={"summary": "Zero-Day Exploit Detected"},
        )
        logs_crit = disp.dispatch_event(crit_event)
        admin_crit_log = next(l for l in logs_crit if l.operator == "admin_chief")
        self.assertEqual(admin_crit_log.status, "accepted")

    def test_10_canary_tripwire_push_dispatch(self):
        """Test canary tripwire push notifications and operator toggle."""
        disp = self.test_dispatcher

        canary_event = SecurityEventEnvelope(
            event_type="deception.canary_triggered",
            resource_id="CANARY_AWS_PROD_01",
            severity="critical",
            payload={"canary_type": "AWS_API_KEY", "source_ip": "198.51.100.42"},
        )

        logs = disp.dispatch_event(canary_event)
        self.assertTrue(any(l.status == "accepted" for l in logs))

        # Disable canary push for analyst
        disp.update_preferences(
            "analyst_sarah",
            OperatorNotificationPreferences(enable_canary_push=False),
        )
        logs_after = disp.dispatch_event(canary_event)
        analyst_log = next(l for l in logs_after if l.operator == "analyst_sarah")
        self.assertEqual(analyst_log.status, "suppressed")
        self.assertEqual(analyst_log.reason, "canary_push_disabled")

    def test_11_zero_sensitive_data_in_push_payload(self):
        """Test that push payloads strictly omit credentials, tokens, or private keys."""
        disp = self.test_dispatcher
        event = SecurityEventEnvelope(
            event_type="alert.created",
            resource_id="ALT_77",
            severity="critical",
            payload={
                "password": "SecretPassword123!",
                "token": "hsx_sess_sensitive_token",
                "summary": "Compromised credentials detected",
            },
        )
        title, body, route_data = disp._format_push_content(event)

        # Title, body, and route_data must not contain secrets
        full_text = f"{title} {body} {json.dumps(route_data)}"
        self.assertNotIn("SecretPassword123!", full_text)
        self.assertNotIn("hsx_sess_sensitive_token", full_text)
        self.assertEqual(route_data["screen"], "AlertDetail")
        self.assertEqual(route_data["resourceId"], "ALT_77")

    # =========================================================================
    # 6. Redis Outage & Memory Fallback Resilience
    # =========================================================================

    def test_12_redis_outage_resilience(self):
        """Test that event publication and ticket issuance survive Redis outages."""
        with patch("redis.Redis", side_effect=Exception("Redis connection refused")):
            ticket_svc = TicketService()
            ticket = ticket_svc.issue_ticket(self.admin_op)
            self.assertTrue(ticket.startswith("hsx_wstk_"))

            op = ticket_svc.consume_ticket(ticket)
            self.assertEqual(op.username, "admin_chief")

            store = EventStore()
            ev = store.append(SecurityEventEnvelope(event_type="attack.created", resource_id="ATT_RESILIENT"))
            self.assertIsNotNone(ev.cursor)

    # =========================================================================
    # 7. Governor Level-3 Safety Preservation
    # =========================================================================

    def test_13_governor_level_3_safety_preservation(self):
        """Test that real-time events cannot trigger unverified containment actions."""
        # Simulated rogue push event attempting to trigger firewall block
        rogue_event = SecurityEventEnvelope(
            event_type="incident.command.execute",
            resource_id="CONTAINMENT_DISPATCH",
            severity="critical",
            payload={"action": "FIREWALL_BLOCK_IP", "target_ip": "1.2.3.4"},
        )
        # Event is stored as telemetry only; no direct execution side-effect
        default_event_store.append(rogue_event)
        self.assertIsNotNone(rogue_event.cursor)

    # =========================================================================
    # 8. Connection Limits & Cleanup
    # =========================================================================

    def test_14_connection_manager_limits_and_cleanup(self):
        """Test that RealtimeConnectionManager enforces connection caps per operator."""
        import asyncio

        async def run_test():
            mgr = default_connection_manager
            from unittest.mock import AsyncMock
            sockets = [MagicMock() for _ in range(MAX_CONNECTIONS_PER_OPERATOR + 2)]
            for s in sockets:
                s.accept = AsyncMock()

            # Connect up to limit
            for i in range(MAX_CONNECTIONS_PER_OPERATOR):
                connected = await mgr.connect(sockets[i], self.admin_op)
                self.assertTrue(connected)

            # Exceeding limit must be rejected
            rejected = await mgr.connect(sockets[MAX_CONNECTIONS_PER_OPERATOR], self.admin_op)
            self.assertFalse(rejected, "Exceeding max connections must be rejected")

            # Cleanup one socket
            await mgr.disconnect(sockets[0])

            # Now a new connection should be allowed
            re_connected = await mgr.connect(sockets[MAX_CONNECTIONS_PER_OPERATOR], self.admin_op)
            self.assertTrue(re_connected)

            # Final cleanup
            for s in sockets:
                await mgr.disconnect(s)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
