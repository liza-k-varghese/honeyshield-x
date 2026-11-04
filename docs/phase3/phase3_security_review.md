# HoneyShield X — Phase 3 Security Review & Threat Analysis
## Real-Time Gateway, Push Privacy, RBAC & Zero-Trust Verification

### 1. Security Analysis & Threat Modeling

| Threat Vector | Severity | Vulnerability Risk | Implemented Architectural Mitigation |
| :--- | :---: | :--- | :--- |
| **Token Leakage in WebSocket URLs** | HIGH | Bearer session tokens embedded in query strings (`?token=...`) are logged in plaintext by HTTP proxies, web servers, and browser history. | **Single-Use Ticket Gateway:** `POST /api/v1/events/ticket` returns a short-lived (60s) single-use ticket (`hsx_wstk_...`). Ticket is atomically invalidated upon handshake; cannot be reused or replayed. |
| **Cross-Operator Telemetry Disclosure** | HIGH | An unprivileged operator (e.g., `viewer`) subscribing to real-time events receives confidential deception hits or Governor containment tokens. | **Server-Side Event Filtering:** Before frame transmission, `can_operator_view_event()` checks `EVENT_PERMISSION_MAP`. Privileged events are dropped before reaching unauthorized client sockets. |
| **Push Notification Data Leakage** | HIGH | Push notifications routed through external delivery infrastructure (Google FCM, Apple APNs) expose credentials, payload previews, or IP addresses on lock screens. | **Minimal Safe Payloads:** Push payloads strictly omit passwords, keys, tokens, and raw payloads. Notifications provide high-level summaries and pass route identifiers (`screen`, `resourceId`) to open an authenticated in-app view. |
| **WebSocket Connection Exhaustion (DoS)** | MEDIUM | A malicious client opens hundreds of idle WebSockets to exhaust gateway memory and file descriptors. | **Per-Operator Connection Caps:** `RealtimeConnectionManager` enforces a hard limit of `MAX_CONNECTIONS_PER_OPERATOR = 5`. Additional connections receive WebSocket closure code `4429`. |
| **Rogue Push Action Execution** | CRITICAL | An attacker intercepts or forges a push notification to trigger automated host isolation or honeypot resets. | **Governor Level-3 Safety Isolation:** Push notifications are passive signals. No automated containment or destructive actions can be triggered by notifications; explicit multi-factor operator authorization is mandatory. |
| **Network Interruption State Drift** | MEDIUM | Mobile client disconnects during cellular handover, causing out-of-order writes or missed threat alerts. | **Cursor-Based Event Replay:** Bounded ring buffer stores recent events with incremental integer cursors. Client replays missed events from its last acknowledged cursor upon reconnect. |

---

### 2. Residual Risks & Staging Recommendations

1. **Physical Device Push Delivery:**
   - In offline sandbox and local testing environments without Google Play Services or public internet access, the push dispatcher operates in mock/simulated acceptance mode.
   - *Recommendation:* Prior to staging deployment, configure Google Firebase Service Account credentials (`google-services.json`) and EAS project credentials for physical device verification.

2. **TLS 1.3 Termination & Certificate Pinning:**
   - In local development, the client connects to `ws://10.0.2.2:8000`.
   - *Recommendation:* In production SOC command deployments, terminate WebSocket connections behind an enterprise reverse proxy enforcing `wss://`, TLS 1.3, and strict certificate pinning within the React Native client.

3. **Rate Limiting on Ticket Issuance:**
   - *Recommendation:* Add IP-based rate limiting on `POST /api/v1/events/ticket` (e.g. 10 requests per minute per IP) to mitigate aggressive ticket generation.

