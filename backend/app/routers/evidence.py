"""Digital Forensic Evidence API Router (Milestone 15).

Provides:
- GET  /api/v1/evidence/{evidence_id}        -> Retrieve evidence record and provenance
- POST /api/v1/evidence/{evidence_id}/verify -> Verify cryptographic SHA-256 integrity
"""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.database import get_db
from app.evidence.service import default_evidence_service
from app.schemas import EvidenceVerificationResponse, ForensicEvidence

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/evidence",
    tags=["Digital Forensics & Evidence Integrity"],
)


@router.get(
    "/{evidence_id}",
    response_model=ForensicEvidence,
    status_code=status.HTTP_200_OK,
    summary="Retrieve forensic evidence metadata and payload",
)
def get_evidence(
    evidence_id: str,
    operator: Operator = Depends(require_permission("case:view")),
) -> ForensicEvidence:
    """Retrieve immutable forensic evidence record and provenance."""
    return default_evidence_service.get_evidence(
        evidence_id=evidence_id,
        operator=operator,
    )


@router.post(
    "/{evidence_id}/verify",
    response_model=EvidenceVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Cryptographically verify forensic evidence SHA-256 digest",
)
def verify_evidence(
    evidence_id: str,
    operator: Operator = Depends(require_permission("case:view")),
    db: Session = Depends(get_db),
) -> EvidenceVerificationResponse:
    """Recalculate SHA-256 digest of stored payload and check for tamper integrity."""
    return default_evidence_service.verify_evidence(
        evidence_id=evidence_id,
        operator=operator,
        db=db,
    )

