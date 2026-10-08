# HoneyShield-X — Module 3.4 Architecture & Reconciliation Specification

**Document Identifier:** `HSX-ARCH-MOD-3.4-RECON`
**Milestone:** Phase 3 — Module 3.4 Architecture & Reconciliation Gate
**Status:** COMPLETE / APPROVED WITH CONDITIONS
**Current Frozen Baseline:** `fdcf0f30c4a5ea3f0c42bfe455dc343ffb27697c` (`feat: add detection rule console and deterministic replay`)
**Previous Frozen Milestones:**
- Phase 2: `da7e229` (`feat: add unified security processing engine`)
- Module 3.1: `546add5` (`feat: add SOC dashboard core workspace`)
- Module 3.2: `998fc9f` (`feat: add threat intelligence and attack-chain explorer`)
- Module 3.3: `fdcf0f3` (`feat: add detection rule console and deterministic replay`)
**Classification:** Defensive Security Architecture / Operator Command & Control
**Core Architectural Mandate:** *"Determinism for Detection; AI for Contextualization."*

---

## 1. Executive Summary

### 1.1 The Reconciliation Challenge
The original HoneyShield-X Phase 3 roadmap designated Module 3.4 as:
> *"3.4 — Real-Time Streaming & Live Incident Command"*

Simultaneously, architectural research into the external reference platforms (`CyberStrike` and `CyberStrikeAI`) identified advanced operational primitives:
- Deterministic Safety Governor (rate limiting, action allowlists, blast-radius constraints)
- Outbound Circuit Breaker (failure shedding, webhook overload prevention)
- Human-in-the-Loop (HITL) Action Guard (mandatory human authorization before state mutation)
- Immutable Operator Audit Logging

However, a naive or literal interpretation of "Live Incident Command" poses severe architectural risks if not reconciled with HoneyShield-X's actual repository state:
1. **Lack of Active Network Execution Engines:** HoneyShield-X is an intrusion detection, deception, risk correlation, and SOC analysis platform. The repository contains **zero** raw network drivers, zero firewall daemons (`iptables`, `nftables`, `pf`), and zero cloud security group mutators. Inventing simulated firewall actions without real infrastructure would be deceptive and brittle.
2. **Database Invariants:** HoneyShield-X Phase 3 operates under a strict **Zero Database Migration** rule. Introducing a new relational `incidents` table, foreign keys, or alembic migrations is prohibited at this stage.
3. **Control-Plane Purity:** The platform's foundational principle—*"Determinism for Detection; AI for Contextualization"*—forbids any autonomous AI or probabilistic agent from possessing authority over detection, alerts, governor decisions, response authorization, or system state mutation.
4. **License Contamination Risk:** CyberStrike is licensed under the strongly copyleft **AGPL-3.0**, while CyberStrikeAI is Apache 2.0 (Go). Zero source code, libraries, or dependencies may be copied or linked.

### 1.2 The Three Architectural Options Evaluated

| Dimension | Option A: Full Real-Time Incident Command | Option B: Real-Time Incident Operations Core *(SELECTED)* | Option C: Architecture-Only / Defer Response Execution |
| :--- | :--- | :--- | :--- |
| **Description** | Full bidirectional WebSocket command mesh with autonomous containment, active firewall/network manipulation, and external response integrations. | **Deterministic real-time event streaming via Server-Sent Events (SSE) backed by Redis Pub/Sub, unified incident triage command console, deterministic Safety Governor & Circuit Breaker, strict Human-in-the-Loop action gate, and SystemEvent audit logging.** | Document architectural patterns on paper; build only passive real-time view; defer all command execution, governor enforcement, and triage workflow. |
| **Real-Time Transport** | Bidirectional WebSocket (WS/WSS) | **SSE (unidirectional stream) + HTTP REST POST (governed commands)** | Passive HTTP Polling or read-only SSE |
| **Defensive Actions** | External active firewall manipulation, automated IP null-routing | **Allowlisted internal actions: alert lifecycle triage, notification re-dispatch, priority escalation, and staged containment export** | Read-only observation; no actions permitted |
| **Governor & Breaker** | Complex distributed AIMD controller | **Deterministic Governor (Allowlist + Rate Limiter + Cooldown + Circuit Breaker)** | None |
| **Feasibility & Safety** | **REJECTED:** Violates clean-room constraints, invents non-existent firewall infrastructure, introduces unsafe autonomous mutation. | **APPROVED:** Perfectly matches existing repository capabilities (PostgreSQL + Redis + FastAPI + React Query); requires zero database migrations; preserves frozen modules. | **REJECTED:** Produces insufficient operational value; fails to solve operator alert fatigue or dispatch protection. |

### 1.3 Authoritative Gate Decision
**Decision:** **OPTION B — Real-Time Incident Operations Core** is selected and **APPROVED WITH CONDITIONS**.

Module 3.4 will deliver:
1. **Low-Latency Event Streaming:** A unidirectional Server-Sent Events (SSE) stream (`/api/v1/incident-command/stream`) powered by Redis Pub/Sub (with graceful in-memory fallback), delivering instant notification of new alerts, correlated attack detections, and system events.
2. **Deterministic Safety Governor:** An in-process policy evaluation engine enforcing a strict action allowlist, per-operator and per-entity rate limits, cooldown periods, and duplicate suppression.
3. **Outbound Circuit Breaker:** An automated failure-shedding guard on external notification dispatch that trips to `OPEN` on consecutive failures, protecting downstream systems from flooding.
4. **Human-in-the-Loop (HITL) Command Gate:** Strict two-phase execution lifecycle for all state-changing actions: `Request → Governor Policy Check → Human Approval → Execution → SystemEvent Audit`.
5. **Virtual Incident Projection:** Real-time triage workflow operating over existing `Alert`, `Attack`, and `SystemEvent` records without requiring database schema migrations.
6. **Live SOC Command Console:** A high-density React/TypeScript workspace featuring live stream indicators, governor telemetry, one-click triage, and audited response execution.

---

## 2. Current Repository State

### 2.1 Git Status & Commit Lineage
- **Working Tree:** Clean (verified: zero dirty files, zero uncommitted changes).
- **Current HEAD Commit:** `fdcf0f30c4a5ea3f0c42bfe455dc343ffb27697c`
- **Commit Subject:** `feat: add detection rule console and deterministic replay`
- **Verified Commit Lineage:**
  ```text
  fdcf0f3 (HEAD -> main) feat: add detection rule console and deterministic replay  [Module 3.3]
  998fc9f feat: add threat intelligence and attack-chain explorer                  [Module 3.2]
  546add5 feat: add SOC dashboard core workspace                                   [Module 3.1]
  da7e229 feat: add unified security processing engine                             [Module 2.10]
  ```

### 2.2 Frozen Module Inventory & Protection Boundary
The following modules are completed, verified, and strictly **FROZEN**:
1. **Modules 2.1–2.10 (Phase 2 Deterministic Security Pipeline):**
   - Telemetry Ingestion (2.1), Heuristic Detection (2.2), Threat Intel Cache (2.3), Deterministic Risk Scoring (2.4), Alert Manager (2.5), Notification Dispatch (2.6), End-to-End Pipeline (2.7), Attack Correlation (2.8), Multi-Vector Detection Registry & Service (2.9), Unified Security Engine (2.10).
   - Test Suite: 95 / 95 passing backend tests.
2. **Module 3.1 (SOC Dashboard Core Workspace):**
   - Security Overview KPIs, Live Alert Feed, Alert Detail Drawer, Attack Event Timeline, Connectivity Health.
   - Test Suite: 10 / 10 passing backend tests, 12 / 12 passing frontend tests.
3. **Module 3.2 (Threat Intelligence & Attack-Chain Explorer):**
   - Threat Intelligence IOC Lookup, MITRE ATT&CK Matrix, IP Investigation Dossier, Attack-Chain DAG Explorer.
   - Test Suite: 13 / 13 passing backend tests, 4 / 4 passing frontend tests.
4. **Module 3.3 (Multi-Vector Detection Rule Console & Deterministic Replay):**
   - Rule Catalog, Rule Detail, Empirical Efficacy Telemetry, Isolated Deterministic Replay, Candidate Rule Simulation Sandbox, Operator Audit Trail (`SystemEvent`).
   - Test Suite: 12 / 12 passing backend tests, 16 / 16 passing frontend tests.
- **Combined Test Baseline:** **130 backend tests passing, 16 frontend tests passing.**

---

## 3. Existing Real-Time / Redis Capabilities

### 3.1 Redis Installation & Runtime Verification
- **Package Status:** `redis==8.1.0` is already installed in `backend/requirements.txt` and verified in `backend/.venv/`.
- **Runtime Daemon:** Redis server is active on `127.0.0.1:6379`. Direct verification via `redis.Redis(host="127.0.0.1", port=6379).ping()` returns `True`.
- **Current Repository Usage:**
  - `backend/app/main.py`: Health check verifies Redis connectivity via ephemeral client ping.
  - `backend/app/routers/dashboard.py`: Dashboard health summary queries Redis ping status.
  - **Critical Finding:** Prior to Module 3.4, **zero** Redis Pub/Sub channels, zero Redis Streams, and zero Redis caching keys are active in the application logic.

### 3.2 Real-Time Primitives Evaluation

| Primitive | Feasibility in HSX | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Redis Pub/Sub** | **High** (Native `redis-py`) | Sub-millisecond fan-out, zero persistence overhead, trivial channel subscription (`redis.pubsub()`), minimal memory footprint. | Transient delivery only; messages lost if no subscriber is active. | **ADOPT for Live SSE Broadcast:** Perfect for pushing real-time events to connected browser sessions. Durability is already handled by PostgreSQL. |
| **Redis Streams** | **Medium** | Append-only message log, consumer groups, message replay, ack tracking. | High operational complexity, requires stream trimming (`XTRIM`), duplicates PostgreSQL event persistence, introduces dual-write split-brain hazards. | **REJECT:** Unnecessary complexity. PostgreSQL `AttackEvent` and `SystemEvent` already provide durable, queryable history. |
| **Redis Key-Value Cache** | **High** | Ultra-fast token bucket and circuit-breaker state tracking. | Ephemeral if Redis restarts without AOF/RDB. | **ADOPT for Governor Token Bucket & Cooldowns:** In-memory or Redis key expiration (`SETEX key ttl value`) provides atomic distributed rate-limiting. |
| **Frontend Polling** | **High** (Active Today) | Robust fallback, zero connection state on backend. | 5-second polling interval in `useDashboard.ts` creates 0–5s latency and repetitive DB load. | **RETAIN as Failover:** Keep TanStack Query polling as an automatic fallback if the SSE connection drops. |

---

## 4. Existing Alert / Attack / Audit State Model

### 4.1 Relational Data Entities (PostgreSQL via SQLAlchemy)
HoneyShield-X's operational state is stored in five core tables in `backend/app/models.py`:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│             Attack              │       │           AttackEvent           │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id: Integer (PK)                │1     *│ id: Integer (PK)                │
│ attack_type: String(100)        ├───────┤ attack_id: Integer (FK)         │
│ source_ip: String(45)           │       │ event_type: String(100)         │
│ destination_ip: String(45)      │       │ source_ip: String(45)           │
│ protocol: String(20)            │       │ message: Text                   │
│ severity: String(20)            │       │ event_time: DateTime            │
│ risk_score: Float               │       └─────────────────────────────────┘
│ status: String(30)              │
│ detected_at: DateTime           │       ┌─────────────────────────────────┐
└───────────────┬─────────────────┘       │           SystemEvent           │
                │1                        ├─────────────────────────────────┤
                │                         │ id: Integer (PK)                │
                │*                        │ event_type: String(100)         │
┌───────────────▼─────────────────┐       │ source: String(100)             │
│              Alert              │       │ severity: String(20)            │
├─────────────────────────────────┤       │ message: Text                   │
│ id: Integer (PK)                │       │ created_at: DateTime            │
│ attack_id: Integer (FK, Null)   │       └─────────────────────────────────┘
│ alert_type: String(100)         │
│ severity: String(20)            │       ┌─────────────────────────────────┐
│ message: Text                   │       │       ThreatIntelligence        │
│ status: String(30)              │       ├─────────────────────────────────┤
│ notified_at: DateTime (Null)    │       │ id: Integer (PK)                │
│ notification_status: String(20) │       │ indicator_type: String(30)      │
│ created_at: DateTime            │       │ indicator_value: String(255)    │
└─────────────────────────────────┘       │ threat_level: String(20)        │
                                          │ source / confidence / desc      │
                                          └─────────────────────────────────┘
```

### 4.2 State Machine Analysis
1. **Alert Lifecycle (`Alert.status`):**
   - Allowed values: `{"open", "acknowledged", "resolved"}`.
   - Enforced by: `backend/app/alerts/service.py` (`update_alert_status`).
   - Gaps Identified: Status changes currently do **not** record audit entries in `SystemEvent`, and do not publish events to Redis.
2. **Notification Lifecycle (`Alert.notification_status`):**
   - Allowed values: `{"pending", "in_flight", "delivered", "failed"}`.
   - Enforced by: `backend/app/notifications/service.py` with atomic PostgreSQL `SELECT ... FOR UPDATE` row locks and lease timeouts (`30.0s`).
3. **Audit Repository (`SystemEvent`):**
   - Utilized by Module 3.3 for operator audit logging (`record_operator_audit` in `backend/app/audit/service.py`).
   - Fully supports arbitrary structured audit payloads via the `message` text column.

---

## 5. Definition of Live Incident Command

For HoneyShield-X, **Live Incident Command** is defined as:
> *A low-latency, human-in-the-loop operational workspace that streams real-time threat intelligence and security alerts to SOC operators, provides immediate lifecycle triage, enforces deterministic safety governor policies over allowlisted defensive actions, and records immutable audit records for every operator decision.*

### 5.1 What Live Incident Command IS
- **Real-Time Situation Awareness:** Push-based streaming of new incoming alerts, multi-vector correlations, and system events to connected operator clients within $< 200\text{ ms}$.
- **Structured Incident Triage:** Operator capability to acknowledge, escalate, or resolve active alerts with required rationale and priority adjustments.
- **Governed Action Dispatch:** Safe, rate-limited triggering of outbound notifications (webhooks) or defensive containment exports, guarded by policy rules.
- **Fail-Closed Safety:** An automated Circuit Breaker that instantly arrests outbound dispatch if downstream notification endpoints fail repeatedly.
- **Tamper-Evident Accountability:** Complete recording of operator identity, timestamps, target entities, and governor decisions in the `SystemEvent` audit log.

### 5.2 What Live Incident Command IS NOT
- **NOT Autonomous AI Remediation:** No language model or autonomous agent has authority to modify alerts, trip switches, or execute commands.
- **NOT Active Offensive Tooling:** No counter-attacking, port probing, credential cracking, or adversary exploitation.
- **NOT Direct Kernel / Firewall Modification:** No direct invocation of `iptables`, `pf`, or kernel packet filters. HoneyShield-X generates exportable containment policies and marks threat intelligence; it does not tamper with production host networking without a verified, sandboxed gateway.

---

## 6. Candidate 3.4 Scope

The reconciled scope of Module 3.4 encompasses six cohesive architectural pillars:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                MODULE 3.4 ARCHITECTURAL PILLARS                                 │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────────────┤
│ 1. Real-Time Event Bus        │ 2. Deterministic Governor     │ 3. Outbound Circuit Breaker     │
│ - Redis Pub/Sub channel       │ - Strict action allowlist     │ - Consecutive failure counter   │
│ - Unidirectional SSE endpoint │ - Per-operator rate limits    │ - Tripped (OPEN) state shedding │
│ - In-memory / polling fallback│ - Per-target cooldown (30s)   │ - Half-open cooldown recovery   │
├───────────────────────────────┼───────────────────────────────┼─────────────────────────────────┤
│ 4. Human-in-the-Loop Gate     │ 5. Virtual Incident Manager   │ 6. Live Command Console         │
│ - 2-phase command execution   │ - Aggregate alert projection  │ - Real-time stream indicator    │
│ - Ephemeral approval tokens   │ - Zero schema migrations      │ - Governor telemetry dashboard  │
│ - Mandatory reason logging    │ - SystemEvent audit trail     │ - One-click triage & dispatch   │
└───────────────────────────────┴───────────────────────────────┴─────────────────────────────────┘
```

1. **Real-Time Event Streaming:**
   - Dedicated SSE endpoint: `GET /api/v1/incident-command/stream`.
   - Redis Pub/Sub channel: `hsx:events:broadcast`.
   - Streaming payloads: `alert.created`, `alert.status_updated`, `governor.breaker_tripped`, `command.executed`.
2. **Deterministic Safety Governor:**
   - Module `backend/app/incident_command/governor.py`.
   - Evaluates commands against an immutable allowlist, global rate limit, and entity cooldown.
3. **Outbound Notification Circuit Breaker:**
   - Protects Module 2.6 webhook dispatch from flooding and cascaded network failure.
   - States: `CLOSED` (normal), `OPEN` (tripped after 3 consecutive failures, shedding traffic for 60s), `HALF_OPEN` (single probe request).
4. **Human-in-the-Loop Execution Engine:**
   - Unified command endpoint: `POST /api/v1/incident-command/execute`.
   - Validates operator session, verifies idempotency key, checks Governor approval, executes action, records audit log.
5. **Virtual Incident Projection:**
   - Projects existing `Alert` and `Attack` models into a high-density "Incident View" without adding database tables or migrations.
6. **Frontend Operator Console:**
   - React 19 / TypeScript live streaming component with real-time indicators, Governor status ribbon, incident command drawer, and audit links.

---

## 7. Governor / Circuit Breaker Architecture

Defensively adapted from CyberStrike’s rate-limiting concepts, the HoneyShield-X Safety Governor acts as an inline firewall for internal state-changing commands.

### 7.1 Governor Architecture Flow

```mermaid
flowchart TD
    CMD["Operator Command Request\n(action, target_id, operator_id, idempotency_key)"] --> IDEM{"Idempotency\nCheck"}
    IDEM -- Duplicate Key --> CACHED["Return Cached Result\n(HTTP 200)"]
    IDEM -- New Key --> ALLOW{"Action in\nAllowlist?"}
    ALLOW -- No --> DENY_ALLOW["Reject: HTTP 403\nAction Not Allowlisted"]
    ALLOW -- Yes --> LOCK{"Governor\nLockout Active?"}
    LOCK -- Yes --> DENY_LOCK["Reject: HTTP 503\nEmergency Lockout Active"]
    LOCK -- No --> RATE{"Operator Rate Limit\n(<= 10 req / 60s)"}
    RATE -- Exceeded --> DENY_RATE["Reject: HTTP 429\nOperator Rate Limit Exceeded"]
    RATE -- OK --> COOL{"Target Cooldown\n(30s since last action)"}
    COOL -- Active --> DENY_COOL["Reject: HTTP 429\nTarget Entity in Cooldown"]
    COOL -- Clear --> CB{"Circuit Breaker\n(for outbound dispatches)"}
    CB -- State: OPEN --> DENY_CB["Reject: HTTP 503\nCircuit Breaker Tripped"]
    CB -- State: CLOSED / HALF_OPEN --> EXEC["Execute Action\n(Under DB Row Lock)"]
    EXEC --> AUDIT["Record SystemEvent Audit Log"]
    AUDIT --> PUB["Publish Event to Redis Pub/Sub"]
    PUB --> RESP["Return Command Result\n(HTTP 200)"]
```

### 7.2 Governor Policy Rules & Thresholds

| Parameter | Default Value | Scope | Rationale |
| :--- | :--- | :--- | :--- |
| `MAX_OPERATOR_RATE` | 10 actions / min | Per `operator_id` | Prevents rapid-fire automated or accidental operator clicking. |
| `TARGET_COOLDOWN_SECONDS` | 30 seconds | Per `(action, target_id)` | Prevents duplicate notification dispatches or flapping status transitions. |
| `IDEMPOTENCY_TTL_SECONDS` | 300 seconds (5 min) | Per `idempotency_key` | Guarantees exactly-once execution semantics across network retries. |
| `BREAKER_FAILURE_THRESHOLD`| 3 consecutive errors | Outbound Webhooks | Trips breaker immediately when downstream webhook endpoints fail. |
| `BREAKER_RESET_TIMEOUT` | 60 seconds | Circuit Breaker | Cooldown window before probing downstream service recovery (`HALF_OPEN`). |
| `EMERGENCY_LOCKOUT` | Boolean flag (False) | System-wide | Manual operator kill-switch to freeze all outbound dispatches in an anomaly. |

---

## 8. Human-in-the-Loop (HITL) Approval Architecture

### 8.1 Core Principle
**"No consequential response may become autonomous."**
Every state-altering operation requires verified human initiation and an explicit audit justification.

### 8.2 Blast-Radius Classification

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BLAST-RADIUS CLASSIFICATION                                   │
├───────────────────────┬─────────────────────────────────┬───────────────────────────────────────┤
│ Tier                  │ Actions                         │ Approval Requirement                  │
├───────────────────────┼─────────────────────────────────┼───────────────────────────────────────┤
│ Level 1: Low Blast    │ - ACKNOWLEDGE_ALERT             │ Single-click action;                  │
│                       │ - VIEW_INVESTIGATION            │ Governor validates rate limits;       │
│                       │ - REPLAY_SIMULATION (Dry-Run)   │ Automatic SystemEvent audit.          │
├───────────────────────┼─────────────────────────────────┼───────────────────────────────────────┤
│ Level 2: Medium Blast │ - RESOLVE_ALERT                 │ Single-click with mandatory reason;   │
│                       │ - ESCALATE_ALERT                │ Operator confirmation dialogue;       │
│                       │ - SUPPRESS_NOTIFICATION        │ SystemEvent audit with resolution note│
├───────────────────────┼─────────────────────────────────┼───────────────────────────────────────┤
│ Level 3: High Blast   │ - DISPATCH_NOTIFICATION (Retry) │ Two-step confirmation modal;          │
│                       │ - EXPORT_CONTAINMENT_BLOCKLIST  │ Explicit rationale required (>10 chr);│
│                       │ - EMERGENCY_GOVERNOR_LOCKOUT    │ Operator re-authorization token.      │
└───────────────────────┴─────────────────────────────────┴───────────────────────────────────────┘
```

### 8.3 Two-Phase Execution Lifecycle for High-Blast Actions
1. **Phase 1: Pre-Flight Evaluation (`POST /incident-command/preview`):**
   - Client sends proposed action and target ID.
   - Governor validates allowlist, rate limits, cooldowns, and circuit breaker status.
   - If policy allows, returns a cryptographically signed or ephemeral approval token with a 60-second TTL.
2. **Phase 2: Execution Submission (`POST /incident-command/execute`):**
   - Operator submits command with the approval token and mandatory justification.
   - Governor verifies token validity and TTL ($< 60\text{ s}$).
   - Action executes atomically under database row lock.
   - System records audit log and invalidates approval token immediately.

---

## 9. Defensive Response Action Boundary

### 9.1 Explicitly Allowlisted Actions
Module 3.4 restricts executable commands strictly to the following enumerated catalog:

1. `ALERT_ACKNOWLEDGE`:
   - Transitions `Alert.status` from `"open"` to `"acknowledged"`.
   - Updates alert state in PostgreSQL; records `SystemEvent`.
2. `ALERT_RESOLVE`:
   - Transitions `Alert.status` from `"acknowledged"` or `"open"` to `"resolved"`.
   - Requires operator resolution comment; records `SystemEvent`.
3. `ALERT_ESCALATE`:
   - Elevates alert severity (e.g. from `"medium"` to `"high"`, or `"high"` to `"critical"`).
   - Requires operator justification; records `SystemEvent`.
4. `NOTIFICATION_DISPATCH`:
   - Dispatches pending or retryable alert notification to configured webhook provider via Module 2.6.
   - Guarded by Governor rate limiter and Circuit Breaker.
5. `NOTIFICATION_SUPPRESS`:
   - Marks an alert's notification as suppressed to prevent outbound dispatch.
6. `CONTAINMENT_STAGING_REQUEST`:
   - Generates an immutable containment recommendation and stages an exportable IP blocklist artifact in the database.
   - **Does NOT** directly modify kernel routing tables or external firewalls.
7. `GOVERNOR_LOCKOUT_ENGAGE` / `GOVERNOR_LOCKOUT_RELEASE`:
   - Toggles system-wide emergency freeze on outbound actions.

### 9.2 Explicitly Forbidden Capabilities (RED LINE)
The following operations are strictly **PROHIBITED** from entering HoneyShield-X:
- Shell execution (`subprocess`, `os.system`, `/bin/sh`)
- Direct kernel packet filtering or firewall manipulation (`iptables -A`, `nft`, `pfctl`)
- Active port scanning or network probing (`nmap`, `masscan`, raw sockets)
- Counter-offensive actions, exploit delivery, or credential harvesting
- Autonomous agent-driven state changes without human authorization

---

## 10. Real-Time Transport Comparison

### 10.1 Technical Comparison Matrix

| Evaluation Criterion | HTTP Short Polling | Server-Sent Events (SSE) *(SELECTED)* | WebSocket (WS) | Redis Streams Direct |
| :--- | :--- | :--- | :--- | :--- |
| **Protocol** | Standard HTTP/1.1 | Standard HTTP/1.1 or HTTP/2 (`text/event-stream`) | Full-Duplex TCP (`ws://` / `wss://`) | Direct Redis TCP socket |
| **Directionality** | Client pull | **Server push (unidirectional)** | Bidirectional | Client pull / subscribe |
| **Browser Support** | Universal | **Native `EventSource` API** | Native `WebSocket` API | None (requires backend gateway) |
| **Reconnection** | N/A (stateless) | **Automatic built-in browser retry** | Requires custom client reconnect loop | Custom driver reconnection |
| **Firewall / Proxy Traversal** | Excellent | **Excellent (standard HTTP GET)** | Poor (often blocked by corporate proxies)| N/A (internal only) |
| **State on Server** | None | **Minimal (1 streaming HTTP thread/task)**| High (persistent TCP connection state)| N/A |
| **Implementation Complexity** | Minimal | **Low (FastAPI `StreamingResponse`)** | High (connection lifecycle, heartbeats)| High |
| **Fit for HoneyShield-X** | Fallback only | **OPTIMAL:** Fits telemetry broadcast perfectly. Commands remain clean HTTP POSTs. | Overkill; adds bidirectional complexity with zero benefit. | Redundant with PostgreSQL persistence. |

### 10.2 Selected Architecture: SSE + HTTP REST POST
- **Event Telemetry (Downstream):** Server-Sent Events (SSE) over standard HTTP GET. The backend consumes events from Redis Pub/Sub and streams JSON events to connected browsers.
- **Operator Commands (Upstream):** Standard authenticated HTTP REST POST requests (`/api/v1/incident-command/execute`). Each request carries standard HTTP headers, JSON payloads, and returns typed responses.
- **Failover Strategy:** If the SSE stream disconnects, the browser client gracefully falls back to React Query's existing 5-second polling interval while attempting exponential-backoff SSE reconnection in the background.

---

## 11. Failure and Recovery Model (Fail-Closed)

### 11.1 Subsystem Failure Matrix

```
┌─────────────────────────┬───────────────────────────┬───────────────────────────────────────────┐
│ Failure Mode            │ System Behavior           │ Safety Invariant Enforced                 │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ Redis Server Down       │ Fallback to in-process    │ FAIL-SOFT for streaming (SSE reconnects); │
│                         │ memory event bus; SSE     │ FAIL-CLOSED for distributed governor lock │
│                         │ clients retry with backoff│ (local in-memory governor acts as backup) │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ PostgreSQL DB Down      │ HTTP 500 error returned;  │ FAIL-CLOSED: No state change permitted    │
│                         │ all commands rejected     │ without durable database transaction.     │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ Outbound Webhook Down   │ Provider returns timeout; │ Circuit Breaker trips to OPEN after 3     │
│                         │ alert set to failed       │ errors; drops subsequent calls for 60s.   │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ Operator Network Drop   │ SSE drops; browser auto-  │ Ephemeral approval tokens expire in 60s;  │
│                         │ reconnects on reconnect   │ uncommitted commands never execute.       │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ Concurrent Double Click │ Client sends duplicate    │ Idempotency key deduplicates in-flight    │
│                         │ command with same UUID    │ request; returns cached original result.  │
├─────────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
│ Conflicting Operators   │ Two operators act on same │ PostgreSQL row lock `SELECT FOR UPDATE`;  │
│                         │ alert simultaneously      │ second transaction detects status change. │
└─────────────────────────┴───────────────────────────┴───────────────────────────────────────────┘
```

### 11.2 The Fail-Closed Mandate
For all authorization and state-changing actions, the system **fails closed**:
- If policy evaluation cannot determine compliance $\rightarrow$ **DENY**.
- If governor state cannot be retrieved $\rightarrow$ **DENY**.
- If circuit breaker state is uncertain $\rightarrow$ **DENY**.
- If database transaction fails to commit $\rightarrow$ **ROLLBACK & DENY**.

---

## 12. Idempotency & Concurrency Model

### 12.1 Idempotency Key Specification
Every command execution request MUST include a client-generated UUID v4 header or field:
`X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000`

1. **Check:** Before evaluating Governor policy, the system queries the idempotency cache (Redis or in-memory dict with 5-minute TTL).
2. **Match:** If the key exists:
   - If execution is currently `IN_PROGRESS`: Returns `HTTP 409 Conflict` ("Command is currently executing").
   - If execution is `COMPLETED`: Returns the previously cached JSON response with `HTTP 200 OK` and header `X-Cache: HIT`.
3. **Store:** If the key is new:
   - Sets status to `IN_PROGRESS`.
   - Executes command.
   - Replaces with final response payload and sets TTL to 300 seconds.

### 12.2 Row-Level Locking Pattern
To prevent race conditions between concurrent operators or automated background tasks, status updates utilize PostgreSQL row locks:
```python
# Atomic row lock pattern inherited from Module 2.6
alert = (
    db.query(Alert)
    .filter(Alert.id == alert_id)
    .with_for_update()
    .first()
)
if alert.status != expected_status:
    raise HTTPException(status_code=409, detail=f"Alert status changed to {alert.status}")
```

---

## 13. Audit Model (SystemEvent Mapping)

HoneyShield-X utilizes the existing `SystemEvent` table for immutable operational auditing. Zero schema changes are required.

### 13.1 Standardized Audit Event Types
- `INCIDENT_COMMAND_EXECUTED`: Successfully executed operator action.
- `INCIDENT_COMMAND_REJECTED`: Action denied by Governor policy, rate limit, or cooldown.
- `CIRCUIT_BREAKER_TRIPPED`: Outbound circuit breaker transitioned from `CLOSED` to `OPEN`.
- `CIRCUIT_BREAKER_RESET`: Outbound circuit breaker recovered to `HALF_OPEN` or `CLOSED`.
- `GOVERNOR_LOCKOUT_ENGAGED`: Emergency kill-switch activated by operator.
- `GOVERNOR_LOCKOUT_RELEASED`: Emergency kill-switch released by operator.

### 13.2 Structured Audit Payload Schema
The `SystemEvent.message` column stores a serialized JSON payload containing:
```json
{
  "audit_version": "1.0",
  "command_id": "cmd-89fa21bc-43d1",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "action": "ALERT_RESOLVE",
  "target_entity": "Alert",
  "target_id": 42,
  "operator_id": "analyst-lead",
  "justification": "False positive confirmed; benign vulnerability scanner IP verified.",
  "governor_evaluation": {
    "rate_limit_checked": true,
    "cooldown_checked": true,
    "circuit_breaker_state": "CLOSED"
  },
  "previous_state": {"status": "acknowledged"},
  "new_state": {"status": "resolved"},
  "execution_duration_ms": 14.2,
  "timestamp_utc": "2026-10-08T06:45:00.123456Z"
}
```

---

## 14. Security Boundary Model

### 14.1 Authentication & Operator Context
- In the current single-tenant deployment, operator context is established via the `X-Operator-Id` header (e.g. `X-Operator-Id: soc-analyst-1`).
- Default fallback if header is absent: `"default_operator"`.
- Requests lacking an operator identifier in high-blast operations are rejected with `HTTP 401 Unauthorized`.

### 14.2 Authorization & Role Boundary
- **Read Operations (`GET`):** Open to all SOC analysts (live stream, rule catalog, efficacy stats).
- **Standard Triage (`ALERT_ACKNOWLEDGE`):** Permitted for Tier-1 Analyst role.
- **State Mutation (`ALERT_RESOLVE`, `ALERT_ESCALATE`):** Permitted for Tier-2 Analyst and Senior Operator roles.
- **Outbound & Governance (`NOTIFICATION_DISPATCH`, `GOVERNOR_LOCKOUT`):** Restricted to SOC Lead / Administrator role.

---

## 15. API Surface Proposal

The proposed API surface is strictly additive. It introduces a dedicated prefix `/api/v1/incident-command` without altering existing `/alerts`, `/attacks`, or `/audit` endpoints.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MODULE 3.4 API ROUTE DEFINITIONS                                │
├────────┬──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ Method │ Path                                     │ Summary & Function                          │
├────────┼──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ GET    │ /api/v1/incident-command/stream          │ Server-Sent Events (SSE) telemetry stream   │
│ POST   │ /api/v1/incident-command/execute         │ Unified governed command execution endpoint │
│ POST   │ /api/v1/incident-command/preview         │ Pre-flight Governor policy check & token    │
│ GET    │ /api/v1/incident-command/governor/status │ Current Governor metrics & breaker state    │
│ POST   │ /api/v1/incident-command/governor/lockout│ Engage / disengage emergency kill-switch    │
│ GET    │ /api/v1/incident-command/actions         │ Catalog of allowlisted actions & thresholds │
│ GET    │ /api/v1/incident-command/incidents       │ Virtual incident list with live metrics     │
└────────┴──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### 15.1 Endpoint Specifications

#### 1. `GET /api/v1/incident-command/stream`
- **Response Content-Type:** `text/event-stream`
- **Behavior:** Keeps connection open; pushes real-time events formatted as SSE:
  ```text
  event: alert.created
  data: {"alert_id": 45, "attack_id": 12, "severity": "high", "risk_score": 85.0, "timestamp": "2026-10-08T06:45:00Z"}

  event: heartbeat
  data: {"timestamp": "2026-10-08T06:45:15Z", "active_connections": 1}
  ```

#### 2. `POST /api/v1/incident-command/execute`
- **Request Body (`IncidentCommandRequest`):**
  - `action`: String (`ALERT_ACKNOWLEDGE`, `ALERT_RESOLVE`, `ALERT_ESCALATE`, `NOTIFICATION_DISPATCH`, `GOVERNOR_LOCKOUT`)
  - `target_id`: Int (e.g. `alert_id`)
  - `justification`: String (optional for Level 1, required for Level 2/3)
  - `idempotency_key`: UUID string
  - `approval_token`: String (optional, required if pre-flight requested)
- **Response (`IncidentCommandResponse`):**
  - `command_id`: String
  - `success`: Boolean
  - `action`: String
  - `target_id`: Int
  - `new_status`: String
  - `governor_status`: String (`ALLOWED`, `COOLDOWN_ACTIVE`, `RATE_LIMITED`, `BREAKER_TRIPPED`)
  - `audit_event_id`: Int
  - `execution_ms`: Float

---

## 16. Frontend Operator Workflow (Live Command Console)

### 16.1 Operator Workspace Architecture
The frontend integrates the Live Incident Command Center directly into the existing React 19 application (`frontend/src/`):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   HONEYSHIELD-X SOC WORKSPACE                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Dashboard]  [Investigation]  [Detection Rules]  [LIVE COMMAND CENTER (3.4)]                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LIVE TELEMETRY BAR:  ● STREAM ACTIVE (SSE)  │  GOVERNOR: HEALTHY  │  BREAKER: CLOSED  │ RATE: 2/10  │
├───────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ ACTIVE INCIDENT STREAM                │ INCIDENT COMMAND CONSOLE                                │
│                                       │                                                         │
│ [CRIT] Alert #45: Brute Force SSH     │ Incident: INC-45 (Alert #45 / Attack #12)               │
│        192.168.1.100 -> Port 22       │ Attacker IP: 192.168.1.100 (Score: 88.5/100)            │
│        Status: OPEN (Just now)        │ Current Status: OPEN  │  Notification: PENDING          │
│                                       │ ─────────────────────────────────────────────────────── │
│ [HIGH] Alert #44: SQLi Probe          │ COMMAND ACTIONS:                                        │
│        10.0.0.55 -> /api/v1/users     │ [✓ Acknowledge]  [✕ Resolve]  [▲ Escalate Priority]     │
│        Status: ACKNOWLEDGED (2m ago)  │                                                         │
│                                       │ OUTBOUND ACTIONS (GOVERNED):                            │
│ [MED]  Alert #42: Port Scan           │ [↻ Re-Dispatch Notification]   [🛡 Export Containment]  │
│        Status: RESOLVED (15m ago)     │                                                         │
│                                       │ GOVERNOR PRE-FLIGHT:                                    │
│                                       │ - Action Allowlisted: YES                               │
│                                       │ - Cooldown Remaining: 0s                                │
│                                       │ - Circuit Breaker: CLOSED (Healthy)                     │
└───────────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

### 16.2 Client-Side Integration Patterns
1. **`useIncidentStream` Hook:**
   - Establishes `EventSource` connection to `/api/v1/incident-command/stream`.
   - On incoming `alert.created` or `alert.status_updated`:
     - Updates local state buffer immediately.
     - Calls `queryClient.invalidateQueries({ queryKey: ['alerts'] })` to synchronize the global React Query cache.
2. **Optimistic UI Updates:**
   - When an operator clicks "Acknowledge", the UI immediately reflects the acknowledged state.
   - If the Governor rejects the action (e.g. rate limit), the UI reverts and displays a warning toast.
3. **Emergency Governor Kill-Switch:**
   - Dedicated toggle in the header allowing an authorized lead analyst to trigger system-wide lockout if anomalies occur.

---

## 17. Data Model Decision: Virtual Incident Projection

### 17.1 The Dilemma: New Table vs. Virtual Projection
A classic dilemma in SOC systems is whether to create a standalone `incidents` database table or compute incidents dynamically.

- **Option 1: New `incidents` Table with Foreign Keys:**
  - Requires: Alembic migration, schema changes in `backend/app/models.py`, foreign keys linking `attacks` and `alerts`, backfilling script for existing data.
  - **Verdict:** **REJECTED.** Violates the non-negotiable **Zero Database Migration** invariant for Phase 3. Adds schema coupling without functional necessity.
- **Option 2: Virtual Incident Projection (Recommended):**
  - An "Incident" in HoneyShield-X is conceptually anchored to an `Alert` and its associated `Attack` container.
  - The API router computes a `VirtualIncident` projection dynamically by joining `Alert`, `Attack`, and recent `AttackEvent` counts in memory / SQL queries.
  - Lifecycle status is persisted directly in `Alert.status` (`open`, `acknowledged`, `resolved`).
  - Audit history is persisted directly in `SystemEvent`.
  - **Verdict:** **APPROVED.** Delivers 100% of the required functionality with **zero migrations**, zero table locks, and zero regression risk to frozen modules.

---

## 18. Performance & Reliability Targets

The following engineering targets are derived directly from the system’s observed performance:

| Metric / Dimension | Target SLA | Verification Method |
| :--- | :--- | :--- |
| **Event Broadcast Latency** | $< 200\text{ ms}$ | Time elapsed from event creation in DB to reception by connected SSE client. |
| **Governor Decision Overhead**| $< 5\text{ ms}$ | In-memory token bucket and cooldown evaluation before command execution. |
| **Command Execution Latency** | $< 50\text{ ms}$ | Round-trip duration for internal alert lifecycle status updates. |
| **Notification Dispatch Latency**| $< 500\text{ ms}$ | Outbound HTTP webhook execution (bounded by 5.0s network timeout). |
| **Circuit Breaker Trip Time** | Instantaneous ($0\text{ ms}$) | Trips on the exact 3rd consecutive outbound error. |
| **Idempotency Cache Retrieval** | $< 2\text{ ms}$ | Lookups in memory dictionary or Redis key cache. |
| **Reconnection Recovery** | $< 5\text{ seconds}$ | Browser `EventSource` automatic exponential-backoff reconnect. |
| **Audit Durability** | $100\%$ | Every state-altering command commits a `SystemEvent` row before returning. |

---

## 19. Explicitly Deferred Capabilities

To maintain rock-solid architectural discipline, the following features are explicitly declared **OUT OF SCOPE** for Module 3.4:

1. **Active Host/Firewall Network Manipulation:**
   - No direct execution of `iptables`, `nftables`, `ufw`, or AWS VPC security group rules. (Deferred to Phase 4 / external orchestration).
2. **Standalone Relational `Incident` Table Migration:**
   - No new database tables or schema migrations. (Deferred to Phase 4).
3. **Full-Duplex WebSockets (WS/WSS):**
   - WebSockets are deferred in favor of the cleaner, proxy-friendly SSE + HTTP REST POST pattern.
4. **Redis Streams Multi-Consumer Architecture:**
   - Deferred; Redis Pub/Sub satisfies all real-time broadcast requirements without persistence duplication.
5. **Autonomous AI Remediation:**
   - Language models and probabilistic reasoning are strictly excluded from the deterministic control plane.
6. **Multi-Tenant Enterprise SAML / OAuth2:**
   - HoneyShield-X remains single-tenant SOC operations. Enterprise multi-tenancy is deferred to Phase 5.

---

## 20. CyberStrike Clean-Room Reconciliation

### 20.1 License Compliance Matrix
- **CyberStrike:** Licensed under **GNU AGPL-3.0**. Strongly viral copyleft across network interactions.
- **CyberStrikeAI:** Licensed under **Apache 2.0** (Go / Eino).
- **Clean-Room Invariant:** Zero source code, zero configuration files, and zero library dependencies have been or will be imported from either repository.

### 20.2 Conceptual Inversion Table

| External Concept (CyberStrike/AI) | External Intent | HoneyShield-X Defensive Inversion | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **AIMD Request Limiter** | Throttles aggressive offensive web vulnerability fuzzing. | **Defensive Operator Rate Limiter:** Regulates operator command velocity to prevent alert fatigue or accidental dispatch storms. | Python token bucket class in `governor.py`. |
| **Circuit Breaker** | Trips when a target web server returns HTTP 429/503 during penetration testing. | **Outbound Notification Breaker:** Sheds traffic when external webhook notification endpoints fail, preventing connection exhaustion. | 3-state breaker (`CLOSED`, `OPEN`, `HALF_OPEN`) guarding `dispatch_alert_notification`. |
| **Session Approval Gate** | Prompts user before executing high-risk offensive exploit modules. | **Human-in-the-Loop Action Guard:** Requires explicit operator confirmation and audit justification for state-altering SOC actions. | 2-phase execution gate with 60s TTL tokens. |
| **Replay Apply Engine** | Replays captured offensive HTTP attack traffic against target servers. | **Isolated Detection Rule Replay:** Evaluates historical honeypot telemetry in memory without mutating database state (Module 3.3). | Completed in Module 3.3. |

---

## 21. Selected Option & Technical Rationale

### 21.1 Selection: OPTION B — Real-Time Incident Operations Core
**Option B is unanimously selected.**

### 21.2 Justification
1. **Perfect Architectural Fit:** Option B builds upon existing, verified repository capabilities—PostgreSQL, Redis 8.1.0, FastAPI, React 19, and TanStack Query—without introducing unneeded external dependencies.
2. **Zero Database Migrations:** By utilizing virtual incident projection and persisting audit history in `SystemEvent`, Option B delivers full incident lifecycle management without touching the database schema.
3. **Honest Defensive Engineering:** Avoids pretending to have active firewall integrations, focusing instead on rock-solid operator triage, deterministic safety governance, and outbound notification circuit breaking.
4. **Deterministic Purity:** Preserves the core principle *"Determinism for Detection; AI for Contextualization"* by enforcing that all command decisions are deterministic and human-gated.

---

## 22. Implementation Sequence

The clean-room implementation of Module 3.4 will execute across eight sequential, verifiable phases:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                MODULE 3.4 IMPLEMENTATION ROADMAP                                │
├──────────────┬──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 0      │ Pre-Implementation Baseline & Safety Verification                                │
│              │ - Verify git HEAD fdcf0f3; confirm clean working tree and test suite (130/16).  │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 1      │ Deterministic Governor & Circuit Breaker Subsystem                               │
│              │ - Create backend/app/incident_command/governor.py; unit test rate limits & CB.   │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 2      │ Real-Time Event Bus & Redis Pub/Sub Subsystem                                    │
│              │ - Create backend/app/incident_command/bus.py; test broadcast & in-memory fallback│
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 3      │ Incident Command Router & Service Layer                                          │
│              │ - Create backend/app/routers/incident_command.py & schemas in app/schemas.py;     │
│              │ - Implement SSE streaming endpoint & governed execute endpoint.                  │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 4      │ Pipeline Event Hooks (Publishing on Ingestion & Alert Creation)                  │
│              │ - Instrument alerts.py & pipeline.py with non-blocking event publishing.         │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 5      │ Frontend Live Stream Hook & Incident Command Console                             │
│              │ - Implement useIncidentStream.ts; build LiveCommandCenter.tsx & GovernorRibbon.  │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 6      │ End-to-End Testing & Regression Gate                                             │
│              │ - Backend pytest suite (+12 new tests); frontend vitest suite (+4 new tests).    │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 7      │ Clean-Room Verification, Pre-Freeze Audit & Report Generation                    │
│              │ - Verify zero migrations, zero dependencies added, zero dirty files.             │
└──────────────┴──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 23. Acceptance Criteria

To achieve certification and freeze, the implementation of Module 3.4 must satisfy all 15 acceptance criteria:

1. **Zero Database Migrations:** Zero Alembic revisions created; `backend/app/models.py` remains completely unmodified.
2. **Zero Dependency Additions:** No new packages added to `requirements.txt` or `package.json`.
3. **Zero Frozen Module Regressions:** All 130 existing backend tests and 16 frontend tests continue to pass 100%.
4. **SSE Stream Availability:** `GET /api/v1/incident-command/stream` connects successfully, sends an initial connection event, and streams heartbeats every 15 seconds.
5. **Real-Time Alert Broadcast:** Creating a new alert or updating an alert status publishes an event received by connected SSE clients within $< 200\text{ ms}$.
6. **Redis Failover Safety:** If Redis is stopped or unreachable, the event bus seamlessly falls back to in-memory dispatch without raising unhandled 500 errors.
7. **Governor Action Allowlist:** Submitting an unlisted action string returns `HTTP 403 Forbidden` with an explicit rejection message.
8. **Governor Rate Limiting:** Exceeding 10 actions within 60 seconds returns `HTTP 429 Too Many Requests` with retry headers.
9. **Target Cooldown Enforcement:** Submitting consecutive state changes against the same alert within 30 seconds returns `HTTP 429`.
10. **Circuit Breaker Trip & Recovery:** After 3 simulated consecutive webhook notification delivery failures, the circuit breaker transitions to `OPEN`, immediately shedding further requests with `HTTP 503`.
11. **Human-in-the-Loop Confirmation:** High-blast-radius actions require explicit justification and valid tokens; empty justifications are rejected with `HTTP 422`.
12. **Idempotency Enforcement:** Submitting duplicate requests with the same `X-Idempotency-Key` executes the business logic exactly once and returns cached results.
13. **Immutable Audit Logging:** Every executed or rejected command creates a corresponding `SystemEvent` record with complete metadata.
14. **Frontend Command Center:** The React UI renders a live streaming pulse, governor health badge, real-time alert feed, and action execution modal.
15. **Production Build Cleanliness:** `vite build` completes with 0 errors and 0 lint warnings; `git diff --check` is clean.

---

## 24. Final Architecture Gate Verdict

### Verdict: **`APPROVED WITH CONDITIONS`**

The architecture for **Module 3.4 — Real-Time Streaming & Live Incident Command (Operations Core)** is fully reconciled, verified against actual repository constraints, and approved to proceed to clean-room implementation, subject to the following non-negotiable conditions:

### Non-Negotiable Conditions:
1. **Condition 1 (Zero Migrations):** All incident management capabilities must operate via virtual projection over existing `Alert`, `Attack`, and `SystemEvent` tables. No database migrations, alterations, or new tables are permitted.
2. **Condition 2 (Deterministic Purity):** No AI/LLM models or probabilistic agents may be introduced into the detection, alert management, governor policy evaluation, response authorization, or state mutation workflows.
3. **Condition 3 (Defensive Boundary):** Active kernel firewall manipulation (`iptables`, `pfctl`) and active network probing are strictly barred. All defensive actions must remain strictly internal to HoneyShield-X's allowlisted operations catalog.
4. **Condition 4 (Clean-Room Isolation):** Zero lines of code or dependencies from CyberStrike (AGPL-3.0) or CyberStrikeAI may enter the repository.
5. **Condition 5 (Fail-Closed Governance):** Any subsystem failure (database contention, unresolvable governor state, circuit breaker trip) must fail closed, rejecting command authorization immediately.

---
*Specification authored and certified by HoneyShield-X Architecture & Security Engineering Team.*
