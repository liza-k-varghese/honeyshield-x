"""Deception Store for Module 3.7 (Option B Zero-Migration).

Provides:
- Atomic Redis 7 persistence for active canary tokens, lookups, and hit events.
- Thread-safe in-memory storage fallback with bounded capacity.
- Per-IP rate limiting and deduplication for trap events.
- Deterministic state consistency: atomic mint, immediate revoke, bounded hit retention.
"""

from collections import deque
from datetime import datetime, timezone
import json
import logging
import os
import threading
import time
from typing import Any

import redis

from app.schemas import CanaryHitEvent, CanaryToken

logger = logging.getLogger(__name__)

REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

MAX_HITS_PER_CANARY: int = 100
MAX_RECENT_GLOBAL_HITS: int = 500
MAX_HIT_RATE_PER_MINUTE: int = 30
DEDUP_WINDOW_SECONDS: float = 10.0


class DeceptionStore:
    """Thread-safe, dual-mode store for Canary honeytokens and tripwire interactions."""

    def __init__(self, redis_host: str = REDIS_HOST, redis_port: int = REDIS_PORT) -> None:
        self._lock = threading.Lock()
        self._redis_host = redis_host
        self._redis_port = redis_port
        self._redis_client: redis.Redis | None = None
        self._redis_available: bool = False

        # In-memory fallback structures
        self._canaries: dict[str, CanaryToken] = {}
        self._token_hash_lookup: dict[str, str] = {}  # token_hash -> canary_id
        self._hits: dict[str, list[dict[str, Any]]] = {}  # canary_id -> list of hit dicts
        self._recent_hits: deque[dict[str, Any]] = deque(maxlen=MAX_RECENT_GLOBAL_HITS)
        self._ip_rate_limits: dict[str, list[float]] = {}  # ip -> list of timestamps
        self._recent_hit_dedup: dict[str, float] = {}  # f"{canary_id}:{ip}" -> timestamp

        self._init_redis()

    def _init_redis(self) -> None:
        """Attempt connection to Redis instance."""
        try:
            client = redis.Redis(
                host=self._redis_host,
                port=self._redis_port,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
            )
            client.ping()
            self._redis_client = client
            self._redis_available = True
            logger.info("DeceptionStore connected to Redis successfully.")
        except Exception as e:
            self._redis_client = None
            self._redis_available = False
            logger.warning("DeceptionStore running in in-memory fallback mode: %s", str(e))

    def _check_redis_health(self) -> bool:
        """Verify Redis connectivity."""
        if not self._redis_available or self._redis_client is None:
            return False
        try:
            self._redis_client.ping()
            return True
        except Exception:
            self._redis_available = False
            return False

    def save_canary(self, canary: CanaryToken) -> bool:
        """Persist a new or updated canary token deterministically in Redis and in-memory store."""
        with self._lock:
            # Update in-memory state
            self._canaries[canary.canary_id] = canary
            self._token_hash_lookup[canary.token_hash] = canary.canary_id
            if canary.canary_id not in self._hits:
                self._hits[canary.canary_id] = []

            # Update Redis if available
            if self._check_redis_health() and self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    key = f"hsx:canary:{canary.canary_id}"
                    pipe.set(key, canary.model_dump_json())
                    pipe.set(f"hsx:canary:lookup:{canary.token_hash}", canary.canary_id)
                    pipe.sadd("hsx:canaries:all", canary.canary_id)
                    if canary.status == "active":
                        pipe.sadd("hsx:canaries:active", canary.canary_id)
                    else:
                        pipe.srem("hsx:canaries:active", canary.canary_id)
                    pipe.execute()
                except Exception as e:
                    logger.warning("Failed saving canary to Redis (%s), saved in-memory: %s", canary.canary_id, str(e))

            return True

    def get_canary(self, canary_id: str) -> CanaryToken | None:
        """Retrieve canary token by its unique canary_id."""
        with self._lock:
            if self._check_redis_health() and self._redis_client:
                try:
                    raw = self._redis_client.get(f"hsx:canary:{canary_id}")
                    if raw:
                        data = json.loads(raw)
                        canary = CanaryToken(**data)
                        self._canaries[canary_id] = canary
                        self._token_hash_lookup[canary.token_hash] = canary_id
                        return canary
                except Exception as e:
                    logger.warning("Error reading canary %s from Redis: %s", canary_id, str(e))

            return self._canaries.get(canary_id)

    def get_canary_by_token_hash(self, token_hash: str) -> CanaryToken | None:
        """Resolve canary token in O(1) time using token SHA-256 hash."""
        with self._lock:
            canary_id: str | None = None
            if self._check_redis_health() and self._redis_client:
                try:
                    canary_id = self._redis_client.get(f"hsx:canary:lookup:{token_hash}")
                except Exception as e:
                    logger.warning("Error resolving token hash from Redis: %s", str(e))

            if not canary_id:
                canary_id = self._token_hash_lookup.get(token_hash)

            if not canary_id:
                return None

        # Fetch canary using canary_id
        return self.get_canary(canary_id)

    def list_canaries(
        self,
        canary_type: str | None = None,
        status: str | None = None,
        environment: str | None = None,
    ) -> list[CanaryToken]:
        """List canary tokens with deterministic filtering."""
        with self._lock:
            canaries: list[CanaryToken] = []
            if self._check_redis_health() and self._redis_client:
                try:
                    canary_ids = self._redis_client.smembers("hsx:canaries:all")
                    for cid in canary_ids:
                        raw = self._redis_client.get(f"hsx:canary:{cid}")
                        if raw:
                            c = CanaryToken(**json.loads(raw))
                            self._canaries[c.canary_id] = c
                            canaries.append(c)
                except Exception as e:
                    logger.warning("Error listing canaries from Redis: %s", str(e))
                    canaries = list(self._canaries.values())
            else:
                canaries = list(self._canaries.values())

            # Apply filters
            filtered = []
            for c in canaries:
                if isinstance(canary_type, str) and c.canary_type.lower() != canary_type.lower():
                    continue
                if isinstance(status, str) and c.status.lower() != status.lower():
                    continue
                if isinstance(environment, str) and c.environment.lower() != environment.lower():
                    continue
                filtered.append(c)

            # Sort deterministic: newest first
            filtered.sort(key=lambda x: x.created_at, reverse=True)
            return filtered

    def revoke_canary(
        self,
        canary_id: str,
        operator_username: str,
    ) -> CanaryToken | None:
        """Immediately decommission and revoke a canary token."""
        canary = self.get_canary(canary_id)
        if not canary:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        canary.status = "revoked"
        canary.revoked_at = now_iso
        canary.revoked_by = operator_username
        canary.updated_at = now_iso

        self.save_canary(canary)
        return canary

    def check_rate_limit(self, client_ip: str) -> bool:
        """Check whether client IP has exceeded the allowed interaction rate limit."""
        now = time.time()
        with self._lock:
            # In-memory sliding window
            timestamps = self._ip_rate_limits.get(client_ip, [])
            # Filter timestamps within 60s
            recent = [t for t in timestamps if now - t < 60.0]
            if len(recent) >= MAX_HIT_RATE_PER_MINUTE:
                return False  # Rate limit exceeded

            recent.append(now)
            self._ip_rate_limits[client_ip] = recent
            return True

    def check_deduplication(self, canary_id: str, client_ip: str) -> bool:
        """Determine if a hit from this client IP to this canary occurred within the deduplication window."""
        now = time.time()
        dedup_key = f"{canary_id}:{client_ip}"
        with self._lock:
            last_hit = self._recent_hit_dedup.get(dedup_key)
            if last_hit is not None and (now - last_hit) < DEDUP_WINDOW_SECONDS:
                return True  # Is duplicate
            self._recent_hit_dedup[dedup_key] = now
            return False

    def record_hit(self, hit: CanaryHitEvent) -> None:
        """Record hit event with strictly bounded retention in Redis and memory."""
        hit_dict = hit.model_dump()
        hit_json = json.dumps(hit_dict)

        with self._lock:
            # Memory bounded append
            if hit.canary_id not in self._hits:
                self._hits[hit.canary_id] = []
            self._hits[hit.canary_id].insert(0, hit_dict)
            if len(self._hits[hit.canary_id]) > MAX_HITS_PER_CANARY:
                self._hits[hit.canary_id] = self._hits[hit.canary_id][:MAX_HITS_PER_CANARY]

            self._recent_hits.appendleft(hit_dict)

            # Redis bounded append
            if self._check_redis_health() and self._redis_client:
                try:
                    pipe = self._redis_client.pipeline()
                    canary_hits_key = f"hsx:canary:hits:{hit.canary_id}"
                    pipe.lpush(canary_hits_key, hit_json)
                    pipe.ltrim(canary_hits_key, 0, MAX_HITS_PER_CANARY - 1)

                    recent_hits_key = "hsx:canary:hits:recent"
                    pipe.lpush(recent_hits_key, hit_json)
                    pipe.ltrim(recent_hits_key, 0, MAX_RECENT_GLOBAL_HITS - 1)
                    pipe.execute()
                except Exception as e:
                    logger.warning("Failed appending hit to Redis for %s: %s", hit.canary_id, str(e))

    def get_hits_for_canary(self, canary_id: str) -> list[CanaryHitEvent]:
        """Retrieve bounded hit history for a specific canary."""
        with self._lock:
            if self._check_redis_health() and self._redis_client:
                try:
                    raw_hits = self._redis_client.lrange(f"hsx:canary:hits:{canary_id}", 0, MAX_HITS_PER_CANARY - 1)
                    if raw_hits:
                        return [CanaryHitEvent(**json.loads(h)) for h in raw_hits]
                except Exception as e:
                    logger.warning("Error fetching hits for %s from Redis: %s", canary_id, str(e))

            stored = self._hits.get(canary_id, [])
            return [CanaryHitEvent(**h) for h in stored]

    def get_recent_hits(self, limit: int = 100) -> list[CanaryHitEvent]:
        """Retrieve global chronological hit stream bounded by limit."""
        bounded_limit = min(max(1, limit), MAX_RECENT_GLOBAL_HITS)
        with self._lock:
            if self._check_redis_health() and self._redis_client:
                try:
                    raw_hits = self._redis_client.lrange("hsx:canary:hits:recent", 0, bounded_limit - 1)
                    if raw_hits:
                        return [CanaryHitEvent(**json.loads(h)) for h in raw_hits]
                except Exception as e:
                    logger.warning("Error fetching recent hits from Redis: %s", str(e))

            return [CanaryHitEvent(**h) for h in list(self._recent_hits)[:bounded_limit]]

    def clear(self) -> None:
        """Clear all in-memory and Redis deception state for deterministic testing."""
        with self._lock:
            self._canaries.clear()
            self._token_hash_lookup.clear()
            self._hits.clear()
            self._recent_hits.clear()
            self._ip_rate_limits.clear()
            self._recent_hit_dedup.clear()

            if self._check_redis_health() and self._redis_client:
                try:
                    all_ids = self._redis_client.smembers("hsx:canaries:all")
                    keys_to_del = ["hsx:canaries:all", "hsx:canaries:active", "hsx:canary:hits:recent"]
                    for cid in all_ids:
                        keys_to_del.append(f"hsx:canary:{cid}")
                        keys_to_del.append(f"hsx:canary:hits:{cid}")
                    for key in self._redis_client.scan_iter("hsx:canary:lookup:*"):
                        keys_to_del.append(key)
                    if keys_to_del:
                        self._redis_client.delete(*keys_to_del)
                except Exception as e:
                    logger.warning("Error clearing Redis deception keys: %s", str(e))


default_deception_store = DeceptionStore()
