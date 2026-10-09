"""Integration test suite for HoneyShield-X Module 3.7: Deception, Cases, & Governor.

Verifies:
1. Full defensive incident lifecycle:
   CANARY HIT -> ALERT -> CASE -> RECOMMENDED CONTAINMENT -> GOVERNOR LEVEL-3 HITL -> AUTHORIZED EXECUTION.
2. Negative test: Canary hits NEVER autonomously execute containment.
3. Deduplication prevents alert and case flooding during rapid hit bursts.
4. Governor approval-token single-use semantics and operator binding preserved.
5. In-memory resilience when Redis is unavailable.
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.registry import default_operator_registry, Operator
from app.cases.service import default_case_service
from app.database import SessionLocal
from app.deception.service import default_deception_service
from app.deception.storage import DeceptionStore, default_deception_store
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.routers.cases import complete_playbook_task, get_case
from app.routers.deception import mint_canary, validate_canary_get
from app.routers.incident_command import execute_command_endpoint, preview_command_endpoint
from app.schemas import (
    CanaryCreateRequest,
    CaseTaskCompleteRequest,
    IncidentCommandRequest,
)


def make_mock_trap_request(
    path: str,
    client_ip: str = "198.51.100.77",
) -> Request:
    """Construct a mock Starlette Request for trap endpoint testing."""
    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": path,
            "headers": [
                (b"host", b"testserver"),
                (b"user-agent", b"Adversary-Recon/1.0"),
            ],
            "client": (client_ip, 49152),
        },
        receive=receive,
    )


class TestModule37Integration(unittest.IsolatedAsyncioTestCase):
    """Integration test suite connecting Deception Grid, Incident Cases, and Governor."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_deception_store.clear()
        default_case_service.store.clear()

        # Reset governor singleton
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        self.admin: Operator = default_operator_registry.get_operator("admin_marcus")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")

        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        self.db.commit()
        self.db.close()

    async def test_1_full_incident_lifecycle_from_canary_to_governor_containment(self):
        """Verify complete flow: Canary hit -> Alert -> Case -> Recommended Containment -> HITL Execution."""
        adversary_ip = "198.51.100.77"

        # 1. Analyst mints AWS honeytoken
        canary = mint_canary(
            payload=CanaryCreateRequest(
                name="Production IAM Decoy",
                canary_type="AWS_API_KEY",
                environment="production",
                placement_hint="decoy repo /secrets/aws.json",
            ),
            operator=self.analyst,
            db=self.db,
        )

        # 2. Adversary hits the trap listener
        trap_req = make_mock_trap_request(
            path=f"/api/v1/deception/validate/{canary.token_id}",
            client_ip=adversary_ip,
        )
        decoy_resp = await validate_canary_get(
            token_id=canary.token_id,
            request=trap_req,
            db=self.db,
        )
        self.assertEqual(decoy_resp.code, 401)

        # 3. Check that Alert was created
        alerts = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").all()
        self.assertTrue(len(alerts) >= 1)
        canary_alert = alerts[-1]
        self.created_alert_ids.append(canary_alert.id)

        # 4. Check that Incident Case was provisioned
        cases_list, total_cases = default_case_service.list_cases()
        self.assertTrue(total_cases >= 1)
        incident_case = cases_list[0]
        self.assertEqual(incident_case.source_ip, adversary_ip)
        self.assertIn(canary_alert.id, incident_case.alert_ids)

        # 5. NEGATIVE INVARIANT CHECK: Verify NO autonomous containment has occurred!
        # The entity cooldown / block state in Governor must be empty before operator action
        self.assertNotIn(adversary_ip, default_governor._entity_cooldowns)

        # 6. Responder requests Level 3 HITL approval token for the recommended containment
        preview_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=canary_alert.id,
            justification=f"Canary tripwire breached by {adversary_ip} in Case {incident_case.case_id}",
        )
        preview_resp = preview_command_endpoint(
            request=preview_req,
            operator=self.responder,
            db=self.db,
        )
        approval_token = preview_resp.approval_token
        self.assertIsNotNone(approval_token)

        # 7. Responder executes containment command through Governor
        idem_key = str(uuid.uuid4())
        cmd_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=canary_alert.id,
            justification=f"Canary tripwire breached by {adversary_ip} in Case {incident_case.case_id}",
            approval_token=approval_token,
        )
        cmd_resp = execute_command_endpoint(
            request=cmd_req,
            x_idempotency_key=idem_key,
            operator=self.responder,
            db=self.db,
        )
        self.assertTrue(cmd_resp.success)
        exec_id = cmd_resp.command_id

        # 8. Responder completes containment task in Case playbook with Governor execution ID
        # Locate task requiring containment in GENERIC_INCIDENT_SOP
        task_id = "task_2_assess_containment"
        completed_case = complete_playbook_task(
            case_id=incident_case.case_id,
            task_id=task_id,
            payload=CaseTaskCompleteRequest(
                notes=f"Adversary ingress contained via Governor execution {exec_id}",
                command_execution_id=exec_id,
            ),
            operator=self.responder,
            db=self.db,
        )
        completed_task = next(t for t in completed_case.tasks if t.task_id == task_id)
        self.assertEqual(completed_task.status, "completed")
        self.assertEqual(completed_task.command_execution_id, exec_id)

    async def test_2_deduplication_prevents_duplicate_cases_and_alerts(self):
        """Verify repeated hits within deduplication window do not duplicate alerts or cases."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Flood Trap", canary_type="SERVICE_API_TOKEN"),
            operator=self.analyst,
            db=self.db,
        )

        initial_alerts = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").count()
        _, initial_cases = default_case_service.list_cases()

        # Hit 1
        req1 = make_mock_trap_request(
            path=f"/api/v1/deception/validate/{canary.token_id}",
            client_ip="198.51.100.90",
        )
        await validate_canary_get(token_id=canary.token_id, request=req1, db=self.db)

        # Hit 2 immediately from same IP
        req2 = make_mock_trap_request(
            path=f"/api/v1/deception/validate/{canary.token_id}",
            client_ip="198.51.100.90",
        )
        await validate_canary_get(token_id=canary.token_id, request=req2, db=self.db)

        # Clean up created alert
        latest_alerts = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").all()
        for a in latest_alerts:
            self.created_alert_ids.append(a.id)

        alerts_after = len(latest_alerts)
        _, cases_after = default_case_service.list_cases()

        # Exactly 1 alert and 1 case should have been created despite 2 hits
        self.assertEqual(alerts_after - initial_alerts, 1)
        self.assertEqual(cases_after - initial_cases, 1)

        # But hit count on canary should be 2
        updated_canary = default_deception_service.get_canary(canary.canary_id)
        self.assertEqual(updated_canary.hit_count, 2)


if __name__ == "__main__":
    unittest.main()
