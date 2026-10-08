"""Session management with Redis storage and in-memory fallback (Module 3.5).

Implements:
- 256-bit CSPRNG bearer session tokens.
- Server-side SHA-256 session token hashing (never store raw tokens).
- 8-hour maximum absolute shift lifetime (28,800s).
- 30-minute idle inactivity timeout (1,800s).
- Atomic session invalidation and administrative revocation.
- Redis primary storage with native key TTL and resilient in-memory fallback.
"""

from dataclasses import asdict, dataclass
import json
import logging
import os
import threading
import time
from typing import Any

import redis

from app.auth.crypto import generate_session_token, hash_session_token
from app.auth.registry import Operator

logger = logging.getLogger(__name__)

MAX_SESSION_LIFETIME_SECONDS: float = 28800.0  # 8 hours
IDLE_TIMEOUT_SECONDS: float = 1800.0          # 30 minutes
REDIS_SESSION_KEY_PREFIX: str = "auth:session:"


@dataclass
class SessionData:
    """Active operator session metadata."""

    session_id_prefix: str
    session_id_hash: str
    operator_id: str
    role: str
    created_at: float
    expires_at: float
    last_active: float
    client_ip: str
    user_agent: str
    revoked: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SessionData":
        return cls(**data)


class SessionStore:
    """Session store utilizing Redis with in-memory fallback."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._memory_sessions: dict[str, SessionData] = {}
        self._redis_client: redis.Redis | None = None
        self._init_redis()

    def _init_redis(self) -> None:
        """Connect to Redis if available."""
        host = os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1")
        port = int(os.getenv("HONEYSHIELD_REDIS_PORT", "6379"))
        try:
            client = redis.Redis(host=host, port=port, decode_responses=True, socket_timeout=1.0)
            client.ping()
            self._redis_client = client
            logger.info("SessionStore connected to Redis at %s:%d", host, port)
        except Exception as e:
            logger.warning("SessionStore falling back to in-memory store: %s", str(e))
            self._redis_client = None

    def create_session(
        self,
        operator: Operator,
        client_ip: str = "127.0.0.1",
        user_agent: str = "unknown",
        max_lifetime_seconds: float = MAX_SESSION_LIFETIME_SECONDS,
        current_time: float | None = None,
    ) -> tuple[str, SessionData]:
        """Generate a fresh session token and store session metadata hashed server-side.

        Returns:
            (raw_bearer_token, session_data)
        """
        now = current_time if current_time is not None else time.time()
        raw_token = generate_session_token()
        token_hash = hash_session_token(raw_token)
        prefix = raw_token[:16] + "..."

        session_data = SessionData(
            session_id_prefix=prefix,
            session_id_hash=token_hash,
            operator_id=operator.username,
            role=operator.role,
            created_at=now,
            expires_at=now + max_lifetime_seconds,
            last_active=now,
            client_ip=client_ip,
            user_agent=user_agent,
            revoked=False,
        )

        ttl = max(1, int(session_data.expires_at - now))

        if self._redis_client is not None:
            try:
                key = f"{REDIS_SESSION_KEY_PREFIX}{token_hash}"
                self._redis_client.set(key, json.dumps(session_data.to_dict()), ex=ttl)
            except Exception as e:
                logger.error("Failed to store session in Redis: %s; saving in-memory", str(e))
                with self._lock:
                    self._memory_sessions[token_hash] = session_data
        else:
            with self._lock:
                self._memory_sessions[token_hash] = session_data

        return raw_token, session_data

    def get_session(self, token: str, current_time: float | None = None) -> SessionData | None:
        """Resolve and validate an active session by raw bearer token."""
        if not token:
            return None

        now = current_time if current_time is not None else time.time()
        token_hash = hash_session_token(token)
        session_data: SessionData | None = None

        if self._redis_client is not None:
            try:
                key = f"{REDIS_SESSION_KEY_PREFIX}{token_hash}"
                raw_json = self._redis_client.get(key)
                if raw_json:
                    session_data = SessionData.from_dict(json.loads(raw_json))
            except Exception as e:
                logger.error("Redis session lookup failed: %s", str(e))
                with self._lock:
                    session_data = self._memory_sessions.get(token_hash)
        else:
            with self._lock:
                session_data = self._memory_sessions.get(token_hash)

        if session_data is None:
            return None

        # Check explicit revocation
        if session_data.revoked:
            self._delete_session_by_hash(token_hash)
            return None

        # Check absolute expiration
        if now > session_data.expires_at:
            self._delete_session_by_hash(token_hash)
            return None

        # Check idle timeout (inactivity)
        if (now - session_data.last_active) > IDLE_TIMEOUT_SECONDS:
            self._delete_session_by_hash(token_hash)
            return None

        # Valid session: touch last_active
        session_data.last_active = now
        remaining_ttl = max(1, int(session_data.expires_at - now))

        if self._redis_client is not None:
            try:
                key = f"{REDIS_SESSION_KEY_PREFIX}{token_hash}"
                self._redis_client.set(key, json.dumps(session_data.to_dict()), ex=remaining_ttl)
            except Exception:
                pass
        else:
            with self._lock:
                self._memory_sessions[token_hash] = session_data

        return session_data

    def revoke_session(self, token: str) -> bool:
        """Revoke a single session by bearer token."""
        if not token:
            return False
        token_hash = hash_session_token(token)
        return self._delete_session_by_hash(token_hash)

    def revoke_operator_sessions(self, operator_id: str) -> int:
        """Revoke all active sessions for a specified operator."""
        revoked_count = 0
        if self._redis_client is not None:
            try:
                pattern = f"{REDIS_SESSION_KEY_PREFIX}*"
                keys = self._redis_client.keys(pattern)
                for key in keys:
                    raw_json = self._redis_client.get(key)
                    if raw_json:
                        s_data = json.loads(raw_json)
                        if s_data.get("operator_id") == operator_id:
                            self._redis_client.delete(key)
                            revoked_count += 1
            except Exception as e:
                logger.error("Failed to revoke operator sessions in Redis: %s", str(e))

        with self._lock:
            to_delete = [
                h for h, s in self._memory_sessions.items()
                if s.operator_id == operator_id
            ]
            for h in to_delete:
                del self._memory_sessions[h]
                revoked_count += 1

        return revoked_count

    def _delete_session_by_hash(self, token_hash: str) -> bool:
        """Delete session by token hash."""
        deleted = False
        if self._redis_client is not None:
            try:
                key = f"{REDIS_SESSION_KEY_PREFIX}{token_hash}"
                deleted = bool(self._redis_client.delete(key))
            except Exception:
                pass

        with self._lock:
            if token_hash in self._memory_sessions:
                del self._memory_sessions[token_hash]
                deleted = True

        return deleted

    def clear(self) -> None:
        """Clear all active sessions (used during test teardowns)."""
        if self._redis_client is not None:
            try:
                keys = self._redis_client.keys(f"{REDIS_SESSION_KEY_PREFIX}*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception:
                pass

        with self._lock:
            self._memory_sessions.clear()


# Global Singleton
default_session_store = SessionStore()
