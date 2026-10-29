# HoneyShield-X — Walkthrough 3: Stage B Preflight & Test Plan Report

**Platform:** HoneyShield-X Enterprise Autonomous Defense & SOC Platform  
**Document ID:** `HSX-PLAN-WALKTHROUGH-3-STAGE-B`  
**Date:** October 28, 2026  
**Evaluator:** Senior Autonomous Security Architect  
**Active Git Branch:** `main` (synchronized with `origin/main`)  
**HEAD Commit Hash:** [`1641d4eca7f7d13862e5c0fae4602cfbee59bd0b`](file:///home/liza/HoneyShield-X/backend/tests/) (`test: isolate test fixtures and resolve cross-test db pollution`)  
**Target Milestone:** Walkthrough 3, Stage B: Governor Containment Staging & Safeguards (Modules 3.4 & 3.5)  
**Report Location:** [`walkthrough_3_stage_b_preflight_and_plan_report.md`](file:///home/liza/HoneyShield-X/walkthrough_3_stage_b_preflight_and_plan_report.md)  
**Stage B Status:** **PREFLIGHT COMPLETE — STOPPED FOR USER REVIEW & EXPLICIT STAGE B AUTHORIZATION**

---

## 1. Executive Summary & Preflight Verification Matrix

In accordance with the directive for **Walkthrough 3 Stage B Preflight**, this document establishes the baseline state and presents a comprehensive, non-destructive test execution plan covering the remaining Governor approval, containment staging, and circuit safeguards.

**Per mandatory instructions, zero state-changing containment actions, lockout engagements, token consumptions, or cooldown triggers were executed during this preflight.**

```
+========================================================================================================+
|                       WALKTHROUGH 3 STAGE B PREFLIGHT & READINESS MATRIX                               |
+========================================================================================================+
| Git Baseline                    : main @ 1641d4eca7f7d13862e5c0fae4602cfbee59bd0b                      |
| Working Tree Status             : Clean (Zero tracked modifications, pristine baseline)                |
| Remote Tracking State           : Up to date with origin/main                                          |
| Live Service Health             : FastAPI (0.0.0.0:8000), PostgreSQL 17, Redis, Vite (0.0.0.0:5173)   |
| Governor Engine State           : lockout_engaged=False, circuit_breaker=CLOSED, active_cooldowns=0    |
| Target Entity State             : Alert #4113 (status: open, severity: critical, attack: 8367)         |
| Preflight State Mutation        : ZERO state-changing actions executed during preflight                |
| Stage B Preflight Status        : COMPLETE                                                             |
| Stage B Execution Status        : HOLD — AWAITING EXPLICIT USER AUTHORIZATION                         |
+========================================================================================================+
```

---

## 2. Baseline Evidence & System State

### 2.1 Git Repository & Working Tree
- **Branch:** `main` (synchronized with `origin/main`).
- **HEAD Commit:** [`1641d4eca7f7d13862e5c0fae4602cfbee59bd0b`](file:///home/liza/HoneyShield-X/backend/tests/).
- **Working Tree:** Pristine (0 modified tracked files).
- **Report Integrity:** All 24 prior markdown audit and freeze reports preserved.

### 2.2 Live Service Daemons
- **FastAPI Backend (PID 4855):** `GET http://127.0.0.1:8000/health` &rarr; `{"status":"ok","service":"HoneyShield X API","postgresql":"connected","redis":"connected"}`.
- **Vite Frontend (PID 4866):** `http://127.0.0.1:5173` &rarr; HTTP 200 OK.
- **PostgreSQL 17 (Port 5432):** Active and connected (`postgresql://honeyshield:change_this_password@127.0.0.1:5432/honeyshield`).
- **Redis (Port 6379):** Active and connected.

### 2.3 Live Database Row Counts (Baseline Pre-Stage B)
- `attacks`: **60**
- `alerts`: **22**
- `attack_events`: **1123**
- `threat_intelligence`: **8**
- `system_events`: **2497** (includes all audit entries from Stage A)

### 2.4 Designated Local Synthetic Target State
- **Target Entity:** Alert ID `4113`
- **Correlated Attack ID:** `8367`
- **Target Source IP:** `198.51.100.103` (RFC 5737 `TEST-NET-2` documentation range)
- **Current Status:** `open`
- **Severity:** `critical`
- **Alert Type:** `web_access`

### 2.5 Live Governor Telemetry (Pre-Stage B)
- **Endpoint:** `GET /api/v1/incident-command/governor/status`
- **`lockout_engaged`:** `false`
- **`circuit_breaker_status`:** `CLOSED`
- **`active_cooldowns_count`:** 0
- **`operator_actions_last_minute`:** 0

---

## 3. Architecture & Interaction Analysis

An audit of [`backend/app/incident_command/governor.py`](file:///home/liza/HoneyShield-X/backend/app/incident_command/governor.py) and [`backend/app/incident_command/service.py`](file:///home/liza/HoneyShield-X/backend/app/incident_command/service.py) identifies the following critical state interactions:

```mermaid
flowchart TD
    Req["Incoming Command Request"] --> IdemCheck{"Idempotency Cache Check"}
    IdemCheck -- "Key Hit (COMPLETED)" --> ReturnCached["Return Cached Response Immediately (No re-eval / no audit)"]
    IdemCheck -- "Key Miss / Fresh" --> PolicyEval["Governor Policy Evaluation"]
    
    PolicyEval --> Allowlist["1. Allowlist Gate"]
    Allowlist --> Lockout["2. Emergency Lockout Gate"]
    Lockout --> Breaker["3. Circuit Breaker Gate"]
    Breaker --> TokenGate["4. Blast Tier-3 & Approval Token Gate"]
    
    TokenGate -- "Token Verification" --> TokenCheck{"_verify_and_consume_approval_token"}
    TokenCheck -- "Invalid / Expired / Mismatch" --> FailToken["HTTP 401 Rejection (Audit Logged)"]
    TokenCheck -- "Valid" --> PopToken["Consume & Pop Token from Memory"]
    
    PopToken --> RateLimit["5. Operator Rate Limiting Gate (10/min)"]
    RateLimit --> Cooldown["6. Entity Cooldown Gate (30s Window)"]
    Cooldown -- "Active Cooldown (<30s)" --> FailCool["HTTP 429 Rejection (Audit Logged)"]
    Cooldown -- "Elapsed" --> ExecAction["Execute Action Logic"]
    
    ExecAction --> RecordStamp["Stamp Entity Cooldown & Operator Rate"]
    RecordStamp --> AuditLog["Append SystemEvent Audit Record"]
    AuditLog --> CacheResp["Cache Response under Idempotency Key"]
    CacheResp --> Done["Return 200 OK Response"]
```

### Critical Component Interactions:
1. **Idempotency vs. Token Consumption:**
   - When an action successfully completes, its response is cached under `X-Idempotency-Key`.
   - Replaying the *same* `X-Idempotency-Key` returns the cached payload immediately without re-checking the approval token or re-running the cooldown.
   - Using the *same* token with a *different* `X-Idempotency-Key` bypasses the idempotency cache and reaches token validation, which fails with `HTTP 401 Unauthorized` because the token was already consumed.
2. **Cooldown vs. Re-Execution:**
   - A successful command execution registers a 30.0-second cooldown on `(action, target_id)`.
   - Even with a brand-new valid approval token, any subsequent execution against the same target within 30 seconds is blocked with `HTTP 429 Too Many Requests`.
3. **Lockout vs. Outbound Dispatches:**
   - Engaging emergency lockout blocks outbound actions (`NOTIFICATION_DISPATCH`, `SOAR_BLOCK_DISPATCH`, `CAMPAIGN_CONTAINMENT_DISPATCH`, `HUNT_PROMOTION_DISPATCH`) with `HTTP 503 Service Unavailable`.
   - Releasing emergency lockout immediately clears the flag and restores outbound command handling.
4. **Non-Destructive Containment Design:**
   - In [`service.py`](file:///home/liza/HoneyShield-X/backend/app/incident_command/service.py#L278-L297), `CONTAINMENT_STAGING_REQUEST` generates an auditable containment recommendation artifact and records the action in `system_events`.
   - **It does not touch the host Linux kernel, `iptables`, `nftables`, or external network routing tables.**
   - It does not modify `alert.status` or `attack` rows in PostgreSQL.

---

## 4. Proposed Stage B Test Matrix

The proposed verification plan is structured into 6 sequential phases, isolating each mechanism and verifying exact observable responses and audit trails:

```
+==================================================================================================================================+
|                                    STAGE B PROPOSED TEST EXECUTION MATRIX                                                        |
+==================================================================================================================================+
| Phase  | Test Case Description             | Endpoint & Method                 | Operator Persona   | Expected HTTP Code         |
+==================================================================================================================================+
| 1.1    | Approval Token Issuance           | POST /incident-command/preview    | responder_alex     | HTTP 200 OK (60s TTL)      |
| 1.2    | Approval Token Expiration Check   | POST /incident-command/execute    | responder_alex     | HTTP 401 (Expired Token)   |
+----------------------------------------------------------------------------------------------------------------------------------+
| 2.1    | Token Action Mismatch Rejection   | POST /incident-command/execute    | responder_alex     | HTTP 401 (Action Mismatch) |
| 2.2    | Token Target Mismatch Rejection   | POST /incident-command/execute    | responder_alex     | HTTP 401 (Target Mismatch) |
| 2.3    | Token Operator Mismatch Rejection | POST /incident-command/execute    | admin_chief        | HTTP 401 (Operator Mismatch|
+----------------------------------------------------------------------------------------------------------------------------------+
| 3.1    | Valid Token Issuance for Staging  | POST /incident-command/preview    | responder_alex     | HTTP 200 OK (Token T_stage)|
| 3.2    | Governed Containment Staging Exec | POST /incident-command/execute    | responder_alex     | HTTP 200 (staged_contain)  |
| 3.3    | Idempotency Key Replay Protection | POST /incident-command/execute    | responder_alex     | HTTP 200 (Cached Response) |
+----------------------------------------------------------------------------------------------------------------------------------+
| 4.1    | Single-Use Token Reuse Rejection  | POST /incident-command/execute    | responder_alex     | HTTP 401 (Token Consumed)  |
+----------------------------------------------------------------------------------------------------------------------------------+
| 5.1    | Entity Cooldown Flapping Block    | POST /incident-command/execute    | responder_alex     | HTTP 429 Too Many Requests |
+----------------------------------------------------------------------------------------------------------------------------------+
| 6.1    | Emergency Lockout Engagement      | POST /incident-command/governor/lo| admin_chief        | HTTP 200 (lockout: true)   |
| 6.2    | Outbound Dispatch Blocked (503)   | POST /incident-command/execute    | admin_chief        | HTTP 503 (Lockout Active)  |
| 6.3    | Emergency Lockout Release         | POST /incident-command/governor/lo| admin_chief        | HTTP 200 (lockout: false)  |
| 6.4    | Post-Release Telemetry Confirm    | GET  /incident-command/governor/st| viewer_dan         | HTTP 200 (Clean Baseline)  |
+==================================================================================================================================+
```

---

## 5. Detailed Test Sequence & Expected Signatures

### Phase 1: Approval-Token Lifecycle & Expiration

#### Test 1.1: Ephemeral Approval Token Issuance
- **Endpoint:** `POST /api/v1/incident-command/preview`
- **Operator:** `responder_alex` (Bearer session token, role `incident_responder`, possesses `command:preview`).
- **Request Payload:**
  ```json
  {
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 4113,
    "justification": "Valid operator justification for lifecycle test"
  }
  ```
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:** Contains `approval_token` (UUID v4), `expires_in_seconds: 60`, `action: "CONTAINMENT_STAGING_REQUEST"`, `target_id: 4113`, `operator_id: "responder_alex"`.
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_PREVIEW"`.

#### Test 1.2: Token Expiration Check
- **Procedure:** Wait 61 seconds for the token's 60-second TTL to lapse naturally.
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `responder_alex`
- **Headers:** `X-Idempotency-Key: <fresh-uuid4>`
- **Request Payload:**
  ```json
  {
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 4113,
    "approval_token": "<expired-token-from-1.1>",
    "justification": "Attempting redemption of expired token"
  }
  ```
- **Expected Status:** `HTTP 401 Unauthorized`
- **Observable Response:** `{"detail": "Approval token has expired. Please request a new preview token."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`, `rejected_status_code: 401`.

---

### Phase 2: Approval-Token Binding to Action, Target, and Operator

#### Test 2.1: Action Mismatch Rejection
- **Precondition:** Issue fresh token $T_a$ via `/preview` for `CONTAINMENT_STAGING_REQUEST` on Alert `4113`.
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `responder_alex`
- **Headers:** `X-Idempotency-Key: <fresh-uuid4>`
- **Request Payload:**
  ```json
  {
    "action": "SOAR_BLOCK_DISPATCH",
    "target_id": 4113,
    "approval_token": "<token-Ta>",
    "justification": "Attempting redemption with mismatched action"
  }
  ```
- **Expected Status:** `HTTP 401 Unauthorized`
- **Observable Response:** `{"detail": "Approval token mismatch for requested action or target."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`.

#### Test 2.2: Target Mismatch Rejection
- **Precondition:** Issue fresh token $T_b$ via `/preview` for `CONTAINMENT_STAGING_REQUEST` on Alert `4113`.
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `responder_alex`
- **Headers:** `X-Idempotency-Key: <fresh-uuid4>`
- **Request Payload:**
  ```json
  {
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 9999,
    "approval_token": "<token-Tb>",
    "justification": "Attempting redemption with mismatched target ID"
  }
  ```
- **Expected Status:** `HTTP 401 Unauthorized`
- **Observable Response:** `{"detail": "Approval token mismatch for requested action or target."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`.

#### Test 2.3: Operator Identity Mismatch Rejection
- **Precondition:** Issue fresh token $T_c$ via `/preview` as `responder_alex` for `CONTAINMENT_STAGING_REQUEST` on Alert `4113`.
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `admin_chief` (different operator identity).
- **Headers:** `X-Idempotency-Key: <fresh-uuid4>`
- **Request Payload:**
  ```json
  {
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 4113,
    "approval_token": "<token-Tc>",
    "justification": "Admin attempting redemption of token issued to responder"
  }
  ```
- **Expected Status:** `HTTP 401 Unauthorized`
- **Observable Response:** `{"detail": "Approval token operator mismatch: token was issued to 'responder_alex', but redemption attempted by 'admin_chief'."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`.

---

### Phase 3: Governed Containment Staging & Idempotency Behavior

#### Test 3.1 & 3.2: Governed Containment Staging Execution
- **Step 3.1:** Issue valid approval token $T_{stage}$ via `/preview` as `responder_alex` for Alert `4113`.
- **Step 3.2:** Execute command:
  - **Endpoint:** `POST /api/v1/incident-command/execute`
  - **Operator:** `responder_alex`
  - **Headers:** `X-Idempotency-Key: <key-K1>`
  - **Request Payload:**
    ```json
    {
      "action": "CONTAINMENT_STAGING_REQUEST",
      "target_id": 4113,
      "approval_token": "<token-Tstage>",
      "justification": "Controlled walkthrough staging against synthetic target Alert 4113"
    }
    ```
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:**
  ```json
  {
    "command_id": "cmd-...",
    "success": true,
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 4113,
    "new_status": "staged_containment",
    "message": "Containment recommendation staged for Alert #4113 (IP: 198.51.100.103). Blocklist artifact generated in audit log. (Host kernel routing untouched).",
    "governor_status": "ALLOWED",
    "audit_event_id": "<id>"
  }
  ```
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_EXECUTED"`.
- **Side Effects Stamped:**
  - Token $T_{stage}$ consumed and popped from in-memory dictionary.
  - Entity cooldown stamped: `("CONTAINMENT_STAGING_REQUEST", 4113) = now`.
  - Operator rate timestamp stamped: `responder_alex = now`.
  - Idempotency record `<key-K1>` set to `status: "COMPLETED"`.

#### Test 3.3: Idempotency-Key Replay Protection
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `responder_alex`
- **Headers:** `X-Idempotency-Key: <key-K1>` (identical to Step 3.2)
- **Request Payload:** Identical payload with token $T_{stage}$.
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:** Exactly identical response payload as Step 3.2.
- **Verification:**
  - Served directly from cache via `check_idempotency`.
  - Zero duplicate database records written.
  - Zero cooldown conflict triggered.

---

### Phase 4: Single-Use Token Redemption Rejection

#### Test 4.1: Single-Use Token Reuse Rejection
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `responder_alex`
- **Headers:** `X-Idempotency-Key: <fresh-key-K2>` (new key to bypass idempotency cache).
- **Request Payload:**
  ```json
  {
    "action": "CONTAINMENT_STAGING_REQUEST",
    "target_id": 4113,
    "approval_token": "<token-Tstage>",
    "justification": "Attempting re-use of already consumed token"
  }
  ```
- **Expected Status:** `HTTP 401 Unauthorized`
- **Observable Response:** `{"detail": "Invalid or expired approval token."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`.
- **Finding:** Confirms that once consumed in Step 3.2, token $T_{stage}$ cannot be reused under any circumstances.

---

### Phase 5: Entity Cooldown Flapping Safeguard

#### Test 5.1: Entity Cooldown Flapping Block
- **Timing:** Executed within the 30-second window following Step 3.2.
- **Step 5.1a:** Request a brand new valid approval token $T_{new}$ via `/preview` for Alert `4113`.
- **Step 5.1b:** Execute command with new token:
  - **Endpoint:** `POST /api/v1/incident-command/execute`
  - **Operator:** `responder_alex`
  - **Headers:** `X-Idempotency-Key: <fresh-key-K3>`
  - **Request Payload:**
    ```json
    {
      "action": "CONTAINMENT_STAGING_REQUEST",
      "target_id": 4113,
      "approval_token": "<token-Tnew>",
      "justification": "Attempting rapid command execution during active cooldown"
    }
    ```
- **Expected Status:** `HTTP 429 Too Many Requests`
- **Observable Response:** `{"detail": "Target entity #4113 is in cooldown for action 'CONTAINMENT_STAGING_REQUEST'. Please wait Xs before re-executing."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`, `rejected_status_code: 429`.
- **Finding:** Governor successfully prevents rapid command flapping against the same target entity even when a valid approval token is presented.

---

### Phase 6: Emergency Outbound Lockout Safeguard & Reliable Restoration

#### Test 6.1: Emergency Outbound Lockout Engagement
- **Endpoint:** `POST /api/v1/incident-command/governor/lockout`
- **Operator:** `admin_chief` (role `security_administrator`, possesses `governor:lockout`).
- **Request Payload:**
  ```json
  {
    "engaged": true,
    "justification": "Emergency lockout safeguard drill verification"
  }
  ```
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:** Contains `new_status: "lockout_engaged"`, `success: true`.
- **Expected Audit Records:**
  - `system_events` row with `event_type: "INCIDENT_COMMAND_EXECUTED"` (command service).
  - `system_events` row with `event_type: "GOVERNOR_LOCKOUT_ENGAGE"`, severity `critical` (router).

#### Test 6.2: Outbound Dispatch Blocked Under Lockout
- **Endpoint:** `POST /api/v1/incident-command/execute`
- **Operator:** `admin_chief`
- **Headers:** `X-Idempotency-Key: <fresh-key-K4>`
- **Request Payload:**
  ```json
  {
    "action": "SOAR_BLOCK_DISPATCH",
    "target_id": 4113,
    "justification": "Attempting outbound dispatch during active lockout"
  }
  ```
- **Expected Status:** `HTTP 503 Service Unavailable`
- **Observable Response:** `{"detail": "Governor emergency lockout is actively engaged. Outbound notification, containment, and promotion dispatches are blocked."}`
- **Expected Audit Record:** `system_events` row with `event_type: "INCIDENT_COMMAND_REJECTED"`, `rejected_status_code: 503`.

#### Test 6.3: Emergency Outbound Lockout Release (Restoration)
- **Endpoint:** `POST /api/v1/incident-command/governor/lockout`
- **Operator:** `admin_chief`
- **Request Payload:**
  ```json
  {
    "engaged": false,
    "justification": "Restoring standard operations post drill verification"
  }
  ```
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:** Contains `new_status: "lockout_released"`, `success: true`.
- **Expected Audit Records:**
  - `system_events` row with `event_type: "INCIDENT_COMMAND_EXECUTED"`.
  - `system_events` row with `event_type: "GOVERNOR_LOCKOUT_RELEASE"`, severity `high`.

#### Test 6.4: Post-Release Telemetry Confirmation
- **Endpoint:** `GET /api/v1/incident-command/governor/status`
- **Operator:** `viewer_dan`
- **Expected Status:** `HTTP 200 OK`
- **Observable Response:** `lockout_engaged: false`, `circuit_breaker.state: CLOSED`.

---

## 6. Potential Side Effects & State Changes Catalog

| Scope | Proposed Action | Expected State Change | Invariant & Safety Boundary |
| :--- | :--- | :--- | :--- |
| **Database: `alerts`** | Containment Staging | **Zero mutations.** Status remains `open`, severity `critical`. | Immutable |
| **Database: `attacks`** | All actions | **Zero mutations.** Row count remains 60. | Immutable |
| **Database: `attack_events`**| All actions | **Zero mutations.** Row count remains 1123. | Immutable |
| **Database: `threat_intel`** | All actions | **Zero mutations.** Row count remains 8. | Immutable |
| **Database: `system_events`**| Previews, Rejections, Execution, Lockouts | Appends audit rows (~12 rows across tests). | Durability verification only |
| **Host Linux Kernel** | Containment Staging | **Zero changes.** Zero iptables, routing, or socket changes. | Immutable |
| **Governor In-Memory** | Token creation | Generates ephemeral token (TTL 60s). | Cleared on pop / expiry |
| **Governor In-Memory** | Containment Staging | Stamps 30s cooldown on `("CONTAINMENT_STAGING_REQUEST", 4113)`.| Natural expiry in 30s |
| **Governor In-Memory** | Idempotency Caching | Caches completed payload under UUID key. | Natural TTL cleanup |
| **Governor In-Memory** | Lockout Toggle | `_emergency_lockout` set to `True` in 6.1, restored to `False` in 6.3.| Fully restored to initial state |

---

## 7. Cleanup & Rollback Plan

1. **Lockout State Verification:**
   - Immediately following Step 6.3, verify `lockout_engaged == false` via `GET /governor/status`.
   - If Step 6.3 fails for any reason, execute immediate fallback: call `/governor/lockout` with `engaged=False` or programmatically reset `default_governor.set_lockout(False)`.
2. **Cooldown Normalization:**
   - Allow the 30-second entity cooldown to lapse naturally or verify its timestamp.
3. **Database Consistency Reconciliation:**
   - Execute post-run SQL count verification:
     - `SELECT COUNT(*) FROM attacks;` &rarr; 60
     - `SELECT COUNT(*) FROM alerts;` &rarr; 22
     - `SELECT id, status, severity FROM alerts WHERE id = 4113;` &rarr; `(4113, 'open', 'critical')`
     - `SELECT COUNT(*) FROM attack_events;` &rarr; 1123
     - `SELECT COUNT(*) FROM threat_intelligence;` &rarr; 8
   - Reconcile `system_events` rows to confirm every audit event corresponds to a known test step.

---

## 8. Explicit Approval Checkpoints & Stop Condition

Per the Stage B directive:
> *"Stop after producing the plan. Do not execute Stage B until the user reviews and explicitly authorizes the exact state-changing actions and target."*

**Stage B Preflight Status:** **`PASS`**  
**Execution Gate Status:** **`HOLD — AWAITING EXPLICIT USER AUTHORIZATION`**

### Summary of Approvals Requested:
1. Authorization to execute **Phase 1** (Token preview and 61s natural expiry verification).
2. Authorization to execute **Phase 2** (Token action, target, and operator mismatch rejection checks).
3. Authorization to execute **Phase 3** (Controlled containment staging on synthetic Alert `4113` and idempotency replay).
4. Authorization to execute **Phase 4** (Single-use token re-use rejection check).
5. Authorization to execute **Phase 5** (Entity cooldown rejection check within the 30s window).
6. Authorization to execute **Phase 6** (Admin emergency lockout engagement, outbound 503 rejection, and reliable release back to `lockout_engaged: false`).

***

*Awaiting your review and explicit authorization to proceed with the execution of Stage B.*

