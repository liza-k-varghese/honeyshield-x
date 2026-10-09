"""Decoy Credential and Inert Artifact Generators for Module 3.7.

Security Invariants:
- ALL generated credentials and artifacts are PERMANENTLY INERT.
- Decoy credentials NEVER authenticate to cloud infrastructure, databases, or services.
- Decoy credentials NEVER grant any functional privilege or invoke external endpoints.
- Canary file beacons are safe static text templates with ZERO embedded code, macros, or outbound callbacks.
- Values serve solely as passive, high-confidence defensive tripwires.
"""

from typing import Any


def generate_decoy_payload(canary_type: str, canary_id: str, token_str: str) -> dict[str, Any]:
    """Generate syntactically realistic yet permanently inert decoy payloads for the given asset class."""
    if canary_type == "AWS_API_KEY":
        # Realistic AWS IAM access key ID format: AKIA + 16 uppercase alphanumeric chars
        access_key_id = f"AKIA{token_str[:16].upper().replace('-', 'X').replace('_', 'Y')}"
        secret_access_key = f"{token_str}qW8eR9tY0uI1oP2a"[:40]
        return {
            "access_key_id": access_key_id,
            "secret_access_key": secret_access_key,
            "region": "us-east-1",
            "inert_disclaimer": "PERMANENTLY INERT DECOY. Does not authenticate to AWS or cloud infrastructure.",
            "recommended_placement": "Deploy to decoy .aws/credentials, test git repositories, or environment configs.",
            "trap_validation_token": token_str,
        }

    elif canary_type == "DATABASE_CREDENTIAL":
        # Realistic database connection credentials
        db_user = "decoy_db_admin"
        db_pass = f"{token_str[:20]}!Pass"
        db_host = "db-internal-prod.lan"
        db_port = 5432
        db_name = "corp_financial_prod"
        connection_string = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        return {
            "username": db_user,
            "password": db_pass,
            "host": db_host,
            "port": db_port,
            "database": db_name,
            "connection_string": connection_string,
            "inert_disclaimer": "PERMANENTLY INERT DECOY. Does not authenticate to any database.",
            "recommended_placement": "Deploy to decoy database configuration files, docker-compose.yml, or memory traps.",
            "trap_validation_token": token_str,
        }

    elif canary_type == "SERVICE_API_TOKEN":
        # Realistic internal service Bearer token
        raw_token = f"hsx_sec_{token_str}"
        return {
            "token": raw_token,
            "header_format": f"Authorization: Bearer {raw_token}",
            "service_name": "internal-identity-vault",
            "inert_disclaimer": "PERMANENTLY INERT DECOY. Does not grant access to internal services.",
            "recommended_placement": "Deploy to decoy .env files, CI/CD pipeline variables, or shell history decoys.",
            "trap_validation_token": token_str,
        }

    elif canary_type == "WEB_TRIPWIRE_ENDPOINT":
        # Web tripwire URL pointing to the HoneyShield-X public validation trap endpoint
        trap_path = f"/api/v1/deception/validate/{token_str}"
        return {
            "tripwire_path": trap_path,
            "full_path": trap_path,
            "http_method": "GET",
            "inert_disclaimer": "DEFENSIVE TRIPWIRE TRAP. High-confidence intrusion detection sensor.",
            "recommended_placement": "Place in robots.txt, HTML source comments, or fake administrative documentation.",
            "trap_validation_token": token_str,
        }

    elif canary_type == "CANARY_FILE_BEACON":
        # Safe static decoy file template. Zero executable code, zero external callbacks.
        trap_path = f"/api/v1/deception/validate/{token_str}"
        decoy_content = (
            "# CONFIDENTIAL INTERNAL CONFIGURATION BACKUP\n"
            "# DO NOT DISTRIBUTE OR EXPORT OUTSIDE SECURE ENCLAVE\n\n"
            "[vault_sync]\n"
            f"sync_endpoint = http://127.0.0.1:8000{trap_path}\n"
            f"token = hsx_canary_{token_str}\n"
            "status = ACTIVE_REPLICATION\n\n"
            "[storage_credentials]\n"
            "access_key = CANARY_INERT_KEY\n"
            "secret_key = CANARY_INERT_SECRET\n"
        )
        return {
            "filename": "credentials_backup.conf",
            "mime_type": "text/plain",
            "file_content": decoy_content,
            "inert_disclaimer": "PERMANENTLY INERT STATIC TEMPLATE. Zero embedded code, zero external callbacks.",
            "recommended_placement": "Deploy as decoy configuration artifact on sensitive server file systems or desktop shares.",
            "trap_validation_token": token_str,
        }

    else:
        return {
            "token": token_str,
            "inert_disclaimer": "PERMANENTLY INERT DECOY.",
            "trap_validation_token": token_str,
        }
