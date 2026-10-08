"""Operator Registry and Role-Based Access Control (RBAC) for Module 3.5.

Zero-Migration Architecture:
- Manages operator accounts, roles, and credential hashes in-memory with environment configuration.
- Enforces deterministic 4-tier SOC roles and permission mappings.
- Enforces 5-failure / 15-minute account lockouts.
- Pre-seeds standard SOC operational personas.
"""

from dataclasses import dataclass, field
import json
import logging
import os
import threading
import time
from typing import Any

from app.auth.crypto import hash_password

logger = logging.getLogger(__name__)

# Deterministic Role Permissions Mapping
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "viewer": {
        "telemetry:view",
        "investigation:view",
    },
    "analyst": {
        "telemetry:view",
        "investigation:view",
        "audit:view",
        "command:preview",
        "command:ack",
        "command:escalate",
    },
    "incident_responder": {
        "telemetry:view",
        "investigation:view",
        "audit:view",
        "command:preview",
        "command:ack",
        "command:escalate",
        "command:resolve",
        "command:stage_containment",
        "command:dispatch_notification",
    },
    "security_administrator": {
        "telemetry:view",
        "investigation:view",
        "audit:view",
        "command:preview",
        "command:ack",
        "command:escalate",
        "command:resolve",
        "command:stage_containment",
        "command:dispatch_notification",
        "governor:lockout",
        "operator:admin",
    },
}

# Module 3.6 Deterministic Case Management Permissions Mapping
CASE_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "viewer": {
        "case:view",
    },
    "analyst": {
        "case:view",
        "case:create",
        "case:update",
    },
    "incident_responder": {
        "case:view",
        "case:create",
        "case:update",
        "case:respond",
        "case:close",
    },
    "security_administrator": {
        "case:view",
        "case:create",
        "case:update",
        "case:respond",
        "case:close",
        "case:admin",
    },
}

MAX_FAILED_LOGIN_ATTEMPTS: int = 5
LOCKOUT_DURATION_SECONDS: float = 900.0  # 15 minutes


@dataclass
class Operator:
    """Operator identity and authorization profile."""

    username: str
    role: str
    email: str
    password_hash: str
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: float | None = None

    @property
    def permissions(self) -> set[str]:
        """Resolve deterministic permission set for current role."""
        base_perms = set(ROLE_PERMISSIONS.get(self.role, set()))
        case_perms = set(CASE_ROLE_PERMISSIONS.get(self.role, set()))
        return base_perms | case_perms

    def has_permission(self, permission: str) -> bool:
        """Check if operator role satisfies permission requirement."""
        if not self.is_active:
            return False
        return permission in self.permissions

    def is_locked(self, current_time: float | None = None) -> bool:
        """Check if account is currently locked out due to excessive failed attempts."""
        now = current_time if current_time is not None else time.time()
        if self.locked_until is not None:
            if now < self.locked_until:
                return True
            # Lockout expired: auto-reset counter
            self.locked_until = None
            self.failed_login_attempts = 0
        return False

    def record_failed_login(self, current_time: float | None = None) -> tuple[int, bool]:
        """Record an unsuccessful login attempt. Returns (new_count, is_now_locked)."""
        now = current_time if current_time is not None else time.time()
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            self.locked_until = now + LOCKOUT_DURATION_SECONDS
            return self.failed_login_attempts, True
        return self.failed_login_attempts, False

    def reset_failed_logins(self) -> None:
        """Reset failed login counter and lockout on successful authentication."""
        self.failed_login_attempts = 0
        self.locked_until = None

    def to_profile_dict(self) -> dict[str, Any]:
        """Serialize operator profile without sensitive hash or lockout details."""
        return {
            "username": self.username,
            "role": self.role,
            "email": self.email,
            "permissions": sorted(list(self.permissions)),
            "is_active": self.is_active,
        }


class OperatorRegistry:
    """Thread-safe in-memory Operator registry."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._operators: dict[str, Operator] = {}
        self._seed_default_operators()

    def _seed_default_operators(self) -> None:
        """Seed baseline SOC operational personas."""
        # Use fixed salts/iterations for fast startup while retaining full PBKDF2 structure
        defaults = [
            Operator(
                username="viewer_dan",
                role="viewer",
                email="viewer.dan@honeyshield.local",
                password_hash=hash_password("ViewerPass123!"),
            ),
            Operator(
                username="analyst_sarah",
                role="analyst",
                email="analyst.sarah@honeyshield.local",
                password_hash=hash_password("AnalystPass123!"),
            ),
            Operator(
                username="responder_alex",
                role="incident_responder",
                email="responder.alex@honeyshield.local",
                password_hash=hash_password("ResponderPass123!"),
            ),
            Operator(
                username="admin_chief",
                role="security_administrator",
                email="admin.chief@honeyshield.local",
                password_hash=hash_password("AdminPass123!"),
            ),
        ]
        with self._lock:
            self._operators.clear()
            for op in defaults:
                self._operators[op.username] = op

        # Check for optional env-configured operators
        env_ops = os.getenv("HONEYSHIELD_OPERATORS_JSON")
        if env_ops:
            try:
                data = json.loads(env_ops)
                with self._lock:
                    for item in data:
                        op = Operator(
                            username=item["username"],
                            role=item.get("role", "viewer"),
                            email=item.get("email", f"{item['username']}@honeyshield.local"),
                            password_hash=item.get("password_hash") or hash_password(item.get("password", "DefaultPass123!")),
                            is_active=item.get("is_active", True),
                        )
                        self._operators[op.username] = op
            except Exception as e:
                logger.error("Failed to parse HONEYSHIELD_OPERATORS_JSON: %s", str(e))

    def get_operator(self, username: str) -> Operator | None:
        """Retrieve operator by username."""
        with self._lock:
            return self._operators.get(username)

    def register_operator(self, operator: Operator) -> None:
        """Register or update an operator in the registry."""
        with self._lock:
            self._operators[operator.username] = operator

    def deactivate_operator(self, username: str) -> bool:
        """Deactivate an operator account."""
        with self._lock:
            op = self._operators.get(username)
            if op:
                op.is_active = False
                return True
            return False

    def reset(self) -> None:
        """Reset registry back to initial seed state."""
        self._seed_default_operators()


# Global Singleton
default_operator_registry = OperatorRegistry()
