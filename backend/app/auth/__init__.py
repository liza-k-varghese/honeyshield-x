"""HoneyShield-X Module 3.5 Operator Authentication & Authorization Package."""

from app.auth.crypto import hash_password, verify_password, generate_session_token, hash_session_token
from app.auth.registry import Operator, default_operator_registry, ROLE_PERMISSIONS
from app.auth.session import SessionData, default_session_store
from app.auth.service import default_auth_service
from app.auth.dependencies import get_current_operator, require_permission

__all__ = [
    "hash_password",
    "verify_password",
    "generate_session_token",
    "hash_session_token",
    "Operator",
    "default_operator_registry",
    "ROLE_PERMISSIONS",
    "SessionData",
    "default_session_store",
    "default_auth_service",
    "get_current_operator",
    "require_permission",
]
