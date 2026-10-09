"""Deception Grid & Canary Orchestrator Service (Module 3.7).

Security Architecture:
- Generates and manages permanently inert decoy credentials and safe tripwires.
- Treats canary tripwires as high-confidence / presumptive-compromise defensive security signals.
- Hardens public trap listeners against adversarial input, SSRF, path traversal, and abuse.
- Links canary events to high-fidelity Alerts and Module 3.6 Incident Cases.
- NEVER autonomously executes containment; stages recommended actions for Module 3.4 Governor with Level-3 HITL authorization.
- Emits immutable SystemEvent audit logs for all lifecycle mutations.
"""

from datetime import datetime, timezone
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
from typing import Any
import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.registry import Operator
from app.cases.service import default_case_service
from app.deception.contextualizer import contextualize_canary_hit
from app.deception.generators import generate_decoy_payload
from app.deception.storage import DeceptionStore, default_deception_store
from app.incident_command.bus import default_event_bus
from app.models import Alert
from app.schemas import (
    CanaryCreateRequest,
    CanaryHitEvent,
    CanaryToken,
    CanaryUpdateRequest,
    CanaryValidationResponse,
    CaseCreateRequest,
)

logger = logging.getLogger(__name__)

VALID_CANARY_TYPES: set[str] = {
    "AWS_API_KEY",
    "DATABASE_CREDENTIAL",
    "SERVICE_API_TOKEN",
    "WEB_TRIPWIRE_ENDPOINT",
    "CANARY_FILE_BEACON",
}

TOKEN_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-]{8,64}$")
MAX_REQUEST_BODY_BYTES: int = 16384  # 16 KB max for public trap listener


def sanitize_string_field(value: str | None, max_len: int = 256) -> str:
    """Sanitize input string by removing control characters, CRLF, and null bytes."""
    if not value:
        return ""
    # Strip control characters, CRLF, and null bytes
    cleaned = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", str(value)).strip()
    return cleaned[:max_len]


class DeceptionGridService:
    """Core service for managing the Active Deception Grid and Canary Honeytokens."""

    def __init__(self, store: DeceptionStore | None = None) -> None:
        self.store = store or default_deception_store

    def _generate_canary_id(self) -> str:
        """Generate a deterministic, unique canary identifier."""
        year = datetime.now(timezone.utc).year
        for _ in range(50):
            cid = f"CANARY-{year}-{secrets.randbelow(9000) + 1000}"
            if self.store.get_canary(cid) is None:
                return cid
        return f"CANARY-{year}-{uuid.uuid4().hex[:6].upper()}"

    def mint_canary(
        self,
        payload: CanaryCreateRequest,
        operator: Operator,
        db: Session,
    ) -> CanaryToken:
        """Mint a new canary honeytoken with permanently inert decoy artifacts."""
        c_type = payload.canary_type.strip().upper()
        if c_type not in VALID_CANARY_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid canary_type. Must be one of: {', '.join(sorted(VALID_CANARY_TYPES))}",
            )

        clean_name = sanitize_string_field(payload.name, max_len=100)
        if len(clean_name) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Canary name must be at least 3 characters",
            )

        clean_env = sanitize_string_field(payload.environment, max_len=50) or "production"
        clean_hint = sanitize_string_field(payload.placement_hint, max_len=200) if payload.placement_hint else None

        canary_id = self._generate_canary_id()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 256-bit CSPRNG token generation
        token_str = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()

        # Generate inert decoy payload
        decoy_payload = generate_decoy_payload(c_type, canary_id, token_str)
        if payload.custom_labels:
            decoy_payload["custom_labels"] = {
                sanitize_string_field(k, 32): sanitize_string_field(v, 64)
                for k, v in payload.custom_labels.items()
            }

        canary = CanaryToken(
            canary_id=canary_id,
            name=clean_name,
            canary_type=c_type,
            status="active",
            token_hash=token_hash,
            token_id=token_str,
            environment=clean_env,
            placement_hint=clean_hint,
            decoy_payload=decoy_payload,
            hit_count=0,
            last_hit_at=None,
            created_by=operator.username,
            created_at=now_iso,
            updated_at=now_iso,
            revoked_at=None,
            revoked_by=None,
        )

        self.store.save_canary(canary)

        # Audit emission to PostgreSQL system_events
        try:
            record_operator_audit(
                db=db,
                event_type="CANARY_MINTED",
                message=json.dumps({
                    "canary_id": canary_id,
                    "canary_type": c_type,
                    "name": clean_name,
                    "environment": clean_env,
                    "operator_id": operator.username,
                }),
                source="deception_grid",
                severity="info",
            )
        except Exception as e:
            logger.error("Failed recording CANARY_MINTED audit for %s: %s", canary_id, str(e))

        # Broadcast event
        try:
            default_event_bus.publish(
                event_type="system.canary.minted",
                payload={
                    "canary_id": canary_id,
                    "canary_type": c_type,
                    "name": clean_name,
                    "operator_id": operator.username,
                },
            )
        except Exception:
            pass

        return canary

    def list_canaries(
        self,
        canary_type: str | None = None,
        status_filter: str | None = None,
        environment: str | None = None,
    ) -> list[CanaryToken]:
        """List canary tokens with optional filters."""
        return self.store.list_canaries(
            canary_type=canary_type,
            status=status_filter,
            environment=environment,
        )

    def get_canary(self, canary_id: str) -> CanaryToken:
        """Retrieve canary token by ID."""
        canary = self.store.get_canary(canary_id)
        if not canary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Canary honeytoken '{canary_id}' not found",
            )
        return canary

    def update_canary(
        self,
        canary_id: str,
        payload: CanaryUpdateRequest,
        operator: Operator,
        db: Session,
    ) -> CanaryToken:
        """Update canary metadata or lifecycle status."""
        canary = self.get_canary(canary_id)
        now_iso = datetime.now(timezone.utc).isoformat()
        mutations: dict[str, Any] = {}

        if payload.name is not None:
            clean_name = sanitize_string_field(payload.name, max_len=100)
            if len(clean_name) < 3:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Canary name must be at least 3 characters",
                )
            canary.name = clean_name
            mutations["name"] = clean_name

        if payload.environment is not None:
            clean_env = sanitize_string_field(payload.environment, max_len=50) or "production"
            canary.environment = clean_env
            mutations["environment"] = clean_env

        if payload.placement_hint is not None:
            clean_hint = sanitize_string_field(payload.placement_hint, max_len=200)
            canary.placement_hint = clean_hint
            mutations["placement_hint"] = clean_hint

        if payload.status is not None:
            new_status = payload.status.strip().lower()
            if new_status not in {"active", "revoked"}:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Status must be either 'active' or 'revoked'",
                )
            if new_status == "revoked" and canary.status != "revoked":
                canary.status = "revoked"
                canary.revoked_at = now_iso
                canary.revoked_by = operator.username
                mutations["status"] = "revoked"
            elif new_status == "active" and canary.status == "revoked":
                canary.status = "active"
                canary.revoked_at = None
                canary.revoked_by = None
                mutations["status"] = "active"

        canary.updated_at = now_iso
        self.store.save_canary(canary)

        # Audit emission
        try:
            audit_action = "CANARY_REVOKED" if mutations.get("status") == "revoked" else "CANARY_UPDATED"
            mutations["operator_id"] = operator.username
            record_operator_audit(
                db=db,
                event_type=audit_action,
                message=json.dumps(mutations),
                source="deception_grid",
                severity="info",
            )
        except Exception as e:
            logger.error("Failed recording audit for canary update %s: %s", canary_id, str(e))

        return canary

    def revoke_canary(
        self,
        canary_id: str,
        operator: Operator,
        db: Session,
    ) -> CanaryToken:
        """Formally revoke and decommission a canary honeytoken."""
        canary = self.store.revoke_canary(canary_id, operator.username)
        if not canary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Canary honeytoken '{canary_id}' not found",
            )

        # Audit emission
        try:
            record_operator_audit(
                db=db,
                event_type="CANARY_REVOKED",
                message=json.dumps({
                    "canary_id": canary_id,
                    "revoked_by": operator.username,
                }),
                source="deception_grid",
                severity="info",
            )
        except Exception as e:
            logger.error("Failed recording CANARY_REVOKED audit for %s: %s", canary_id, str(e))

        return canary

    def get_hits_for_canary(self, canary_id: str) -> list[CanaryHitEvent]:
        """Retrieve bounded hit history for a specific canary."""
        self.get_canary(canary_id)  # Verifies existence
        return self.store.get_hits_for_canary(canary_id)

    def list_all_hits(self, limit: int = 100) -> list[CanaryHitEvent]:
        """Retrieve global hit timeline."""
        return self.store.get_recent_hits(limit=limit)

    async def process_trap_hit(
        self,
        token_id: str,
        request: Request,
        db: Session,
    ) -> CanaryValidationResponse:
        """Process an adversary encounter on the public trap listener.

        Hardened Public Ingestion Contract:
        - Strictly validates token_id format.
        - Bounds captured headers, body payload, and client metadata.
        - Applies per-IP rate limiting and deduplication.
        - Zero code execution, zero SSRF, zero arbitrary file operations.
        - NEVER autonomously executes containment: prepares recommendation in Incident Case notes.
        - Returns a benign decoy response.
        """
        # 1. Format validation on token_id (strictly bound length and format)
        if len(token_id) > 64 or len(token_id) < 8 or not TOKEN_ID_REGEX.match(token_id):
            # Invalid token format or oversized: reject safely with generic error
            return CanaryValidationResponse(
                status="error",
                message="Invalid authentication credentials",
                code=400,
            )

        clean_token = token_id

        # 2. Extract network client IP (never trust spoofable auth headers)
        client_ip = "127.0.0.1"
        if request.client and request.client.host:
            client_ip = sanitize_string_field(request.client.host, max_len=45)

        # 3. Rate limiting guard
        if not self.store.check_rate_limit(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication requests",
            )

        # 4. Read and bound request payload (max 16KB)
        body_preview = ""
        try:
            body_bytes = await request.body()
            if len(body_bytes) > MAX_REQUEST_BODY_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Request payload exceeds maximum allowed size",
                )
            body_text = body_bytes.decode("utf-8", errors="replace")
            body_preview = sanitize_string_field(body_text, max_len=512)
        except HTTPException:
            raise
        except Exception:
            body_preview = "[Unparseable or binary payload]"

        # 5. Extract and bound request headers
        headers_captured: dict[str, str] = {}
        header_count = 0
        for k, v in request.headers.items():
            if header_count >= 15:
                break
            safe_key = sanitize_string_field(k, max_len=64).lower()
            safe_val = sanitize_string_field(v, max_len=256)
            # Exclude sensitive host/cookie internals
            if "cookie" in safe_key:
                safe_val = "[REDACTED_COOKIE]"
            headers_captured[safe_key] = safe_val
            header_count += 1

        user_agent = sanitize_string_field(request.headers.get("user-agent"), max_len=200)

        # 6. Resolve Canary token in constant time
        token_hash = hashlib.sha256(clean_token.encode()).hexdigest()
        canary = self.store.get_canary_by_token_hash(token_hash)

        # Fallback check against token_id direct match if hash lookup did not find it
        if not canary:
            # Fallback scan in memory with constant-time comparison
            for cand in self.store.list_canaries():
                cand_token = cand.token_id or cand.decoy_payload.get("trap_validation_token", "")
                if hmac.compare_digest(cand_token, clean_token):
                    canary = cand
                    break

        # If token does not match any active canary, return benign decoy response
        if not canary or canary.status != "active":
            return CanaryValidationResponse(
                status="error",
                message="Access denied: unauthorized token signature",
                code=401,
            )

        # 7. Active Tripwire Encounter Processing (High-Confidence Breach Signal)
        now_iso = datetime.now(timezone.utc).isoformat()
        hit_id = f"HIT-{uuid.uuid4().hex[:8].upper()}"

        # Deduplication check
        is_dedup = self.store.check_deduplication(canary.canary_id, client_ip)

        alert_id: int | None = None
        case_id: str | None = None

        if not is_dedup:
            # A. Create high-fidelity Alert in PostgreSQL alerts table
            try:
                alert = Alert(
                    alert_type="CANARY_TRIPWIRE_TRIGGERED",
                    severity="critical",
                    status="open",
                    message=(
                        f"High-confidence canary breach signal: Honeytoken '{canary.name}' "
                        f"({canary.canary_type}) tripped by adversary entity {client_ip}."
                    ),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(alert)
                db.commit()
                db.refresh(alert)
                alert_id = alert.id
            except Exception as e:
                db.rollback()
                logger.error("Failed creating Alert for canary hit %s: %s", canary.canary_id, str(e))

            # B. Emit immutable CANARY_TRIPPED SystemEvent audit record
            try:
                record_operator_audit(
                    db=db,
                    event_type="CANARY_TRIPPED",
                    message=json.dumps({
                        "canary_id": canary.canary_id,
                        "canary_type": canary.canary_type,
                        "source_ip": client_ip,
                        "user_agent": user_agent,
                        "alert_id": alert_id,
                    }),
                    source="deception_grid",
                    severity="critical",
                )
            except Exception as e:
                logger.error("Failed recording CANARY_TRIPPED audit: %s", str(e))

            # C. Provision Module 3.6 Incident Case with containment recommendation
            try:
                system_operator = Operator(
                    username="system:deception_grid",
                    role="security_administrator",
                    email="system@honeyshield.local",
                    password_hash="",
                )
                case_req = CaseCreateRequest(
                    title=f"High-Confidence Canary Breach: {canary.name} ({canary.canary_type})",
                    description=(
                        f"Presumptive adversary breach signal: Canary honeytoken '{canary.name}' "
                        f"deployed at '{canary.placement_hint or 'unspecified enclave'}' was tripped "
                        f"by adversary entity {client_ip}. Asset class: {canary.canary_type}."
                    ),
                    severity="critical",
                    source_ip=client_ip,
                    target_id=alert_id,
                    initial_alert_ids=[alert_id] if alert_id else [],
                    playbook_template="GENERIC_INCIDENT_SOP",
                    initial_note=(
                        f"TRIPWIRE ENCOUNTER RECORDED: Adversary IP {client_ip} interacted with "
                        f"canary {canary.canary_id} at {now_iso}.\n"
                        f"RECOMMENDED ACTION: Stage Level-3 Ingress Containment via Module 3.4 Governor for IP {client_ip}.\n"
                        f"NOTE: Autonomous execution is prohibited. Operator Level-3 HITL approval is strictly mandatory."
                    ),
                )
                new_case = default_case_service.create_case(
                    payload=case_req,
                    operator=system_operator,
                    db=db,
                )
                case_id = new_case.case_id
            except Exception as e:
                logger.error("Failed provisioning Incident Case for canary hit: %s", str(e))

        # D. Update canary hit counter
        canary.hit_count += 1
        canary.last_hit_at = now_iso
        self.store.save_canary(canary)

        # E. Record bounded hit event in store
        hit_event = CanaryHitEvent(
            hit_id=hit_id,
            canary_id=canary.canary_id,
            canary_type=canary.canary_type,
            source_ip=client_ip,
            user_agent=user_agent,
            request_method=request.method,
            headers_captured=headers_captured,
            payload_preview=body_preview,
            alert_id=alert_id,
            case_id=case_id,
            timestamp=now_iso,
        )
        self.store.record_hit(hit_event)

        # F. Broadcast real-time event to SSE event bus
        try:
            default_event_bus.publish(
                event_type="system.canary.tripped",
                payload={
                    "hit_id": hit_id,
                    "canary_id": canary.canary_id,
                    "canary_name": canary.name,
                    "canary_type": canary.canary_type,
                    "source_ip": client_ip,
                    "alert_id": alert_id,
                    "case_id": case_id,
                    "timestamp": now_iso,
                },
            )
        except Exception:
            pass

        # G. Promote to Module 3.8 Threat Intelligence (if auto-promote enabled)
        if os.getenv("HONEYSHIELD_AUTO_PROMOTE_CANARY", "false").lower() in ("true", "1"):
            try:
                from app.threat_intelligence.service import threat_intel_service
                threat_intel_service.promote_canary_hit(
                    db=db,
                    source_ip=client_ip,
                    canary_id=canary.canary_id,
                    canary_type=canary.canary_type,
                    custom_campaign=canary.custom_labels.get("campaign") if hasattr(canary, "custom_labels") and canary.custom_labels else None,
                )
            except Exception as e:
                logger.error("Failed promoting canary hit to threat intelligence: %s", str(e))

        # Return benign decoy response
        return CanaryValidationResponse(
            status="error",
            message="Authentication failed: invalid authorization credential signature",
            code=401,
        )


default_deception_service = DeceptionGridService()
