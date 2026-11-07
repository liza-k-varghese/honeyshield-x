# HoneyShield X — Milestone 18: Mobile Authentication & KeyStore Security

## 1. Authentication Architecture
The mobile application interfaces with the HoneyShield X distributed authentication system (`app/auth/`):
1. **Operator Login:** Authenticates username and password against `/api/v1/auth/login`.
2. **Ephemeral Token Generation:** Issues high-entropy bearer session tokens with configurable TTL (default 8 hours).
3. **Hardware Storage:** Tokens are encrypted in Android Keystore using AES-256-GCM via `expo-secure-store` / `SecurityEnclaveHelper.java`.
4. **Account Lockout:** Enforces 5-failure / 15-minute lockout policy across all clients.
5. **Session Revocation:** Administrative revocation instantly drops active mobile sessions and terminates WebSocket connections.

## 2. Test Verification
- Verified in `backend/tests/test_milestone17_sdk_recovery_and_defense.py`:
  - `test_10_device_revocation_and_token_invalidation`: **PASSED**
  - `test_11_role_based_access_control_mutation_barriers`: **PASSED**
- Verified in `backend/tests/test_milestone11_distributed_hardening.py`:
  - 10/10 distributed session and token revocation tests: **PASSED**

