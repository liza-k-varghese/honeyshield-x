"""Unit and integration tests for Staging Authentication Hardening and Environment Isolation.

Verifies:
1. APP_ENV=staging requires explicit HONEYSHIELD_OPERATORS_JSON (or HONEYSHIELD_STAGING_OPERATORS_JSON).
2. Missing or empty operator configuration fails safely with RuntimeError.
3. Development demo credentials (admin_chief, etc.) are strictly rejected in staging.
4. Dedicated staging operators can authenticate successfully.
5. Development mode continues to seed default demo personas.
"""

import json
import os
import secrets
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

from app.auth.registry import OperatorRegistry
from app.auth.service import AuthService


@pytest.fixture(autouse=True)
def clean_auth_env():
    """Ensure environment variables are restored after each test."""
    preserved = {
        "APP_ENV": os.environ.get("APP_ENV"),
        "HONEYSHIELD_ENV": os.environ.get("HONEYSHIELD_ENV"),
        "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
        "HONEYSHIELD_OPERATORS_JSON": os.environ.get("HONEYSHIELD_OPERATORS_JSON"),
        "HONEYSHIELD_STAGING_OPERATORS_JSON": os.environ.get("HONEYSHIELD_STAGING_OPERATORS_JSON"),
    }
    yield
    for key, val in preserved.items():
        if val is not None:
            os.environ[key] = val
        else:
            os.environ.pop(key, None)


def test_staging_mode_rejects_missing_operators_json():
    """Verify that staging mode fails safely if HONEYSHIELD_OPERATORS_JSON is missing."""
    os.environ["APP_ENV"] = "staging"
    os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)
    os.environ.pop("HONEYSHIELD_STAGING_OPERATORS_JSON", None)

    with pytest.raises(RuntimeError) as exc_info:
        OperatorRegistry()
    assert "Staging mode (APP_ENV=staging) requires HONEYSHIELD_OPERATORS_JSON" in str(exc_info.value)
    assert "Insecure default operator seeds are disabled in staging" in str(exc_info.value)


def test_staging_mode_rejects_empty_operators_json():
    """Verify that staging mode fails if operators JSON is empty array."""
    os.environ["APP_ENV"] = "staging"
    os.environ["HONEYSHIELD_OPERATORS_JSON"] = "[]"

    with pytest.raises(RuntimeError) as exc_info:
        OperatorRegistry()
    assert "Staging mode (APP_ENV=staging) requires HONEYSHIELD_OPERATORS_JSON" in str(exc_info.value)


def test_staging_mode_rejects_malformed_operators_json():
    """Verify that staging mode fails safely if operators JSON is malformed."""
    os.environ["APP_ENV"] = "staging"
    os.environ["HONEYSHIELD_OPERATORS_JSON"] = "{invalid_json}"

    with pytest.raises(RuntimeError) as exc_info:
        OperatorRegistry()
    assert "Invalid HONEYSHIELD_OPERATORS_JSON in staging" in str(exc_info.value)


def test_staging_mode_accepts_configured_staging_operators():
    """Verify that staging mode loads configured operators and strictly excludes development defaults."""
    os.environ["APP_ENV"] = "staging"
    synthetic_analyst_pass = f"SynthTestPass-Analyst-{secrets.token_urlsafe(16)}!Aa1"
    os.environ["HONEYSHIELD_OPERATORS_JSON"] = json.dumps([
        {
            "username": "staging_analyst",
            "role": "analyst",
            "email": "analyst.staging@honeyshield.local",
            "password": synthetic_analyst_pass,
        }
    ])

    registry = OperatorRegistry()
    assert registry.get_operator("staging_analyst") is not None
    assert registry.get_operator("staging_analyst").role == "analyst"

    # Development demo personas must NOT exist in staging
    assert registry.get_operator("admin_chief") is None
    assert registry.get_operator("viewer_dan") is None
    assert registry.get_operator("analyst_sarah") is None
    assert registry.get_operator("responder_alex") is None


def test_staging_mode_supports_dedicated_staging_env_var():
    """Verify that HONEYSHIELD_STAGING_OPERATORS_JSON is recognized in staging."""
    os.environ["APP_ENV"] = "staging"
    os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)
    synthetic_lead_pass = f"SynthTestPass-Lead-{secrets.token_urlsafe(16)}!Aa1"
    os.environ["HONEYSHIELD_STAGING_OPERATORS_JSON"] = json.dumps([
        {
            "username": "staging_lead",
            "role": "security_administrator",
            "email": "lead.staging@honeyshield.local",
            "password": synthetic_lead_pass,
        }
    ])

    registry = OperatorRegistry()
    assert registry.get_operator("staging_lead") is not None
    assert registry.get_operator("admin_chief") is None


def test_staging_authentication_flow():
    """Verify authentication behavior in staging: dedicated account succeeds, dev demo fails."""
    os.environ["APP_ENV"] = "staging"
    synthetic_staging_pass = f"SynthTestPass-SecOps-{secrets.token_urlsafe(16)}!Aa1"
    os.environ["HONEYSHIELD_OPERATORS_JSON"] = json.dumps([
        {
            "username": "staging_operator",
            "role": "security_administrator",
            "email": "secops.staging@honeyshield.local",
            "password": synthetic_staging_pass,
        }
    ])

    registry = OperatorRegistry()
    auth_service = AuthService()
    auth_service.operator_registry = registry
    mock_db = MagicMock()

    # 1. Development credentials must fail with 401
    with pytest.raises(HTTPException) as exc_dev:
        auth_service.login(
            username="admin_chief",
            password="AdminPass123!",
            client_ip="127.0.0.1",
            user_agent="pytest",
            db=mock_db,
        )
    assert exc_dev.value.status_code == 401
    assert "Invalid username or password" in exc_dev.value.detail

    # 2. Dedicated staging credentials must succeed
    token_resp = auth_service.login(
        username="staging_operator",
        password=synthetic_staging_pass,
        client_ip="127.0.0.1",
        user_agent="pytest",
        db=mock_db,
    )
    assert token_resp is not None
    assert "token" in token_resp
    assert token_resp["token_type"] == "bearer"
    assert token_resp["operator"]["username"] == "staging_operator"
    assert token_resp["operator"]["role"] == "security_administrator"


def test_development_mode_retains_default_personas():
    """Verify development mode retains demo personas when APP_ENV=development."""
    os.environ["APP_ENV"] = "development"
    os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)
    os.environ.pop("HONEYSHIELD_STAGING_OPERATORS_JSON", None)

    registry = OperatorRegistry()
    assert registry.get_operator("admin_chief") is not None
    assert registry.get_operator("analyst_sarah") is not None
    assert registry.get_operator("responder_alex") is not None
    assert registry.get_operator("viewer_dan") is not None
