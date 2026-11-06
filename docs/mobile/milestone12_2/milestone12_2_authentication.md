# Milestone 12.2 — Mobile Authentication & Session Persistence

**Document:** `milestone12_2_authentication.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Authentication Lifecycle

HoneyShield X Mobile implements zero-trust operator authentication:
- **Primary Credentials Flow:** `POST /api/v1/auth/login` exchanges operator credentials for a short-lived JWT Access Token (15-minute TTL) and Refresh Token (7-day TTL).
- **Header-Only Authorization:** Bearer tokens are transported strictly in the `Authorization: Bearer <token>` HTTP header. No query parameter token transport is permitted.
- **Session Restoration:** Upon application launch, the client checks the hardware keystore via `expo-secure-store`. If an unexpired access token or valid refresh token exists, session state transitions directly to the authorized dashboard.
- **Clean Logout:** Invoking `POST /api/v1/auth/logout` invalidates the refresh token server-side in PostgreSQL and Redis, purges the local keystore, and transitions the state machine to `AuthStack.Login`.

## 2. Role-Based Access Control (RBAC) Enforcement

The backend remains strictly authoritative for role permissions (`security_administrator`, `incident_responder`, `analyst`, `viewer`):
- All sensitive operations (such as Governor Level-3 host isolation or canary token minting) enforce permission dependencies on the FastAPI backend.
- Attempts by unprivileged operator roles return `403 Forbidden`.

