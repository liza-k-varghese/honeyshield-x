# HoneyShield-X Module 3.5 — Architecture & Research Gate
## Operator Authentication & Audit Compliance

**Document Identifier:** `HSX-ARCH-MOD-3.5-RECON`  
**Milestone:** Phase 3 — Module 3.5 Architecture & Research Gate  
**Status:** ARCHITECTURE DESIGN & RECONCILIATION COMPLETE  
**Current Frozen Baseline:** `f4f9e9eee2163a92a67dfe50b098c4562bef068d` (`feat: add real-time incident operations core`)  
**Frozen Predecessors:**
- Phase 2: `da7e229` (Modules 2.1–2.10 Unified Security Processing Engine)
- Module 3.1: `546add5` (SOC Dashboard Core Workspace)
- Module 3.2: `998fc9f` (Threat Intelligence & Attack-Chain Explorer)
- Module 3.3: `fdcf0f3` (Detection Rule Console & Deterministic Replay)
- Module 3.4: `f4f9e9e` (Real-Time Streaming & Live Incident Command Core)
**Classification:** Defensive Control Plane / Operator Identity, Authentication, and Audit Governance  

---

## 1. Executive Summary & Objective

The primary objective of **Module 3.5 (Operator Authentication & Audit Compliance)** is to eliminate the unauthenticated `X-Operator-Id` identity boundary inherited from Phase 2 and establish an enterprise-grade, cryptographically sound, and deterministic Operator Authentication and Role-Based Access Control (RBAC) layer for HoneyShield-X SOC operations.

In Module 3.4, the pre-freeze hostile audit explicitly recorded finding **HSX-F-3.4-05**:
> *“Unauthenticated `X-Operator-Id` Header Assumption: Operator identity is received as an unauthenticated HTTP header without cryptographic signature, token, or session verification.”*

While Module 3.4 mitigated token substitution by cryptographically binding ephemeral approval tokens to the requesting `operator_id` string, the system still relied on client-supplied headers. Module 3.5 delivers the architectural blueprint to replace this untrusted mechanism with an authenticated, verifiable, session-managed identity pipeline that seamlessly integrates with Module 3.4's deterministic Safety Governor, Human-in-the-Loop (HITL) approval gates, and immutable audit logs.

### Core Architectural Mandates
1. **Zero Weakening of Module 3.4 Safety Controls:** Mandatory Level 3 approval tokens, single-use token consumption, terminal alert state immutability, circuit breaker single-probe gates, and mandatory idempotency must remain 100% intact.
2. **Deterministic Role-Based Authorization:** No probabilistic or heuristic access decisions. Every endpoint evaluates deterministic permission bits.
3. **Fail-Closed Identity Enforcement:** Any request lacking a valid, active, unexpired session token must fail closed with `HTTP 401 Unauthorized` before reaching business logic or the Safety Governor.
4. **Credential-Free Audit Durability:** Immutable audit logs in `SystemEvent` must record operator identity, IP, action, and outcome without logging passwords, tokens, or approval secrets.
5. **Clean-Room Defensive Boundary:** Zero offensive tooling, zero shell execution, and zero AI/LLM authority over authentication, role assignment, or response authorization.

---

## 2. Current Baseline & Frozen Contracts Analysis

An exhaustive inspection of the HoneyShield-X codebase at frozen commit `f4f9e9e` establishes the following architectural baseline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FROZEN BASELINE CONSTRAINTS                     │
├────────────────────────────────┬───────────────────────────────────────┤
│ Subsystem                      │ Existing Architectural Contract       │
├────────────────────────────────┼───────────────────────────────────────┤
│ Database (PostgreSQL)          │ attacks, attack_events, alerts,       │
│                                │ threat_intelligence, system_events.   │
│                                │ Zero operator or auth tables exist.   │
├────────────────────────────────┼───────────────────────────────────────┤
│ Audit Logging                  │ SystemEvent table (Additive logging,  │
│                                │ JSON message payloads, max 2048 chars)│
├────────────────────────────────┼───────────────────────────────────────┤
│ Incident Command (Module 3.4)  │ DeterministicGovernor with singleton  │
│                                │ token bucket, entity cooldowns,       │
│                                │ circuit breaker, approval tokens.     │
├────────────────────────────────┼───────────────────────────────────────┤
│ API Middleware (FastAPI)       │ CORSMiddleware mounted in main.py.    │
│                                │ No authentication middleware present. │
├────────────────────────────────┼───────────────────────────────────────┤
│ Dependency Manifest            │ Python 3.13 standard library, FastAPI,│
│                                │ SQLAlchemy, psycopg, redis, pydantic. │
│                                │ NO pyjwt, passlib, or bcrypt present. │
├────────────────────────────────┼───────────────────────────────────────┤
│ Telemetry Bus                  │ Redis pub/sub with in-memory fallback │
│                                │ and SSE stream on /incident-command.  │
└────────────────────────────────┴───────────────────────────────────────┘
```

### Key Technical Findings from Baseline Inspection
1. **Existing Audit Model (`SystemEvent`):**
   `SystemEvent` stores `event_type`, `source`, `severity`, `message`, and `created_at`. In Module 3.3 and 3.4, `record_operator_audit` stores structured JSON payloads in `message`. This mechanism is fast, battle-tested, and fully capable of storing authentication audits without schema changes.
2. **Existing Identity Injection Point:**
   In `backend/app/routers/incident_command.py`, endpoints receive `x_operator_id: str | None = Header(default="default_operator", alias="X-Operator-Id")`. Module 3.5 must replace this parameter with a FastAPI dependency `Depends(get_current_operator)`.
3. **Dependency Constraints:**
   `backend/requirements.txt` currently lacks third-party JWT or password hashing libraries. However, Python 3.13 includes standard library modules `hashlib` (with PBKDF2-HMAC-SHA256), `hmac` (constant-time digest comparison), `secrets` (CSPRNG), and `base64`. Module 3.5 can either leverage Python's standard cryptographic primitives or formally introduce minimal, audited dependencies (`bcrypt`, `pyjwt`).

---

## 3. Security Design: Operator Authentication

### 3.1 Identity Verification & Credential Handling
- **Password Hashing:**
  - Standard Algorithm: **PBKDF2-HMAC-SHA256** with a minimum of **600,000 iterations** (exceeding OWASP 2024 recommendations) or **Argon2id/bcrypt**.
  - Salt: Cryptographically secure random 16-byte salt per operator generated via `secrets.token_bytes(16)`.
  - Storage Format: Constant-length modular format: `pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>`.
  - Timing-Attack Mitigation: Password comparison must strictly utilize `hmac.compare_digest` to prevent side-channel timing leaks.
- **Credential Brute-Force Protection:**
  - Account Lockout Policy: **5 consecutive failed attempts** triggers a deterministic **15-minute lockout**.
  - Reset Semantic: Successful login resets failed attempt counter to 0.
  - Per-IP Rate Limiting: Governor-enforced rate limiter on `/api/v1/auth/login` (max 5 requests per minute per source IP) returning `HTTP 429 Too Many Requests`.

### 3.2 Session & Token Architecture
Two architectural patterns were evaluated:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TOKEN STRATEGY COMPARISON                            │
├───────────────────────┬────────────────────────────────────────────────┤
│ Approach              │ Characteristics                                │
├───────────────────────┼────────────────────────────────────────────────┤
│ Option 1:             │ - Completely stateless, signed with HMAC-SHA256│
│ Stateless Signed JWT  │ - Problem: Immediate revocation requires a     │
│                       │   distributed denylist (Redis).                │
│                       │ - Problem: Vulnerable to revocation race.      │
├───────────────────────┼────────────────────────────────────────────────┤
│ Option 2:             │ - 256-bit CSPRNG token (secrets.token_urlsafe) │
│ State-Backed Bearer   │ - Stored as SHA-256 hash in Redis / DB.        │
│ Session Token         │ - Immediate, atomic revocation via key delete. │
│ (RECOMMENDED)         │ - Supports active session enumeration.         │
│                       │ - Zero external JWT dependencies required.     │
└───────────────────────┴────────────────────────────────────────────────┘
```

**Recommended Token Strategy: Option 2 (State-Backed Bearer Session Token)**
1. **Token Generation:** Client receives an opaque 32-byte URL-safe string: `hsx_sess_<token_entropy>`.
2. **Storage:** The server hashes the incoming token with SHA-256 and checks the session store (Redis primary with PostgreSQL fallback).
3. **Session Metadata:**
   ```json
   {
     "session_id": "sess-a8f102e3",
     "operator_id": "analyst_sarah",
     "role": "analyst",
     "created_at": 1728374400.0,
     "expires_at": 1728403200.0,
     "last_active": 1728374820.0,
     "client_ip": "192.0.2.45",
     "user_agent": "Mozilla/5.0 ...",
     "revoked": false
   }
   ```
4. **Expiration Policy:**
   - **Absolute Expiration (TTL):** Maximum session lifetime of **8 hours** (typical SOC shift).
   - **Idle Timeout (Inactivity):** Automatic invalidation after **30 minutes** of operator inactivity.
5. **Logout & Invalidation:**
   - Explicit logout immediately deletes/revokes the session hash in storage.
   - Admin revocation endpoint can invalidate all active sessions for a compromised operator (`DELETE /api/v1/auth/operators/{id}/sessions`).

---

## 4. Security Design: Operator Authorization & RBAC Matrix

### 4.1 SOC Operational Roles
HoneyShield-X defines four deterministic operational tiers:

1. **`viewer` (Read-Only Observer):**
   External auditor, junior observer, or executive dashboard user. Observes telemetry, alerts, and investigations without operational mutation rights.
2. **`analyst` (SOC Tier 1/2 Triage Analyst):**
   Investigates alerts, inspects IP dossiers, and performs triage. Authorized for Tier 1 acknowledgment and Tier 2 severity escalation, but prohibited from closing incidents or initiating containment.
3. **`incident_responder` (SOC Tier 3 / Lead Responder):**
   Active incident handler. Authorized to execute incident resolutions, trigger alert notifications, and stage containment recommendations under mandatory HITL approval token governance.
4. **`security_administrator` (SOC Lead / Platform Admin):**
   Full system authority. Controls emergency governor lockout, manages operator accounts and roles, and reviews system audit streams.

### 4.2 Comprehensive Permission Matrix

| Permission Key | Description | Viewer | Analyst | Responder | Admin |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `telemetry:view` | View dashboard, live stream, attack graphs, MITRE matrix | Yes | Yes | Yes | Yes |
| `investigation:view` | Inspect IP dossiers, cross-attack timeline, IOC lookup | Yes | Yes | Yes | Yes |
| `audit:view` | View SystemEvent audit logs (`/api/v1/audit/events`) | No | Yes | Yes | Yes |
| `command:preview` | Request pre-flight governor checks & approval tokens | No | Yes | Yes | Yes |
| `command:ack` | Execute `ALERT_ACKNOWLEDGE`, `NOTIFICATION_SUPPRESS` (Tier 1) | No | Yes | Yes | Yes |
| `command:escalate` | Execute `ALERT_ESCALATE` (Tier 2) | No | Yes | Yes | Yes |
| `command:resolve` | Execute `ALERT_RESOLVE` (Tier 2, requires justification) | No | No | Yes | Yes |
| `command:stage_containment` | Execute `CONTAINMENT_STAGING_REQUEST` (Tier 3, HITL token) | No | No | Yes | Yes |
| `command:dispatch_notification` | Execute `NOTIFICATION_DISPATCH` (Tier 3, HITL token) | No | No | Yes | Yes |
| `governor:lockout` | Engage/release emergency system lockout (`GOVERNOR_LOCKOUT_*`) | No | No | No | Yes |
| `operator:admin` | Create, update, deactivate operators, force logout | No | No | No | Yes |

---

## 5. Module 3.4 Integration & End-to-End Identity Pipeline

The verified authenticated identity must completely replace the raw `X-Operator-Id` header. The end-to-end command flow is structured as follows:

```
[HTTP Request]
   │  Headers: Authorization: Bearer <session_token>
   │           X-Idempotency-Key: <uuid-v4>
   ▼
[1. Authentication Middleware / Dependency]
   ├─ Extract Bearer token & compute SHA-256 hash
   ├─ Query session store (Redis / DB)
   ├─ Validate expiration (8h TTL) & idle timeout (30m)
   ├─ If invalid/expired/revoked: RAISE HTTP 401 UNAUTHORIZED
   └─ Load authenticated Operator (username, role, is_active)
   ▼
[2. Authorization Gate (require_permission)]
   ├─ Evaluate operator.role against endpoint permission requirements
   ├─ If unauthorized for requested action:
   │    ├─ Persist OPERATOR_AUTH_DENIED to SystemEvent
   │    └─ RAISE HTTP 403 FORBIDDEN
   └─ Authorized: Forward operator.username to Service layer
   ▼
[3. Safety Governor Policy Evaluation (Module 3.4)]
   ├─ Action Allowlist Check (8 actions -> HTTP 403)
   ├─ Emergency Outbound Lockout Check (HTTP 503)
   ├─ Circuit Breaker Check (CLOSED / HALF_OPEN single probe -> HTTP 503)
   ├─ Blast Tier & Justification Gate (Tier >= 2 -> min 5 chars -> HTTP 422)
   ├─ Mandatory Level 3 Approval Token Gate (HSX-F-3.4-01 -> HTTP 422)
   ├─ Approval Token Operator Binding Verification (HSX-F-3.4-02):
   │    ├─ Validate: token.operator_id == operator.username
   │    ├─ Validate: token.action == request.action
   │    ├─ Validate: token.target_id == request.target_id
   │    ├─ Validate: now < token.expires_at (60s TTL)
   │    ├─ Consume token atomically (pop-on-read under lock)
   │    └─ Mismatch/Expired: RAISE HTTP 401 UNAUTHORIZED
   ├─ Operator Rate Limit Check (Max 10 / 60s per authenticated operator)
   └─ Entity Cooldown Check (30s cooldown per target)
   ▼
[4. Database Command Execution (PostgreSQL)]
   ├─ Acquire row lock: SELECT ... FOR UPDATE
   ├─ Terminal State Check (HSX-F-3.4-03): If resolved -> RAISE HTTP 409
   ├─ Mutate state (acknowledged, resolved, escalated)
   └─ Commit transaction
   ▼
[5. Immutable Audit Persistence]
   ├─ Write SystemEvent record: INCIDENT_COMMAND_EXECUTED
   │    ├─ operator_id = authenticated username (CANNOT BE FORGED)
   │    ├─ client_ip = request remote IP
   │    └─ No sensitive tokens recorded
   └─ Broadcast command.completed event to Real-Time EventBus
```

### Invariant Preservation Guarantee
- **HSX-F-3.4-01 (Mandatory Level 3 Token):** Remains completely unaltered. Omitting token on Tier 3 actions raises HTTP 422.
- **HSX-F-3.4-02 (Token Operator Binding):** Strengthened! The `operator_id` bound to the preview token comes from the authenticated session, not an untrusted header.
- **HSX-F-3.4-03 (Terminal State Immutability):** Row-level lock and terminal checks continue to raise HTTP 409 Conflict.
- **HSX-F-3.4-04 (Circuit Breaker Gate):** Single-probe reservation in `HALF_OPEN` remains strictly enforced.
- **HSX-F-3.4-06 (Mandatory Idempotency):** `X-Idempotency-Key` continues to be required on all mutating requests.

---

## 6. Audit Compliance & SystemEvent Log Architecture

### 6.1 Audit Event Taxonomy

Every security-relevant operation creates an immutable entry in the `system_events` table via `record_operator_audit`:

| Event Type | Trigger | Severity | Key Payload Metadata |
| :--- | :--- | :---: | :--- |
| `OPERATOR_LOGIN_SUCCESS` | Successful authentication | `info` | `operator_id`, `role`, `client_ip`, `user_agent` |
| `OPERATOR_LOGIN_FAILURE` | Bad password / non-existent user | `warning` | `attempted_username`, `client_ip`, `reason`, `failure_count` |
| `OPERATOR_ACCOUNT_LOCKED` | Exceeded 5 failed login attempts | `high` | `operator_id`, `client_ip`, `locked_until` |
| `OPERATOR_LOGOUT` | Explicit session termination | `info` | `operator_id`, `session_id_prefix`, `client_ip` |
| `OPERATOR_SESSION_EXPIRED` | Idle timeout or absolute TTL | `info` | `operator_id`, `reason` |
| `OPERATOR_AUTH_DENIED` | Role lacks required permission | `warning` | `operator_id`, `role`, `required_permission`, `endpoint` |
| `INCIDENT_COMMAND_PREVIEW` | Approval token generated | `info` | `operator_id`, `action`, `target_id`, `expires_at` |
| `INCIDENT_COMMAND_EXECUTED` | Governed action completed | `info` | `command_id`, `operator_id`, `action`, `target_id`, `diff` |
| `INCIDENT_COMMAND_REJECTED` | Policy rejection (401/403/409/422/503) | `warning` | `operator_id`, `action`, `target_id`, `status_code`, `reason` |
| `GOVERNOR_LOCKOUT_ENGAGE` | Emergency outbound lockout tripped | `critical` | `operator_id`, `justification`, `client_ip` |
| `GOVERNOR_LOCKOUT_RELEASE` | Emergency outbound lockout lifted | `high` | `operator_id`, `client_ip` |
| `OPERATOR_ACCOUNT_CREATED` | New operator provisioned | `info` | `admin_id`, `new_operator_id`, `assigned_role` |
| `OPERATOR_ROLE_MODIFIED` | Operator role changed | `high` | `admin_id`, `target_operator_id`, `prev_role`, `new_role` |
| `BREAK_GLASS_ENGAGED` | Emergency bypass operator used | `critical` | `operator_id`, `justification`, `duration_minutes` |

### 6.2 Data Sanitation & Redaction Rules
1. **Never Log Sensitive Credentials:** Passwords, password hashes, salts, raw bearer tokens, and ephemeral approval token UUIDs must never appear in `message` JSON strings.
2. **Identifier Truncation:** Session IDs in audit logs must be truncated to their prefix: `sess-a8f1...` (first 8 characters only).
3. **Payload Truncation:** User justification and reason strings are bounded to 512 characters to prevent log-injection DoS.

---

## 7. Comprehensive Threat Model & Adversarial Analysis

The proposed architecture addresses 14 distinct threat vectors:

### 1. Stolen Session / Bearer Token
- **Risk:** Adversary captures bearer token via network sniffing or XSS.
- **Mitigation:** Enforce HTTPS in production; sessions expire after 30 minutes of inactivity; maximum 8-hour shift lifetime. Admin can instantly revoke all sessions for a compromised operator.

### 2. Credential Stuffing & Password Brute Force
- **Risk:** Automated dictionary attacks against `/api/v1/auth/login`.
- **Mitigation:** Rate-limited to 5 requests per minute per IP; account is temporarily locked for 15 minutes after 5 consecutive failures. PBKDF2 with 600,000 iterations makes offline cracking cost-prohibitive.

### 3. Replay Attacks
- **Risk:** Intercepted valid command request retransmitted by attacker.
- **Mitigation:** Mandatory `X-Idempotency-Key` (UUID v4) prevents duplicate execution. Once consumed, the governor returns the cached result without re-executing.

### 4. Vertical Privilege Escalation
- **Risk:** Analyst attempts to execute Administrator actions (`GOVERNOR_LOCKOUT_ENGAGE`) or Responder actions (`ALERT_RESOLVE`).
- **Mitigation:** Deterministic permission checks execute before any business logic or Governor evaluation. Roles are immutable on the session object; unauthorized attempts return `HTTP 403 Forbidden` and log `OPERATOR_AUTH_DENIED`.

### 5. Horizontal Privilege Abuse
- **Risk:** Operator A attempts to modify or acknowledge alerts outside their tenant/scope.
- **Mitigation:** In HoneyShield-X System 1, operators share the SOC command scope, but all actions are strictly serialized with row locks (`SELECT ... FOR UPDATE`), audited with the actor's verified username, and rate-limited individually.

### 6. Operator Impersonation
- **Risk:** Client sends forged `X-Operator-Id` header to frame another analyst for a consequential action.
- **Mitigation:** The raw `X-Operator-Id` header is completely removed from authorization trust. The operator identity is strictly derived from the verified Bearer token session.

### 7. Approval Token Substitution (HSX-F-3.4-02 Attack)
- **Risk:** Analyst B intercepts a pre-flight approval token generated by Responder A and attempts to execute Tier 3 containment.
- **Mitigation:** Governor checks `token.operator_id == session.operator_id`. Any mismatch raises `HTTP 401 Unauthorized` and immediately invalidates the token.

### 8. Cross-Site Request Forgery (CSRF)
- **Risk:** Malicious website tricks operator's browser into executing a command.
- **Mitigation:** HoneyShield-X utilizes standard `Authorization: Bearer <token>` headers rather than ambient browser cookies. Browsers do not automatically attach Bearer headers on cross-site requests. If cookie transport is enabled, `SameSite=Strict` and custom headers (`X-Requested-With`) are mandated.

### 9. Session Fixation
- **Risk:** Adversary establishes a session and tricks victim into authenticating with the pre-set session ID.
- **Mitigation:** A completely fresh session ID is generated via CSPRNG upon every successful login. Any pre-existing anonymous session is discarded.

### 10. Logout / Revocation Race Condition
- **Risk:** Attacker rapidly fires commands while operator clicks logout.
- **Mitigation:** Session deletion in Redis/DB is atomic. The Governor checks the session on every request under connection pooling; once deleted, subsequent requests fail immediately with `HTTP 401`.

### 11. Concurrent Command Race Conditions
- **Risk:** Multiple tabs from same operator issue conflicting commands simultaneously.
- **Mitigation:** Idempotency reservation lock in Governor; PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) in Service; entity cooldowns prevent command flapping.

### 12. Audit Tampering
- **Risk:** Rogue operator attempts to delete or alter audit logs to cover tracks.
- **Mitigation:** `SystemEvent` table has no `UPDATE` or `DELETE` endpoints exposed via the API. All audit insertions are append-only.

### 13. Clock Skew / Timing Desynchronization
- **Risk:** Distributed servers with misaligned clocks cause valid tokens to be prematurely expired or expired tokens to be accepted.
- **Mitigation:** Single centralized database / Redis clock source; standard 5-second leeway buffer applied to TTL evaluations.

### 14. Fail-Open Authentication / Authorization
- **Risk:** If authentication service throws an unhandled exception or database connection drops, requests proceed unauthorized.
- **Mitigation:** All dependency gates are wrapped in `try/except` with explicit `raise HTTPException(status_code=500)` or `401`. Under zero circumstances does the request fall through to business logic.

---

## 8. Controlled Emergency / Break-Glass Mechanism

### 8.1 Operational Need
In critical security emergencies (e.g., identity database corruption, credential lockouts during active ransomware incident), SOC operations require a deterministic, fail-safe mechanism to restore access without kernel modification.

### 8.2 Break-Glass Architecture
1. **Bootstrap Emergency Account:**
   A pre-configured emergency account (`emergency_breakglass`) defined with credentials stored in an offline sealed safe.
2. **Deterministic Activation Requirements:**
   - Must call dedicated endpoint: `POST /api/v1/auth/break-glass`.
   - Requires valid break-glass passphrase.
   - **Mandatory Justification:** Must provide an operational justification of at least **20 characters**.
3. **Strict Time-Boxing:**
   - Break-glass sessions are strictly capped at **30 minutes maximum**.
   - No idle-timeout extensions; session terminates automatically after 30 minutes.
4. **Immediate High-Severity Telemetry:**
   - Creates a `BREAK_GLASS_ENGAGED` audit record with `severity="critical"`.
   - Broadcasts a priority banner event to all connected SOC dashboard clients via SSE (`system.breakglass`).
5. **No Safety Governor Bypass:**
   - Break-glass grants `security_administrator` role permissions.
   - **Crucial Invariant:** Break-glass DOES NOT bypass Module 3.4 Safety Governor allowlists, circuit breaker limits, terminal state immutability, or PostgreSQL row locks.

---

## 9. Database Architecture: Migration vs. Zero-Migration Evaluation

Module 3.5 requires careful evaluation regarding whether to introduce database schema migrations.

### Option A: Persistent Database Migration (Recommended for Production)
Introduces two dedicated tables via Alembic:

```sql
-- 1. Operators Table
CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_operators_username ON operators(username);

-- 2. Operator Sessions Table
CREATE TABLE operator_sessions (
    id SERIAL PRIMARY KEY,
    session_id_hash VARCHAR(64) UNIQUE NOT NULL,
    operator_id INT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    client_ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL
);
CREATE INDEX ix_operator_sessions_hash ON operator_sessions(session_id_hash);
CREATE INDEX ix_operator_sessions_operator ON operator_sessions(operator_id);
```

### Option B: Zero-Migration Architecture (Preserving Strict Zero-Migration Contract)
If project governance strictly mandates continuing the Phase 3 zero-migration policy:
1. **Operator Store:** Seeded via environment variables or encrypted configuration file (`HONEYSHIELD_OPERATORS_JSON`), loaded into a thread-safe in-memory/Redis registry at startup.
2. **Session Store:** Active session hashes stored entirely in Redis (`auth:session:<hash>`) with native Redis TTL keys.
3. **Audit Trails:** Persisted entirely into the existing `system_events` table using JSON payloads.
4. **Verdict on Zero-Migration:** Feasible, highly performant, and 100% compliant with zero-migration constraints.

**Recommendation:** Present both options to project leadership. Option B allows complete Module 3.5 delivery with zero migrations, while Option A provides standard enterprise relational persistence.

---

## 10. Frontend Architecture & Operator UX

### 10.1 UI State & Component Structure
1. **Authentication Context (`AuthContext.tsx`):**
   - Manages `token`, `currentOperator: { username, role, permissions }`, and `isAuthenticated`.
   - Stores token in secure session storage (cleared on tab close).
2. **Header User Ribbon (`Header.tsx`):**
   - Displays authenticated operator name and color-coded role badge:
     - `Viewer`: Slate badge (`bg-slate-800 text-slate-300`)
     - `Analyst`: Amber badge (`bg-amber-900/60 text-amber-300`)
     - `Responder`: Cyan badge (`bg-cyan-900/60 text-cyan-300`)
     - `Admin`: Purple badge (`bg-purple-900/60 text-purple-300`)
   - Includes quick "Logout" button with confirmation.
3. **Role-Aware Action Controls:**
   - In `LiveCommandCenterView.tsx` and `CommandExecutionModal.tsx`, action buttons verify `hasPermission(action)`:
     - If unauthorized: button is disabled with explanatory tooltip (e.g., *"Requires Incident Responder role"*).
4. **Session Expiration Interceptor:**
   - Axios / Fetch response interceptor catches `HTTP 401`:
   - Dispatches `SESSION_EXPIRED` event, displays toast alert: *"Your SOC session has expired. Please re-authenticate."*, and renders modal login overlay without losing operator's work context.

---

## 11. Complete API Contract & Endpoint Classification

### 11.1 Endpoint Taxonomy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MODULE 3.5 API TAXONOMY                         │
├───────────────────────┬────────┬───────────────────────────────────────┤
│ Endpoint              │ Method │ Access Tier & Required Permission     │
├───────────────────────┼────────┼───────────────────────────────────────┤
│ /health               │ GET    │ Public (Unauthenticated)              │
│ /api/v1/auth/login    │ POST   │ Public (Rate-limited to 5 req/min)    │
│ /api/v1/auth/logout   │ POST   │ Authenticated (Any active session)    │
│ /api/v1/auth/me       │ GET    │ Authenticated (Returns active profile)│
├───────────────────────┼────────┼───────────────────────────────────────┤
│ /api/v1/dashboard/*   │ GET    │ Role-Protected: telemetry:view        │
│ /api/v1/attacks/*     │ GET    │ Role-Protected: telemetry:view        │
│ /api/v1/alerts/*      │ GET    │ Role-Protected: telemetry:view        │
│ /api/v1/investigation │ GET    │ Role-Protected: investigation:view    │
│ /api/v1/rules/*       │ GET    │ Role-Protected: investigation:view    │
├───────────────────────┼────────┼───────────────────────────────────────┤
│ /api/v1/audit/events  │ GET    │ Role-Protected: audit:view            │
├───────────────────────┼────────┼───────────────────────────────────────┤
│ /incident-cmd/preview │ POST   │ Role-Protected: command:preview       │
│ /incident-cmd/execute │ POST   │ Role-Protected: command:<action>      │
├───────────────────────┼────────┼───────────────────────────────────────┤
│ /incident-cmd/lockout │ POST   │ Privileged: governor:lockout          │
│ /api/v1/operators/*   │ CRUD   │ Privileged: operator:admin            │
│ /api/v1/auth/break-gl │ POST   │ Privileged: Emergency credentials     │
└───────────────────────┴────────┴───────────────────────────────────────┘
```

---

## 12. Compliance Posture Matrix

| Compliance Framework | Target Control | Status in Module 3.5 | Future Work (Enterprise) |
| :--- | :--- | :--- | :--- |
| **SOC 2 Type II** | **CC6.1 (Logical Access)** | **ADDRESSED** via deterministic RBAC and unique operator IDs. | SAML/OIDC SSO Integration |
| **SOC 2 Type II** | **CC6.2 (User Credentials)** | **ADDRESSED** via PBKDF2 hashing, lockout, and password complexity. | Hardware MFA (FIDO2) |
| **SOC 2 Type II** | **CC6.3 (Access Revocation)** | **ADDRESSED** via immediate session revocation and idle timeouts. | Automated SCIM de-provisioning |
| **SOC 2 Type II** | **CC7.2 (Security Monitoring)** | **ADDRESSED** via comprehensive SystemEvent audit trails. | External TLS Syslog / SIEM pipeline |
| **ISO/IEC 27001:2022** | **A.5.15 (Access Control)** | **ADDRESSED** via least-privilege 4-tier role separation. | Attribute-Based Access Control (ABAC) |
| **ISO/IEC 27001:2022** | **A.8.5 (Secure Auth)** | **ADDRESSED** via CSPRNG bearer tokens and rate limiting. | Client Certificate (mTLS) Auth |
| **NIST CSF 2.0** | **PR.AA-01 (Identity Mgmt)** | **ADDRESSED** via central operator registry and session tracking. | Centralized Active Directory sync |

---

## 13. Implementation Plan & Migration Strategy

When Module 3.5 implementation begins, execution must follow strict phased gates:

1. **Phase 1: Cryptographic Primitives & Password Hashing**
   - Implement PBKDF2-HMAC-SHA256 hasher and CSPRNG session generator using standard library `hashlib` and `secrets`.
2. **Phase 2: Session Store & Authentication Service**
   - Build `AuthService` handling login, token generation, session lookup, idle timeout, and lockout tracking.
3. **Phase 3: FastAPI Dependencies & Middleware**
   - Create `get_current_operator` and `require_permission(perm)` dependencies.
4. **Phase 4: Router Integration & Header Replacement**
   - Wire dependencies into `routers/incident_command.py`, replacing raw `X-Operator-Id` parameters.
5. **Phase 5: Audit Event Taxonomy Alignment**
   - Verify all authentication and authorization outcomes log to `SystemEvent`.
6. **Phase 6: Frontend Login UX & Role Badging**
   - Implement login modal, session persistence, role badges, and 401/403 interceptors.
7. **Phase 7: Adversarial Verification & Pre-Freeze Audit**
   - Test all 14 threat model vectors before freezing.

---

## 14. Architectural Verdict & Recommendations

### **ARCHITECTURE GATE VERDICT: APPROVED WITH CONDITIONS**

**Conditions for Implementation:**
1. **Option B (Zero Migrations) or User-Approved Option A:** If user approves Alembic migration, proceed with Option A. If zero-migration contract is maintained, execute Option B using Redis/config operator registry.
2. **No External Heavy Dependencies:** Leverage Python 3.13 standard library (`hashlib`, `hmac`, `secrets`) or minimal approved packages.
3. **Strict Fail-Closed Behavior:** Any authentication ambiguity must return `HTTP 401`; any role ambiguity must return `HTTP 403`.
4. **Preserve All Module 3.4 Invariants:** Approval token binding, single-use guarantees, circuit breaker gates, and terminal alert state immutability must remain untouched.

Module 3.5 architecture is formally approved to proceed to user review.
