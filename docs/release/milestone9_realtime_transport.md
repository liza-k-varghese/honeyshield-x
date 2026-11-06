# Milestone 9 — Real-Time Transport, Outbox Monotonicity & Streaming

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Date:** 2026-11-06  
**Auditor:** Redis & Event-Streaming Reliability Engineer  

---

## 1. Dual-Transport Real-Time Architecture

HoneyShield X implements a hardened real-time event delivery pipeline prioritizing authenticated WebSockets with a resilient, token-protected Server-Sent Events (SSE) fallback.

```
       [ Client Browser / SOC Dashboard ]
                      │
          Ticket Request: POST /api/v1/events/ticket
          Header: Authorization: Bearer <session_token>
                      │
       ◄──────────────┴──────────────►
       │ WebSocket Primary           │ SSE Fallback
       │ ws://.../events/stream/ws   │ GET /api/v1/events/stream
       │   ?ticket=<64_hex_chars>    │ Header: Authorization: Bearer <token>
       │                             │ (Query param tokens REJECTED)
```

---

## 2. Hardened WebSocket Ticket Authentication

1. **Short-Lived (60-second TTL):** Tickets expire automatically after 60 seconds if unused.
2. **Single-Use Invalidation:** As demonstrated in `test_05_single_use_websocket_tickets_and_replay_rejection`, consuming a ticket deletes it immediately. Replay attempts fail with connection rejection.
3. **No Bearer Token in URL:** The permanent session token is never transmitted in WebSocket URLs. Only the disposable ticket appears in the initial handshake query string.

---

## 3. Secure Fetch-Based SSE Fallback

Following Milestone 6.1 remediation:
- Plain `GET /api/v1/events/stream?token=...` requests are rejected with HTTP 401.
- SSE connections are established via fetch with readable stream processing, passing the bearer token strictly in the HTTP `Authorization` request header.
- Resilient stream parser decodes chunk-split SSE frames, filters comment keepalives (`: keepalive`), and handles multibyte UTF-8 boundaries cleanly.

---

## 4. Transactional Outbox Monotonicity & Replay

- Event IDs and cursors increment strictly monotonically ($C_i > C_{i-1}$).
- Reconnection replay accepts `since_cursor=<int>`, allowing seamless resumption following transient network disconnects without event loss or duplicate out-of-order delivery.

