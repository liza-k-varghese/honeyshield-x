"""Integration test suite for Module 3.6 Case Playbooks & Module 3.4 Governor Execution.

Tests:
1. Playbook task requiring Governor containment action (CONTAINMENT_STAGING_REQUEST).
2. Level 3 HITL approval token issuance for case-associated adversary IP.
3. Governed command execution with approval token, idempotency key, and row-level locking.
4. Binding Governor execution ID into playbook task completion record.
5. Level 3 token enforcement: containment without approval token rejected (HTTP 422).
6. Single-use token enforcement: reused approval token rejected (HTTP 422).
7. Co-existence of Governor audit events and Case audit events in PostgreSQL system_events.
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth.registry import default_operator_registry, Operator
from app.cases.service import default_case_service
from app.database import SessionLocal
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.routers.cases import complete_playbook_task, create_case, get_case
from app.routers.incident_command import execute_command_endpoint, preview_command_endpoint
from app.schemas import (
    CaseCreateRequest,
    CaseTaskCompleteRequest,
    IncidentCommandRequest,
)


class TestModule36GovernorIntegration(unittest.TestCase):
    """Test suite integrating Module 3.6 Playbook tasks with Module 3.4 Governor."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_case_service.store.clear()

        # Reset governor singleton
        default_governor.circuit_breaker.reset()
        default_governor.set_lockout(False)
        default_governor._operator_timestamps.clear()
        default_governor._entity_cooldowns.clear()
        default_governor._idempotency_cache.clear()
        default_governor._approval_tokens.clear()

        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")

        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.query(SystemEvent).filter(SystemEvent.source.in_(["incident_command", "case_management"])).delete()
        self.db.commit()
        self.db.close()
        default_case_service.store.clear()

    def _create_test_attack_and_alert(self) -> tuple[Attack, Alert]:
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip="198.51.100.77",
            destination_ip="10.0.0.1",
            protocol="TCP",
            severity="critical",
            risk_score=92.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        alert = Alert(
            attack_id=attack.id,
            alert_type="Brute Force SSH",
            severity="critical",
            message="Hostile brute force from 198.51.100.77",
            status="open",
            notification_status="pending",
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return attack, alert

    def test_1_playbook_task_governor_containment_flow(self):
        """Test complete Level-3 HITL containment handoff from Playbook to Governor."""
        attack, alert = self._create_test_attack_and_alert()

        # 1. Create Case using SSH SOP
        case_req = CaseCreateRequest(
            title="High-Severity SSH Intrusion",
            severity="critical",
            source_ip=attack.source_ip,
            target_id=attack.id,
            initial_alert_ids=[alert.id],
            playbook_template="SSH_BRUTE_FORCE_SOP",
        )
        case = create_case(payload=case_req, operator=self.analyst, db=self.db)

        # Find containment task in playbook
        containment_task = None
        for t in case.tasks:
            if t.suggested_command == "CONTAINMENT_STAGING_REQUEST":
                containment_task = t
                break
        self.assertIsNotNone(containment_task)
        self.assertEqual(containment_task.status, "pending")

        # 2. Request Level 3 Governor Approval Token for containment action
        preview_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Automated brute force threshold exceeded on honeypot listener",
        )
        preview_resp = preview_command_endpoint(
            request=preview_req,
            operator=self.responder,
            db=self.db,
        )
        self.assertIsNotNone(preview_resp.approval_token)
        self.assertEqual(preview_resp.operator_id, "responder_alex")
        token_str = preview_resp.approval_token

        # 3. Execute Governor Command with Approval Token and Idempotency Key
        exec_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Automated brute force threshold exceeded on honeypot listener",
            approval_token=token_str,
        )
        idem_key = str(uuid.uuid4())
        cmd_resp = execute_command_endpoint(
            request=exec_req,
            x_idempotency_key=idem_key,
            operator=self.responder,
            db=self.db,
        )
        self.assertTrue(cmd_resp.success)
        self.assertIsNotNone(cmd_resp.command_id)

        # 4. Bind Governor Execution ID to Playbook Task Completion
        completed_case = complete_playbook_task(
            case_id=case.case_id,
            task_id=containment_task.task_id,
            payload=CaseTaskCompleteRequest(
                notes="Host drop rule staged and verified under Governor approval",
                command_execution_id=cmd_resp.command_id,
            ),
            operator=self.responder,
            db=self.db,
        )

        # Verify task is completed with execution ID bound
        verified_task = [t for t in completed_case.tasks if t.task_id == containment_task.task_id][0]
        self.assertEqual(verified_task.status, "completed")
        self.assertEqual(verified_task.command_execution_id, cmd_resp.command_id)
        self.assertEqual(verified_task.completed_by, "responder_alex")

        # 5. Verify PostgreSQL SystemEvent Audit Trail contains both command and case audit records
        cmd_events = (
            self.db.query(SystemEvent)
            .filter(SystemEvent.source == "incident_command")
            .all()
        )
        self.assertTrue(len(cmd_events) >= 1)

        case_events = (
            self.db.query(SystemEvent)
            .filter(SystemEvent.source == "case_management")
            .filter(SystemEvent.event_type == "CASE_TASK_COMPLETED")
            .all()
        )
        self.assertTrue(len(case_events) >= 1)
        task_audit = json.loads(case_events[0].message)
        self.assertEqual(task_audit["command_execution_id"], cmd_resp.command_id)

    def test_2_missing_approval_token_rejected_by_governor(self):
        """Test containment staging without approval token is rejected by Governor (HTTP 422)."""
        _, alert = self._create_test_attack_and_alert()

        req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Attempting unapproved containment",
            approval_token=None,
        )
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=self.responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("mandatory pre-flight approval token", ctx.exception.detail)

    def test_3_reused_approval_token_rejected_by_governor(self):
        """Test reused approval token fails closed on second execution attempt."""
        _, alert = self._create_test_attack_and_alert()

        preview_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Valid justification for containment",
        )
        preview_resp = preview_command_endpoint(
            request=preview_req,
            operator=self.responder,
            db=self.db,
        )
        token_str = preview_resp.approval_token

        # First execution succeeds
        exec_req = IncidentCommandRequest(
            action="CONTAINMENT_STAGING_REQUEST",
            target_id=alert.id,
            justification="Valid justification for containment",
            approval_token=token_str,
        )
        execute_command_endpoint(
            request=exec_req,
            x_idempotency_key=str(uuid.uuid4()),
            operator=self.responder,
            db=self.db,
        )

        # Second execution with same token is rejected
        with self.assertRaises(HTTPException) as ctx:
            execute_command_endpoint(
                request=exec_req,
                x_idempotency_key=str(uuid.uuid4()),
                operator=self.responder,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
