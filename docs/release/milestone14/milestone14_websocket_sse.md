# Milestone 14 — Real-Time Streaming: Authenticated WebSocket & Secure SSE Fallback

**Document ID:** `HSX-DOC-M14-013`  
**Classification:** Distributed Real-Time Protocols  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Dual-Transport Architecture

HoneyShield X deploys a dual-transport real-time event pipeline ensuring robust connectivity across restrictive enterprise firewalls, inspection proxies, and mobile cellular connections:

```
                          Client Application
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
                   ▼                             ▼
       Primary: Authenticated WS        Fallback: Secure SSE
       Route: /api/v1/ws/events         Route: /api/v1/stream/events
       Auth: Ephemeral Ticket           Auth: Authorization Header
```

---

## 2. Authenticated Connection Ticket Flow (WebSocket)

To eliminate token leakage in web server access logs and browser query strings:
1. Client calls `POST /api/v1/ws/ticket` with `Authorization: Bearer <JWT>`.
2. Backend generates a 32-byte cryptographically secure random ticket with 30-second TTL stored in Redis.
3. Client initiates WebSocket connection: `GET /api/v1/ws/events?ticket=<ticket>`.
4. Backend atomically claims and deletes the ticket from Redis.
5. Replay attempts with the same ticket receive immediate HTTP `401 Unauthorized` / connection close.

---

## 3. Secure Header-Authenticated SSE Fallback

When WebSocket connections are blocked by deep packet inspection or corporate proxies:
1. Client automatically falls back to `GET /api/v1/stream/events`.
2. **Security Policy:** Ordinary bearer tokens **never** appear in SSE URL query parameters. The connection is established via `fetch()` with standard `Authorization: Bearer <JWT>` request headers.
3. **Cursor Recovery:** The client includes `Last-Event-ID: <cursor>` header.
4. **Outbox Replay:** The server streams missed events from the PostgreSQL outbox before switching to live broadcast chunks.
5. **Heartbeats:** Server sends keepalive comment `: ping\n\n` every 15 seconds to prevent proxy idle timeouts.

