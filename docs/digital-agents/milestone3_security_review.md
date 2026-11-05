# HoneyShield X — Digital Agent Universe
## Milestone 3 Security & RBAC Verification Review

### 1. Security Architecture & Threat Model

The Digital Agent Universe integrates directly with real-time operational feeds and persistent incident data. To maintain defense-in-depth, strict security controls are enforced across the stack:

1. **Server-Side RBAC Enforcement:**
   - Every event emitted or replayed passes through server-side authorization checks (`can_operator_view_event`).
   - Analyst roles are restricted from inspecting privileged containment records or administrative deception controls without explicit permissions (`command:stage_containment`, `deception:admin`).
   - Frontend character animations never dictate authorization: access decisions are strictly validated server-side.

2. **Ticket-Based WebSocket Authentication:**
   - Single-use, 60-second connection tickets (`/api/v1/events/ticket`) prevent sensitive JWT or session tokens from leaking via URL query strings or browser history logs.
   - Tickets are consumed atomically on connection handshake.

3. **Data Sanitization & Privacy:**
   - Raw attacker passwords, SSH private keys, and session secrets are scrubbed before serialization into `payload_json`.
   - Browser logs are kept clean of confidential payload tokens.

4. **Zero Containment Execution via Chat:**
   - The NEXUS Assistant strictly enforces a read-only operational boundary.
   - Containment requests trigger an immediate security advisory directing operators to the Governor Emergency Console with required step-up verification.

5. **Replay vs. Production Storage Isolation:**
   - Historical replays run in a sandboxed client state machine that has no write access to PostgreSQL, Redis, or WebSocket broadcasting channels.

