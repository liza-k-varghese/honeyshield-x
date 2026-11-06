"""Digital Forensic Evidence Domain Service (Milestone 15).

Implements:
- Cryptographic SHA-256 digest computation over evidence snapshots.
- Provenance recording (collector identity, source record, timestamp).
- Evidence integrity verification with audit logging.
- Role-based access control.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.registry import Operator
from app.cases.service import default_case_service
from app.evidence.storage import EvidenceStore, default_evidence_store
from app.schemas import (
    EvidenceVerificationResponse,
    ForensicEvidence,
    ForensicEvidenceCreateRequest,
)

logger = logging.getLogger(__name__)


def compute_canonical_sha256(payload: dict[str, Any] | str) -> tuple[str, int]:
    """Compute deterministic SHA-256 digest and byte size over evidence payload."""
    if isinstance(payload, dict):
        # Canonical JSON serialization: sorted keys, no whitespace
        canonical_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    else:
        canonical_str = str(payload)

    raw_bytes = canonical_str.encode("utf-8")
    digest = hashlib.sha256(raw_bytes).hexdigest()
    return digest, len(raw_bytes)


class EvidenceService:
    """Core domain service for forensic evidence lifecycle and verification."""

    def __init__(self, store: EvidenceStore | None = None) -> None:
        self.store = store or default_evidence_store

    def attach_evidence(
        self,
        case_id: str,
        payload: ForensicEvidenceCreateRequest,
        operator: Operator,
        db: Session | None = None,
    ) -> ForensicEvidence:
        """Attach an immutable forensic evidence snapshot to an incident case."""
        if not operator.has_permission("case:update") and not operator.has_permission("case:respond"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operator lacks case:update permission to attach evidence",
            )
        # Verify case exists
        case = default_case_service.get_case(case_id)
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident case '{case_id}' not found",
            )

        sha256_digest, byte_size = compute_canonical_sha256(payload.raw_payload)
        now_iso = datetime.now(timezone.utc).isoformat()
        evidence_id = f"evd-{uuid.uuid4().hex[:12]}"

        evidence = ForensicEvidence(
            evidence_id=evidence_id,
            case_id=case_id,
            source_type=payload.source_type,
            source_record_id=payload.source_record_id,
            description=payload.description,
            content_type=payload.content_type,
            byte_size=byte_size,
            sha256_digest=sha256_digest,
            collected_by=operator.username,
            collected_at=now_iso,
            access_classification=payload.access_classification,
            retention_policy=payload.retention_policy,
            raw_payload=payload.raw_payload,
        )

        self.store.save_evidence(evidence)

        if db:
            record_operator_audit(
                db=db,
                event_type="EVIDENCE_ATTACH",
                message=f"Operator {operator.username} attached evidence {evidence_id} to case {case_id} (digest: {sha256_digest[:16]}...)",
                source="forensic_evidence_service",
                severity="info",
            )

        logger.info(
            "Evidence %s attached to case %s by %s (SHA-256: %s)",
            evidence_id,
            case_id,
            operator.username,
            sha256_digest,
        )
        return evidence

    def get_evidence(self, evidence_id: str, operator: Operator) -> ForensicEvidence:
        """Retrieve a specific forensic evidence item."""
        evidence = self.store.get_evidence(evidence_id)
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Forensic evidence '{evidence_id}' not found",
            )
        return evidence

    def list_case_evidence(self, case_id: str, operator: Operator) -> list[ForensicEvidence]:
        """List all evidence attached to an incident case."""
        # Verify case exists
        case = default_case_service.get_case(case_id)
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident case '{case_id}' not found",
            )
        return self.store.list_case_evidence(case_id)

    def verify_evidence(
        self,
        evidence_id: str,
        operator: Operator,
        db: Session | None = None,
    ) -> EvidenceVerificationResponse:
        """Recalculate SHA-256 digest and verify integrity against stored digest."""
        evidence = self.get_evidence(evidence_id, operator)
        computed_digest, _ = compute_canonical_sha256(evidence.raw_payload)
        verified = (computed_digest == evidence.sha256_digest)
        now_iso = datetime.now(timezone.utc).isoformat()

        audit_note = (
            "Cryptographic integrity confirmed. Payload matches stored SHA-256."
            if verified
            else "INTEGRITY VIOLATION: Computed SHA-256 does not match stored digest!"
        )

        self.store.record_verification(
            evidence_id=evidence_id,
            verified=verified,
            calculated_digest=computed_digest,
            expected_digest=evidence.sha256_digest,
            operator_username=operator.username,
        )

        if db:
            record_operator_audit(
                db=db,
                event_type="EVIDENCE_VERIFY",
                message=f"Operator {operator.username} verified evidence {evidence_id}: {verified} (computed: {computed_digest[:16]}...)",
                source="forensic_evidence_service",
                severity="info" if verified else "warning",
            )

        return EvidenceVerificationResponse(
            evidence_id=evidence_id,
            verified=verified,
            stored_digest=evidence.sha256_digest,
            computed_digest=computed_digest,
            verification_timestamp=now_iso,
            audit_note=audit_note,
        )


default_evidence_service = EvidenceService()
