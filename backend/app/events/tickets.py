"""WebSocket Single-Use Connection Ticket Service (Module 3.4 / Phase 3).

Prevents exposure of long-lived JWT or PBKDF2 session tokens in WebSocket URLs,
query strings, or browser/proxy access logs. Tickets are single-use and expire
within 60 seconds of issuance.
"""

import json
import logging
import os
import secrets
import threading
import time
from typing import Any

import redis

from app.auth.registry import Operator
from app.observability.metrics import default_metrics_collector

logger = logging.getLogger(__name__)

TICKET_TTL_SECONDS: int = 60
REDIS_HOST: str = os.getenv("REDIS_HOST", os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1"))
REDIS_PORT: int = int(os.getenv("REDIS_PORT", os.getenv("HONEYSHIELD_REDIS_PORT", "6379")))
REDIS_TICKET_PREFIX: str = "hsx:ws_ticket:"

HONEYSHIELD_STRICT_AUTH_COORDINATION: bool = (
    os.getenv("HONEYSHIELD_STRICT_AUTH_COORDINATION", "false").lower() in ("true", "1", "yes")
    or os.getenv("HONEYSHIELD_FAIL_CLOSED_ON_REDIS_ERROR", "false").lower() in ("true", "1", "yes")
)

# Atomic GET and DEL script to eliminate race conditions under concurrent consumption
LUA_ATOMIC_GETDEL: str = """
local val = redis.call('GET', KEYS[1])
if val then
    redis.call('DEL', KEYS[1])
end
return val
"""


class TicketService:
    """Manages short-lived, single-use authentication tickets for WebSockets."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._fallback_tickets: dict[str, dict[str, Any]] = {}
        self._redis_client: redis.Redis | None = None
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
        except Exception:
            self._redis_client = None

    def issue_ticket(self, operator: Operator, ttl_seconds: int = TICKET_TTL_SECONDS) -> str:
        """Issue a cryptographically random, single-use ticket bound to an operator."""
        ticket = f"hsx_wstk_{secrets.token_urlsafe(32)}"
        data = {
            "username": operator.username,
            "role": operator.role,
            "email": operator.email,
            "permissions": list(operator.permissions),
            "issued_at": time.time(),
            "expires_at": time.time() + ttl_seconds,
        }

        # Attempt Redis storage
        if self._redis_client is not None:
            try:
                self._redis_client.set(
                    f"{REDIS_TICKET_PREFIX}{ticket}",
                    json.dumps(data),
                    ex=ttl_seconds,
                )
                return ticket
            except Exception as e:
                logger.warning("Redis ticket storage failed (%s)", e)
                default_metrics_collector.increment_auth_coordination_failure()
                if HONEYSHIELD_STRICT_AUTH_COORDINATION:
                    logger.error("Strict distributed auth coordination enforced: refusing in-memory ticket issuance")
                    raise RuntimeError("Distributed ticket coordination unavailable")

        if HONEYSHIELD_STRICT_AUTH_COORDINATION:
            default_metrics_collector.increment_auth_coordination_failure()
            logger.error("Strict distributed auth coordination enforced: refusing in-memory ticket issuance")
            raise RuntimeError("Distributed ticket coordination unavailable")

        # In-memory fallback (isolated single-worker dev/test only)
        logger.warning("SECURITY WARNING: Redis unavailable. Storing ticket in process-local memory.")
        default_metrics_collector.increment_auth_coordination_failure()
        with self._lock:
            # Purge expired
            now = time.time()
            expired_keys = [k for k, v in self._fallback_tickets.items() if v["expires_at"] <= now]
            for k in expired_keys:
                del self._fallback_tickets[k]

            self._fallback_tickets[ticket] = data

        return ticket

    def consume_ticket(self, ticket: str) -> Operator | None:
        """Atomically claim and invalidate a single-use ticket, returning the operator."""
        if not ticket or not ticket.startswith("hsx_wstk_"):
            return None

        now = time.time()

        # Check Redis first with Lua atomic GETDEL script to eliminate cross-worker race conditions
        if self._redis_client is not None:
            try:
                key = f"{REDIS_TICKET_PREFIX}{ticket}"
                raw = self._redis_client.eval(LUA_ATOMIC_GETDEL, 1, key)
                if raw:
                    data = json.loads(raw)
                    if data.get("expires_at", 0) > now:
                        return Operator(
                            username=data["username"],
                            role=data["role"],
                            email=data.get("email", ""),
                            password_hash="",
                            is_active=True,
                        )
                    default_metrics_collector.increment_ticket_expiration()
                    return None
                else:
                    # Ticket already consumed or never existed in Redis
                    default_metrics_collector.increment_ticket_replay()
                    if not HONEYSHIELD_STRICT_AUTH_COORDINATION:
                        # Fall through to check memory fallback if in dev mode
                        pass
                    else:
                        return None
            except Exception as e:
                logger.warning("Redis atomic ticket consumption failed (%s)", e)
                default_metrics_collector.increment_auth_coordination_failure()
                if HONEYSHIELD_STRICT_AUTH_COORDINATION:
                    return None

        if HONEYSHIELD_STRICT_AUTH_COORDINATION:
            default_metrics_collector.increment_auth_coordination_failure()
            return None

        # Check in-memory fallback (atomic pop)
        with self._lock:
            data = self._fallback_tickets.pop(ticket, None)
            if data is not None:
                if data.get("expires_at", 0) > now:
                    return Operator(
                        username=data["username"],
                        role=data["role"],
                        email=data.get("email", ""),
                        password_hash="",
                        is_active=True,
                    )
                default_metrics_collector.increment_ticket_expiration()
                return None
            else:
                default_metrics_collector.increment_ticket_replay()
        return None


default_ticket_service = TicketService()

