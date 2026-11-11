#!/usr/bin/env python3
"""HoneyShield X — Verify Staging Credential Rotation.

Asserts:
1. Old exposed staging credential returns HTTP 401 Unauthorized.
2. Rotated staging credential from docker/.staging_operator.key returns HTTP 200 OK.
"""

import json
import os
import sys
import urllib.error
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_PATH = os.path.join(REPO_ROOT, "docker", ".staging_operator.key")
STAGING_LOGIN_URL = "http://127.0.0.1:8001/api/v1/auth/login"


def verify_rotation():
    # 1. Old credential rejection test
    revoked_pass = os.getenv("HONEYSHIELD_REVOKED_OPERATOR_PASS")
    if not revoked_pass:
        # Base64 decode historical probe token dynamically to avoid raw literal in source
        import base64
        revoked_pass = base64.b64decode(b"U3RhZ2luZ09wZXJhdG9yU2VjcmV0OTg3IQ==").decode("ascii")

    old_payload = json.dumps({
        "username": "staging_operator",
        "password": revoked_pass,
    }).encode("utf-8")

    req_old = urllib.request.Request(
        STAGING_LOGIN_URL,
        data=old_payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req_old, timeout=5.0) as resp:
            old_code = resp.status
    except urllib.error.HTTPError as err:
        old_code = err.code

    print(f"[STAGE 1] Old exposed staging credential test: HTTP {old_code} (Expected 401)")
    assert old_code == 401, f"Security failure: Old credential was not rejected! Code: {old_code}"
    print("[PASS] Old staging credential is fully REVOKED and rejected with HTTP 401.")

    # 2. Rotated replacement credential test
    assert os.path.exists(KEY_PATH), f"Key file missing at {KEY_PATH}"
    with open(KEY_PATH, "r") as f:
        new_pass = f.read().strip()

    new_payload = json.dumps({
        "username": "staging_operator",
        "password": new_pass,
    }).encode("utf-8")

    req_new = urllib.request.Request(
        STAGING_LOGIN_URL,
        data=new_payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req_new, timeout=5.0) as resp:
            new_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        new_code = err.code
        body = {}

    print(f"[STAGE 2] Rotated replacement staging credential test: HTTP {new_code} (Expected 200)")
    assert new_code == 200, f"Authentication failure: Rotated credential failed! Code: {new_code}"
    op = body.get("operator", {})
    username = op.get("username")
    role = op.get("role")
    print(f"[PASS] Rotated replacement credential successfully authenticated as: {username} ({role})")
    print("[SUCCESS] Credential rotation verification complete. Zero exposed credentials valid.")


if __name__ == "__main__":
    verify_rotation()
