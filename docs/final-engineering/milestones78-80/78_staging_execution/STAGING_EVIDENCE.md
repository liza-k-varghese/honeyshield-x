# HONEYSHIELD X — MILESTONES 78–80: STAGING EVIDENCE DOSSIER
## EMPIRICAL ARTIFACTS, CONFIGURATION VALIDATION OUTPUTS & PREFLIGHT LOGS

**Document ID:** `HSX-M78-EVIDENCE`  
**Application:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Target Release:** `v1.0.0` (Current Release Candidate: `v1.0.0-rc5`)  
**Date:** 2026-11-09  

---

### 1. Evidence Artifact 1: Staging Compose Configuration Validation

Command executed:
```bash
docker compose -f docker/docker-compose.staging.yml config
```
Exit Code: **`0`**

#### Normalized Declarative Configuration Output:
```yaml
name: honeyshield-staging
services:
  backend-staging:
    build:
      context: /home/liza/HoneyShield-X/backend
      dockerfile: ../docker/Dockerfile.backend
    container_name: honeyshield-staging-backend
    depends_on:
      postgres-staging:
        condition: service_healthy
        required: true
      redis-staging:
        condition: service_healthy
        required: true
    deploy:
      resources:
        limits:
          cpus: 1.5
          memory: "1610612736"
    environment:
      DATABASE_URL: postgresql+psycopg://honeyshield_staging_user:staging_secure_pass_change_me@postgres-staging:5432/honeyshield_staging
      DEBUG: "false"
      ENVIRONMENT: staging
      REDIS_HOST: redis-staging
      REDIS_PORT: "6379"
      SECRET_KEY: staging_secret_key_placeholder_min_32
    healthcheck:
      test:
        - CMD-SHELL
        - curl -f http://127.0.0.1:8000/api/v1/health || exit 1
      timeout: 5s
      interval: 10s
      retries: 3
    networks:
      honeyshield_staging_net: null
    ports:
      - mode: ingress
        host_ip: 127.0.0.1
        target: 8000
        published: "8001"
        protocol: tcp
    restart: unless-stopped
  frontend-staging:
    build:
      context: /home/liza/HoneyShield-X/frontend
      dockerfile: ../docker/Dockerfile.frontend
    container_name: honeyshield-staging-frontend
    depends_on:
      backend-staging:
        condition: service_started
        required: true
    deploy:
      resources:
        limits:
          cpus: 0.5
          memory: "536870912"
    networks:
      honeyshield_staging_net: null
    ports:
      - mode: ingress
        host_ip: 127.0.0.1
        target: 80
        published: "5174"
        protocol: tcp
    restart: unless-stopped
  postgres-staging:
    container_name: honeyshield-staging-postgres
    deploy:
      resources:
        limits:
          cpus: 1
          memory: "1073741824"
    environment:
      POSTGRES_DB: honeyshield_staging
      POSTGRES_PASSWORD: staging_secure_pass_change_me
      POSTGRES_USER: honeyshield_staging_user
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U honeyshield_staging_user -d honeyshield_staging
      timeout: 3s
      interval: 5s
      retries: 5
    image: postgres:17-alpine
    networks:
      honeyshield_staging_net: null
    ports:
      - mode: ingress
        host_ip: 127.0.0.1
        target: 5432
        published: "5433"
        protocol: tcp
    restart: unless-stopped
    volumes:
      - type: volume
        source: staging_postgres_data
        target: /var/lib/postgresql/data
        volume: {}
  redis-staging:
    command:
      - redis-server
      - --appendonly
      - 'yes'
    container_name: honeyshield-staging-redis
    deploy:
      resources:
        limits:
          cpus: 0.5
          memory: "536870912"
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      timeout: 3s
      interval: 5s
      retries: 5
    image: redis:7-alpine
    networks:
      honeyshield_staging_net: null
    ports:
      - mode: ingress
        host_ip: 127.0.0.1
        target: 6379
        published: "6380"
        protocol: tcp
    restart: unless-stopped
    volumes:
      - type: volume
        source: staging_redis_data
        target: /data
        volume: {}
networks:
  honeyshield_staging_net:
    name: honeyshield-staging_honeyshield_staging_net
    driver: bridge
volumes:
  staging_postgres_data:
    name: honeyshield-staging_staging_postgres_data
  staging_redis_data:
    name: honeyshield-staging_staging_redis_data
```

---

### 2. Evidence Artifact 2: Preflight Verification Log

Command executed:
```bash
./scripts/staging_preflight_and_launcher.sh --check-only
```
Exit Code: **`0`**

#### Execution Log:
```text
======================================================================
HONEYSHIELD X — STAGING PREFLIGHT VERIFICATION
======================================================================
[INFO] Verifying repository root...
[PASS] Working directory verified: /home/liza/HoneyShield-X
[INFO] Verifying resource isolation boundaries...
[PASS] Isolation verified: Distinct volumes and separate network confirmed.
[INFO] Checking port availability...
[PASS] All staging ports (5174, 8001, 5433, 6380) are free.
[INFO] Verifying production frontend distribution...
[PASS] Production frontend distribution ready in frontend/dist.
[INFO] Inspecting container engine availability...
[WARN] docker binary is installed, but daemon socket is not responding.
[WARN] Notice: In sandboxed agent environments, /run/user/1000/podman/podman.sock is isolated.
[WARN] Host operator must run this script from a native terminal session with container access.
----------------------------------------------------------------------
[WARN] PREFLIGHT COMPLETE (WITH CONTAINER DAEMON WARNING):
[WARN] Declarative Compose configuration and ports are 100% verified.
[WARN] Host terminal execution is required to launch containers.
======================================================================
```

---

### 3. Evidence Artifact 3: Socket Availability & Sandbox Isolation Diagnostic

Command executed:
```bash
which docker podman; id; env | grep -E "DOCKER|PODMAN|XDG_RUNTIME_DIR"; ls -la /run /run/user 2>&1
```
Exit Code: **`2`**

#### Diagnostic Output:
```text
/bin/docker
/bin/podman
uid=1000(liza) gid=1002(liza) groups=1002(liza),65534(nogroup)
XDG_RUNTIME_DIR=/run/user/1000
DOCKER_HOST=unix:///run/user/1000/podman/podman.sock
ls: cannot access '/run/user': No such file or directory
/run:
total 0
dr-xr-xr-x  2 liza liza  40 Nov  9 06:53 .
dr-xr-xr-x 17 liza liza 340 Nov  9 06:53 ..
```

---

### 4. Evidence Artifact 4: Port Conflict Audit

Verification command:
```bash
ss -tlpn '( sport = :5174 or sport = :8001 or sport = :5433 or sport = :6380 )'
```
Exit Code: **`0`** (Empty output, confirming zero port collisions on loopback).
