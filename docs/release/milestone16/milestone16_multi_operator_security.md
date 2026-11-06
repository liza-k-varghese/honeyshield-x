# Milestone 16 — Multi-Operator Security & Case Segregation Audit

## 1. Multi-Operator Tenancy Model
In high-tempo SOC operations, multiple analysts, responders, and auditors collaborate concurrently. Security requirements dictate:
- Strict segregation between private investigation cases (e.g., internal insider threat cases) and general team cases.
- Separation of duties between `viewer` (read telemetry), `analyst` (triage alerts, annotate cases), `lead_analyst` (manage cases, run deep hunts), and `admin` (system config, device management).

## 2. Hardening Measures Implemented
In `backend/app/routers/investigation.py` and `backend/app/cases/service.py`:
1. **Private Case Segregation:**
   - Cases carry a `visibility` property (`"team"` vs `"private"`).
   - If `visibility == "private"`, non-owner, non-admin analysts requesting case details receive `403 Forbidden` (`"Access denied: Private case"`).
2. **Object-Level Action Authorization:**
   - Attempting to attach evidence requires `case:update` or `case:respond` (`test_11`).
   - Attempting to create saved hunts requires `hunt:create` (`test_12`).
   - Read-only viewers attempting state mutations are rejected with HTTP 403.

## 3. Empirical Test Validation
- Verified in `backend/tests/test_milestone16_forensics_and_reconciliation.py`:
  - `test_09_private_case_segregation_and_peer_blocking` (Peer analyst blocked from private case).
  - `test_11_role_based_access_control_viewer_restrictions` (Viewer blocked from attaching evidence).
  - `test_12_saved_hunt_creation_permission_enforcement` (Viewer blocked from saving threat hunt).

