# Milestone 12 — Mobile Authentication Architecture & Session Security

**Document:** `milestone12_authentication.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Authentication Flow

HoneyShield X Mobile provides dual-path authentication:
1. **Direct Operator Authentication:**
   - Transport: TLS 1.3 encrypted HTTPS `POST /api/v1/auth/login`.
   - Payload: Operator identifier + password.
   - Response: Short-lived JWT Access Token (15-minute TTL) and Refresh Token (7-day TTL).
   - In-flight Protection: Bearer tokens transported strictly in HTTP Authorization headers, never in URL parameters.
2. **Secure QR Device Pairing Flow:**
   - Desktop SOC initiates pairing request with admin step-up approval.
   - High-entropy cryptographic payload encoded in QR code.
   - Mobile camera scans QR, performs device fingerprint attestation, and receives hardware-bound access token.

## 2. Session Refresh & Auto-Re-authentication

- Tokens are automatically refreshed prior to expiration via background interceptor.
- If refresh token expires or is revoked via `DELETE /api/v1/auth/devices/{id}/revoke`, the client immediately wipes secure memory, tears down WebSocket connections, and transitions state machine to `AuthStack.Login`.

