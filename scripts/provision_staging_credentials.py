#!/usr/bin/env python3
"""HoneyShield-X Staging Credential Provisioning Utility.

Generates dedicated, secure operator credentials for the isolated staging environment.
Writes to uncommitted `docker/staging.env` with restricted permissions (0600).
Zero secrets are hardcoded in source or tracked in git.
"""

import argparse
import json
import os
import secrets
import stat
import string
import sys

# Add backend directory to sys.path so app modules are resolvable
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))

from app.auth.crypto import hash_password


def generate_secure_password(length: int = 32) -> str:
    """Generate a CSPRNG cryptographically strong random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def provision_staging_env(
    username: str = "staging_operator",
    role: str = "security_administrator",
    password: str | None = None,
    output_file: str | None = None,
) -> tuple[str, str]:
    """Provision a dedicated staging operator and write docker/staging.env.

    Returns:
        tuple (username, password)
    """
    if not password:
        password = generate_secure_password(32)

    pw_hash = hash_password(password)

    operators_payload = [
        {
            "username": username,
            "role": role,
            "email": f"{username}@honeyshield.local",
            "password_hash": pw_hash,
            "is_active": True,
        }
    ]

    operators_json = json.dumps(operators_payload)

    if output_file is None:
        output_file = os.path.join(REPO_ROOT, "docker", "staging.env")

    env_content = (
        f"# HoneyShield X Isolated Staging Environment Configuration\n"
        f"# Automatically generated - DO NOT COMMIT TO VERSION CONTROL\n"
        f"APP_ENV=staging\n"
        f"HONEYSHIELD_ENV=staging\n"
        f"HONEYSHIELD_OPERATORS_JSON='{operators_json}'\n"
        f"HONEYSHIELD_STAGING_OPERATORS_JSON='{operators_json}'\n"
    )

    # Write securely with restricted permissions (0600)
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    mode = stat.S_IRUSR | stat.S_IWUSR  # 0600
    with os.fdopen(os.open(output_file, flags, mode), "w") as f:
        f.write(env_content)

    return username, password


def main():
    parser = argparse.ArgumentParser(description="HoneyShield X Staging Credential Provisioning")
    parser.add_argument("--username", default="staging_operator", help="Staging operator username")
    parser.add_argument("--role", default="security_administrator", help="Operator role")
    parser.add_argument("--password", default=None, help="Explicit password (leave blank to auto-generate)")
    parser.add_argument("--output", default=None, help="Target env file path (default: docker/staging.env)")
    parser.add_argument("--show-password", action="store_true", help="Print generated password to stdout (operator terminal only)")

    args = parser.parse_args()

    username, password = provision_staging_env(
        username=args.username,
        role=args.role,
        password=args.password,
        output_file=args.output,
    )

    target_path = args.output or os.path.join(REPO_ROOT, "docker", "staging.env")
    print(f"[OK] Staging operator '{username}' ({args.role}) provisioned successfully.")
    print(f"[OK] Staging configuration written to: {target_path} (mode 0600)")

    if args.show_password:
        print(f"[NOTICE] Generated Password: {password}")


if __name__ == "__main__":
    main()
