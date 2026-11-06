# Milestone 13 — Real-Time Streaming Architecture: WebSocket & Secure SSE Fallback

**Document ID:** `HSX-DOC-M13-014`  
**Classification:** Distributed Real-Time Systems  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/routers/stream.py`, `backend/app/routers/ws.py`, `backend/app/services/event_outbox.py`

---

## 1. Dual Transport Real-Time Design

HoneyShield X implements a resilient real-time streaming pipeline designed to survive network proxies, enterprise firewalls, and intermittent wireless connections.

### 1.1 Primary Transport: Authenticated WebSocket (`/api/v1/ws/events`)
- **Handshake Protocol:** WebSockets require a short-lived ticket obtained via authenticated REST (`POST /api/v1/ws/ticket`), preventing query parameter token leakage in proxy logs.
- **Bi-Directional Telemetry:** Supports low-latency event delivery (< 15ms) and client heartbeat pings.
- **Heartbeat & Keepalive:** Transmits heartbeat frames every 15 seconds. If a client fails to respond within 30 seconds, the server terminates the socket to reclaim connection resources.

### 1.2 Resilient Fallback: Secure SSE (`/api/v1/stream/events`)
- **HTTP Header Authorization:** Enforces `Authorization: Bearer <JWT>` directly in the HTTP connection header. Strictly rejects URL-query-token transmission.
- **Automatic Degradation:** If WebSocket connection fails, closes unexpectedly, or is blocked by upstream proxy inspection, the frontend and mobile clients cleanly fall back to SSE streaming without operator interruption.
- **Last-Event-ID Cursor Recovery:** SSE clients send `Last-Event-ID: <cursor>` upon reconnect. The server replays missed events from the PostgreSQL outbox before resuming live delivery.

---

## 2. Event Outbox Cursor Architecture

```
PostgreSQL (Event Outbox)            Event Dispatcher                  WebSocket / SSE Worker             Client (Web/Mobile)
          |                                  |                                   |                                   |
          |--- Commit Transaction ---------->|                                   |                                   |
          |    (cursor=104, payload, time)   |                                   |                                   |
          |                                  |--- Redis PUBLISH event_channel -->|                                   |
          |                                  |                                   |--- Send Frame / SSE Chunk ------->|
          |                                  |                                   |    (id: 104, data: JSON)          |
          |                                  |                                   |                                   |
          |                                  |                                   |<-- Disconnect / Network Drop -----|
          |                                  |                                   |                                   |
          |                                  |                                   |<-- Reconnect (Last-Event-ID: 104) |
          |<-- SELECT * WHERE cursor > 104 --|-----------------------------------|                                   |
          |--- Return missed events -------->|                                   |                                   |
          |                                  |---------------------------------->|--- Replay Cursors 105, 106 ------>|
```

---

## 3. Verification & Performance Benchmarking

Validated in `backend/tests/test_milestone6_1_stream_security.py` and `test_phase3_realtime_and_push.py`:
- **WebSocket Ticket Invalidation:** Single-use tickets expire after 30 seconds and cannot be reused.
- **SSE Header Enforcement:** Queries without Authorization header receive HTTP `401 Unauthorized`.
- **Replay Continuity:** Zero dropped frames during simulated 10-second client disconnects.

