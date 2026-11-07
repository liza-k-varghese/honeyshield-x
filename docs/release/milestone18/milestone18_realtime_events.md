# HoneyShield X — Milestone 18: Real-Time Event Synchronization & Outbox Resilience

## 1. Transport Mechanisms
The mobile application uses dual-transport synchronization:
1. **Primary Transport:** Authenticated WebSocket connection (`/ws/soc`) with ping/pong heartbeats.
2. **Fallback Transport:** HTTP-header authenticated Server-Sent Events (SSE) via `/api/v1/stream/events`.

## 2. Monotonic Cursors & Outbox Guarantees
- Every security event committed to `security_event_outbox` receives an auto-incrementing 64-bit integer ID (`seq_id`).
- Upon connection, the mobile client specifies its highest processed sequence ID:
  `GET /api/v1/events/outbox?after_seq_id={cursor}&limit=100`
- The backend streams all subsequent events in strict ascending order.
- Reconnections resume from the local cursor, preventing missed events and eliminating duplicate alerts.

## 3. Test Verification
- Verified in `backend/tests/test_milestone17_sdk_recovery_and_defense.py`:
  - `test_03_digital_agent_sync_service_monotonic_cursor`: **PASSED**
  - `test_12_full_soc_event_outbox_transactional_trace`: **PASSED**
- Verified in `backend/tests/test_milestone9_enterprise_orchestration.py`:
  - `test_08_transactional_outbox_monotonic_cursor_seek`: **PASSED**

