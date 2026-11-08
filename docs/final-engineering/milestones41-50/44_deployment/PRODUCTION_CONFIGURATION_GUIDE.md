# Milestone 44 — Production Configuration Guide

**Release Candidate:** `v1.0.0-rc5`  
**Configuration Reference:** Environment Variables & Secrets Specification  

---

## 1. Mandatory Production Environment Variables

In production, all of the following variables must be populated via secure environment injection (e.g. AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets). The application will fail to start if critical keys are missing.

```bash
# ==============================================================================
# HONEYSHIELD X PRODUCTION CONFIGURATION
# ==============================================================================

# 1. APPLICATION CORE
ENVIRONMENT=production
DEBUG=false
APP_NAME="HoneyShield X Enterprise"
SECRET_KEY=<CRYPTOGRAPHICALLY_RANDOM_HEX_64_CHARS>

# 2. POSTGRESQL 17 CONNECTION (Strictly Managed Connection Pool)
DATABASE_URL=postgresql+psycopg://hsx_app_user:<SECURE_DB_PASSWORD>@postgres.prod.internal:5432/honeyshield_prod
POSTGRES_POOL_SIZE=20
POSTGRES_MAX_OVERFLOW=10
POSTGRES_POOL_TIMEOUT=30
POSTGRES_POOL_RECYCLE=300

# 3. REDIS 7 CONNECTION (Pub/Sub & Revocation Storage)
REDIS_HOST=redis.prod.internal
REDIS_PORT=6379
REDIS_PASSWORD=<SECURE_REDIS_PASSWORD>
REDIS_DB=0
REDIS_SSL=true

# 4. CORS & DOMAIN WHITELISTS
HONEYSHIELD_CORS_ORIGINS=https://soc.company.com,https://api.company.com

# 5. AUTHENTICATION & JWT
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
REFRESH_TOKEN_EXPIRATION_DAYS=7

# 6. LOGGING & OBSERVABILITY
LOG_LEVEL=INFO
ENABLE_STRUCTURED_JSON_LOGGING=true
OPENTELEMETRY_ENABLED=true
```

---

## 2. Configuration Validation Guardrails

In production mode (`ENVIRONMENT=production`):
1. **Fallback Prevention:** The application will immediately raise a fatal configuration error and abort startup if `SECRET_KEY` equals default placeholders (`change_this_secret`, `change_this_password`, `secret`).
2. **TLS Verification:** Reject plain HTTP origins in `HONEYSHIELD_CORS_ORIGINS`.
3. **Database Pre-Ping:** Automatic heartbeat verification on connection acquisition with zero silent fallback to SQLite in production.
