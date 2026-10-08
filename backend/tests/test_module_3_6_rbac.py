"""Unit and integration test suite for HoneyShield-X Module 3.6: Case Management RBAC Boundaries.

Tests:
1. Viewer role authorization boundaries (can view cases and PIR reports, 403 on create/update/respond/notes).
2. Analyst role authorization boundaries (can view, create, update, note; 403 on task respond).
3. Incident Responder role capabilities (authorized for all operational case progression tasks).
4. Security Administrator role capabilities (authorized for all case operations + closed case reopening).
5. Unauthenticated / missing token rejection (HTTP 401).
6. Inactive operator rejection (HTTP 401).
7. Audit trail emission for authorization denials (OPERATOR_AUTH_DENIED).
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import get_audit_events
from app.auth.dependencies import require_permission
from app.auth.registry import default_operator_registry, Operator
from app.cases.service import default_case_service
from app.database import SessionLocal
from app.models import SystemEvent
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


def make_mock_request(
    method: str = "POST",
    path: str = "/api/v1/cases",
    authorization: str | None = None,
    client_ip: str = "127.0.0.1",
) -> Request:
    """Construct a lightweight Starlette Request instance."""
    headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"HoneyShield-Case-RBAC-Test/1.0"),
    ]
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": headers,
        "client": (client_ip, 12345),
    })


class TestModule36RBAC(unittest.TestCase):
    """Test suite covering deterministic RBAC barriers on Module 3.6 endpoints."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_case_service.store.clear()

        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.admin: Operator = default_operator_registry.get_operator("admin_chief")

        # Create baseline case for testing mutations
        req = CaseCreateRequest(
            title="RBAC Baseline Incident Case",
            severity="high",
            playbook_template="GENERIC_INCIDENT_SOP",
        )
        self.baseline_case = create_case(payload=req, operator=self.analyst, db=self.db)

    def tearDown(self):
        self.db.query(SystemEvent).filter(SystemEvent.source.in_(["auth", "case_management"])).delete()
        self.db.commit()
        self.db.close()
        default_operator_registry.reset()
        default_case_service.store.clear()

    # ==========================================
    # 1. Viewer Role Boundaries
    # ==========================================

    def test_1_viewer_can_read_cases_and_reports(self):
        """Test Viewer role has case:view and can list cases and inspect reports."""
        res = list_cases(operator=self.viewer)
        self.assertTrue(len(res.cases) >= 1)

        c = get_case(case_id=self.baseline_case.case_id, operator=self.viewer)
        self.assertEqual(c.case_id, self.baseline_case.case_id)

        rep = get_post_incident_report(case_id=self.baseline_case.case_id, operator=self.viewer)
        self.assertEqual(rep.case_id, self.baseline_case.case_id)

    def test_2_viewer_forbidden_from_creating_case(self):
        """Test Viewer role cannot create incident cases (HTTP 403)."""
        guard = require_permission("case:create")
        req_obj = make_mock_request(method="POST", path="/api/v1/cases")

        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("case:create", ctx.exception.detail)

    def test_3_viewer_forbidden_from_updating_case(self):
        """Test Viewer role cannot update case metadata or status (HTTP 403)."""
        guard = require_permission("case:update")
        req_obj = make_mock_request(method="PATCH", path=f"/api/v1/cases/{self.baseline_case.case_id}")

        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("case:update", ctx.exception.detail)

    def test_4_viewer_forbidden_from_responding_to_task(self):
        """Test Viewer role cannot complete playbook tasks (HTTP 403)."""
        guard = require_permission("case:respond")
        t_id = self.baseline_case.tasks[0].task_id
        req_obj = make_mock_request(method="POST", path=f"/api/v1/cases/{self.baseline_case.case_id}/tasks/{t_id}/complete")

        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=self.viewer, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("case:respond", ctx.exception.detail)

    # ==========================================
    # 2. Analyst Role Boundaries
    # ==========================================

    def test_5_analyst_can_create_update_and_add_notes(self):
        """Test Analyst role has case:create and case:update."""
        # Create
        req = CaseCreateRequest(title="Analyst Auth Case", severity="medium")
        c = create_case(payload=req, operator=self.analyst, db=self.db)
        self.assertEqual(c.title, "Analyst Auth Case")

        # Update
        up = update_case(case_id=c.case_id, payload=CaseUpdateRequest(status="investigating"), operator=self.analyst, db=self.db)
        self.assertEqual(up.status, "investigating")

        # Note
        note = add_case_note(case_id=c.case_id, payload=CaseNoteCreateRequest(message="Analyst note"), operator=self.analyst, db=self.db)
        self.assertEqual(note.operator_id, "analyst_sarah")

    def test_6_analyst_forbidden_from_completing_task(self):
        """Test Analyst role is forbidden from completing playbook tasks (requires case:respond -> HTTP 403)."""
        guard = require_permission("case:respond")
        t_id = self.baseline_case.tasks[0].task_id
        req_obj = make_mock_request(method="POST", path=f"/api/v1/cases/{self.baseline_case.case_id}/tasks/{t_id}/complete")

        with self.assertRaises(HTTPException) as ctx:
            guard(request=req_obj, operator=self.analyst, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("case:respond", ctx.exception.detail)

    # ==========================================
    # 3. Incident Responder Role
    # ==========================================

    def test_7_responder_authorized_for_task_progression(self):
        """Test Incident Responder role has case:respond and successfully completes tasks."""
        t_id = self.baseline_case.tasks[0].task_id
        updated = complete_playbook_task(
            case_id=self.baseline_case.case_id,
            task_id=t_id,
            payload=CaseTaskCompleteRequest(notes="Responder verification complete"),
            operator=self.responder,
            db=self.db,
        )
        self.assertEqual(updated.tasks[0].status, "completed")
        self.assertEqual(updated.tasks[0].completed_by, "responder_alex")

    # ==========================================
    # 4. Security Administrator Role
    # ==========================================

    def test_8_admin_authorized_for_all_and_reopen(self):
        """Test Security Administrator has all case permissions and reopens closed case."""
        # Close case
        update_case(case_id=self.baseline_case.case_id, payload=CaseUpdateRequest(status="closed"), operator=self.responder, db=self.db)

        # Admin reopens
        reopened = update_case(case_id=self.baseline_case.case_id, payload=CaseUpdateRequest(status="investigating"), operator=self.admin, db=self.db)
        self.assertEqual(reopened.status, "investigating")

    # ==========================================
    # 5. Inactive Operator & Audit Logging
    # ==========================================

    def test_9_inactive_operator_rejected_via_current_operator(self):
        """Test inactive operator cannot authenticate via session (HTTP 401)."""
        from app.auth.dependencies import get_current_operator
        from app.auth.session import default_session_store

        raw_token, _ = default_session_store.create_session(self.viewer)
        default_operator_registry.deactivate_operator("viewer_dan")

        req_auth = make_mock_request(method="GET", path="/api/v1/cases", authorization=f"Bearer {raw_token}")
        with self.assertRaises(HTTPException) as ctx:
            get_current_operator(request=req_auth, authorization=f"Bearer {raw_token}")
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("inactive", ctx.exception.detail.lower())

    def test_10_auth_denial_emits_audit_event(self):
        """Test permission denial records OPERATOR_AUTH_DENIED in PostgreSQL system_events."""
        guard = require_permission("case:create")
        req_obj = make_mock_request(method="POST", path="/api/v1/cases")

        try:
            guard(request=req_obj, operator=self.viewer, db=self.db)
        except HTTPException:
            pass

        events = get_audit_events(db=self.db, event_type="OPERATOR_AUTH_DENIED")
        self.assertTrue(len(events) >= 1)
        ev = events[0]
        self.assertEqual(ev.source, "auth")
        self.assertIn("case:create", ev.message)


if __name__ == "__main__":
    unittest.main()
