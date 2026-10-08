"""Cryptographic primitives for HoneyShield-X Module 3.5 Operator Authentication.

Implements:
- PBKDF2-HMAC-SHA256 password hashing with 600,000 iterations (OWASP 2024 compliance)
- Unique 16-byte random salts via secrets.token_bytes(16)
- Constant-time password comparison via hmac.compare_digest
- CSPRNG opaque 256-bit entropy session token generation via secrets.token_urlsafe(32)
- Server-side SHA-256 session token hashing via hashlib.sha256

Zero external dependencies: relies exclusively on Python 3.13 standard library.
"""

import base64
import hashlib
import hmac
import secrets

DEFAULT_PBKDF2_ITERATIONS: int = 600_000
SALT_BYTES: int = 16


def hash_password(password: str, iterations: int = DEFAULT_PBKDF2_ITERATIONS) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a CSPRNG salt.

    Returns:
        Formatted string: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
    """
    if not password:
        raise ValueError("Password cannot be empty")
    salt = secrets.token_bytes(SALT_BYTES)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    hash_b64 = base64.b64encode(derived_key).decode("ascii")
    return f"pbkdf2_sha256${iterations}${salt_b64}${hash_b64}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored PBKDF2-HMAC-SHA256 hash using constant-time comparison.

    Returns:
        True if the password matches, False otherwise (including malformed hash strings).
    """
    if not plain_password or not hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = base64.b64decode(parts[2].encode("ascii"))
        stored_hash = parts[3]
        derived_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        computed_hash = base64.b64encode(derived_key).decode("ascii")
        return hmac.compare_digest(computed_hash, stored_hash)
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate an opaque 256-bit CSPRNG bearer token."""
    return f"hsx_sess_{secrets.token_urlsafe(32)}"


def hash_session_token(token: str) -> str:
    """Compute SHA-256 digest of session token for secure server-side storage and lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
