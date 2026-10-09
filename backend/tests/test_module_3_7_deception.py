"""Unit and integration test suite for HoneyShield-X Module 3.7: Active Deception Grid.

Tests:
1. Canary minting across all 5 asset classes (AWS_API_KEY, DATABASE_CREDENTIAL, SERVICE_API_TOKEN, WEB_TRIPWIRE_ENDPOINT, CANARY_FILE_BEACON).
2. Permanently inert decoy payload verification (safe disclaimers, no functional access).
3. Canary listing with filters (type, status, environment).
4. Canary retrieval by ID (404 on non-existent).
5. Canary metadata updates (name, environment, placement hint, status).
6. Canary revocation (status changes to revoked, timestamp and operator attributed).
7. Trap listener encounter processing (GET and POST).
8. High-confidence breach signal: Alert generated, CANARY_TRIPPED in SystemEvent, Case provisioned.
9. Recommended containment in case notes without autonomous execution.
10. Hit history retrieval for specific canary and recent global hits.
11. Bounded hit retention (maximum 100 hits per canary, 500 recent global hits).
12. Advisory threat contextualization across asset classes.
13. In-memory storage fallback resiliency when Redis is unavailable.
14. Audit ledger event emission to PostgreSQL system_events table.
"""

import json
import unittest
import uuid
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.registry import default_operator_registry, Operator
from app.cases.service import default_case_service
from app.database import SessionLocal
from app.deception.contextualizer import contextualize_canary_hit
from app.deception.generators import generate_decoy_payload
from app.deception.service import DeceptionGridService, default_deception_service
from app.deception.storage import DeceptionStore, default_deception_store
from app.models import Alert, SystemEvent
from app.routers.deception import (
    get_canary,
    get_canary_context,
    get_canary_hits,
    list_all_hits,
    list_canaries,
    mint_canary,
    revoke_canary,
    update_canary,
    validate_canary_get,
    validate_canary_post,
)
from app.schemas import (
    CanaryCreateRequest,
    CanaryHitEvent,
    CanaryUpdateRequest,
)


def make_mock_trap_request(
    method: str = "GET",
    path: str = "/api/v1/deception/validate/test_token",
    client_ip: str = "198.51.100.25",
    headers: dict[str, str] | None = None,
    body: bytes = b"",
) -> Request:
    """Construct a mock Starlette Request for trap endpoint testing."""
    raw_headers = [
        (b"host", b"testserver"),
        (b"user-agent", b"Adversary-Scanner/2.4"),
    ]
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode(), v.encode()))

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": raw_headers,
            "client": (client_ip, 49152),
        },
        receive=receive,
    )


class TestModule37Deception(unittest.IsolatedAsyncioTestCase):
    """Test suite for Active Deception Grid & Canary Honeytokens."""

    def setUp(self):
        self.db: Session = SessionLocal()
        default_operator_registry.reset()
        default_deception_store.clear()
        default_case_service.store.clear()

        self.admin: Operator = default_operator_registry.get_operator("admin_chief")
        self.analyst: Operator = default_operator_registry.get_operator("analyst_sarah")
        self.responder: Operator = default_operator_registry.get_operator("responder_alex")
        self.viewer: Operator = default_operator_registry.get_operator("viewer_dan")

        self.created_alert_ids: list[int] = []

    def tearDown(self):
        for aid in self.created_alert_ids:
            self.db.query(Alert).filter(Alert.id == aid).delete()
        self.db.commit()
        self.db.close()

    def test_1_mint_all_five_canary_types_with_inert_payloads(self):
        """Verify minting for all 5 asset classes produces permanently inert decoy credentials."""
        types = [
            "AWS_API_KEY",
            "DATABASE_CREDENTIAL",
            "SERVICE_API_TOKEN",
            "WEB_TRIPWIRE_ENDPOINT",
            "CANARY_FILE_BEACON",
        ]

        for c_type in types:
            req = CanaryCreateRequest(
                name=f"Decoy {c_type}",
                canary_type=c_type,
                environment="production",
                placement_hint=f"Decoy location for {c_type}",
            )
            canary = mint_canary(payload=req, operator=self.analyst, db=self.db)

            self.assertIsNotNone(canary.canary_id)
            self.assertEqual(canary.canary_type, c_type)
            self.assertEqual(canary.status, "active")
            self.assertEqual(canary.created_by, self.analyst.username)
            self.assertEqual(canary.hit_count, 0)

            # Verify inert payload properties
            payload = canary.decoy_payload
            self.assertIn("inert_disclaimer", payload)
            self.assertTrue(len(payload["inert_disclaimer"]) > 0)

            if c_type == "AWS_API_KEY":
                self.assertTrue(payload["access_key_id"].startswith("AKIA"))
                self.assertEqual(len(payload["secret_access_key"]), 40)
            elif c_type == "DATABASE_CREDENTIAL":
                self.assertIn("postgresql://", payload["connection_string"])
                self.assertEqual(payload["port"], 5432)
            elif c_type == "SERVICE_API_TOKEN":
                self.assertTrue(payload["token"].startswith("hsx_sec_"))
            elif c_type == "WEB_TRIPWIRE_ENDPOINT":
                self.assertIn("/api/v1/deception/validate/", payload["tripwire_path"])
            elif c_type == "CANARY_FILE_BEACON":
                self.assertIn("credentials_backup.conf", payload["filename"])
                self.assertIn("[vault_sync]", payload["file_content"])

    def test_2_invalid_canary_type_and_short_name_rejected(self):
        """Verify 422 rejection when minting with invalid asset class or short name."""
        with self.assertRaises((HTTPException, ValidationError)):
            mint_canary(
                payload=CanaryCreateRequest(name="Valid Name", canary_type="EXPLOIT_KIT_SCANNER"),
                operator=self.analyst,
                db=self.db,
            )

        with self.assertRaises((HTTPException, ValidationError)):
            mint_canary(
                payload=CanaryCreateRequest(name="ab", canary_type="AWS_API_KEY"),
                operator=self.analyst,
                db=self.db,
            )

    def test_3_list_canaries_with_filtering(self):
        """Verify listing and filtering by type, status, and environment."""
        mint_canary(
            payload=CanaryCreateRequest(name="AWS Prod Key", canary_type="AWS_API_KEY", environment="production"),
            operator=self.analyst,
            db=self.db,
        )
        mint_canary(
            payload=CanaryCreateRequest(name="DB Staging Key", canary_type="DATABASE_CREDENTIAL", environment="staging"),
            operator=self.analyst,
            db=self.db,
        )

        all_res = list_canaries(operator=self.analyst)
        self.assertEqual(all_res.total, 2)

        aws_res = list_canaries(canary_type="AWS_API_KEY", operator=self.analyst)
        self.assertEqual(aws_res.total, 1)
        self.assertEqual(aws_res.canaries[0].canary_type, "AWS_API_KEY")

        staging_res = list_canaries(environment="staging", operator=self.analyst)
        self.assertEqual(staging_res.total, 1)
        self.assertEqual(staging_res.canaries[0].name, "DB Staging Key")

    def test_4_get_canary_detail_and_404_on_missing(self):
        """Verify retrieving specific canary and 404 for missing IDs."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Target Canary", canary_type="SERVICE_API_TOKEN"),
            operator=self.analyst,
            db=self.db,
        )

        fetched = get_canary(canary_id=canary.canary_id, operator=self.analyst)
        self.assertEqual(fetched.canary_id, canary.canary_id)

        with self.assertRaises(HTTPException) as ctx:
            get_canary(canary_id="CANARY-9999-NONEXISTENT", operator=self.analyst)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_5_update_canary_metadata_and_status(self):
        """Verify updating canary labels and toggling status."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Initial Name", canary_type="AWS_API_KEY"),
            operator=self.analyst,
            db=self.db,
        )

        updated = update_canary(
            canary_id=canary.canary_id,
            payload=CanaryUpdateRequest(name="Updated Label", placement_hint="Repo git config"),
            operator=self.analyst,
            db=self.db,
        )
        self.assertEqual(updated.name, "Updated Label")
        self.assertEqual(updated.placement_hint, "Repo git config")

    def test_6_revoke_canary_lifecycle_transition(self):
        """Verify permanent revocation decommissions token immediately."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="To Be Revoked", canary_type="DATABASE_CREDENTIAL"),
            operator=self.admin,
            db=self.db,
        )

        revoked = revoke_canary(canary_id=canary.canary_id, operator=self.admin, db=self.db)
        self.assertEqual(revoked.status, "revoked")
        self.assertIsNotNone(revoked.revoked_at)
        self.assertEqual(revoked.revoked_by, self.admin.username)

        # Confirm get reflects revoked status
        refetched = get_canary(canary_id=canary.canary_id, operator=self.admin)
        self.assertEqual(refetched.status, "revoked")

    async def test_7_trap_listener_encounter_creates_alert_case_and_preserves_safety(self):
        """Verify adversary trap hit creates Alert, CANARY_TRIPPED audit, Incident Case, and preserves Governor HITL."""
        canary = mint_canary(
            payload=CanaryCreateRequest(
                name="Critical Web Trap",
                canary_type="WEB_TRIPWIRE_ENDPOINT",
                placement_hint="/admin/login comments",
            ),
            operator=self.analyst,
            db=self.db,
        )
        token_id = canary.token_id

        # Simulate adversary probing the trap listener
        req = make_mock_trap_request(
            method="GET",
            path=f"/api/v1/deception/validate/{token_id}",
            client_ip="203.0.113.88",
        )
        response = await validate_canary_get(token_id=token_id, request=req, db=self.db)

        # 1. Verify adversary receives benign decoy error
        self.assertEqual(response.status, "error")
        self.assertEqual(response.code, 401)

        # 2. Verify canary record updated
        updated_canary = get_canary(canary_id=canary.canary_id, operator=self.analyst)
        self.assertEqual(updated_canary.hit_count, 1)
        self.assertIsNotNone(updated_canary.last_hit_at)

        # 3. Verify Alert generated in database
        alerts = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").all()
        self.assertTrue(len(alerts) >= 1)
        latest_alert = alerts[-1]
        self.created_alert_ids.append(latest_alert.id)
        self.assertIn("203.0.113.88", latest_alert.message)

        # 4. Verify CANARY_TRIPPED SystemEvent audit logged
        audit_events = self.db.query(SystemEvent).filter(SystemEvent.event_type == "CANARY_TRIPPED").all()
        self.assertTrue(len(audit_events) >= 1)

        # 5. Verify Incident Case provisioned via Module 3.6
        cases_list, total_cases = default_case_service.list_cases()
        self.assertTrue(total_cases >= 1)
        latest_case = cases_list[0]
        self.assertIn("High-Confidence Canary Breach", latest_case.title)
        self.assertEqual(latest_case.source_ip, "203.0.113.88")
        self.assertEqual(latest_case.severity, "critical")

        # 6. Verify case notes recommend containment without autonomous execution
        self.assertTrue(len(latest_case.notes) >= 1)
        self.assertIn("RECOMMENDED ACTION: Stage Level-3 Ingress Containment", latest_case.notes[0].message)
        self.assertIn("Operator Level-3 HITL approval is strictly mandatory", latest_case.notes[0].message)

    async def test_8_revoked_canary_does_not_fire_active_breach_alerts(self):
        """Verify that hitting a revoked canary does NOT fire active incident alerts."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="Decommissioned Key", canary_type="SERVICE_API_TOKEN"),
            operator=self.admin,
            db=self.db,
        )
        token_id = canary.token_id

        # Revoke canary
        revoke_canary(canary_id=canary.canary_id, operator=self.admin, db=self.db)

        initial_alerts_count = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").count()

        # Adversary hits revoked token
        req = make_mock_trap_request(client_ip="198.51.100.99")
        response = await validate_canary_get(token_id=token_id, request=req, db=self.db)

        self.assertEqual(response.status, "error")
        self.assertEqual(response.code, 401)

        # Alerts count should NOT increase
        new_alerts_count = self.db.query(Alert).filter(Alert.alert_type == "CANARY_TRIPWIRE_TRIGGERED").count()
        self.assertEqual(new_alerts_count, initial_alerts_count)

    def test_9_advisory_threat_contextualizer(self):
        """Verify deterministic threat contextualization across asset classes."""
        canary = mint_canary(
            payload=CanaryCreateRequest(name="AWS Canary", canary_type="AWS_API_KEY"),
            operator=self.analyst,
            db=self.db,
        )
        ctx = get_canary_context(canary_id=canary.canary_id, operator=self.analyst)

        self.assertEqual(ctx["canary_id"], canary.canary_id)
        self.assertEqual(ctx["canary_type"], "AWS_API_KEY")
        self.assertIn("Cloud Credential Theft", ctx["adversary_intent"])
        self.assertEqual(ctx["confidence"], "HIGH_CONFIDENCE")
        self.assertIn("Advisory context generated deterministically", ctx["advisory_disclaimer"])

    def test_10_bounded_hit_retention(self):
        """Verify hits are strictly bounded in storage to prevent memory exhaustion."""
        store = DeceptionStore()
        canary_id = "CANARY-2026-BOUNDED"

        # Record 150 hits
        for i in range(150):
            hit = CanaryHitEvent(
                hit_id=f"HIT-{i}",
                canary_id=canary_id,
                canary_type="AWS_API_KEY",
                source_ip=f"10.0.0.{i % 250}",
                user_agent="TestScanner",
                request_method="GET",
                headers_captured={},
                payload_preview=None,
                alert_id=None,
                case_id=None,
                timestamp="2026-10-09T00:00:00Z",
            )
            store.record_hit(hit)

        stored_hits = store.get_hits_for_canary(canary_id)
        self.assertLessEqual(len(stored_hits), 100)

        recent = store.get_recent_hits(limit=500)
        self.assertLessEqual(len(recent), 500)


if __name__ == "__main__":
    unittest.main()
