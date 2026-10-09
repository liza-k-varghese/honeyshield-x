"""Deterministic Safety Governor & Circuit Breaker Engine (Module 3.4).

Enforces:
- Strict action allowlist (rejects arbitrary action strings).
- Per-operator rate limits (10 actions / 60s window).
- Per-target entity cooldown (30s cooldown).
- Idempotency key tracking (UUID v4, 300s TTL).
- Emergency system-wide outbound lockout.
- Deterministic 3-state Circuit Breaker for outbound webhook notifications.
- Fail-closed evaluation semantics.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
import re
import threading
import time
from typing import Any
import uuid

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# =============================================================================
# Constants & Allowlist
# =============================================================================

ALLOWED_ACTIONS: set[str] = {
    "ALERT_ACKNOWLEDGE",
    "ALERT_RESOLVE",
    "ALERT_ESCALATE",
    "NOTIFICATION_DISPATCH",
    "NOTIFICATION_SUPPRESS",
    "CONTAINMENT_STAGING_REQUEST",
    "GOVERNOR_LOCKOUT_ENGAGE",
    "GOVERNOR_LOCKOUT_RELEASE",
    "IOC_BULK_REVOKE",
    "IOC_CONTAINMENT_DISPATCH",
    "IOC_FEED_LOCKOUT",
    "SOAR_BLOCK_DISPATCH",
}

BLAST_RADIUS_TIERS: dict[str, int] = {
    "ALERT_ACKNOWLEDGE": 1,
    "NOTIFICATION_SUPPRESS": 1,
    "ALERT_RESOLVE": 2,
    "ALERT_ESCALATE": 2,
    "NOTIFICATION_DISPATCH": 3,
    "CONTAINMENT_STAGING_REQUEST": 3,
    "GOVERNOR_LOCKOUT_ENGAGE": 3,
    "GOVERNOR_LOCKOUT_RELEASE": 3,
    "IOC_BULK_REVOKE": 3,
    "IOC_CONTAINMENT_DISPATCH": 3,
    "IOC_FEED_LOCKOUT": 3,
    "SOAR_BLOCK_DISPATCH": 3,
}

MAX_OPERATOR_RATE_LIMIT: int = 10  # Max commands
RATE_LIMIT_WINDOW_SECONDS: float = 60.0
ENTITY_COOLDOWN_SECONDS: float = 30.0
IDEMPOTENCY_TTL_SECONDS: float = 300.0  # 5 minutes
APPROVAL_TOKEN_TTL_SECONDS: float = 60.0  # 1 minute

CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 3
CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS: float = 60.0

UUID_V4_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


# =============================================================================
# Circuit Breaker Implementation
# =============================================================================

class CircuitBreakerState:
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


@dataclass
class CircuitBreakerMetrics:
    state: str = CircuitBreakerState.CLOSED
    consecutive_failures: int = 0
    total_failures: int = 0
    total_successes: int = 0
    last_failure_time: float | None = None
    last_state_change: float = field(default_factory=time.time)
    tripped_count: int = 0


class NotificationCircuitBreaker:
    """Deterministic 3-state Circuit Breaker for outbound webhook notifications.

    Transitions:
    - CLOSED: Normal operation. If consecutive failures >= 3 -> trips to OPEN.
    - OPEN: Sheds all outbound calls for 60 seconds (returns fail-closed / HTTP 503).
    - HALF_OPEN: Cooldown elapsed. Allows exactly 1 probe request.
        - If probe succeeds -> transitions to CLOSED, resets consecutive failures.
        - If probe fails -> transitions to OPEN, resets 60s cooldown timer.
    """

    def __init__(
        self,
        failure_threshold: int = CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        reset_timeout: float = CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self._lock = threading.Lock()
        self.metrics = CircuitBreakerMetrics()
        self._transition_listeners: list[Any] = []
        self._probe_in_flight: bool = False

    def register_transition_listener(self, listener: Any) -> None:
        self._transition_listeners.append(listener)

    def _notify_listeners(self, previous_state: str, new_state: str, reason: str) -> None:
        for listener in self._transition_listeners:
            try:
                listener(previous_state, new_state, reason)
            except Exception as e:
                logger.error("Circuit breaker listener error: %s", e)

    @property
    def current_state(self) -> str:
        with self._lock:
            now = time.time()
            if self.metrics.state == CircuitBreakerState.OPEN:
                if now - self.metrics.last_state_change >= self.reset_timeout:
                    prev = self.metrics.state
                    self.metrics.state = CircuitBreakerState.HALF_OPEN
                    self.metrics.last_state_change = now
                    self._probe_in_flight = False
                    self._notify_listeners(
                        prev,
                        CircuitBreakerState.HALF_OPEN,
                        f"Cooldown of {self.reset_timeout}s elapsed; entering HALF_OPEN probe state",
                    )
            return self.metrics.state

    def check_permission(self) -> tuple[bool, str]:
        """Check whether outbound dispatch is permitted by the circuit breaker.

        In HALF_OPEN state, serializes access to ensure exactly ONE caller reserves the probe.
        All concurrent callers are shed until the probe completes.

        Returns:
            (permitted: bool, reason: str)
        """
        with self._lock:
            now = time.time()
            if self.metrics.state == CircuitBreakerState.OPEN:
                if now - self.metrics.last_state_change >= self.reset_timeout:
                    prev = self.metrics.state
                    self.metrics.state = CircuitBreakerState.HALF_OPEN
                    self.metrics.last_state_change = now
                    self._probe_in_flight = False
                    self._notify_listeners(
                        prev,
                        CircuitBreakerState.HALF_OPEN,
                        f"Cooldown of {self.reset_timeout}s elapsed; entering HALF_OPEN probe state",
                    )

            if self.metrics.state == CircuitBreakerState.OPEN:
                elapsed = now - self.metrics.last_state_change
                remaining = max(0.0, self.reset_timeout - elapsed)
                return False, f"Circuit breaker is OPEN. Shedding outbound traffic ({remaining:.1f}s cooldown remaining)."

            if self.metrics.state == CircuitBreakerState.HALF_OPEN:
                if self._probe_in_flight:
                    return (
                        False,
                        "Circuit breaker is in HALF_OPEN state with a single probe already in flight. Shedding concurrent outbound traffic.",
                    )
                self._probe_in_flight = True
                return True, "HALF_OPEN probe reserved."

            return True, "Dispatch permitted."

    def record_success(self) -> None:
        """Record successful notification dispatch."""
        with self._lock:
            self._probe_in_flight = False
            self.metrics.total_successes += 1
            prev = self.metrics.state
            if self.metrics.state == CircuitBreakerState.HALF_OPEN:
                self.metrics.state = CircuitBreakerState.CLOSED
                self.metrics.consecutive_failures = 0
                self.metrics.last_state_change = time.time()
                self._notify_listeners(
                    prev,
                    CircuitBreakerState.CLOSED,
                    "Probe request succeeded in HALF_OPEN; circuit breaker restored to CLOSED",
                )
            elif self.metrics.state == CircuitBreakerState.CLOSED:
                self.metrics.consecutive_failures = 0

    def record_failure(self, error_message: str = "") -> None:
        """Record failed notification dispatch."""
        with self._lock:
            self._probe_in_flight = False
            now = time.time()
            self.metrics.total_failures += 1
            self.metrics.consecutive_failures += 1
            self.metrics.last_failure_time = now
            prev = self.metrics.state

            if self.metrics.state == CircuitBreakerState.HALF_OPEN:
                self.metrics.state = CircuitBreakerState.OPEN
                self.metrics.last_state_change = now
                self.metrics.tripped_count += 1
                self._notify_listeners(
                    prev,
                    CircuitBreakerState.OPEN,
                    f"Probe request failed in HALF_OPEN ({error_message}); returning to OPEN state",
                )
            elif self.metrics.state == CircuitBreakerState.CLOSED:
                if self.metrics.consecutive_failures >= self.failure_threshold:
                    self.metrics.state = CircuitBreakerState.OPEN
                    self.metrics.last_state_change = now
                    self.metrics.tripped_count += 1
                    self._notify_listeners(
                        prev,
                        CircuitBreakerState.OPEN,
                        f"{self.metrics.consecutive_failures} consecutive failures reached threshold ({self.failure_threshold}); circuit breaker tripped to OPEN",
                    )

    def reset(self) -> None:
        """Manually reset circuit breaker to healthy CLOSED state."""
        with self._lock:
            self._probe_in_flight = False
            prev = self.metrics.state
            self.metrics.state = CircuitBreakerState.CLOSED
            self.metrics.consecutive_failures = 0
            self.metrics.last_state_change = time.time()
            self._notify_listeners(prev, CircuitBreakerState.CLOSED, "Manual operator reset")

    def get_status_dict(self) -> dict[str, Any]:
        """Return serialized status of the circuit breaker."""
        state = self.current_state
        with self._lock:
            now = time.time()
            cooldown_remaining = 0.0
            if state == CircuitBreakerState.OPEN:
                elapsed = now - self.metrics.last_state_change
                cooldown_remaining = max(0.0, self.reset_timeout - elapsed)

            return {
                "state": state,
                "consecutive_failures": self.metrics.consecutive_failures,
                "failure_threshold": self.failure_threshold,
                "cooldown_remaining_seconds": round(cooldown_remaining, 1),
                "total_successes": self.metrics.total_successes,
                "total_failures": self.metrics.total_failures,
                "tripped_count": self.metrics.tripped_count,
            }


# =============================================================================
# Deterministic Governor Engine
# =============================================================================

@dataclass
class IdempotencyRecord:
    status: str  # "IN_PROGRESS" or "COMPLETED"
    created_at: float
    response_payload: dict[str, Any] | None = None


class DeterministicGovernor:
    """Enforces deterministic safety controls over all incident command actions."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # Rate limiting: operator_id -> list of timestamps
        self._operator_timestamps: dict[str, list[float]] = {}
        # Entity cooldowns: (action, target_id) -> last_timestamp
        self._entity_cooldowns: dict[tuple[str, int], float] = {}
        # Idempotency cache: key -> IdempotencyRecord
        self._idempotency_cache: dict[str, IdempotencyRecord] = {}
        # Ephemeral approval tokens: token -> (action, target_id, expires_at)
        self._approval_tokens: dict[str, dict[str, Any]] = {}
        # Emergency lockout state
        self._emergency_lockout: bool = False
        # Outbound notification circuit breaker
        self.circuit_breaker = NotificationCircuitBreaker()

    # -------------------------------------------------------------------------
    # Emergency Lockout
    # -------------------------------------------------------------------------

    @property
    def is_lockout_engaged(self) -> bool:
        with self._lock:
            return self._emergency_lockout

    def set_lockout(self, engaged: bool) -> None:
        with self._lock:
            self._emergency_lockout = engaged
            logger.warning("Governor emergency lockout set to: %s", engaged)

    # -------------------------------------------------------------------------
    # Idempotency Key Validation
    # -------------------------------------------------------------------------

    def validate_idempotency_key(self, key: str | None) -> str:
        """Validate format of the client-supplied idempotency key."""
        if not key or not isinstance(key, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Header 'X-Idempotency-Key' is required and must be a valid UUID v4.",
            )
        clean_key = key.strip()
        if not UUID_V4_REGEX.match(clean_key):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Idempotency key '{clean_key}' is not a valid UUID v4 format.",
            )
        return clean_key

    def check_idempotency(self, key: str) -> dict[str, Any] | None:
        """Check if an idempotency key was previously processed or is currently in flight.

        Returns cached response dict if already completed.
        Raises HTTP 409 Conflict if in flight.
        Returns None if key is fresh.
        """
        now = time.time()
        with self._lock:
            self._clean_expired_idempotency_records(now)
            if key in self._idempotency_cache:
                record = self._idempotency_cache[key]
                if record.status == "IN_PROGRESS":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Command with idempotency key '{key}' is currently in flight.",
                    )
                if record.status == "COMPLETED" and record.response_payload is not None:
                    return record.response_payload
            # Reserve in-progress slot
            self._idempotency_cache[key] = IdempotencyRecord(
                status="IN_PROGRESS",
                created_at=now,
            )
            return None

    def record_idempotency_completion(self, key: str, payload: dict[str, Any]) -> None:
        """Store the successful response payload for the idempotency key."""
        with self._lock:
            if key in self._idempotency_cache:
                self._idempotency_cache[key].status = "COMPLETED"
                self._idempotency_cache[key].response_payload = payload

    def release_idempotency_key(self, key: str) -> None:
        """Remove in-progress reservation if execution aborted before completion."""
        with self._lock:
            self._idempotency_cache.pop(key, None)

    def _clean_expired_idempotency_records(self, now: float) -> None:
        expired = [
            k for k, v in self._idempotency_cache.items()
            if now - v.created_at > IDEMPOTENCY_TTL_SECONDS
        ]
        for k in expired:
            del self._idempotency_cache[k]

    # -------------------------------------------------------------------------
    # Policy Evaluation (Allowlist, Rate Limit, Cooldown, Lockout, Breaker)
    # -------------------------------------------------------------------------

    def evaluate_command_policy(
        self,
        action: str,
        target_id: int,
        operator_id: str,
        justification: str | None = None,
        approval_token: str | None = None,
    ) -> None:
        """Deterministically evaluates all safety gates for a proposed command.

        Fails closed on any policy violation.
        """
        now = time.time()

        # 1. Action Allowlist Gate (HTTP 403)
        if not action or action not in ALLOWED_ACTIONS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Action '{action}' is not allowlisted. "
                    f"Permitted actions: {', '.join(sorted(ALLOWED_ACTIONS))}"
                ),
            )

        # 2. Emergency Lockout Gate (HTTP 503)
        # Lockout specifically blocks outbound dispatch
        with self._lock:
            if self._emergency_lockout and action in ("NOTIFICATION_DISPATCH", "SOAR_BLOCK_DISPATCH"):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Governor emergency lockout is actively engaged. Outbound notification and containment dispatches are blocked.",
                )

        # 3. Circuit Breaker Gate for Outbound Actions (HTTP 503)
        if action == "NOTIFICATION_DISPATCH":
            permitted, reason = self.circuit_breaker.check_permission()
            if not permitted:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Outbound dispatch rejected: {reason}",
                )

        # 4. Blast-Radius & Approval Token Gate
        blast_tier = BLAST_RADIUS_TIERS.get(action, 1)
        if blast_tier >= 2 and not (action in ("GOVERNOR_LOCKOUT_ENGAGE", "GOVERNOR_LOCKOUT_RELEASE")):
            # Require non-empty justification for Level 2 and Level 3 actions
            if not justification or len(justification.strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Action '{action}' (Blast Tier {blast_tier}) requires a mandatory justification (min 5 characters).",
                )

        # FIX 1: Mandatory Level 3 Approval Token Gate
        if blast_tier >= 3 and not (action in ("GOVERNOR_LOCKOUT_ENGAGE", "GOVERNOR_LOCKOUT_RELEASE")):
            if not approval_token:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Action '{action}' (Blast Tier {blast_tier}) requires a mandatory pre-flight approval token.",
                )

        if approval_token:
            self._verify_and_consume_approval_token(
                token=approval_token,
                action=action,
                target_id=target_id,
                operator_id=operator_id,
            )

        # 5. Operator Rate Limiting Gate (HTTP 429)
        with self._lock:
            timestamps = self._operator_timestamps.setdefault(operator_id, [])
            # Prune timestamps older than 60 seconds
            self._operator_timestamps[operator_id] = [
                ts for ts in timestamps if now - ts < RATE_LIMIT_WINDOW_SECONDS
            ]
            if len(self._operator_timestamps[operator_id]) >= MAX_OPERATOR_RATE_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Operator '{operator_id}' exceeded rate limit "
                        f"({MAX_OPERATOR_RATE_LIMIT} actions per {int(RATE_LIMIT_WINDOW_SECONDS)}s). "
                        "Please wait before issuing further commands."
                    ),
                )

        # 6. Entity Cooldown Gate (HTTP 429)
        # Cooldown prevents rapid command flapping against the same alert/entity
        if action not in ("GOVERNOR_LOCKOUT_ENGAGE", "GOVERNOR_LOCKOUT_RELEASE"):
            cooldown_key = (action, target_id)
            with self._lock:
                last_time = self._entity_cooldowns.get(cooldown_key)
                if last_time is not None:
                    elapsed = now - last_time
                    if elapsed < ENTITY_COOLDOWN_SECONDS:
                        remaining = ENTITY_COOLDOWN_SECONDS - elapsed
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=(
                                f"Target entity #{target_id} is in cooldown for action '{action}'. "
                                f"Please wait {remaining:.1f}s before re-executing."
                            ),
                        )

    def record_action_executed(
        self,
        action: str,
        target_id: int,
        operator_id: str,
    ) -> None:
        """Record successful execution timestamp for rate limiting and cooldown."""
        now = time.time()
        with self._lock:
            # Stamp operator rate
            self._operator_timestamps.setdefault(operator_id, []).append(now)
            # Stamp entity cooldown
            if action not in ("GOVERNOR_LOCKOUT_ENGAGE", "GOVERNOR_LOCKOUT_RELEASE"):
                self._entity_cooldowns[(action, target_id)] = now

    # -------------------------------------------------------------------------
    # Approval Tokens (Two-Phase Pre-Flight)
    # -------------------------------------------------------------------------

    def create_approval_token(
        self,
        action: str,
        target_id: int,
        operator_id: str = "default_operator",
    ) -> dict[str, Any]:
        """Issue an ephemeral approval token bound to action, target, and operator valid for 60 seconds."""
        token = str(uuid.uuid4())
        now = time.time()
        expires_at = now + APPROVAL_TOKEN_TTL_SECONDS
        with self._lock:
            self._approval_tokens[token] = {
                "action": action,
                "target_id": target_id,
                "operator_id": operator_id,
                "expires_at": expires_at,
            }
        return {
            "approval_token": token,
            "action": action,
            "target_id": target_id,
            "operator_id": operator_id,
            "expires_in_seconds": int(APPROVAL_TOKEN_TTL_SECONDS),
            "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        }

    def _verify_and_consume_approval_token(
        self,
        token: str,
        action: str,
        target_id: int,
        operator_id: str,
    ) -> None:
        now = time.time()
        with self._lock:
            info = self._approval_tokens.pop(token, None)
            if not info:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired approval token.",
                )
            if now > info["expires_at"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Approval token has expired. Please request a new preview token.",
                )
            if info["action"] != action or str(info["target_id"]) != str(target_id):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Approval token mismatch for requested action or target.",
                )
            if info.get("operator_id") != operator_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=(
                        f"Approval token operator mismatch: token was issued to '{info.get('operator_id')}', "
                        f"but redemption attempted by '{operator_id}'."
                    ),
                )

    # -------------------------------------------------------------------------
    # Status & Telemetry
    # -------------------------------------------------------------------------

    def get_status_dict(self, operator_id: str = "default_operator") -> dict[str, Any]:
        """Return comprehensive live status of the Governor."""
        now = time.time()
        with self._lock:
            op_timestamps = self._operator_timestamps.get(operator_id, [])
            valid_op = [ts for ts in op_timestamps if now - ts < RATE_LIMIT_WINDOW_SECONDS]
            active_cooldowns_count = sum(
                1 for ts in self._entity_cooldowns.values()
                if now - ts < ENTITY_COOLDOWN_SECONDS
            )

            cb_status = self.circuit_breaker.get_status_dict()

            return {
                "lockout_engaged": self._emergency_lockout,
                "operator_id": operator_id,
                "operator_actions_last_minute": len(valid_op),
                "operator_rate_limit_max": MAX_OPERATOR_RATE_LIMIT,
                "active_cooldowns_count": active_cooldowns_count,
                "circuit_breaker": cb_status,
                "allowlisted_actions": sorted(list(ALLOWED_ACTIONS)),
            }


# Singleton Governor instance for HoneyShield-X application lifecycle
default_governor = DeterministicGovernor()
