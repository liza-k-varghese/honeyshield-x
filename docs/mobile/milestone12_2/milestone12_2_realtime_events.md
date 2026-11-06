# Milestone 12.2 — Real-Time Streaming & Durable Outbox Cursors

**Document:** `milestone12_2_realtime_events.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Dual-Transport Architecture

The mobile application implements a resilient real-time streaming pipeline:
1. **Primary: Authenticated WebSocket (`/ws/events`):**
   - Employs short-lived ticket handshake (`POST /api/v1/auth/ws-ticket`).
   - Streams live security events, courier coordinates, and agent state updates.
   - Periodic heartbeat frames maintain link vitality.
2. **Fallback: Secure Server-Sent Events (`/api/v1/events/stream`):**
   - Automatically activates if WebSocket connection fails or encounters proxy restrictions.
   - Authenticated strictly via HTTP `Authorization: Bearer <token>` header (zero query parameter tokens).

---

## 2. Monotonic PostgreSQL Outbox Synchronization

- Every event envelope carries an incrementing `sequence_id` from the PostgreSQL transactional outbox.
- The mobile client preserves the highest observed cursor in encrypted local storage.
- Upon reconnection after an outage, the client submits `last_seen_cursor` to recover missed events sequentially, guaranteeing zero message loss.
- Lifecycle states (`LIVE`, `RECOVERED`, `HISTORICAL`, `DEMO`) are explicitly tagged in the event envelope.

