# Milestone 12.2 — Mobile Device Management & Instant Revocation

**Document:** `milestone12_2_device_revocation.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Device Enrollment & Fleet Management

Paired mobile terminals are registered as first-class operational assets:
- Operators can view all active mobile terminals via the web SOC and mobile `DeviceManagementScreen.tsx`.
- Attributes tracked: `device_id`, `device_name`, `platform`, `paired_at`, `last_seen_at`, and `status`.

## 2. Distributed Revocation Enforcement

When an administrator revokes a device via `DELETE /api/v1/auth/devices/{id}/revoke`:
1. The backend sets device status to `REVOKED` in PostgreSQL.
2. The device identifier and token hash are added to the Redis revocation blacklist.
3. Active WebSocket connections and SSE streaming connections for the device are immediately severed.
4. If a revoked device attempts any subsequent API call, FastAPI dependency filters return `403 Forbidden: Device Revoked`.
5. Upon receiving this response, the mobile app wipes its local keystore, clears offline caches, and redirects to the login screen.
6. Multi-worker consistency guarantees that the device cannot regain access by hitting another backend worker.

