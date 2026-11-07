"""Dual-Mode Redis & In-Memory Forensic Evidence Storage (Milestone 15).

Implements:
- Redis primary storage under 'hsx:evidence:{evidence_id}'.
- Thread-safe in-memory fallback dict if Redis is offline.
- Case-to-evidence index mapping under 'hsx:case_evidence:{case_id}'.
- Verification audit trail per evidence item.
"""

from datetime import datetime, timezone
import json
import logging
import os
import threading
from typing import Any

import redis

from app.schemas import ForensicEvidence

logger = logging.getLogger(__name__)

REDIS_EVIDENCE_PREFIX = "hsx:evidence:"
REDIS_CASE_EVIDENCE_PREFIX = "hsx:case_evidence:"
REDIS_HOST = os.getenv("HONEYSHIELD_REDIS_HOST", os.getenv("REDIS_HOST", "127.0.0.1"))
REDIS_PORT = int(os.getenv("HONEYSHIELD_REDIS_PORT", os.getenv("REDIS_PORT", "6379")))


class EvidenceStore:
    """Thread-safe storage repository for forensic evidence items."""

    def __init__(self, use_redis: bool = True) -> None:
        self._lock = threading.RLock()
        self._memory_evidence: dict[str, ForensicEvidence] = {}
        self._memory_case_index: dict[str, set[str]] = {}
        self._memory_verification_history: dict[str, list[dict[str, Any]]] = {}
        self._redis_client: redis.Redis | None = None
        if use_redis:
            self._init_redis()

    def _init_redis(self) -> None:
        try:
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_timeout=1.0,
            )
            client.ping()
            self._redis_client = client
            logger.info("EvidenceStore connected to Redis at %s:%d", REDIS_HOST, REDIS_PORT)
        except Exception as e:
            logger.warning("EvidenceStore running in in-memory fallback mode: %s", str(e))
            self._redis_client = None

    def save_evidence(self, evidence: ForensicEvidence) -> ForensicEvidence:
        """Store an immutable forensic evidence item."""
        with self._lock:
            # Memory store
            self._memory_evidence[evidence.evidence_id] = evidence
            if evidence.case_id not in self._memory_case_index:
                self._memory_case_index[evidence.case_id] = set()
            self._memory_case_index[evidence.case_id].add(evidence.evidence_id)

            # Redis store
            if self._redis_client:
                try:
                    payload_json = evidence.model_dump_json()
                    self._redis_client.set(f"{REDIS_EVIDENCE_PREFIX}{evidence.evidence_id}", payload_json)
                    self._redis_client.sadd(f"{REDIS_CASE_EVIDENCE_PREFIX}{evidence.case_id}", evidence.evidence_id)
                except Exception as e:
                    logger.warning("Redis error saving evidence %s: %s", evidence.evidence_id, e)

            return evidence

    def get_evidence(self, evidence_id: str) -> ForensicEvidence | None:
        """Retrieve an evidence item by its identifier."""
        with self._lock:
            if self._redis_client:
                try:
                    raw = self._redis_client.get(f"{REDIS_EVIDENCE_PREFIX}{evidence_id}")
                    if raw:
                        return ForensicEvidence.model_validate_json(raw)
                except Exception as e:
                    logger.warning("Redis error reading evidence %s: %s", evidence_id, e)

            return self._memory_evidence.get(evidence_id)

    def list_case_evidence(self, case_id: str) -> list[ForensicEvidence]:
        """List all evidence attached to a specific incident case."""
        with self._lock:
            evidence_ids: list[str] = []
            if self._redis_client:
                try:
                    members = self._redis_client.smembers(f"{REDIS_CASE_EVIDENCE_PREFIX}{case_id}")
                    if members:
                        evidence_ids = sorted(list(members))
                except Exception as e:
                    logger.warning("Redis error listing case evidence %s: %s", case_id, e)

            if not evidence_ids and case_id in self._memory_case_index:
                evidence_ids = sorted(list(self._memory_case_index[case_id]))

            items: list[ForensicEvidence] = []
            for eid in evidence_ids:
                item = self.get_evidence(eid)
                if item:
                    items.append(item)

            return items

    def record_verification(
        self,
        evidence_id: str,
        verified: bool,
        calculated_digest: str,
        expected_digest: str,
        operator_username: str,
    ) -> dict[str, Any]:
        """Record a verification attempt in the audit log."""
        record = {
            "evidence_id": evidence_id,
            "verified": verified,
            "calculated_digest": calculated_digest,
            "expected_digest": expected_digest,
            "verified_by": operator_username,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with self._lock:
            if evidence_id not in self._memory_verification_history:
                self._memory_verification_history[evidence_id] = []
            self._memory_verification_history[evidence_id].append(record)
        return record


default_evidence_store = EvidenceStore()

