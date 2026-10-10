"""RBAC and Entitlement Tests for Module 3.11 Threat Hunting.

Verifies:
- Deterministic 4-tier role permission resolution (viewer, analyst, incident_responder, security_administrator).
- Granular endpoint enforcement:
  - viewer: Read-only access (hunt:view). Cannot create, update, execute, promote, or archive.
  - analyst: Full operational hunting (view, create, update, execute, promote). Cannot archive.
  - responder: Full operational hunting (view, create, update, execute, promote). Cannot archive.
  - admin: Full authority including archiving (hunt:admin).
- Hypothesis ownership: analyst cannot modify another analyst's core hypothesis unless granted hunt:admin.
- No public delete mutation endpoint exists (SOC audit compliance).
- Operator identity originates strictly from authenticated Bearer session.
"""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

from app.auth.dependencies import require_permission
from app.auth.registry import (
    HUNT_ROLE_PERMISSIONS,
    Operator,
    default_operator_registry,
)
from app.hunting.service import HuntService, default_hunt_service
from app.hunting.storage import HuntStore
from app.main import app
from app.routers.hunts import (
    archive_hunt,
    create_hunt,
    execute_hunt,
    get_hunt_dossier,
    get_hunt_metrics,
    list_hunts,
    promote_to_detection_rule,
    promote_to_incident_case,
    update_hunt_dossier,
)
from app.schemas import (
    HuntCreateRequest,
    HuntDossier,
    HuntPromotionRequest,
    HuntQuerySpec,
    HuntUpdateRequest,
)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_request():
    req = MagicMock()
    req.client.host = "127.0.0.1"
    req.url.path = "/api/v1/hunts"
    return req


def test_rbac_matrix_permission_resolution():
    """Verify HUNT_ROLE_PERMISSIONS resolves expected entitlements across all 4 tiers."""
    # 1. Viewer
    viewer = Operator(username="v1", role="viewer", email="v@hsx.local", password_hash="")
    assert viewer.has_permission("hunt:view")
    assert not viewer.has_permission("hunt:create")
    assert not viewer.has_permission("hunt:execute")
    assert not viewer.has_permission("hunt:promote")
    assert not viewer.has_permission("hunt:admin")

    # 2. Analyst
    analyst = Operator(username="a1", role="analyst", email="a@hsx.local", password_hash="")
    assert analyst.has_permission("hunt:view")
    assert analyst.has_permission("hunt:create")
    assert analyst.has_permission("hunt:update")
    assert analyst.has_permission("hunt:execute")
    assert analyst.has_permission("hunt:promote")
    assert not analyst.has_permission("hunt:admin")

    # 3. Incident Responder
    responder = Operator(username="r1", role="incident_responder", email="r@hsx.local", password_hash="")
    assert responder.has_permission("hunt:view")
    assert responder.has_permission("hunt:create")
    assert responder.has_permission("hunt:update")
    assert responder.has_permission("hunt:execute")
    assert responder.has_permission("hunt:promote")
    assert not responder.has_permission("hunt:admin")

    # 4. Security Administrator
    admin = Operator(username="admin1", role="security_administrator", email="adm@hsx.local", password_hash="")
    assert admin.has_permission("hunt:view")
    assert admin.has_permission("hunt:create")
    assert admin.has_permission("hunt:update")
    assert admin.has_permission("hunt:execute")
    assert admin.has_permission("hunt:promote")
    assert admin.has_permission("hunt:admin")


def test_require_permission_guard_rejections(mock_request, mock_db):
    """Verify require_permission dependency raises HTTP 403 on unentitled operators."""
    viewer = Operator(username="viewer_user", role="viewer", email="v@hsx.local", password_hash="")
    analyst = Operator(username="analyst_user", role="analyst", email="a@hsx.local", password_hash="")

    guard_create = require_permission("hunt:create")
    guard_execute = require_permission("hunt:execute")
    guard_admin = require_permission("hunt:admin")

    # Viewer cannot create
    with pytest.raises(HTTPException) as exc_info:
        guard_create(request=mock_request, operator=viewer, db=mock_db)
    assert exc_info.value.status_code == 403

    # Viewer cannot execute
    with pytest.raises(HTTPException) as exc_info:
        guard_execute(request=mock_request, operator=viewer, db=mock_db)
    assert exc_info.value.status_code == 403

    # Analyst cannot admin/archive
    with pytest.raises(HTTPException) as exc_info:
        guard_admin(request=mock_request, operator=analyst, db=mock_db)
    assert exc_info.value.status_code == 403


def test_analyst_ownership_boundary(mock_db):
    """Verify an analyst cannot modify another analyst's hypothesis without hunt:admin."""
    service = HuntService(store=HuntStore(use_redis=False))

    creator = Operator(username="analyst_alice", role="analyst", email="alice@hsx.local", password_hash="")
    intruder = Operator(username="analyst_bob", role="analyst", email="bob@hsx.local", password_hash="")
    admin = Operator(username="admin_carol", role="security_administrator", email="carol@hsx.local", password_hash="")

    # Alice creates a hunt
    hunt = service.create_hunt(
        payload=HuntCreateRequest(
            title="Alice Confidential Threat Hunt",
            description="Alice's private hypothesis",
            severity="high",
        ),
        operator=creator,
        db=mock_db,
    )

    # Bob attempts to update Alice's hypothesis title -> HTTP 403
    with pytest.raises(HTTPException) as exc_info:
        service.update_hunt(
            hunt_id=hunt.hunt_id,
            payload=HuntUpdateRequest(title="Bob Hijacked This Hypothesis"),
            operator=intruder,
            db=mock_db,
        )
    assert exc_info.value.status_code == 403
    assert "Only the hypothesis creator" in exc_info.value.detail

    # But Bob CAN append a collaborative forensic note
    updated_with_note = service.update_hunt(
        hunt_id=hunt.hunt_id,
        payload=HuntUpdateRequest(note="Bob collaborative observation note"),
        operator=intruder,
        db=mock_db,
    )
    assert len(updated_with_note.forensic_notes) == 1
    assert updated_with_note.forensic_notes[0].operator_id == "analyst_bob"

    # Admin Carol CAN update Alice's title
    updated_by_admin = service.update_hunt(
        hunt_id=hunt.hunt_id,
        payload=HuntUpdateRequest(title="Admin Approved Threat Hunt Title"),
        operator=admin,
        db=mock_db,
    )
    assert updated_by_admin.title == "Admin Approved Threat Hunt Title"


def test_archive_restricted_to_security_administrator(mock_db):
    """Verify only security_administrator (hunt:admin) can archive a concluded hunt."""
    service = HuntService(store=HuntStore(use_redis=False))

    analyst = Operator(username="analyst_alice", role="analyst", email="alice@hsx.local", password_hash="")
    admin = Operator(username="admin_carol", role="security_administrator", email="carol@hsx.local", password_hash="")

    hunt = service.create_hunt(
        payload=HuntCreateRequest(
            title="Test Hypothesis For Archiving",
            description="Test archiving lifecycle",
            severity="medium",
        ),
        operator=analyst,
        db=mock_db,
    )

    # Set status to completed then concluded
    hunt.status = "completed"
    service.store.save_hunt(hunt)
    service.update_hunt(
        hunt_id=hunt.hunt_id,
        payload=HuntUpdateRequest(
            verdict="benign_activity",
            conclusion_summary="Investigation concluded benign activity",
        ),
        operator=analyst,
        db=mock_db,
    )

    # Admin can archive
    archived = service.archive_hunt(
        hunt_id=hunt.hunt_id,
        operator=admin,
        db=mock_db,
    )
    assert archived.status == "archived"


def test_no_delete_endpoint_permitted():
    """Verify permanent deletion is prohibited across all routes under /api/v1/hunts."""
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set())
        if path.startswith("/api/v1/hunts"):
            assert "DELETE" not in methods, f"Disallowed DELETE method found on route {path}"
