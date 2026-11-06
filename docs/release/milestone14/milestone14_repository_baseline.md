# Milestone 14 — Authoritative Repository Baseline & Source Inventory

**Document ID:** `HSX-DOC-M14-002`  
**Classification:** Configuration Management & Source Baseline  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Source Tree & Git State

- **Repository Root:** `/home/liza/HoneyShield-X`
- **Active Branch:** `main` (tracked to `origin/main`)
- **HEAD Commit:** `7ad33c6`
- **Host OS:** Parrot OS Linux 6.12.33 / KDE Plasma 6.3.2 / Wayland
- **Current Reported Release Candidate:** `v1.0.0-rc5`

---

## 2. Toolchain Inventory

| Tool / Runtime | Version | Status | Purpose |
|:---|:---|:---:|:---|
| **Python** | 3.13.5 (`backend/.venv`) | Verified | FastAPI backend, detection engine, threat intel |
| **Node.js** | 20.19.2 | Verified | Web SOC build and test execution |
| **npm** | Project-local binaries | Verified | `frontend/node_modules/.bin/*` utilized |
| **TypeScript** | 5.0+ | Verified | Frontend and mobile type systems |
| **Vite** | 5.0.3 | Verified | Web SOC bundling and minification |
| **Vitest** | 4.0.8 | Verified | Frontend unit/component test execution |
| **Pytest** | 9.1.1 | Verified | Backend end-to-end and security tests |
| **Java JDK** | OpenJDK 25.0.4.1 | Installed | Host Java runtime |
| **Android SDK / ADB**| Missing from PATH | **BLOCKED** | Android native packaging toolchain absent on host |

---

## 3. Subsystem Source Mapping

| Subsystem Name | Directory Path | Tech Stack | Status |
|:---|:---|:---|:---:|
| **System 1: SOC Detection** | `backend/app/routers/attacks.py`, `backend/app/routers/alerts.py` | FastAPI, SQLAlchemy | Verified |
| **System 2: Honeypots & Deception** | `backend/app/routers/honeypots.py`, `backend/app/routers/canaries.py` | Cowrie, Dionaea, HoneyWeb | Verified |
| **System 3: Threat Intelligence** | `backend/app/routers/threat_intel.py`, `backend/app/services/threat_correlation.py` | STIX 2.1, TAXII | Verified |
| **System 4: Digital Agent Universe**| `frontend/src/components/cyber/AgentUniverse.tsx`, `frontend/src/components/agents/` | React 19, Canvas, SVG | Verified |
| **System 5: Mobile SOC Companion** | `mobile/src/screens/`, `mobile/src/services/` | React Native, Expo | TypeScript OK (Native Build Blocked) |
| **Event Outbox & Bus** | `backend/app/events/store.py`, `backend/app/events/service.py` | PostgreSQL Outbox, Redis PubSub | Verified |
| **Authentication & RBAC** | `backend/app/auth/`, `backend/app/core/rbac.py` | JWT, Redis Denylist | Verified |

---

## 4. Database Models & Schema State

The persistent database layer (`backend/app/models.py`) defines 14 core entities:
- `Attack` (id, attack_type, source_ip, destination_ip, protocol, severity, risk_score, status, detected_at)
- `Alert` (id, alert_type, severity, message, status, attack_id, timestamp)
- `SecurityEventOutbox` (cursor, event_id, event_type, payload, status, created_at)
- `CanaryToken` (id, token_id, token_type, name, memo, triggered, triggered_at)
- `ThreatIndicator` (id, indicator, indicator_type, threat_actor, confidence, status)
- `User` (id, username, hashed_password, role, is_active)
- `DeviceSession` (id, device_fingerprint, user_id, public_key, is_revoked, paired_at)
- Associated Incident, Sensor, and Audit models.

