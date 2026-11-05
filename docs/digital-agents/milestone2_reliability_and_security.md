# HoneyShield X — Digital Agent Universe
## Milestone 2: Reliability, Error Handling & Security Model

**Document:** `docs/digital-agents/milestone2_reliability_and_security.md`  
**Milestone:** 2 — Live Backend Integration, Real-Time Movement & Verified Agent Handoffs  
**Status:** COMPLETE & VERIFIED  

---

### 1. Security Architecture & Threat Model

The real-time Digital Agent Universe introduces visual operational telemetry while enforcing strict security controls:

#### Authentication & Single-Use Connection Tickets
- Web clients acquire a single-use connection ticket via `POST /api/v1/events/ticket` authenticated by an authorized Bearer JWT.
- Single-use tickets are consumed instantaneously upon WebSocket handshake, preventing ticket sharing, replay attacks, or exposure of JWT tokens in server access logs.
- Tickets expire automatically after 60 seconds if unconsumed.

#### Server-Side RBAC Filtering
- Before any frame is transmitted across the WebSocket, `can_operator_view_event(operator, event_type)` is evaluated.
- Operators without `command:stage_containment` permissions are strictly filtered from receiving Level-3 Governor containment telemetry.
- Administrative deception events require `deception:admin` permissions.

#### Zero Sensitive Data Leakage
- Passwords, SSH keys, private honeytokens, and database credentials are fully sanitized before outbox insertion.
- Raw attack binaries or exploit strings are never passed through visualization websockets.

---

### 2. Error Recovery & Edge Case Resilience

| Edge Case Scenario | System Response & Mitigation Strategy | Test Verification |
| :--- | :--- | :---: |
| **Backend Outage / Recycling** | Client transitions to `reconnecting` state; initiates exponential backoff with random jitter. | **PASS** |
| **Ticket Expiration / Auth Expiry** | Expired tickets rejected with WS code 4403; client refreshes authentication credentials. | **PASS** |
| **Network Interruptions** | Ping/pong keepalive detects dropped socket within 20s; reclaims resources safely. | **PASS** |
| **Duplicate Events** | Bounded ring-buffer Set (`seenEventIds`) drops duplicated event IDs with zero re-animation. | **PASS** |
| **Missed Events on Reconnect** | Client queries `/api/v1/events/replay?since_cursor=N` to catch up on missed records. | **PASS** |
| **Historical Catch-up vs Live** | Historical replayed events increment stats and outbox without triggering disruptive movement animations. | **PASS** |
| **Operation Failure in Flight** | Character transitions to crimson `failed` state with explicit `failure_reason` displayed in inspector. | **PASS** |

