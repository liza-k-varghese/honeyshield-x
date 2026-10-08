"""Case Storage Layer utilizing Redis with In-Memory Fallback (Module 3.6).

Zero-Migration Architecture:
- Active case state is stored in Redis under 'hsx:case:{case_id}'.
- Thread-safe in-memory fallback ensures resilience if Redis is offline.
- Redis TTL is an active-state cache policy (30 days on closed cases),
  NOT a compliance retention policy. Permanent compliance records are
  written immutably to the PostgreSQL 'system_events' table.
"""

from datetime import datetime, timezone
import json
import logging
import os
import threading
from typing import Any

import redis

from app.schemas import IncidentCase

logger = logging.getLogger(__name__)

ACTIVE_CASE_CACHE_TTL_SECONDS: int = 2_592_000  # 30-day active cache policy for closed cases
REDIS_CASE_PREFIX: str = "hsx:case:"
REDIS_CASES_ALL_SET: str = "hsx:cases:all"
REDIS_CASES_ACTIVE_SET: str = "hsx:cases:active"


class CaseStore:
    """Storage repository for IncidentCase entities backed by Redis or in-memory dict."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._memory_cases: dict[str, IncidentCase] = {}
        self._redis_client: redis.Redis | None = None
        self._init_redis()

    def _init_redis(self) -> None:
        """Connect to Redis if configured and reachable."""
        host = os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1")
        port = int(os.getenv("HONEYSHIELD_REDIS_PORT", "6379"))
        try:
            client = redis.Redis(host=host, port=port, decode_responses=True, socket_timeout=1.0)
            client.ping()
            self._redis_client = client
            logger.info("CaseStore successfully connected to Redis at %s:%d", host, port)
        except Exception as e:
            logger.warning("CaseStore operating in in-memory fallback mode: %s", str(e))
            self._redis_client = None

    def save_case(self, case: IncidentCase) -> IncidentCase:
        """Atomically persist or update an IncidentCase."""
        case_json = json.dumps(case.model_dump())

        if self._redis_client is not None:
            try:
                pipe = self._redis_client.pipeline(transaction=True)
                key = f"{REDIS_CASE_PREFIX}{case.case_id}"

                # Cache TTL: closed cases expire from active Redis cache after 30 days
                if case.status == "closed":
                    pipe.set(key, case_json, ex=ACTIVE_CASE_CACHE_TTL_SECONDS)
                    pipe.srem(REDIS_CASES_ACTIVE_SET, case.case_id)
                else:
                    pipe.set(key, case_json)  # Active cases remain without expiration
                    pipe.sadd(REDIS_CASES_ACTIVE_SET, case.case_id)

                pipe.sadd(REDIS_CASES_ALL_SET, case.case_id)
                pipe.execute()
                return case
            except Exception as e:
                logger.error("Failed to save case in Redis: %s; saving in-memory", str(e))
                with self._lock:
                    self._memory_cases[case.case_id] = case
                return case
        else:
            with self._lock:
                self._memory_cases[case.case_id] = case
            return case

    def get_case(self, case_id: str) -> IncidentCase | None:
        """Retrieve an IncidentCase by unique case identifier."""
        if self._redis_client is not None:
            try:
                key = f"{REDIS_CASE_PREFIX}{case_id}"
                data = self._redis_client.get(key)
                if data:
                    parsed = json.loads(data)
                    return IncidentCase(**parsed)
            except Exception as e:
                logger.error("Redis error reading case %s: %s; checking in-memory", case_id, str(e))
                with self._lock:
                    return self._memory_cases.get(case_id)
            # If not in Redis, check memory
            with self._lock:
                return self._memory_cases.get(case_id)
        else:
            with self._lock:
                return self._memory_cases.get(case_id)

    def list_cases(
        self,
        status: str | None = None,
        severity: str | None = None,
        handler: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[IncidentCase], int]:
        """List cases with filtering and pagination."""
        all_cases: list[IncidentCase] = []

        if self._redis_client is not None:
            try:
                case_ids = list(self._redis_client.smembers(REDIS_CASES_ALL_SET))
                if case_ids:
                    keys = [f"{REDIS_CASE_PREFIX}{cid}" for cid in case_ids]
                    raw_cases = self._redis_client.mget(keys)
                    for item in raw_cases:
                        if item:
                            try:
                                all_cases.append(IncidentCase(**json.loads(item)))
                            except Exception:
                                pass
            except Exception as e:
                logger.error("Failed listing cases from Redis: %s; using in-memory", str(e))
                with self._lock:
                    all_cases = list(self._memory_cases.values())
        else:
            with self._lock:
                all_cases = list(self._memory_cases.values())

        # Also merge any memory cases that might have been saved during transient Redis outage
        with self._lock:
            existing_ids = {c.case_id for c in all_cases}
            for cid, c in self._memory_cases.items():
                if cid not in existing_ids:
                    all_cases.append(c)

        # Apply deterministic filtering
        filtered: list[IncidentCase] = []
        for c in all_cases:
            if status and status != "all":
                if status == "active" and c.status in ("closed", "resolved"):
                    continue
                elif status != "active" and c.status != status:
                    continue
            if severity and severity != "all" and c.severity != severity:
                continue
            if handler and handler != "all" and c.assigned_to != handler:
                continue
            filtered.append(c)

        # Sort descending by updated_at / created_at
        filtered.sort(key=lambda x: x.updated_at or x.created_at, reverse=True)
        total = len(filtered)
        paged = filtered[offset : offset + limit]
        return paged, total

    def delete_case(self, case_id: str) -> bool:
        """Administrative case removal (Security Administrator only)."""
        deleted = False
        if self._redis_client is not None:
            try:
                key = f"{REDIS_CASE_PREFIX}{case_id}"
                pipe = self._redis_client.pipeline(transaction=True)
                pipe.delete(key)
                pipe.srem(REDIS_CASES_ALL_SET, case_id)
                pipe.srem(REDIS_CASES_ACTIVE_SET, case_id)
                pipe.execute()
                deleted = True
            except Exception as e:
                logger.error("Failed deleting case from Redis: %s", str(e))

        with self._lock:
            if case_id in self._memory_cases:
                del self._memory_cases[case_id]
                deleted = True

        return deleted

    def clear(self) -> None:
        """Clear all cases (used during test resets)."""
        if self._redis_client is not None:
            try:
                keys = self._redis_client.keys(f"{REDIS_CASE_PREFIX}*")
                if keys:
                    self._redis_client.delete(*keys)
                self._redis_client.delete(REDIS_CASES_ALL_SET)
                self._redis_client.delete(REDIS_CASES_ACTIVE_SET)
            except Exception:
                pass

        with self._lock:
            self._memory_cases.clear()


default_case_store = CaseStore()
