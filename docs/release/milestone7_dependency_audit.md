# Milestone 7 — Dependency and Supply-Chain Review

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-05  

---

## 1. Frontend Dependency Inventory

Located in `frontend/package.json`:

### Production Runtime Dependencies (6 total)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `@tanstack/react-query` | `^5.66.0` | Server state management and caching |
| `clsx` | `^2.1.1` | Conditional CSS class merging |
| `lucide-react` | `^0.475.0` | SVG icons for SOC UI and characters |
| `react` | `^19.0.0` | Declarative UI framework |
| `react-dom` | `^19.0.0` | DOM rendering layer |
| `tailwind-merge` | `^3.0.1` | Tailwind class conflict resolution |

### Audit Findings
- Zero bloated external state libraries (Redux, MobX, etc.).
- Minimal attack surface with only 6 production packages.
- All dev dependencies (Vitest, Happy-DOM, PostCSS, Tailwind, TypeScript) are isolated and excluded from production bundle `frontend/dist`.

---

## 2. Backend Dependency Inventory

Located in `backend/requirements.txt`:
All 26 backend dependencies are pinned to specific, reproducible release tags:
- `fastapi==0.141.1`
- `pydantic==2.13.5`
- `SQLAlchemy==2.1.1`
- `alembic==1.20.0`
- `psycopg==3.3.6` & `psycopg-binary==3.3.6`
- `redis==8.1.0`
- `websockets==17.1`
- `uvicorn==0.54.0`
- `uvloop==0.22.1`

### Audit Findings
- All dependencies pinned with exact `==` specifiers to eliminate drifting transitive packages.
- No obsolete or abandoned packages detected.
- Clean separation between test runners (`pytest==9.1.1`) and production runtime dependencies.

