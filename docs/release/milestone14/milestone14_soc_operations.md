# Milestone 14 — SOC Command Center Operations, Alert Triage & Incident Life Cycle

**Document ID:** `HSX-DOC-M14-006`  
**Classification:** Security Operations Center Engineering  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. SOC Dashboard & Metrics Integrity

The HoneyShield X SOC Command Center provides unified visibility into attack vectors, active incidents, sensor status, and digital agent telemetry.

### Metrics Integrity Guarantee:
1. **Zero Client Synthetic Fabrication:** All dashboard counts (`Total Attacks`, `Critical Alerts`, `Active Sensors`, `Backlog`) are derived directly from SQL queries against PostgreSQL.
2. **Explicit Operational States:** Widgets strictly render state machines covering:
   - `LOADING`: Initial request pending.
   - `READY`: Hydrated from backend.
   - `EMPTY`: Zero records exist (honest display).
   - `DEGRADED`: Partial upstream response.
   - `OFFLINE`: Network disconnected (prominent amber banner).
   - `UNAUTHORIZED`: HTTP 401/403.
   - `UNKNOWN`: Missing data never silently rendered as `0`.

---

## 2. Alert Triage Workflow & State Machine

Alerts transition through deterministic operational phases:
$$\text{DETECTED} \longrightarrow \text{INVESTIGATING} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{CONTAINED} \longrightarrow \text{RESOLVED}$$

- **Triage Actions:** Operators can inspect full payload metadata, link alerts to parent cases, add timestamped analyst notes, and trigger dry-run containment playbooks.
- **Concurrency & Locking:** Row-level versioning prevents multi-operator race conditions. An incident claimed by Operator A immediately shows as locked/in-review to Operator B across Web and Mobile clients.

---

## 3. Incident Management & SOAR Integration

- **Case Playbooks:** Automated playbook suggestions (`PB-01` to `PB-04`) present analysts with containment steps (IP null-routing, decoy redeployment, credential revocation).
- **Dry-Run Enforcement:** In staging and development environments, playbook executions remain strictly simulated (zero host network/firewall tampering).
- **Audit Logging:** Every status change, note entry, and triage decision records the operator ID, client IP, and UTC timestamp.

