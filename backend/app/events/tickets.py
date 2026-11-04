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

logger = logging.getLogger(__name__)

TICKET_TTL_SECONDS: int = 60
REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
REDIS_TICKET_PREFIX: str = "hsx:ws_ticket:"


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
                logger.warning("Redis ticket storage failed (%s), falling back to in-memory", e)

        # In-memory fallback
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

        # Check Redis first
        if self._redis_client is not None:
            try:
                key = f"{REDIS_TICKET_PREFIX}{ticket}"
                raw = self._redis_client.get(key)
                if raw:
                    self._redis_client.delete(key)  # Single-use consumption
                    data = json.loads(raw)
                    if data.get("expires_at", 0) > now:
                        return Operator(
                            username=data["username"],
                            role=data["role"],
                            email=data.get("email", ""),
                            password_hash="",
                            is_active=True,
                        )
                    return None
            except Exception as e:
                logger.warning("Redis ticket consumption failed (%s), checking in-memory", e)

        # Check in-memory fallback
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
        return None


default_ticket_service = TicketService()

