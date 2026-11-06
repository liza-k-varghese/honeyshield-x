# Milestone 12 — Mobile Real-Time Event Streaming & Fallback Architecture

**Document:** `milestone12_realtime_events.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Dual Real-Time Transport Protocol

HoneyShield X Mobile implements a resilient dual-transport streaming client:
1. **Primary Transport: Authenticated WebSocket (`/ws/events`)**
   - Employs ticket-based authentication exchange (`POST /api/v1/auth/ws-ticket` -> ticket token passed in handshake).
   - Ingests streaming security events and digital agent telemetry.
   - Maintains periodic heartbeat frames (`system.heartbeat`).
2. **Resilient Fallback Transport: Secure Server-Sent Events (`/api/v1/events/stream`)**
   - Triggered automatically upon WebSocket timeout, disconnect, or strict proxy blocking.
   - Authenticated via standard `Authorization: Bearer <token>` request header (zero bearer tokens in query string).
   - Transparently parses event streams and emits identical event payloads.

## 2. Monotonic PostgreSQL Outbox Synchronization

Every streaming event contains a monotonic `sequence_id` originating from the PostgreSQL transactional outbox. The mobile client preserves the highest observed cursor in encrypted local storage. Upon reconnection after network interruptions, the client sends `last_seen_cursor` to replay missed events without data loss.

