# PRODUCTION DEPLOYMENT & ENVIRONMENT CONFIGURATION

**File Reference:** `.env.example`, `backend/app/main.py`, `frontend/vite.config.ts`  
**Release Gate:** G34, G39  

---

## 1. MANDATORY PRODUCTION ENVIRONMENT VARIABLES

When deploying HoneyShield X in production (`APP_ENV=production`), the following environment variables must be injected via secure secret stores (Kubernetes Secrets, HashiCorp Vault, AWS Secrets Manager):

| Variable | Description | Requirement | Example / Constraints |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | Application environment identifier | Required | `production` |
| `DATABASE_URL` | PostgreSQL 17 connection string | Required | `postgresql+psycopg://user:pass@host:5432/dbname` |
| `REDIS_URL` | Redis 7 event cache connection string | Required | `redis://:pass@host:6379/0` |
| `HONEYSHIELD_OPERATORS_JSON` | Authorized production operator accounts | **MANDATORY** in prod | Valid JSON array of pre-hashed operators |
| `HONEYSHIELD_JWT_SECRET` | Secret key for session signature validation | Required | 256-bit high-entropy secret |
| `HONEYSHIELD_BREAK_GLASS_PASSPHRASE` | Emergency break-glass passphrase | Required | Strong passphrase (>= 24 chars) |
| `HONEYSHIELD_CORS_ORIGINS` | Permitted browser origins | Required | `https://soc.enterprise.corp` |

---

## 2. OWASP RECOMMENDED SECURITY HEADERS

HoneyShield X enforces enterprise HTTP security headers on all endpoints via Starlette middleware:

```python
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
response.headers["Content-Security-Policy"] = (
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' ws: wss:;"
)
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
```

---

## 3. ASSET DELIVERY & CACHING STRATEGY

- **Static Assets:** Cached immutable for 1 year (`Cache-Control: public, max-age=31536000, immutable`).
- **HTML Document (`index.html`):** Non-cacheable (`Cache-Control: no-cache, no-store, must-revalidate`).
- **Telemetry Protection:** Production bundle strips dev diagnostics and never mounts `window.__HSX_RELAY_STATE__`.
