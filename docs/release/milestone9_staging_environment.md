# Milestone 9 — Staging Environment & Isolation Architecture

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Date:** 2026-11-06  
**Auditor:** DevSecOps & Infrastructure Lead  

---

## 1. Staging Topology & Isolation

The staging environment is designed to provide full-fidelity emulation of production while maintaining strict network, port, and credential isolation from production infrastructure.

```
+---------------------------------------------------------------+
|                       HOST: Parrot OS                         |
|                                                               |
|   +-------------------------------------------------------+   |
|   |          ISOLATED STAGING COMPOSE STACK               |   |
|   |                                                       |   |
|   |   +-------------------+       +-------------------+   |   |
|   |   | staging-frontend  |       |  staging-backend  |   |   |
|   |   | Port: 5174        |       |  Port: 8001       |   |   |
|   |   +---------+---------+       +---------+---------+   |   |
|   |             |                           |             |   |
|   |             +-------------+-------------+             |   |
|   |                           |                           |   |
|   |   +-------------------+   |   +-------------------+   |   |
|   |   |   staging-db      |<--+-->|   staging-redis   |   |   |
|   |   |  PostgreSQL 17    |       |  Redis 7          |   |   |
|   |   |  Port: 5433       |       |  Port: 6380       |   |   |
|   |   +-------------------+       +-------------------+   |   |
|   +-------------------------------------------------------+   |
|                                                               |
|   PROD PORTS (UNTOUCHED): 5173 (FE), 8000 (BE), 5432 (PG),    |
|                          6379 (REDIS)                         |
+---------------------------------------------------------------+
```

---

## 2. Configuration Parameters

| Service | Staging Port | Dedicated Network | Persistence Volume | Environment Template |
|:---|:---:|:---:|:---:|:---|
| **Frontend** | `127.0.0.1:5174` | `honeyshield-staging-net` | Ephemeral | `config/.env.staging.example` |
| **FastAPI Backend** | `127.0.0.1:8001` | `honeyshield-staging-net` | Host mount | `config/.env.staging.example` |
| **PostgreSQL 17** | `127.0.0.1:5433` | `honeyshield-staging-net` | `staging_pg_data` | `docker/docker-compose.staging.yml` |
| **Redis 7** | `127.0.0.1:6380` | `honeyshield-staging-net` | `staging_redis_data` | `docker/docker-compose.staging.yml` |

---

## 3. Staging Verification Checks

1. **Zero Production Collisions:**
   - Database connects to staging port `5433` using dedicated database `honeyshield_staging`.
   - Redis connects to staging port `6380`.
   - Staging network is isolated bridge `172.28.0.0/16`.
2. **Environment Variable Injection:**
   - Staging secrets are isolated from `.env.production`.
   - Health checks verify `127.0.0.1:8001/api/v1/system/health/detailed` within 100ms.

