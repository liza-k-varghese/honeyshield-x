"""Unit tests for Milestone 62 administrative credential security and production lockdown."""

import os
import json
import secrets
import pytest
from app.auth.registry import OperatorRegistry, default_operator_registry
from app.auth.service import AuthService
from fastapi import HTTPException
from unittest.mock import MagicMock


def test_development_mode_seeds_default_personas():
    """Verify that in development/test environment, standard personas are available."""
    old_env = os.environ.get("APP_ENV")
    try:
        os.environ["APP_ENV"] = "development"
        registry = OperatorRegistry()
        admin = registry.get_operator("admin_chief")
        assert admin is not None
        assert admin.role == "security_administrator"
        assert admin.has_permission("operator:admin")
    finally:
        if old_env is not None:
            os.environ["APP_ENV"] = old_env
        else:
            os.environ.pop("APP_ENV", None)


def test_production_mode_rejects_missing_operators_json():
    """Verify that production mode fails safely if HONEYSHIELD_OPERATORS_JSON is missing."""
    old_env = os.environ.get("APP_ENV")
    old_json = os.environ.get("HONEYSHIELD_OPERATORS_JSON")
    try:
        os.environ["APP_ENV"] = "production"
        os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)

        with pytest.raises(RuntimeError) as exc_info:
            OperatorRegistry()
        assert "Production mode (APP_ENV=production) requires HONEYSHIELD_OPERATORS_JSON" in str(exc_info.value)
    finally:
        if old_env is not None:
            os.environ["APP_ENV"] = old_env
        else:
            os.environ.pop("APP_ENV", None)
        if old_json is not None:
            os.environ["HONEYSHIELD_OPERATORS_JSON"] = old_json


def test_production_mode_accepts_configured_operators_json():
    """Verify that production mode loads explicitly configured operators and rejects default seeds."""
    old_env = os.environ.get("APP_ENV")
    old_json = os.environ.get("HONEYSHIELD_OPERATORS_JSON")
    try:
        os.environ["APP_ENV"] = "production"
        synthetic_prod_pass = f"SynthProdTestPass-{secrets.token_urlsafe(16)}!Aa1"
        os.environ["HONEYSHIELD_OPERATORS_JSON"] = json.dumps([
            {
                "username": "prod_secops",
                "role": "security_administrator",
                "email": "secops@corp.internal",
                "password": synthetic_prod_pass,
            }
        ])

        registry = OperatorRegistry()
        assert registry.get_operator("prod_secops") is not None
        # Default demo accounts must NOT exist in production
        assert registry.get_operator("admin_chief") is None
        assert registry.get_operator("viewer_dan") is None
        assert registry.get_operator("analyst_sarah") is None
        assert registry.get_operator("responder_alex") is None
    finally:
        if old_env is not None:
            os.environ["APP_ENV"] = old_env
        else:
            os.environ.pop("APP_ENV", None)
        if old_json is not None:
            os.environ["HONEYSHIELD_OPERATORS_JSON"] = old_json
        else:
            os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)


def test_production_mode_rejects_authentication_with_development_credentials():
    """Verify that development personas cannot authenticate in a configured production environment."""
    old_env = os.environ.get("APP_ENV")
    old_json = os.environ.get("HONEYSHIELD_OPERATORS_JSON")
    try:
        os.environ["APP_ENV"] = "production"
        synthetic_prod_pass = f"SynthProdTestPass-{secrets.token_urlsafe(16)}!Aa1"
        os.environ["HONEYSHIELD_OPERATORS_JSON"] = json.dumps([
            {
                "username": "prod_secops",
                "role": "security_administrator",
                "email": "secops@corp.internal",
                "password": synthetic_prod_pass,
            }
        ])

        registry = OperatorRegistry()
        auth_service = AuthService()
        auth_service.operator_registry = registry
        mock_db = MagicMock()

        # Development credentials must be rejected with 401
        with pytest.raises(HTTPException) as exc_info:
            auth_service.login(username="admin_chief", password="AdminPass123!", client_ip="127.0.0.1", user_agent="pytest", db=mock_db)
        assert exc_info.value.status_code == 401
        assert "Invalid username or password" in exc_info.value.detail

        with pytest.raises(HTTPException) as exc_info2:
            auth_service.login(username="analyst_sarah", password="AnalystPass123!", client_ip="127.0.0.1", user_agent="pytest", db=mock_db)
        assert exc_info2.value.status_code == 401
    finally:
        if old_env is not None:
            os.environ["APP_ENV"] = old_env
        else:
            os.environ.pop("APP_ENV", None)
        if old_json is not None:
            os.environ["HONEYSHIELD_OPERATORS_JSON"] = old_json
        else:
            os.environ.pop("HONEYSHIELD_OPERATORS_JSON", None)

