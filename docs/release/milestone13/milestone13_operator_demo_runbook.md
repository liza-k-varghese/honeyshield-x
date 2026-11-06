# Milestone 13 — Operator Demonstration Runbook (Scenarios A through R)

**Document ID:** `HSX-DOC-M13-025`  
**Classification:** Operational Runbook & Acceptance Procedures  
**Release Candidate:** `v1.0.0-rc5`  
**Audience:** SOC Operators, SREs, QA Engineers, Release Authority

---

## 1. Overview & Execution Rules

This runbook provides step-by-step instructions for demonstrating and qualifying the HoneyShield X cybersecurity platform. All tests are conducted against isolated staging infrastructure.

> [!CAUTION]
> **DRY-RUN CONTAINMENT RULE:**
> All automated response and containment playbooks execute in **DRY-RUN MODE ONLY** during demonstrations. No actual network interfaces or host firewalls on the host OS are modified.

---

## 2. Operator Demonstration Procedures

### Demo A — Staging Environment Boot & Health Verification
1. Launch staging services: `docker compose -f docker-compose.staging.yml up -d`.
2. Query health endpoint: `curl -s http://localhost:8000/api/v1/health | jq .`.
3. Verify Redis, PostgreSQL, and background worker status returns `"status": "healthy"`.

### Demo B — Web SOC Operator Login & RBAC Initialization
1. Navigate Firefox to `http://localhost:5173`.
2. Authenticate with Analyst credentials (`analyst@honeyshield.io` / `StagingTest123!`).
3. Verify JWT issued in secure cookie/header; UI displays Analyst role badge.

### Demo C — Digital Agent Universe Initial State
1. View the Digital Agent Universe canvas.
2. Confirm 4 agents appear in their resting ambient hover breathing cycles with canonical hex codes:
   - SCOUT (`#3B82F6`)
   - NEXUS (`#06B6D4`)
   - ORACLE (`#A855F7`)
   - SENTINEL (`#EF4444`)

### Demo D — Sensor Ingestion & SCOUT Activation
1. Transmit synthetic SSH attack to Cowrie honeypot node:
   ```bash
   backend/.venv/bin/python scripts/verify_cross_platform_event_trace.py
   ```
2. Observe SCOUT node pulse azure blue (`#3B82F6`) as event cursor 1 commits to PostgreSQL outbox.

### Demo E — Schema Normalization & NEXUS Outbox Queuing
1. NEXUS transitions to `ANALYZING` state, pulsing cyan (`#06B6D4`).
2. Normalized STIX attack-pattern record committed with cursor 2.

### Demo F — Threat Intelligence Correlation & ORACLE Attribution
1. ORACLE activates with violet pulse (`#A855F7`), matching IP against threat feeds.
2. Attribution banner surfaces in UI: `APT-29 / Midnight Blizzard (96% Confidence)`. Cursor 3 committed.

### Demo G — High-Severity Alert Broadcast & SENTINEL Defense Pulse
1. SENTINEL transitions to `DISPATCH` state with signal red pulse (`#EF4444`).
2. Alert #1 surfaces in Web SOC incident feed with Risk Score `94.0`. Cursor 4 committed.

### Demo H — Multi-Vector Attack Burst Handling
1. Ingest rapid burst of 50 decoy probes across SMB, HTTP, and DB listeners.
2. Verify outbox monotonic sequence incrementation without race conditions or deadlocks.

### Demo I — Canary Token Tripwire Detonation
1. Trigger canary endpoint: `curl -X POST http://localhost:8000/api/v1/canaries/trigger/canary_aws_key_01`.
2. Verify zero-latency escalation directly to SENTINEL critical alert.

### Demo J — SOAR Playbook Suggestion & Analyst Triage
1. Click Alert #1 in Incident Feed to open triage drawer.
2. Review automated recommendation: `PB-01: BRUTE-FORCE - Null-Route IP 198.51.100.45`.
3. Click "Acknowledge Incident". Verify status updates to `acknowledged`.

### Demo K — Secure QR Pairing Handshake (Web Initiator)
1. In Web SOC, navigate to Settings $\rightarrow$ Pair Mobile Companion.
2. Click "Generate Pairing Code".
3. Verify QR code displays with 180s countdown timer. No JWT present in QR payload.

### Demo L — Mobile QR Scan & Mutual Handshake
*(Note: Requires mobile dev build or simulated API call)*
1. Submit claim payload: `POST /api/v1/devices/pair/claim`.
2. Web SOC displays modal: "Approve Device: Pixel 8 (HSX-KEY-9821)?".
3. Operator clicks "Approve". Scoped device JWT issued.

### Demo M — WebSocket Ticket Acquisition & Streaming
1. Client requests ticket: `POST /api/v1/ws/ticket`.
2. Connects to `/api/v1/ws/events?ticket=...`.
3. Verify bidirectional keepalive frames received every 15s.

### Demo N — Proxy Interruption & Seamless SSE Fallback
1. Terminate WebSocket connection abruptly.
2. Verify client automatically shifts to `GET /api/v1/stream/events` with `Authorization: Bearer <JWT>` header.
3. Verify zero operator interruption.

### Demo O — Offline Disconnect & Amber Banner Lockdown
1. Simulate client disconnect (toggle offline mode).
2. Verify persistent amber banner: `STATUS: OFFLINE — CACHED VIEW ONLY`.
3. Verify incident triage and containment buttons are disabled.

### Demo P — Network Restoration & Outbox Catch-Up
1. Reconnect client with `Last-Event-ID: 2`.
2. Verify backend streams missed cursors 3 and 4 immediately.
3. Amber banner dismisses; buttons re-enable.

### Demo Q — Emergency Operator Session Revocation
1. In Web SOC, click "Revoke All Sessions for Device HSX-KEY-9821".
2. Backend writes token `jti` to Redis blacklist and publishes revocation event.
3. Verify mobile companion immediately disconnects with code `4401` and redirects to login.

### Demo R — Disaster Recovery & Database Snapshot Restore
1. Execute `pg_dump` backup script.
2. Drop staging database and execute `pg_restore` runbook.
3. Confirm all 4 event outbox entries and alert entities match cryptographic hash.

