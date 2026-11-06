# Milestone 7 — Staging Architecture & Isolation Design

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-05  

---

## 1. Staging Isolation Strategy

To satisfy strict release engineering and QA acceptance criteria without risk to production or live SOC operations, an isolated staging environment is specified via `docker/docker-compose.staging.yml`.

### Port Allocation & Network Segregation

| Component | Production Port | Staging Port | Binding Policy |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 17** | `5432` | `5433` | Loopback `127.0.0.1` only |
| **Redis 7** | `6379` | `6380` | Loopback `127.0.0.1` only |
| **FastAPI Backend** | `8000` | `8001` | Loopback `127.0.0.1` only |
| **Vite Frontend (Nginx)**| `5173` | `5174` | Loopback `127.0.0.1` only |

> [!IMPORTANT]
> The staging environment utilizes a dedicated Docker bridge network (`honeyshield_staging_net`) and named volumes (`staging_pg_data`, `staging_redis_data`). No staging service is attached to or shares disk state with production.

---

## 2. Docker Compose Staging Definition

Located at `docker/docker-compose.staging.yml`:
- **Backend Service:** Runs non-root Uvicorn container built from `docker/Dockerfile.backend`.
- **Frontend Service:** Runs multi-stage build Nginx alpine container built from `docker/Dockerfile.frontend`.
- **Postgres Service:** Configured with dedicated database `honeyshield_staging` and staging user credentials.
- **Redis Service:** Configured with isolated Redis database `db 1`.

### Health Check Policies
- PostgreSQL: `pg_isready -U honeyshield_staging -d honeyshield_staging` (interval: 10s, retries: 5).
- Redis: `redis-cli ping` (interval: 10s, retries: 5).
- Backend: `curl -f http://127.0.0.1:8000/health` (interval: 10s, retries: 5).

---

## 3. Configuration Management

Environment variables for staging are managed via `config/.env.staging.example`.
Key variables:
- `DATABASE_URL=postgresql://staging_user:staging_secret_placeholder@staging-postgres:5432/honeyshield_staging`
- `REDIS_URL=redis://:staging_redis_placeholder@staging-redis:6379/1`
- `JWT_SECRET_KEY=<staging_only_random_256bit_hex>`
- `ENV_MODE=staging`
- `DEBUG=false`

