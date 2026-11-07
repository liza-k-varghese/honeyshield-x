# HoneyShield X — Milestone 17: Mobile-Backend Integration & Event Synchronization

## 1. Architecture Overview
The HoneyShield X mobile client communicates with the FastAPI backend across three distinct transport channels:
1. **REST APIs (`/api/v1/`)**: For authentication, incident investigation, case updates, and device management.
2. **PostgreSQL Transactional Outbox (`/api/v1/events/outbox`)**: Guarantees ordered, persistent delivery of SOC events across process recycles.
3. **Bi-directional WebSocket (`/ws/soc`) with Header-Authenticated SSE Fallback (`/api/v1/stream/events`)**: Delivers sub-millisecond alerts and Digital Agent status vectors.

## 2. Event Monotonicity and Cursors
- Mobile clients track a 64-bit integer cursor (`last_seen_seq_id`).
- Outbox polls or WebSocket streams query `SELECT * FROM security_event_outbox WHERE id > :cursor ORDER BY id ASC LIMIT :batch_size`.
- If an SSE or WebSocket connection drops, reconnection resumes from `last_seen_seq_id`, preventing missed attacks or duplicate notifications.

## 3. Session Security
- Mobile clients use ephemeral bearer tokens stored in Android Keystore / encrypted preferences.
- Server session store (`default_session_store`) monitors active tokens, operator roles, and expiration.
- Instant token revocation is supported through `revoke_session(token)` and `revoke_operator_sessions(operator_id)`.

## 4. Verification Verdict
- Monotonic cursor tracking: **PASSED (Verified in `test_03`)**
- Session creation and instant revocation: **PASSED (Verified in `test_10`)**
- Full outbox publication trace: **PASSED (Verified in `test_12`)**

