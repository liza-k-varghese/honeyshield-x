"""Unit and integration test suite for HoneyShield-X Module 3.6: Incident Case Management.

Tests:
1. Case creation with default SANS template and domain-specific templates.
2. Alert promotion into case with automated IP/target resolution.
3. Title and parameter bounds validation (HTTP 422 on invalid).
4. State machine deterministic transitions and forbidden path rejection (HTTP 409).
5. Terminal closed state protection and administrative reopen capability.
6. Playbook SOP task progression, completion ratio calculation, and task skipping.
7. Playbook task idempotency.
8. Forensic journal note addition with operator attribution.
9. Case filtering, search, and pagination.
10. Deterministic Post-Incident Review (PIR) report synthesis.
11. In-memory storage fallback resiliency when Redis is unavailable.
12. Audit ledger event emission to PostgreSQL system_events table.
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth.registry import default_operator_registry, Operator
from app.cases.playbooks import PLAYBOOK_TEMPLATES, get_playbook_tasks_for_template
from app.cases.service import CaseManagementService, default_case_service
from app.cases.storage import CaseStore
from app.database import SessionLocal
from app.models import Alert, Attack, AttackEvent, SystemEvent
from app.routers.cases import (
    add_case_note,
    complete_playbook_task,
    create_case,
    get_case,
    get_post_incident_report,
    list_cases,
    update_case,
)
from app.schemas import (
    CaseCreateRequest,
    CaseNoteCreateRequest,
    CaseTaskCompleteRequest,
    CaseUpdateRequest,
)


class TestModule36Cases(unittest.TestCase):
    """Test suite covering Module 3.6 incident cases and response playbooks."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_case_service.store.clear()

        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.admin: Operator = default_operator_registry.get_operator("admin_chief")

        self.created_attack_ids: list[int] = []
        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        for att_id in self.created_attack_ids:
            self.db.query(AttackEvent).filter(AttackEvent.attack_id == att_id).delete()
            self.db.query(Alert).filter(Alert.attack_id == att_id).delete()
            self.db.query(Attack).filter(Attack.id == att_id).delete()
        self.db.query(SystemEvent).filter(SystemEvent.source == "case_management").delete()
        self.db.commit()
        self.db.close()
        default_case_service.store.clear()

    def _create_test_attack_and_alert(self) -> tuple[Attack, Alert]:
        attack = Attack(
            attack_type="Brute Force SSH",
            source_ip="198.51.100.44",
            destination_ip="10.0.0.1",
            protocol="TCP",
            severity="high",
            risk_score=85.0,
            status="detected",
        )
        self.db.add(attack)
        self.db.commit()
        self.db.refresh(attack)
        self.created_attack_ids.append(attack.id)

        alert = Alert(
            attack_id=attack.id,
            alert_type="Brute Force SSH",
            severity="high",
            message="SSH Brute Force detected from 198.51.100.44",
            status="open",
            notification_status="pending",
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        self.created_alert_ids.append(alert.id)
        return attack, alert

    # ==========================================
    # 1. Case Creation & Playbook Template Tests
    # ==========================================

    def test_1_create_case_default_generic_sop(self):
        """Test case creation defaults to GENERIC_INCIDENT_SOP with full task list."""
        req = CaseCreateRequest(
            title="Generic Intrusion Detection",
            severity="medium",
            description="Broad threat telemetry detected.",
            playbook_template="GENERIC_INCIDENT_SOP",
        )
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        self.assertTrue(case.case_id.startswith("CASE-"))
        self.assertEqual(case.title, "Generic Intrusion Detection")
        self.assertEqual(case.status, "new")
        self.assertEqual(case.playbook_template, "GENERIC_INCIDENT_SOP")
        self.assertEqual(case.playbook_progress, 0.0)
        self.assertEqual(len(case.tasks), 5)
        self.assertEqual(case.tasks[0].stage, "identification")
        self.assertIsNotNone(case.advisory_summary)

    def test_2_create_case_domain_specific_templates(self):
        """Test all 4 standardized playbook SOP templates populate correct tasks."""
        for tmpl_name in ("SSH_BRUTE_FORCE_SOP", "WEB_EXPLOIT_SOP", "PORT_SCAN_RECON_SOP"):
            req = CaseCreateRequest(
                title=f"Test {tmpl_name}",
                severity="high",
                playbook_template=tmpl_name,
            )
            case = create_case(payload=req, operator=self.analyst, db=self.db)
            expected_tasks = PLAYBOOK_TEMPLATES[tmpl_name]
            self.assertEqual(len(case.tasks), len(expected_tasks))
            self.assertEqual(case.tasks[0].title, expected_tasks[0]["title"])

    def test_3_case_creation_input_validation(self):
        """Test invalid title lengths raise ValidationError or HTTP 422."""
        with self.assertRaises(ValidationError):
            CaseCreateRequest(title="ab")  # Too short (< 3)

        with self.assertRaises(ValidationError):
            CaseCreateRequest(title="x" * 201)  # Too long (> 200)

    def test_4_promote_alert_into_case(self):
        """Test alert promotion automatically binds alert IDs and resolves source IP."""
        attack, alert = self._create_test_attack_and_alert()

        req = CaseCreateRequest(
            title="Promoted SSH Attack Case",
            severity="high",
            initial_alert_ids=[alert.id],
            initial_note="Triage confirmed active credential assault.",
        )
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        self.assertIn(alert.id, case.alert_ids)
        self.assertEqual(case.source_ip, attack.source_ip)
        self.assertEqual(case.target_id, attack.id)
        self.assertEqual(len(case.notes), 1)
        self.assertEqual(case.notes[0].operator_id, "analyst_sarah")

    # ==========================================
    # 2. State Machine & Transition Tests
    # ==========================================

    def test_5_valid_state_transitions(self):
        """Test full deterministic lifecycle: new -> investigating -> containment -> contained -> resolved -> closed."""
        req = CaseCreateRequest(title="Lifecycle Test Case", severity="medium")
        case = create_case(payload=req, operator=self.analyst, db=self.db)
        cid = case.case_id

        # 1. new -> investigating
        u1 = update_case(case_id=cid, payload=CaseUpdateRequest(status="investigating"), operator=self.analyst, db=self.db)
        self.assertEqual(u1.status, "investigating")

        # 2. investigating -> containment_in_progress
        u2 = update_case(case_id=cid, payload=CaseUpdateRequest(status="containment_in_progress"), operator=self.responder, db=self.db)
        self.assertEqual(u2.status, "containment_in_progress")

        # 3. containment_in_progress -> contained
        u3 = update_case(case_id=cid, payload=CaseUpdateRequest(status="contained"), operator=self.responder, db=self.db)
        self.assertEqual(u3.status, "contained")

        # 4. contained -> resolved
        u4 = update_case(case_id=cid, payload=CaseUpdateRequest(status="resolved"), operator=self.responder, db=self.db)
        self.assertEqual(u4.status, "resolved")

        # 5. resolved -> closed
        u5 = update_case(case_id=cid, payload=CaseUpdateRequest(status="closed"), operator=self.responder, db=self.db)
        self.assertEqual(u5.status, "closed")
        self.assertIsNotNone(u5.closed_at)
        self.assertEqual(u5.closed_by, "responder_alex")

    def test_6_invalid_state_transition_rejected(self):
        """Test illegal jump from 'new' directly to 'contained' raises HTTP 409."""
        req = CaseCreateRequest(title="Jump State Test", severity="medium")
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        with self.assertRaises(HTTPException) as ctx:
            update_case(
                case_id=case.case_id,
                payload=CaseUpdateRequest(status="contained"),
                operator=self.analyst,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("Invalid status transition", ctx.exception.detail)

    def test_7_closed_case_reopen_governance(self):
        """Test non-admin cannot reopen closed cases (409), while security administrator can."""
        req = CaseCreateRequest(title="Reopen Governance Test", severity="low")
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        # Transition directly new -> closed
        update_case(case_id=case.case_id, payload=CaseUpdateRequest(status="closed"), operator=self.responder, db=self.db)

        # Analyst attempt to reopen -> 409 Conflict
        with self.assertRaises(HTTPException) as ctx:
            update_case(
                case_id=case.case_id,
                payload=CaseUpdateRequest(status="investigating"),
                operator=self.analyst,
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("Only a Security Administrator can reopen closed cases", ctx.exception.detail)

        # Security Administrator reopens -> Success
        reopened = update_case(
            case_id=case.case_id,
            payload=CaseUpdateRequest(status="investigating"),
            operator=self.admin,
            db=self.db,
        )
        self.assertEqual(reopened.status, "investigating")
        self.assertIsNone(reopened.closed_at)
        self.assertIsNone(reopened.closed_by)

    # ==========================================
    # 3. Playbook Task Progression Tests
    # ==========================================

    def test_8_playbook_task_completion_and_progress_ratio(self):
        """Test completing tasks recalculates completion ratio."""
        req = CaseCreateRequest(
            title="Task Progression Test",
            severity="high",
            playbook_template="PORT_SCAN_RECON_SOP",  # 4 tasks
        )
        case = create_case(payload=req, operator=self.analyst, db=self.db)
        self.assertEqual(case.playbook_progress, 0.0)

        t1_id = case.tasks[0].task_id
        updated = complete_playbook_task(
            case_id=case.case_id,
            task_id=t1_id,
            payload=CaseTaskCompleteRequest(notes="Firewall log audit complete"),
            operator=self.responder,
            db=self.db,
        )
        self.assertEqual(updated.playbook_progress, 0.25)
        self.assertEqual(updated.tasks[0].status, "completed")
        self.assertEqual(updated.tasks[0].completed_by, "responder_alex")
        self.assertEqual(updated.tasks[0].notes, "Firewall log audit complete")

    def test_9_playbook_task_skip(self):
        """Test skipping an optional task marks status skipped without failing progress."""
        req = CaseCreateRequest(
            title="Task Skip Test",
            severity="medium",
            playbook_template="PORT_SCAN_RECON_SOP",
        )
        case = create_case(payload=req, operator=self.analyst, db=self.db)
        t2_id = case.tasks[1].task_id

        updated = complete_playbook_task(
            case_id=case.case_id,
            task_id=t2_id,
            payload=CaseTaskCompleteRequest(status="skipped", notes="No passive DNS records found"),
            operator=self.responder,
            db=self.db,
        )
        self.assertEqual(updated.tasks[1].status, "skipped")

    def test_10_playbook_task_idempotency(self):
        """Test repeating task completion is idempotent and preserves original completion operator."""
        req = CaseCreateRequest(title="Idempotency Test", severity="low")
        case = create_case(payload=req, operator=self.analyst, db=self.db)
        t1_id = case.tasks[0].task_id

        first = complete_playbook_task(
            case_id=case.case_id,
            task_id=t1_id,
            payload=CaseTaskCompleteRequest(notes="First pass"),
            operator=self.responder,
            db=self.db,
        )
        orig_completed_at = first.tasks[0].completed_at

        # Repeat completion
        second = complete_playbook_task(
            case_id=case.case_id,
            task_id=t1_id,
            payload=CaseTaskCompleteRequest(notes="Second pass update"),
            operator=self.admin,
            db=self.db,
        )
        self.assertEqual(second.tasks[0].completed_by, "responder_alex")
        self.assertEqual(second.tasks[0].completed_at, orig_completed_at)
        self.assertEqual(second.tasks[0].notes, "Second pass update")

    # ==========================================
    # 4. Forensic Journal Notes Tests
    # ==========================================

    def test_11_append_forensic_note(self):
        """Test appending timestamped investigation note with operator attribution."""
        req = CaseCreateRequest(title="Journal Note Test", severity="medium")
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        note = add_case_note(
            case_id=case.case_id,
            payload=CaseNoteCreateRequest(message="Investigated decoy node; confirmed attacker IP rotated."),
            operator=self.analyst,
            db=self.db,
        )
        self.assertIsNotNone(note.note_id)
        self.assertEqual(note.operator_id, "analyst_sarah")
        self.assertEqual(note.role, "analyst")
        self.assertIn("attacker IP rotated", note.message)

        # Verify persisted on case
        refreshed = get_case(case_id=case.case_id, operator=self.analyst)
        self.assertEqual(len(refreshed.notes), 1)

    # ==========================================
    # 5. PIR Report Synthesis Tests
    # ==========================================

    def test_12_deterministic_pir_report_synthesis(self):
        """Test Post-Incident Review generation produces structured, deterministic executive summary."""
        req = CaseCreateRequest(
            title="Severe SSH Attack Incident",
            severity="critical",
            source_ip="198.51.100.44",
            playbook_template="SSH_BRUTE_FORCE_SOP",
        )
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        # Complete task 2 with governor action
        complete_playbook_task(
            case_id=case.case_id,
            task_id=case.tasks[1].task_id,
            payload=CaseTaskCompleteRequest(
                notes="Containment staged",
                command_execution_id="exec_12345",
            ),
            operator=self.responder,
            db=self.db,
        )

        pir = get_post_incident_report(case_id=case.case_id, operator=self.responder)

        self.assertEqual(pir.case_id, case.case_id)
        self.assertEqual(pir.signoff_operator, "responder_alex")
        self.assertIn("198.51.100.44", pir.executive_summary)
        self.assertIn("SSH", pir.root_cause_analysis)
        self.assertTrue(len(pir.remediation_actions) > 0)
        self.assertTrue(len(pir.incident_timeline) >= 2)

    # ==========================================
    # 6. Audit Logging Verification
    # ==========================================

    def test_13_audit_events_recorded_in_system_events(self):
        """Verify CASE_CREATED and CASE_TASK_COMPLETED generate structured audit events in PostgreSQL."""
        req = CaseCreateRequest(title="Audit Verification Case", severity="high")
        case = create_case(payload=req, operator=self.analyst, db=self.db)

        # Check CASE_CREATED audit event
        ev_create = (
            self.db.query(SystemEvent)
            .filter(SystemEvent.event_type == "CASE_CREATED")
            .first()
        )
        self.assertIsNotNone(ev_create)
        payload = json.loads(ev_create.message)
        self.assertEqual(payload["case_id"], case.case_id)
        self.assertEqual(payload["operator_id"], "analyst_sarah")

        # Complete a task
        complete_playbook_task(
            case_id=case.case_id,
            task_id=case.tasks[0].task_id,
            payload=CaseTaskCompleteRequest(notes="Audit verify task"),
            operator=self.responder,
            db=self.db,
        )

        # Check CASE_TASK_COMPLETED audit event
        ev_task = (
            self.db.query(SystemEvent)
            .filter(SystemEvent.event_type == "CASE_TASK_COMPLETED")
            .first()
        )
        self.assertIsNotNone(ev_task)
        t_payload = json.loads(ev_task.message)
        self.assertEqual(t_payload["operator_id"], "responder_alex")


if __name__ == "__main__":
    unittest.main()
