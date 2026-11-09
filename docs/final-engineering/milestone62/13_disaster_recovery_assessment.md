# DISASTER RECOVERY & RESILIENCE ASSESSMENT

**Architecture Reference:** Monotonic Transactional Outbox + Redis Failover  
**Release Gate:** G36, G37  

---

## 1. RTO & RPO TARGETS

| Parameter | Target | Architectural Mechanism |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **0 seconds** | Synchronous ACID commits in PostgreSQL 17 transactional outbox table (`security_event_outbox`). |
| **Recovery Time Objective (RTO)** | **< 30 seconds** | Stateless FastAPI instances resume processing immediately upon restart; replay events from last outbox cursor. |

---

## 2. COMPONENT FAILURE MATRIX & RECOVERY

### 1. Backend API Process Crash:
- **Impact:** Active HTTP requests fail; WebSockets drop.
- **Recovery:** Process manager (systemd/Kubernetes) restarts container. Frontend automatically initiates reconnect loop with exponential backoff (1s -> 2s -> 4s -> 8s) and recovers stream cursor using `outbox.cursor.#XXXX`.

### 2. Redis 7 Cache Restart:
- **Impact:** Temporary interruption of pub/sub broadcasts.
- **Recovery:** PostgreSQL stores all outbox events durably. Backend event bridge automatically reconnects to Redis and resumes streaming from the database.

### 3. Database Primary Failover:
- **Impact:** Read/write paused during failover (5–10s).
- **Recovery:** Connection pool detects connection loss and reconnects to new primary. Transaction rollback ensures zero corrupted partial events.

---

## 3. DATABASE BACKUP PROCEDURE

```bash
# Periodic snapshot backup
pg_dump -h 127.0.0.1 -U honeyshield -Fc honeyshield > /backups/honeyshield_$(date +%Y%m%d_%H%M%S).dump

# Point-in-time recovery (WAL archiving enabled in production)
```
