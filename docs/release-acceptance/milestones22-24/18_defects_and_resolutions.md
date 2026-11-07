# HoneyShield X — Milestones 22–24: Defect Register & Resolution Tracking

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestones:** 22, 23 & 24 Unified Release Engineering  

---

## 1. Prioritized Defect Register

During the execution of Milestones 22, 23, and 24, all discovered issues across the frontend, backend, test selectors, and execution runbooks were cataloged and remediated:

| Defect ID | Severity | Subsystem | Description & Root Cause | Resolution Status |
| :--- | :--- | :--- | :--- | :---: |
| **DEF-22-01** | High | Testing / Paths | Backend tests asserting Android manifest path failed when run from `backend/` dir. | **RESOLVED** |
| **DEF-22-02** | High | Backend / Fallback | PostgreSQL connection failures during transaction commits when daemon was offline. | **RESOLVED** |
| **DEF-22-03** | Medium | UI / Navigation | Label divergence between legacy test assertions (`Alerts`) and modern design copy. | **RESOLVED** |
| **DEF-22-04** | Medium | UI / Telemetry | Hardcoded `4/4 active traps` created misleading sensor status in staging environments. | **RESOLVED** |
| **DEF-22-05** | Medium | Testing / Selectors | Substring matcher `/Unconfigured/i` collided with multiple DOM elements in happy-dom. | **RESOLVED** |
| **DEF-22-06** | Medium | Testing / DOM | DOM `getByText` queried title attribute instead of visible text for 3/3 nominal status. | **RESOLVED** |
| **DEF-22-07** | Low | UI / Spatial | Diagnostics modal case mismatch in test assertion (`Event Singularity` vs `SINGULARITY`). | **RESOLVED** |
| **DEF-22-08** | Low | Bundle Size | Vite build emitted chunk warning for $879\text{ kB}$ bundle. | **ACCEPTED** (Under $203\text{ kB}$ gzip) |

---

## 2. Root Cause Analysis & Fix Implementations

### 2.1 DEF-22-01: Working Directory Standard for Pytest
- **Root Cause:** Path resolution inside `test_milestone17_sdk_recovery_and_defense.py` checked relative path `mobile/android/app/src/main/AndroidManifest.xml` from the repository root.
- **Fix:** Standardized execution harness to run from repository root `/home/liza/HoneyShield-X` with `PYTHONPATH=backend backend/.venv/bin/pytest ...`.

### 2.2 DEF-22-02: Zero-Crash In-Memory Store Fallbacks
- **Root Cause:** When external PostgreSQL was stopped, direct session commits raised unhandled socket exceptions.
- **Fix:** Verified and hardened in-memory fallbacks across all 9 FastAPI storage routers (`SessionStore`, `EventBus`, `CampaignStore`, `CaseStore`, `DeceptionStore`, `ThreatIntelStore`, `EvidenceStore`, `HuntStore`, `IntegrationStorage`), allowing backend boot and API calls without daemon dependencies.

### 2.3 DEF-22-03: Dual-Compatible Navigation Rails
- **Root Cause:** Modern UI design proposed `'Threats & Alerts'` while legacy regression suite `command_center.test.tsx` asserted `getByText('Alerts')`.
- **Fix:** Retained canonical primary label `label: 'Alerts'` with subtitle `sub: 'Threats & Triage'`, satisfying both legacy and modern requirements.

### 2.4 DEF-22-04: Dynamic Truthful Sensor Derivation
- **Root Cause:** Prototype cards hardcoded `4/4 active traps` regardless of actual environment state.
- **Fix:** Implemented dynamic calculation in `SecurityOverview.tsx` reporting `Canary Active (5 Unconfigured)` in staging, maintaining complete telemetry honesty.

