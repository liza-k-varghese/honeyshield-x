"""Authentication and authorization orchestration service for Module 3.5.

Enforces:
- Login authentication with PBKDF2 verification.
- Per-IP rate limiting (max 5 login requests / minute / IP -> HTTP 429).
- Brute-force lockout (5 consecutive failures -> 15-minute lockout).
- Session lifecycle and atomic revocation.
- Emergency break-glass access (30-minute max session, justification >= 20 chars).
- Redacted audit persistence via SystemEvent.
"""

from collections import defaultdict
import json
import logging
import os
import threading
import time
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.crypto import verify_password
from app.auth.registry import (
    Operator,
    default_operator_registry,
)
from app.auth.session import (
    MAX_SESSION_LIFETIME_SECONDS,
    default_session_store,
)
from app.incident_command.bus import default_event_bus

logger = logging.getLogger(__name__)

LOGIN_RATE_LIMIT_MAX_REQUESTS: int = 5
LOGIN_RATE_LIMIT_WINDOW_SECONDS: float = 60.0
BREAKGLASS_SESSION_SECONDS: float = 1800.0  # 30 minutes


class LoginRateLimiter:
    """Thread-safe sliding window rate limiter for login requests per source IP."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._ip_timestamps: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str, current_time: float | None = None) -> bool:
        """Check if client IP is within rate limits (max 5 per minute)."""
        now = current_time if current_time is not None else time.time()
        window_start = now - LOGIN_RATE_LIMIT_WINDOW_SECONDS

        with self._lock:
            timestamps = self._ip_timestamps[client_ip]
            # Prune expired timestamps
            pruned = [t for t in timestamps if t >= window_start]
            if len(pruned) >= LOGIN_RATE_LIMIT_MAX_REQUESTS:
                self._ip_timestamps[client_ip] = pruned
                return False
            pruned.append(now)
            self._ip_timestamps[client_ip] = pruned
            return True

    def reset(self) -> None:
        """Clear rate limiter history."""
        with self._lock:
            self._ip_timestamps.clear()


default_login_rate_limiter = LoginRateLimiter()


def record_auth_audit(
    db: Session,
    event_type: str,
    payload: dict[str, Any],
    severity: str = "info",
) -> None:
    """Record an authentication or authorization audit event to SystemEvent with secret redaction."""
    # Ensure sensitive credentials are never stored in audit logs
    sanitized = {k: v for k, v in payload.items() if k not in {"password", "token", "hash", "secret", "passphrase"}}
    msg_json = json.dumps(sanitized)
    record_operator_audit(
        db=db,
        event_type=event_type,
        message=msg_json,
        source="auth",
        severity=severity,
    )


class AuthService:
    """Service handling operator authentication, session issuance, and break-glass procedures."""

    def __init__(self) -> None:
        self.rate_limiter = default_login_rate_limiter
        self.operator_registry = default_operator_registry
        self.session_store = default_session_store

    def login(
        self,
        username: str,
        password: str,
        client_ip: str,
        user_agent: str,
        db: Session,
        current_time: float | None = None,
    ) -> dict[str, Any]:
        """Authenticate operator and issue a fresh session token."""
        # 1. Rate Limit Gate
        if not self.rate_limiter.is_allowed(client_ip, current_time=current_time):
            record_auth_audit(
                db,
                "OPERATOR_AUTH_DENIED",
                {"reason": "Login rate limit exceeded", "client_ip": client_ip},
                severity="warning",
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please wait 1 minute before trying again.",
            )

        # 2. Operator Lookup
        operator = self.operator_registry.get_operator(username)
        if operator is None:
            record_auth_audit(
                db,
                "OPERATOR_LOGIN_FAILURE",
                {"attempted_username": username, "reason": "User not found", "client_ip": client_ip},
                severity="warning",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        if not operator.is_active:
            record_auth_audit(
                db,
                "OPERATOR_LOGIN_FAILURE",
                {"operator_id": username, "reason": "Account inactive", "client_ip": client_ip},
                severity="warning",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Operator account is inactive",
            )

        # 3. Account Lockout Gate
        if operator.is_locked(current_time=current_time):
            record_auth_audit(
                db,
                "OPERATOR_ACCOUNT_LOCKED",
                {
                    "operator_id": username,
                    "reason": "Account locked",
                    "locked_until": operator.locked_until,
                    "client_ip": client_ip,
                },
                severity="high",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is temporarily locked due to excessive failed attempts. Please try again later.",
            )

        # 4. Password Verification
        if not verify_password(password, operator.password_hash):
            failed_count, is_locked = operator.record_failed_login(current_time=current_time)
            if is_locked:
                record_auth_audit(
                    db,
                    "OPERATOR_ACCOUNT_LOCKED",
                    {
                        "operator_id": username,
                        "failed_attempts": failed_count,
                        "locked_until": operator.locked_until,
                        "client_ip": client_ip,
                    },
                    severity="high",
                )
            else:
                record_auth_audit(
                    db,
                    "OPERATOR_LOGIN_FAILURE",
                    {
                        "operator_id": username,
                        "reason": "Invalid password",
                        "failed_attempts": failed_count,
                        "client_ip": client_ip,
                    },
                    severity="warning",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        # 5. Success: Reset Failed Counter and Create Session
        operator.reset_failed_logins()
        raw_token, session_data = self.session_store.create_session(
            operator=operator,
            client_ip=client_ip,
            user_agent=user_agent,
            max_lifetime_seconds=MAX_SESSION_LIFETIME_SECONDS,
            current_time=current_time,
        )

        record_auth_audit(
            db,
            "OPERATOR_LOGIN_SUCCESS",
            {
                "operator_id": operator.username,
                "role": operator.role,
                "client_ip": client_ip,
                "user_agent": user_agent[:100],
            },
            severity="info",
        )

        return {
            "token": raw_token,
            "token_type": "bearer",
            "expires_in": int(session_data.expires_at - session_data.created_at),
            "operator": operator.to_profile_dict(),
        }

    def logout(self, token: str, client_ip: str, db: Session) -> dict[str, Any]:
        """Revoke active session and log audit trail."""
        session_data = self.session_store.get_session(token)
        if session_data is not None:
            self.session_store.revoke_session(token)
            record_auth_audit(
                db,
                "OPERATOR_LOGOUT",
                {
                    "operator_id": session_data.operator_id,
                    "session_prefix": session_data.session_id_prefix,
                    "client_ip": client_ip,
                },
                severity="info",
            )
        return {"success": True, "message": "Successfully logged out"}

    def break_glass(
        self,
        passphrase: str,
        justification: str,
        client_ip: str,
        user_agent: str,
        db: Session,
        current_time: float | None = None,
    ) -> dict[str, Any]:
        """Emergency break-glass procedure granting 30-minute Security Administrator session."""
        clean_justification = justification.strip()
        if len(clean_justification) < 20:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Operational justification must be at least 20 characters",
            )

        expected_passphrase = os.getenv(
            "HONEYSHIELD_BREAKGLASS_PASSPHRASE",
            "HoneyShield-SOC-Emergency-BreakGlass-2026!",
        )

        # Constant-time comparison
        from hmac import compare_digest
        if not compare_digest(passphrase, expected_passphrase):
            record_auth_audit(
                db,
                "OPERATOR_LOGIN_FAILURE",
                {"reason": "Invalid break-glass credential", "client_ip": client_ip},
                severity="warning",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid break-glass emergency credential",
            )

        # Emergency operator entity
        emergency_op = Operator(
            username="emergency_breakglass",
            role="security_administrator",
            email="breakglass@honeyshield.local",
            password_hash="",
            is_active=True,
        )

        raw_token, session_data = self.session_store.create_session(
            operator=emergency_op,
            client_ip=client_ip,
            user_agent=user_agent,
            max_lifetime_seconds=BREAKGLASS_SESSION_SECONDS,
            current_time=current_time,
        )

        # Critical audit event
        record_auth_audit(
            db,
            "BREAK_GLASS_ENGAGED",
            {
                "operator_id": "emergency_breakglass",
                "justification": clean_justification[:512],
                "duration_minutes": 30,
                "client_ip": client_ip,
            },
            severity="critical",
        )

        # Publish SSE high-priority event
        try:
            default_event_bus.publish(
                event_type="system.breakglass",
                payload={
                    "operator_id": "emergency_breakglass",
                    "justification": clean_justification[:200],
                    "duration_seconds": BREAKGLASS_SESSION_SECONDS,
                },
            )
        except Exception:
            pass

        return {
            "token": raw_token,
            "token_type": "bearer",
            "expires_in": int(BREAKGLASS_SESSION_SECONDS),
            "operator": emergency_op.to_profile_dict(),
            "warning": "EMERGENCY BREAK-GLASS ACTIVE: 30 MINUTE MAXIMUM NON-EXTENDABLE LIFETIME",
        }


# Global Singleton
default_auth_service = AuthService()
