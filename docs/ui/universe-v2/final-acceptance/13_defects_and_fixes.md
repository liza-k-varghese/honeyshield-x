# HoneyShield X — Milestone 19.4: Defects Remediated & Fix Register
## Milestone 19.4 + RC5 Final Acceptance

This register documents genuine defects identified and corrected during the final acceptance audit:

---

### Defect Register & Resolution Log

#### 1. DEF-194-01: TypeScript Unresolved Symbol `failedPackets`
- **Component:** `frontend/src/components/UniverseCommandCenter.tsx`
- **Symptom:** `tsc -b` failed with TS2552: `Cannot find name 'failedPackets'. Did you mean '_failedPackets'?`
- **Root Cause:** When props destructuring previously aliased `failedPackets: _failedPackets = []`, lines 1545 and 1626 referenced the unaliased identifier in the expanded 12-tile operator diagnostics panel.
- **Resolution:** Updated props destructuring to `failedPackets = []` directly, allowing the diagnostics panel and clipboard exporter to read `failedPackets.length`.
- **Verification:** `tsc -b` completed with 0 errors.

#### 2. DEF-194-02: Vite Proxy Missing WebSocket Upgrade (`ws: true`)
- **Component:** `frontend/vite.config.ts`
- **Symptom:** WebSocket connections to `ws://127.0.0.1:5173/api/v1/events/ws?ticket=...` failed or fell back to polling when proxied through Vite.
- **Root Cause:** The `/api` proxy definition lacked the `ws: true` attribute required by Vite / `http-proxy` to handle HTTP 101 Switching Protocols upgrade handshakes.
- **Resolution:** Added `ws: true` to `/api` proxy rule in `vite.config.ts`.
- **Verification:** `milestone6_1_secure_streaming.test.tsx` passed 7/7 tests; WebSocket client connects cleanly.

#### 3. DEF-194-03: `RealtimeAgentWebSocketClient` Missing `this.apiBaseUrl` Protocol Translation
- **Component:** `frontend/src/digital-agents/engine/RealtimeAgentWebSocketClient.ts`
- **Symptom:** When instantiated with an explicit `apiBaseUrl` (e.g. `http://127.0.0.1:8000`), the client defaulted to `window.location.host` instead of translating `apiBaseUrl` to `ws://` / `wss://`.
- **Root Cause:** The WebSocket URL constructor unconditionally used `window.location.host`.
- **Resolution:** Updated URL constructor to check `this.apiBaseUrl`:
  ```ts
  if (this.apiBaseUrl) {
    const baseWs = this.apiBaseUrl.replace(/^http/, 'ws');
    wsUrl = `${baseWs}/api/v1/events/ws?ticket=${ticket}`;
  }
  ```
- **Verification:** Unit tests and integration client connect reliably in both direct and proxied configurations.

#### 4. DEF-194-04: Test Suite PostgreSQL Coupling in Unit Tests
- **Component:** `backend/tests/test_alerts.py`, `test_pipeline.py`, `test_threat_intelligence.py`
- **Symptom:** Running tests without a live PostgreSQL server caused `sqlalchemy.exc.OperationalError: connection to 127.0.0.1:5432 failed: Connection refused`.
- **Root Cause:** Tests imported `SessionLocal()` which defaulted to PostgreSQL connection strings unless overridden.
- **Resolution:** Standardized SQLite file fallback via `DATABASE_URL="sqlite:////tmp/honeyshield_test.db"`, auto-initializing tables with `Base.metadata.create_all(bind=engine)`.
- **Verification:** 45 test cases across 4 legacy test suites passed with 100% success rate without requiring PostgreSQL daemon.

#### 5. DEF-194-05: Timestamp Type Mismatch in Live Showcase Script
- **Component:** `scripts/verify_milestone19_4_live_showcase.py`
- **Symptom:** `AttributeError: 'str' object has no attribute 'isoformat'` during evidence export.
- **Root Cause:** Event envelope timestamps were already formatted as strings by the serialization engine.
- **Resolution:** Wrapped with `str(t.timestamp)` to safely handle both `str` and `datetime` types.
- **Verification:** Script completed with exit code 0 and generated valid evidence JSON.

