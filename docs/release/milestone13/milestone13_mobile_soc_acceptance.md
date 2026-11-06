# Milestone 13 — Mobile SOC Acceptance & Screen Architecture

**Document ID:** `HSX-DOC-M13-006`  
**Classification:** Internal Security Operations Standard  
**Release Candidate:** `v1.0.0-rc5`  
**Target Application:** `mobile/` (React Native / Expo)

---

## 1. Executive Summary

Milestone 13 enforces complete removal of synthetic UI mocks in the mobile client (`mobile/`). Every mobile screen, state machine, and data provider must bind directly to authentic REST endpoints (`/api/v1/*`) and authenticated real-time streaming transports (`/api/v1/stream/events`, `/api/v1/ws/events`).

In accordance with release gates, mobile UI code was verified across TypeScript compilation, navigation hierarchy, authentication gating, and real-time agent status telemetry.

---

## 2. Screen Architecture & Verification Matrix

The mobile platform incorporates 6 core operational views with real data binding:

| Screen Name | File Path | Route | Data Source / Endpoint | Mock Status |
|:---|:---|:---|:---|:---|
| **Incident Feed** | `mobile/src/screens/IncidentsScreen.tsx` | `/incidents` | `GET /api/v1/alerts`, `GET /api/v1/attacks` | Zero mock data. Real state reducer. |
| **Alert Details** | `mobile/src/screens/AlertDetailScreen.tsx` | `/incidents/:id` | `GET /api/v1/alerts/{id}`, `POST /acknowledge` | Server-confirmed state transitions. |
| **Agent Universe** | `mobile/src/screens/AgentsScreen.tsx` | `/agents` | `GET /api/v1/agents/status`, Event Stream | Live 4-agent status cards with hex themes. |
| **Sensor Grid** | `mobile/src/screens/SensorsScreen.tsx` | `/sensors` | `GET /api/v1/honeypots`, `GET /api/v1/canaries` | Real decoy node telemetry. |
| **QR Scanner** | `mobile/src/screens/PairingScreen.tsx` | `/pair` | Camera scanner + `POST /api/v1/devices/pair` | Strict single-use registration handshake. |
| **Settings / Auth**| `mobile/src/screens/SettingsScreen.tsx` | `/settings` | `POST /api/v1/auth/logout`, Session Store | Immediate token purge and Redis revocation. |

---

## 3. Real State Machine & Connection Management

1. **Authentication Redirection:**
   Unauthenticated app launch immediately routes to the login/pairing flow. No operational telemetry or sensitive SOC data is retained in unencrypted storage or displayed without a valid JWT session.
2. **Connection Status Pill:**
   The global navigation header displays a persistent connectivity indicator:
   - `CONNECTED (LIVE WS)` — Active authenticated WebSocket.
   - `FALLBACK (STREAM SSE)` — Operating under HTTP Authorization header-based SSE.
   - `OFFLINE (CACHED)` — Amber offline banner displayed. Mutations and containment actions are locked.
3. **Filter Bar & Search:**
   Severity filters (`critical`, `high`, `medium`, `low`) and status filters (`open`, `acknowledged`, `contained`) execute filtering across in-memory state hydrated from the backend outbox.
4. **Action Acknowledgement:**
   Operator actions (e.g., alert acknowledge, quarantine recommendation) require explicit tap confirmation and transmit step-up authenticated payloads to the backend API.

---

## 4. Verification Evidence

- **TypeScript Compilation:** Passed with 0 errors (`./frontend/node_modules/.bin/tsc --project mobile/tsconfig.json --noEmit`).
- **Code Audit:** No static JSON fixtures or hardcoded mock arrays present in production screens.
- **Contract Compatibility:** Verified against FastAPI schemas in `backend/app/schemas.py`.

