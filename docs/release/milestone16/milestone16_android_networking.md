# Milestone 16 — Android Network Security & Communication Architecture

**Project:** HoneyShield X — Android Mobile Networking  
**Milestone:** 16  
**Evaluation Date:** 2026-11-06  

---

## 1. Network Boundary Architecture

In the HoneyShield X mobile architecture:
- Android mobile clients communicate with the backend over strict HTTPS and authenticated WebSocket (`wss://`) channels.
- When WebSocket ticket acquisition fails (e.g. HTTP 503 or proxy restriction), the client automatically falls back to authenticated Server-Sent Events (SSE) streaming with authorization headers.
- **Cleartext Traffic Disabled:** `android:usesCleartextTraffic="false"` is strictly enforced in `AndroidManifest.xml` line 30, preventing unencrypted HTTP transmissions in production and release configurations.
- **Token Protection:** Bearer tokens are strictly excluded from URL query parameters, mitigating proxy access log leakage.

---

## 2. Staging Endpoint Resolution

- For local Android emulator testing: Android uses `10.0.2.2` to route to host `127.0.0.1`.
- For physical Android devices: Communication requires a routed staging endpoint on the local LAN or TLS-terminated staging domain.
- In Milestone 16, backend network contracts are verified via automated integration tests; real physical device connectivity remains gated at Track D.

