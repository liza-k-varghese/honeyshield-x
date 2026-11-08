# Milestone 44 — Production Deployment Architecture & Topology

**Release Candidate:** `v1.0.0-rc5`  
**Target Environments:** Linux (Parrot OS, Debian 12, Ubuntu 24.04 LTS, RHEL 9), Docker 24+, Compose v2  
**Status:** **PASSED / ARCHITECTURALLY VERIFIED**  

---

## 1. Production Topology Overview

```
                      [ INTERNET / INGRESS ]
                                │
                                ▼ (HTTPS / WSS on Port 443)
              ┌─────────────────────────────────────┐
              │     Edge Reverse Proxy (Nginx)      │
              │   TLS 1.3 Termination & WAF Filter  │
              └──────────────────┬──────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
         Static UI Requests              API / Stream Requests
                 │                               │
                 ▼                               ▼
       ┌───────────────────┐           ┌───────────────────┐
       │   Frontend SPA    │           │  FastAPI Backend  │
       │ Built React Dist  │           │  Uvicorn Cluster  │
       │   (Nginx / CDN)   │           │    (2+ Workers)   │
       └───────────────────┘           └─────────┬─────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │                               │
                                 ▼                               ▼
                       ┌───────────────────┐           ┌───────────────────┐
                       │   PostgreSQL 17   │           │      Redis 7      │
                       │ Relational Ledger │           │ Pub/Sub & Stream  │
                       │ & Outbox Storage  │           │   Token Store     │
                       └───────────────────┘           └───────────────────┘
```

---

## 2. Environment Separation & Configuration Precedence

HoneyShield X strictly enforces 4 isolated operating tiers:

| Parameter | Development (DEV) | Test / CI (TEST) | Staging (STG) | Production (PROD) |
| :--- | :--- | :--- | :--- | :--- |
| **API Host:Port** | `127.0.0.1:8000` | Mock / Ephemeral | `127.0.0.1:8001` | Private VPC `:8000` |
| **Frontend Server** | Vite Dev (`5173`) | `happy-dom` harness | Nginx Container (`5174`) | Nginx / CDN (`443`) |
| **PostgreSQL** | `honeyshield-postgres` (`5432`) | SQLite / Ephemeral | `honeyshield-staging-postgres` (`5433`) | Managed HA RDS / PG17 |
| **Redis** | `honeyshield-redis` (`6379`) | In-memory fallback | `honeyshield-staging-redis` (`6380`) | Redis Cluster / AOF |
| **Log Level** | `DEBUG` | `WARNING` | `INFO` | `INFO` / `WARNING` |
| **CORS Origins** | `http://127.0.0.1:5173` | Local test origin | `http://127.0.0.1:5174` | Whitelisted FQDN only |
| **Debug Mode** | `true` | `false` | `false` | **`false` (Strictly Enforced)** |

---

## 3. Web Server & Process Model Standards

1. **Frontend Hosting:**
   - **Vite Development Server is NOT supported in production.**
   - In production, compiled static artifacts in `frontend/dist/` must be served by Nginx or a hardened edge CDN with gzip/brotli compression and browser caching (`Cache-Control: max-age=31536000, immutable` for hashed assets in `assets/`).
2. **Backend Application Workers:**
   - FastAPI is executed using Uvicorn under standard process supervision (Systemd or Docker container restart policy `unless-stopped`).
   - Production concurrency formula: `WORKERS = (2 * CPU_CORES) + 1` (minimum 2 workers).
   - Graceful termination timeout: 30 seconds allowing in-flight outbox transactions to complete.
