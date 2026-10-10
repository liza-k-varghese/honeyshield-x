"""Dual-Mode Redis & In-Memory Threat Hunt Storage (Module 3.11).

Implements:
- Redis primary storage with automatic thread-safe in-memory fallback.
- Two-tier capacity limits: max 200 active (non-archived) hunts, max 500 total stored hunts.
- Deterministic FIFO eviction of ARCHIVED and benign CONCLUDED hunts.
- Protected states: DRAFT, SCHEDULED, RUNNING, COMPLETED, and malicious CONCLUDED are strictly unevictable.
- Strict 64 KB (65,536 bytes) serialized payload cap per dossier.
"""

from datetime import datetime, timezone
import json
import logging
import os
import threading
from typing import Any

from fastapi import HTTPException, status
import redis

from app.schemas import (
    HuntDossier,
    HuntMetricsResponse,
    HuntSummary,
)

logger = logging.getLogger(__name__)

# Storage bounds
MAX_ACTIVE_HUNTS: int = 200
MAX_TOTAL_HUNTS: int = 500
MAX_SERIALIZED_BYTES: int = 65536  # 64 KB

# Redis keys
REDIS_KEY_ITEMS = "hsx:hunts:items"
REDIS_KEY_ORDER = "hsx:hunts:order"
REDIS_KEY_ACTIVE = "hsx:hunts:active_ids"

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))


class HuntStore:
    """Thread-safe, dual-mode store for threat hunt dossiers."""

    def __init__(self, use_redis: bool = True) -> None:
        self._lock = threading.RLock()
        self._memory_items: dict[str, HuntDossier] = {}
        self._memory_order: list[str] = []
        self._redis_client: redis.Redis | None = None

        if use_redis:
            self._init_redis()

    def _init_redis(self) -> None:
        try:
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            client.ping()
            self._redis_client = client
            logger.info("HuntStore connected to Redis at %s:%s", REDIS_HOST, REDIS_PORT)
        except Exception as exc:
            logger.warning("HuntStore failed to connect to Redis (%s); falling back to in-memory mode", exc)
            self._redis_client = None

    def _serialize_dossier(self, dossier: HuntDossier) -> str:
        """Serializes dossier to JSON with strict 64KB bounded safety."""
        raw_dict = dossier.model_dump()
        serialized = json.dumps(raw_dict)
        raw_bytes = serialized.encode("utf-8")

        if len(raw_bytes) > MAX_SERIALIZED_BYTES:
            # First attempt: prune verbose evidence attributes to strings
            for ev in raw_dict.get("evidence", []):
                ev["attributes"] = {"truncated": True}
            serialized = json.dumps(raw_dict)
            raw_bytes = serialized.encode("utf-8")

            if len(raw_bytes) > MAX_SERIALIZED_BYTES:
                # Second attempt: prune evidence list to top 20 items
                raw_dict["evidence"] = raw_dict.get("evidence", [])[:20]
                serialized = json.dumps(raw_dict)
                raw_bytes = serialized.encode("utf-8")

                if len(raw_bytes) > MAX_SERIALIZED_BYTES:
                    raise ValueError(
                        f"Hunt dossier {dossier.hunt_id} serialized size ({len(raw_bytes)} bytes) exceeds 64KB limit"
                    )

        return serialized

    def _deserialize_dossier(self, data: str) -> HuntDossier:
        """Deserializes JSON string into HuntDossier model."""
        raw_dict = json.loads(data)
        return HuntDossier.model_validate(raw_dict)

    def count_total(self) -> int:
        """Return total number of stored hunts."""
        with self._lock:
            if self._redis_client:
                try:
                    return int(self._redis_client.hlen(REDIS_KEY_ITEMS))
                except Exception:
                    pass
            return len(self._memory_items)

    def count_active(self) -> int:
        """Return count of active (non-archived) hunts."""
        with self._lock:
            if self._redis_client:
                try:
                    return int(self._redis_client.scard(REDIS_KEY_ACTIVE))
                except Exception:
                    pass
            return sum(1 for h in self._memory_items.values() if h.status != "archived")

    def _evict_if_needed(self) -> None:
        """Deterministically evicts oldest evictable hunts if capacity is reached."""
        total = self.count_total()
        if total < MAX_TOTAL_HUNTS:
            return

        with self._lock:
            # Collect candidate hunts for eviction
            all_hunts: list[HuntDossier] = []
            if self._redis_client:
                try:
                    raw_items = self._redis_client.hgetall(REDIS_KEY_ITEMS)
                    for raw in raw_items.values():
                        all_hunts.append(self._deserialize_dossier(raw))
                except Exception:
                    all_hunts = list(self._memory_items.values())
            else:
                all_hunts = list(self._memory_items.values())

            # Tier 1 Eviction: Oldest ARCHIVED hunts
            archived_hunts = [h for h in all_hunts if h.status == "archived"]
            if archived_hunts:
                archived_hunts.sort(key=lambda h: h.updated_at)
                victim = archived_hunts[0]
                self.delete_hunt(victim.hunt_id)
                logger.info("Evicted oldest archived hunt %s to maintain capacity", victim.hunt_id)
                return

            # Tier 2 Eviction: Oldest CONCLUDED benign/inconclusive hunts
            concluded_evictable = [
                h for h in all_hunts
                if h.status == "concluded" and h.verdict in ("benign_activity", "inconclusive")
            ]
            if concluded_evictable:
                concluded_evictable.sort(key=lambda h: h.updated_at)
                victim = concluded_evictable[0]
                self.delete_hunt(victim.hunt_id)
                logger.info("Evicted concluded benign hunt %s to maintain capacity", victim.hunt_id)
                return

            # Hard Overflow Protection: All 500 hunts are protected
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Hunt storage capacity reached (500). Archive concluded hunts to free capacity.",
            )

    def save_hunt(self, hunt: HuntDossier, is_new: bool = False) -> HuntDossier:
        """Persist or update a hunt dossier with bounded validation."""
        serialized = self._serialize_dossier(hunt)

        with self._lock:
            existing = self.get_hunt(hunt.hunt_id)
            if existing is None and is_new:
                # Capacity checks for new hunt
                active_count = self.count_active()
                if hunt.status != "archived" and active_count >= MAX_ACTIVE_HUNTS:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Active hunt limit ({MAX_ACTIVE_HUNTS}) reached. Archive concluded hunts to free capacity.",
                    )
                self._evict_if_needed()

            # Persist to Redis if available
            if self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    pipe.hset(REDIS_KEY_ITEMS, hunt.hunt_id, serialized)
                    if hunt.status == "archived":
                        pipe.srem(REDIS_KEY_ACTIVE, hunt.hunt_id)
                    else:
                        pipe.sadd(REDIS_KEY_ACTIVE, hunt.hunt_id)
                    pipe.execute()
                except Exception as exc:
                    logger.warning("Failed writing to Redis (%s); falling back to memory", exc)

            # Mirror to in-memory fallback
            self._memory_items[hunt.hunt_id] = hunt
            if hunt.hunt_id not in self._memory_order:
                self._memory_order.append(hunt.hunt_id)

            return hunt

    def get_hunt(self, hunt_id: str) -> HuntDossier | None:
        """Retrieve single hunt dossier by ID."""
        with self._lock:
            if self._redis_client:
                try:
                    raw = self._redis_client.hget(REDIS_KEY_ITEMS, hunt_id)
                    if raw:
                        return self._deserialize_dossier(raw)
                except Exception as exc:
                    logger.warning("Redis read failed (%s); checking memory fallback", exc)

            return self._memory_items.get(hunt_id)

    def delete_hunt(self, hunt_id: str) -> bool:
        """Internal deletion method for eviction."""
        with self._lock:
            deleted = False
            if self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    pipe.hdel(REDIS_KEY_ITEMS, hunt_id)
                    pipe.srem(REDIS_KEY_ACTIVE, hunt_id)
                    pipe.execute()
                    deleted = True
                except Exception:
                    pass

            if hunt_id in self._memory_items:
                del self._memory_items[hunt_id]
                deleted = True
            if hunt_id in self._memory_order:
                self._memory_order.remove(hunt_id)

            return deleted

    def list_hunts(
        self,
        status: str | None = None,
        severity: str | None = None,
        mitre_tactic: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[HuntSummary], int]:
        """Query and filter hunts with deterministic sorting."""
        with self._lock:
            all_hunts: list[HuntDossier] = []
            if self._redis_client:
                try:
                    raw_items = self._redis_client.hgetall(REDIS_KEY_ITEMS)
                    for raw in raw_items.values():
                        all_hunts.append(self._deserialize_dossier(raw))
                except Exception:
                    all_hunts = list(self._memory_items.values())
            else:
                all_hunts = list(self._memory_items.values())

            # Apply filters
            filtered = all_hunts
            if status:
                st_lower = status.lower().strip()
                filtered = [h for h in filtered if h.status.lower() == st_lower]
            if severity:
                sev_lower = severity.lower().strip()
                filtered = [h for h in filtered if h.severity.lower() == sev_lower]
            if mitre_tactic:
                tac_lower = mitre_tactic.lower().strip()
                filtered = [
                    h for h in filtered
                    if any(tac_lower in t.lower() for t in h.mitre_tactics)
                ]

            # Deterministic ordering: updated_at DESC, hunt_id DESC
            sorted_hunts = sorted(
                filtered,
                key=lambda h: (h.updated_at, h.hunt_id),
                reverse=True,
            )

            total = len(sorted_hunts)
            paginated = sorted_hunts[offset : offset + limit]

            summaries = [
                HuntSummary(
                    hunt_id=h.hunt_id,
                    title=h.title,
                    status=h.status,
                    severity=h.severity,
                    mitre_tactics=h.mitre_tactics,
                    evidence_count=len(h.evidence),
                    verdict=h.verdict,
                    created_by=h.created_by,
                    created_at=h.created_at,
                    updated_at=h.updated_at,
                    last_executed_at=h.last_executed_at,
                    is_automated_suggestion=h.is_automated_suggestion,
                )
                for h in paginated
            ]

            return summaries, total

    def get_metrics(self) -> HuntMetricsResponse:
        """Compute aggregate KPI metrics for Threat Hunting ribbon."""
        with self._lock:
            all_hunts: list[HuntDossier] = []
            if self._redis_client:
                try:
                    raw_items = self._redis_client.hgetall(REDIS_KEY_ITEMS)
                    for raw in raw_items.values():
                        all_hunts.append(self._deserialize_dossier(raw))
                except Exception:
                    all_hunts = list(self._memory_items.values())
            else:
                all_hunts = list(self._memory_items.values())

            total = len(all_hunts)
            active = sum(1 for h in all_hunts if h.status != "archived")
            concluded = sum(1 for h in all_hunts if h.status == "concluded")
            archived = sum(1 for h in all_hunts if h.status == "archived")
            malicious = sum(1 for h in all_hunts if h.verdict == "malicious_confirmed")
            benign = sum(1 for h in all_hunts if h.verdict == "benign_activity")
            inconclusive = sum(1 for h in all_hunts if h.verdict == "inconclusive")
            promoted_rules = sum(len(h.promoted_rule_ids) for h in all_hunts)
            promoted_cases = sum(len(h.promoted_case_ids) for h in all_hunts)

            return HuntMetricsResponse(
                total_hunts=total,
                active_hunts=active,
                concluded_hunts=concluded,
                archived_hunts=archived,
                malicious_confirmed=malicious,
                benign_activity=benign,
                inconclusive=inconclusive,
                promoted_rules_count=promoted_rules,
                promoted_cases_count=promoted_cases,
            )

    def clear(self) -> None:
        """Clear all store items (for testing)."""
        with self._lock:
            if self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    pipe.delete(REDIS_KEY_ITEMS)
                    pipe.delete(REDIS_KEY_ORDER)
                    pipe.delete(REDIS_KEY_ACTIVE)
                    pipe.execute()
                except Exception:
                    pass
            self._memory_items.clear()
            self._memory_order.clear()


# Default singleton instance
default_hunt_store = HuntStore()
