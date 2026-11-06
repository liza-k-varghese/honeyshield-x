# Milestone 13 — Offline Resilience, Local Caching & Reconnection Recovery

**Document ID:** `HSX-DOC-M13-017`  
**Classification:** Client Architecture & Fault Tolerance  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `mobile/src/services/offlineSync.ts`, `frontend/src/services/apiClient.ts`

---

## 1. Offline Philosophy & Threat Boundaries

During field operations, mobile analysts or SOC operators may enter network dead zones, tunnels, or high-RF interference areas. The client must preserve operational context while strictly preventing unsanctioned or unverified actions.

### Core Resilience Principles:
1. **Persistent Read-Only Cache:** Previously loaded alerts, agent states, and threat intelligence entries remain visible offline via encrypted device storage (SQLite / MMKV).
2. **Prominent Offline Warning Banner:** A high-contrast amber banner (`STATUS: OFFLINE — CACHED VIEW ONLY`) spans the top of the interface.
3. **Strict Mutation Lockdown:** Operators **cannot** acknowledge alerts, trigger containment playbooks, or modify security configurations while offline. Mutating buttons are disabled with tooltip: `"Network connection required for containment actions"`.
4. **Reconnection Catch-Up:** Upon network restoration, the client resumes streaming via the PostgreSQL transactional outbox using `Last-Event-ID` / cursor replay, ensuring zero missed events.

---

## 2. Reconnection & Outbox Catch-Up Flow

```
Mobile Client                           FastAPI Ingestion Gateway               PostgreSQL Outbox
      |                                              |                                 |
      |=== Network Connection Lost =================|                                 |
      |    (Displays Amber Offline Banner)           |                                 |
      |    (Disables Containment Controls)           |                                 |
      |                                              |                                 |
      |                                              |<-- Attacks Ingested (4, 5, 6)---|
      |                                              |--- Stored in Outbox ------------>|
      |                                              |                                 |
      |=== Network Restored =========================|                                 |
      |--- 1. Connect WS / SSE with since_cursor=3 ->|                                 |
      |                                              |--- 2. Fetch Cursors > 3 ------->|
      |                                              |<-- 3. Return Events 4, 5, 6 ----|
      |<-- 4. Replay Missed Events (4, 5, 6) --------|                                 |
      |                                              |                                 |
      |=== 5. UI Updates to Latest State ============|                                 |
      |    (Removes Amber Banner, Enables Controls)  |                                 |
```

---

## 3. Verification & Validation Evidence

Tested across frontend and backend integration suites:
- Validated cursor catch-up from arbitrary checkpoint (`since_cursor=2` caught up through current head `cursor=4`).
- Confirmed mutation endpoints return HTTP `400` / `409` if client session timestamp is out of sync.
- Zero data corruption or memory leaks during rapid simulated offline/online toggling in Vitest.

