# Milestone 12 — Mobile Device Management & Revocation Protocol

**Document:** `milestone12_device_management.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Registered Device Lifecycle

Mobile devices authorized via QR pairing are tracked in the database and manageable through the `DeviceManagementScreen` and Web SOC interface:
- **Device Attributes:**
  - `device_id`: Unique cryptographic identifier.
  - `device_name`: Human-readable label (e.g., "SOC-Field-Unit-Alpha").
  - `platform`: `android` (SDK target 34).
  - `paired_at`: ISO 8601 UTC timestamp.
  - `last_seen_at`: Monotonically updated on every authenticated ping or courier sync.
  - `status`: `ACTIVE`, `SUSPENDED`, or `REVOKED`.

## 2. Instant Revocation Protocol

When a security operator revokes a device via `DELETE /api/v1/auth/devices/{id}/revoke`:
1. The backend sets `status = 'REVOKED'` and writes a revocation record to the PostgreSQL audit table.
2. The device token is placed on the Redis revocation blacklist.
3. Active WebSockets and SSE streams for the target device are severed immediately.
4. If a revoked mobile device attempts any subsequent API request, it receives `403 Forbidden: Device Revoked`.
5. Upon receiving the revocation status, the mobile application wipes its hardware keystore, clears offline caches, and transitions to the unauthenticated login screen.

