# MODULE 3.11 ARCHITECTURE RECONCILIATION REPORT

**Platform:** HoneyShield-X Enterprise Autonomous Defense & SOC Platform
**Target Module:** Module 3.11 — Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)
**Evaluator:** Architecture Reconciliation Gate
**Frozen Predecessor Baseline:** `5e60b7f894cf3aca9c55d5db15836ac737e75270` (Module 3.10 Frozen Locally)
**Research Reference Artifact:** `module_3_11_architecture_research.md`
**Status:** **APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT**
**Remote Push Status:** **STRICTLY ZERO PUSH**
**Database Migrations Required:** **EXACTLY 0**
**SQLAlchemy Model Changes:** **EXACTLY 0**
**New Third-Party Dependencies:** **EXACTLY 0**
**Code Modifications in this Gate:** **EXACTLY ZERO**

---

## 1. Executive Verdict

**VERDICT: APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT**

The architecture for **Module 3.11: Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)** has been fully reconciled against the authoritative frozen baseline commit `5e60b7f894cf3aca9c55d5db15836ac737e75270`.

All research ambiguities—including regex safety, lifecycle state transitions, dual-mode storage bounds, relational field projections, Governor interaction, EventBus loop prevention, and closed-loop promotion boundaries—have been resolved with deterministic, fail-closed contracts. Module 3.11 maintains 100% backward compatibility with Modules 2.1 through 3.10, introduces exactly zero database migrations, zero SQLAlchemy model alterations, and zero new dependencies.

```
+========================================================================================+
|                       MODULE 3.11 ARCHITECTURAL RECONCILIATION SUMMARY                 |
+========================================================================================+
| Baseline Commit       : 5e60b7f894cf3aca9c55d5db15836ac737e75270 (Module 3.10 Frozen)  |
| Winning Candidate     : Retrospective Threat Hunting & Adversary Hypothesis Engine     |
| Substrate Class       : System 2 — Operator Decision-Support Substrate                 |
| Containment Authority : ZERO (Pure Read-Only Retrospective Analysis & Staging)         |
| Database Migrations   : EXACTLY ZERO (Redis primary + Thread-Safe Memory Fallback)     |
| SQLAlchemy Models     : EXACTLY ZERO Modifications (Read-only projections on M2.x)     |
| New Dependencies      : EXACTLY ZERO                                                   |
| Code Modifications    : EXACTLY ZERO in this Reconciliation Gate                       |
| Final Gate Verdict    : APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT            |
+========================================================================================+
```

---

## 2. Frozen Baseline Verification

The authoritative baseline commit is `5e60b7f894cf3aca9c55d5db15836ac737e75270` (`feat: add cross-module attack campaign intelligence`). Clean-room repository verification confirms that all prerequisite subsystems are frozen, functional, and available for integration:

| Module | Source Location | Verified Capabilities & Contracts |
|---|---|---|
| **Module 2.8** | `backend/app/correlation/` | Temporal multi-attack pattern matching, windowed correlation scoring (24h). |
| **Module 2.9** | `backend/app/multi_vector_detection/` | Canonical vector classification (`auth`, `web`, `network`), declarative detection rules. |
| **Module 2.10** | `backend/app/unified_engine/` | Ingestion pipeline, real-time event routing, baseline threat scoring. |
| **Module 3.1** | `frontend/src/components/DashboardView.tsx` | SOC metrics, KPI cards, real-time alert feed. |
| **Module 3.2** | `backend/app/investigation/` | Attack progression graph, entity relationship mapping. |
| **Module 3.3** | `backend/app/multi_vector_detection/registry.py` | Declarative detection rule catalog (`DetectionRuleRegistry`), deterministic event replay. |
| **Module 3.4** | `backend/app/incident_command/governor.py` | Governor safety engine, circuit breaker, idempotency cache, emergency lockout. |
| **Module 3.5** | `backend/app/auth/registry.py` | 4-tier operator roles (`viewer`, `analyst`, `incident_responder`, `security_administrator`). |
| **Module 3.6** | `backend/app/cases/service.py` | Case management, playbooks, checklist tasks, forensic journals (`IncidentCase`). |
| **Module 3.7** | `backend/app/deception/service.py` | Active deception grid, canary honeytokens, tripwire hit tracking. |
| **Module 3.8** | `backend/app/threat_intelligence/service.py` | IOC lifecycle, confidence half-life decay, indicator tagging, STIX 2.1 export. |
| **Module 3.9** | `backend/app/integrations/dispatcher.py` | Outbound SIEM/SOAR webhooks, HMAC signing, SSRF validation, DLQ replay. |
| **Module 3.10** | `backend/app/campaigns/service.py` | Deterministic DSU clustering, Jaccard similarity, 4h sliding window, DAG read-model. |

---

## 3. Core Module 3.11 Ownership & Non-Goals

### 3.1 What Module 3.11 Owns
1. **Hypothesis Management:** Lifecycle tracking of structured SOC threat hunt hypotheses (`hunt-[12 hex chars]`).
2. **Deterministic Retrospective Querying:** Multi-attribute query execution over historical relational telemetry (`attacks`, `attack_events`, `alerts`, `threat_intelligence`).
3. **Forensic Evidence Collating:** Compilation of matched entity records into bounded Hunt Dossiers with analyst forensic commentary.
4. **Closed-Loop Promotion:** Explicit, operator-initiated conversion of hunt findings into **INACTIVE/DRAFT** Detection Rules (Module 3.3) or Incident Cases (Module 3.6).
5. **Operator Audit & Governance:** Tracking of all hypothesis mutations, query executions, and promotions via `SystemEvent`.

### 3.2 What Module 3.11 Deliberately Does NOT Do
1. **NO Autonomous Containment:** Module 3.11 possesses **ZERO containment authority**. It cannot block IPs, quarantine hosts, or revoke credentials.
2. **NO Autonomous Rule Activation:** Promoted detection rules are created strictly as `draft` / inactive rules requiring Module 3.3 deterministic replay validation before activation.
3. **NO Autonomous Execution from Events:** Module 3.11 never triggers retrospective queries automatically upon receiving EventBus events. All executions require authenticated operator initiation.
4. **NO Telemetry Mutation:** Historical hunts are strictly read-only. Executing a hunt never alters the status, risk score, or metadata of underlying attacks, alerts, or campaigns.
5. **NO Unbounded Wildcard Scans:** Bounded to a maximum 30-day temporal window and maximum 200 matched results.

---

## 4. Resolution of Research Ambiguities

### 4.1 Deterministic Regex & Query Predicate Safety
**Research Proposal:** Runtime timeout-based regex safety with fallback to substring search if evaluation exceeds 5ms.
**Reconciled Decision:** **REJECTED.** Runtime timeout detection is inherently non-deterministic, platform-dependent, and vulnerable to catastrophic backtracking (ReDoS) thread starvation.

**Approved Deterministic Policy:**
1. **Default Matching Mode:** Literal, case-insensitive substring search (`str.lower() in field.lower()` or SQL parameterized `ILIKE %pattern%`).
2. **Fail-Closed Regex Validation (Evaluated BEFORE Compilation):**
   - Maximum pattern length: **$\le 64$ characters**.
   - **Prohibited Constructs (Deterministic AST/Syntax Rejection):**
     - Nested quantifiers: Rejects `(a+)+`, `(a*)*`, `(a|b+)+`, `.*.*`.
     - Lookaround assertions: Rejects `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`.
     - Backreferences: Rejects `\1`, `\2`, `(?P=name)`.
     - Unbounded repetition ranges: Bounded quantifier `{n,m}` requires $m \le 20$.
   - **Allowed Regex Constructs:** Literal tokens, character sets `[a-zA-Z0-9_.-]`, boundaries `\b`, `^`, `$`, and single un-nested quantifiers `?`, `*`, `+` within the 64-character limit.
   - Any pattern violating these rules is rejected deterministically with `HTTP 422 Unprocessable Content` before any database query or regex execution begins.

### 4.2 Storage Capacity vs. Eviction Ambiguity
**Research Proposal:** Max 500 active hunts, FIFO eviction of archived hunts.
**Reconciled Decision:** Fully disambiguated two-tier capacity model:
1. **Maximum Active (Non-Archived) Hunts:** **200**.
2. **Maximum Total Stored Hunts:** **500**.
3. **Deterministic FIFO Eviction Algorithm:**
   - Eviction is triggered when total stored hunts reach **500**.
   - **Tier 1 Eviction:** Oldest `ARCHIVED` hunts (sorted by `updated_at` ascending) are evicted first.
   - **Tier 2 Eviction (Only if 0 archived hunts exist):** Oldest `CONCLUDED` hunts with verdict `benign_activity` or `inconclusive` (sorted by `updated_at` ascending).
   - **Protected States:** Hunts in `DRAFT`, `RUNNING`, `COMPLETED`, or `CONCLUDED` with verdict `malicious_confirmed` are **strictly unevictable**.
   - **Hard Overflow Protection:** If all 500 stored hunts are protected, new hunt creation is rejected with `HTTP 409 Conflict` ("Hunt storage capacity reached. Archive concluded hunts to free capacity.").

---

## 5. Reconciled Hunt Lifecycle & State Machine

```
               +---------------------------------------------------+
               |                                                   |
               v                                                   |
           [ DRAFT ] ---> [ SCHEDULED ] ---> [ RUNNING ]           |
               |                                 |                 |
               |                                 v                 |
               +-------------------------> [ COMPLETED ]           |
                                                 |                 |
                                                 v                 |
                                           [ CONCLUDED ] --------->+ (Re-run permitted)
                                                 |
                                                 v
                                           [ ARCHIVED ] (Terminal)
```

### Legal State Transitions & Preconditions

| Transition | From State | To State | Allowed Roles | Preconditions & Execution Behavior |
|---|---|---|---|---|
| **Create Draft** | *None* | `DRAFT` | `analyst`, `responder`, `admin` | Hypothesis title (10–150 chars), narrative, and MITRE tags provided. Bound to `created_by`. |
| **Execute Hunt** | `DRAFT` / `COMPLETED` / `CONCLUDED` | `SCHEDULED` $\to$ `RUNNING` | `analyst`, `responder`, `admin` | Acquires single-flight mutex. Validates query predicates. If re-run, increments `execution_count` and refreshes evidence. |
| **Execution Complete** | `RUNNING` | `COMPLETED` | System | Query successfully finishes within 3.0s limit. Evidence collated into dossier. Mutex released. |
| **Execution Abort/Fail** | `RUNNING` | `DRAFT` | System | On query timeout (>3.0s) or database error, state reverts to `DRAFT` with error logged in dossier. |
| **Conclude Hunt** | `COMPLETED` | `CONCLUDED` | `analyst`, `responder`, `admin` | Analyst submits conclusion summary ($\ge 10$ chars) and verdict (`malicious_confirmed`, `benign_activity`, `inconclusive`). |
| **Archive Hunt** | `CONCLUDED` | `ARCHIVED` | `security_administrator` | Moves hunt to terminal read-only archive. Immutable; no further edits, re-runs, or promotions permitted. |

---

## 6. Deterministic Query Language & Schema Verification

Historical hunting is **strictly read-only** against existing, frozen relational database models in `backend/app/models.py`.

### Verified Source Field Mapping

| Hunting Filter Field | Source Table (`models.py`) | Actual Column & Type | Indexing Status | Supported Filter Operation |
|---|---|---|---|---|
| `time_range_start` / `end` | `attacks` / `alerts` / `attack_events` | `detected_at` / `created_at` / `event_time` (`DateTime`) | **Indexed** | Range: `col >= start AND col <= end` (Max 30 days) |
| `source_ips` | `attacks` / `attack_events` | `source_ip` (`String(45)`) | Scanned | Exact match or /24 subnet match |
| `destination_ips` | `attacks` | `destination_ip` (`String(45)`) | Scanned | Exact internal decoy IP match |
| `attack_types` | `attacks` | `attack_type` (`String(100)`) | Scanned | Exact match (`in_([types])`) |
| `severities` | `attacks` / `alerts` | `severity` (`String(20)`) | Scanned | Exact match (`low`, `medium`, `high`, `critical`) |
| `alert_statuses` | `alerts` | `status` (`String(30)`) | Scanned | Exact match (`open`, `resolved`, `acknowledged`) |
| `payload_substring` | `attack_events` | `message` (`Text`) | Scanned | Parameterized substring: `message ILIKE :pattern` |
| `ioc_values` | `threat_intelligence` | `indicator_value` (`String(255)`) | Scanned | Exact match or substring |
| `canary_ids` | Deception Store (Redis/Memory) | `canary_id` (`str`) | $O(1)$ Hash | Key lookup in Deception Store |
| `campaign_ids` | Campaign Store (Redis/Memory) | `campaign_id` (`str`) | $O(1)$ Hash | Key lookup in Campaign Store |

### Query Execution Invariants
1. **Logical Operator:** All supplied filter clauses are joined by **AND**. Multiple values within an array parameter are evaluated as **OR**.
2. **Maximum Predicates:** A single hunt query may contain at most **10** active filter clauses.
3. **Maximum Time Span:** `time_range_end - time_range_start` cannot exceed **30 days** (2,592,000 seconds).
4. **Deterministic Ordering:** Results ordered by `timestamp` DESC, secondary `id` DESC.
5. **Hard Result Cap:** Evaluated SQL queries enforce `LIMIT 200`. At most **200** evidence items are returned per execution.
6. **Query Timeout:** Database cursor execution bounded to **3.0 seconds**. If exceeded, query is cancelled safely without hanging the connection pool.

---

## 7. Reconciled Evidence & Dossier Model

A `HuntDossier` aggregates the full investigative context into an explainable, bounded structure:

```python
class HuntEvidenceRecord(BaseModel):
    evidence_id: str = Field(description="Deterministic ID: ev-[12 hex]")
    entity_type: str = Field(description="attack, alert, attack_event, canary_hit, ioc_match, campaign")
    entity_id: str = Field(description="Underlying entity identifier, e.g. atk-101, CAN-01")
    timestamp: str = Field(description="ISO 8601 UTC observation timestamp")
    summary: str = Field(max_length=255, description="Brief narrative of evidence")
    source_ip: str | None = Field(default=None, max_length=45)
    destination_ip: str | None = Field(default=None, max_length=45)
    technique: str | None = Field(default=None, max_length=50)
    attributes: dict[str, Any] = Field(default_factory=dict, description="Sanitized key-value attributes")

class HuntDossier(BaseModel):
    hunt_id: str = Field(description="Format: hunt-[12 hex]")
    title: str = Field(min_length=10, max_length=150)
    description: str = Field(max_length=2000)
    status: str = Field(description="draft, scheduled, running, completed, concluded, archived")
    severity: str = Field(description="low, medium, high, critical")
    mitre_tactics: list[str] = Field(default_factory=list)
    mitre_techniques: list[str] = Field(default_factory=list)
    query_spec: HuntQuerySpec
    evidence: list[HuntEvidenceRecord] = Field(default_factory=list)  # Max 200 items
    forensic_notes: list[HuntNote] = Field(default_factory=list)
    conclusion_summary: str | None = Field(default=None, max_length=1000)
    verdict: str | None = Field(default=None, description="malicious_confirmed, benign_activity, inconclusive")
    promoted_rule_ids: list[str] = Field(default_factory=list)
    promoted_case_ids: list[str] = Field(default_factory=list)
    execution_count: int = Field(default=0)
    last_executed_at: str | None = Field(default=None)
    created_by: str = Field(description="Operator username")
    created_at: str
    updated_at: str
```

### Sensitive Data Scrubbing
Prior to serialization, evidence attributes are recursively sanitized:
- Any attribute key containing `password`, `secret`, `token`, `key`, or `auth` is masked as `[REDACTED]`.
- Dossier payload size is capped at **64 KB** (65,536 bytes). If serialized JSON exceeds 64KB, evidence attributes are truncated. If still exceeding 64KB, a `ValueError` is raised, preventing bloated writes.

---

## 8. Role-Based Access Control (RBAC) Entitlements

Module 3.11 registers 6 explicit permissions in `backend/app/auth/registry.py`:

```python
HUNT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "viewer": {
        "hunt:view",
    },
    "analyst": {
        "hunt:view",
        "hunt:create",
        "hunt:update",
        "hunt:execute",
        "hunt:promote",
    },
    "incident_responder": {
        "hunt:view",
        "hunt:create",
        "hunt:update",
        "hunt:execute",
        "hunt:promote",
    },
    "security_administrator": {
        "hunt:view",
        "hunt:create",
        "hunt:update",
        "hunt:execute",
        "hunt:promote",
        "hunt:admin",
    },
}
```

### Granular Ownership & Mutation Rules
1. **Analyst Ownership Binding:** An analyst may edit their own `DRAFT` hypothesis and query specification. An analyst cannot edit the hypothesis of another analyst unless granted `hunt:admin`.
2. **Forensic Collaboration:** Any authenticated analyst or responder may append timestamped forensic notes to any non-archived hunt.
3. **Administrative Authority (`hunt:admin`):** Only a `security_administrator` can archive a hunt (`POST /hunts/{id}/archive`) or override its status.
4. **Deletion Prohibition:** Permanent deletion is **strictly prohibited** across all roles to ensure immutable SOC audit compliance.

---

## 9. Closed-Loop Promotion Contracts

### 9.1 Promotion to Detection Rule (Module 3.3)
- **Endpoint:** `POST /api/v1/hunts/{hunt_id}/promote/rule`
- **Precondition:** Hunt must be in `COMPLETED` or `CONCLUDED` state with at least 1 evidence record.
- **Contract with Module 3.3:**
  - Registers a new rule in `DetectionRuleRegistry` (Module 3.3).
  - Rule ID format: `DET-HUNT-[8 hex chars]`.
  - **Invariance Rule:** The promoted rule is flagged as `is_active = False` (DRAFT/INACTIVE).
  - The rule requires explicit operator testing via Module 3.3 deterministic replay before activation.
  - Provenance: Description explicitly records `[Derived from Threat Hunt {hunt_id} by {operator}]`.
  - **Idempotency:** Re-promoting with the same parameters returns the previously minted rule ID without creating duplicates.

### 9.2 Promotion to Incident Case (Module 3.6)
- **Endpoint:** `POST /api/v1/hunts/{hunt_id}/promote/case`
- **Precondition:** Hunt must be in `COMPLETED` or `CONCLUDED` state with verdict `malicious_confirmed`.
- **Contract with Module 3.6:**
  - Calls `default_case_service.create_case(...)` using authenticated operator context.
  - Generates `IncidentCase` with title `[Hunt Escalation] {hunt_title}`.
  - Attaches matched alert IDs from hunt evidence to `initial_alert_ids`.
  - Sets playbook template to `ADVANCED_THREAT_HUNT_DISCOVERY`.
  - Records hunt link in case initial note.
  - Appends minted `case_id` to `hunt.promoted_case_ids`.
  - **Idempotency:** If the hunt was already promoted to an active case, the endpoint returns the existing `case_id` without creating duplicate cases.

---

## 10. Governor Policy Reconciliation

Module 3.11 registers the following action in `backend/app/incident_command/governor.py`:

```python
# Governor Action Registration
ALLOWED_ACTIONS.add("HUNT_PROMOTION_DISPATCH")
BLAST_RADIUS_TIERS["HUNT_PROMOTION_DISPATCH"] = 2
```

### Action Classification
- **Observational (Tier 0):** `GET /hunts`, `GET /hunts/{id}`, `GET /hunts/metrics/summary`. Free of Governor evaluation.
- **Tier 1 (Execution):** `POST /hunts/{id}/execute`. Single-flight concurrency lock enforced; rate-limited to 1 request per 10s per operator.
- **Tier 2 (Promotion):** `POST /hunts/{id}/promote/rule`, `POST /hunts/{id}/promote/case`.
  - Evaluated via Governor `evaluate_command_policy`.
  - Requires valid justification ($\ge 10$ chars).
  - Operator rate limit enforced (10 actions/min).
  - Subject to entity cooldown (30s per hunt).
  - Blocked when Governor emergency lockout is active (`HTTP 503 Service Unavailable`).
- **Tier 3 (Containment):** **Module 3.11 has ZERO Tier-3 containment authority.** Any subsequent containment must be dispatched through existing Module 3.4 / 3.6 / 3.10 Governor controls.

---

## 11. EventBus Contract & Recursion Prevention

### 11.1 Published Events

| Event Channel | Event Type | Trigger Condition | Payload Contents |
|---|---|---|---|
| `hsx:events:broadcast` | `hunt.created` | New hunt draft registered | `hunt_id`, `title`, `severity`, `created_by` |
| `hsx:events:broadcast` | `hunt.executed` | Retrospective query completes | `hunt_id`, `matched_count`, `duration_ms`, `operator_id` |
| `hsx:events:broadcast` | `hunt.concluded` | Analyst finalizes verdict | `hunt_id`, `verdict`, `operator_id` |
| `hsx:events:broadcast` | `hunt.promoted` | Findings promoted to Rule/Case | `hunt_id`, `target_type`, `target_id`, `operator_id` |

### 11.2 Consumed Events
- Module 3.11 subscribes to `hsx:events:broadcast` with strict loop prevention:
  - Any event with prefix `hunt.*` or `system.*` is **immediately ignored**.
  - `campaign.detected` and `canary.tripwire` events are recorded as observational triggers for suggested hunt hypotheses.
  - **Non-Execution Invariant:** Automated hypothesis suggestions create `DRAFT` hypotheses flagged with `is_automated_suggestion = True`. They are **NEVER** automatically executed.

---

## 12. Audit Logging Contract (`SystemEvent`)

All consequential mutations generate immutable `SystemEvent` records in PostgreSQL:

| Action | `event_type` | `severity` | Formatted Audit Message |
|---|---|:---:|---|
| Create Hypothesis | `HUNT_CREATED` | `info` | `Operator {op} created threat hunt {hunt_id}: {title}` |
| Execute Query | `HUNT_EXECUTED` | `info` | `Operator {op} executed hunt {hunt_id}: {count} records matched in {ms}ms` |
| Conclude Verdict | `HUNT_CONCLUDED` | `warning` | `Operator {op} concluded hunt {hunt_id} with verdict {verdict}` |
| Archive Hunt | `HUNT_ARCHIVED` | `info` | `Administrator {op} archived hunt {hunt_id}` |
| Promote to Rule | `HUNT_RULE_PROMOTION` | `warning` | `Operator {op} promoted hunt {hunt_id} to draft detection rule {rule_id}` |
| Promote to Case | `HUNT_CASE_PROMOTION` | `high` | `Operator {op} promoted hunt {hunt_id} to incident case {case_id}` |
| Access Denied | `HUNT_ACCESS_DENIED` | `warning` | `Operator {op} denied permission {perm} on hunt {hunt_id}` |

---

## 13. Reconciled API Surface & Schema Contract

All endpoints mounted under `/api/v1/hunts`:

```
GET    /api/v1/hunts                     -> ListHuntResponse
POST   /api/v1/hunts                     -> HuntDossier (Create Draft)
GET    /api/v1/hunts/{hunt_id}           -> HuntDossier (Retrieve Full Dossier)
PATCH  /api/v1/hunts/{hunt_id}           -> HuntDossier (Update Metadata/Conclusion)
POST   /api/v1/hunts/{hunt_id}/execute   -> HuntExecutionResponse (Run Scan)
POST   /api/v1/hunts/{hunt_id}/promote/rule -> HuntPromotionResponse (Mint Draft Rule)
POST   /api/v1/hunts/{hunt_id}/promote/case -> HuntPromotionResponse (Mint Incident Case)
POST   /api/v1/hunts/{hunt_id}/archive   -> HuntDossier (Move to Archived)
GET    /api/v1/hunts/metrics/summary     -> HuntMetricsResponse (KPIs)
```

---

## 14. Performance & Resource Bounds

| Metric | Target | Hard Safety Limit | Deterministic Enforcement Mechanism |
|---|:---:|:---:|---|
| **Dossier Key Lookup** | $< 5$ ms | $< 25$ ms | In-memory dict lookup / Redis hash read |
| **7-Day Retrospective Query** | $< 250$ ms | $< 1,500$ ms | Indexed `DateTime` SQL filters, `LIMIT 200` |
| **30-Day Retrospective Query** | $< 800$ ms | $< 3,000$ ms | Indexed `DateTime` SQL filters, `LIMIT 200` |
| **Database Query Timeout** | 1.0 s | 3.0 s | Statement execution timeout |
| **Regex Pattern Length** | $< 32$ chars | $\le 64$ chars | Pydantic regex `max_length=64` validation |
| **Maximum Results Per Run** | 50 records | 200 records | SQL `LIMIT 200` |
| **Maximum Active Hunts** | 100 | 200 | Creation rejection if $>200$ non-archived |
| **Maximum Total Stored Hunts** | 300 | 500 | FIFO eviction of archived hunts |
| **Serialized Dossier Size** | $< 16$ KB | $\le 64$ KB (65,536 bytes) | Evidence array capping & payload size validation |
| **Concurrent Executions** | 1 at a time | 1 at a time | `threading.Lock()` single-flight mutex (`HTTP 409`) |
| **Operator Rate Limit** | 1 / 10s | 1 / 10s | Sliding window per-operator lock (`HTTP 429`) |

---

## 15. Frontend / SOC Operator Interface Contract

A dedicated **Threat Hunting Console** accessible via `/hunts`:
1. **KPI Ribbon:** Total Hunts, Active Hunts, Confirmed Threats, Promoted Detection Rules.
2. **Hunt Inventory Table:** Filterable by status, severity, and MITRE tactic with pagination and sorting.
3. **Hypothesis Creation Modal:** Guided authoring of hypotheses, MITRE technique tags, and query parameters.
4. **Hunt Dossier Drawer:**
   - **Hypothesis Tab:** Threat narrative, creator attribution, lifecycle badges.
   - **Query & Execution Tab:** Date range picker, predicate builder, execute button with live progress spinner.
   - **Findings & Evidence Tab:** Evidence table with severity badges, entity deep-links, and attribute inspector flyout.
   - **Forensic Journal Tab:** Chronological commentary feed with note composer.
5. **Promotion Modal:** Two-phase confirmation to promote to Draft Rule (M3.3) or Incident Case (M3.6).

---

## 16. Implementation Boundary

### Files to CREATE (15 Files)
- `backend/app/hunting/__init__.py`
- `backend/app/hunting/engine.py` (Retrospective query engine & regex safety validator)
- `backend/app/hunting/storage.py` (Dual-mode HuntStore, capacity bounds, FIFO eviction)
- `backend/app/hunting/service.py` (HuntService, single-flight mutex, promotion adapters)
- `backend/app/routers/hunts.py` (FastAPI REST router with RBAC guards)
- `backend/tests/test_module_3_11_hunting.py` (Unit tests for engine and storage)
- `backend/tests/test_module_3_11_rbac.py` (RBAC entitlement tests)
- `backend/tests/test_module_3_11_integration.py` (Cross-module promotion and EventBus tests)
- `backend/tests/test_module_3_11_hostile.py` (Adversarial ReDoS, SQLi, and capacity tests)
- `frontend/src/components/ThreatHuntingView.tsx` (Main SOC hunting workspace)
- `frontend/src/components/HuntDossierDrawer.tsx` (Dossier detail side drawer)
- `frontend/src/components/HuntHypothesisModal.tsx` (Hypothesis creation modal)
- `frontend/src/components/HuntPromotionModal.tsx` (Promotion to rule/case modal)
- `frontend/src/hooks/useThreatHunting.ts` (React Query hooks)
- `frontend/src/tests/hunting.test.tsx` (Vitest frontend test suite)

### Files to MODIFY (7 Files)
- `backend/app/auth/registry.py` (Register `hunt:*` permissions)
- `backend/app/incident_command/governor.py` (Register `HUNT_PROMOTION_DISPATCH` action)
- `backend/app/main.py` (Mount `hunts.router` under `/api/v1`)
- `backend/app/schemas.py` (Add Hunt schemas)
- `frontend/src/App.tsx` (Add `/hunts` route)
- `frontend/src/components/Header.tsx` (Add "Threat Hunting" navigation link)
- `frontend/src/types/index.ts` (Add Hunt TypeScript types)

### Files that MUST Remain UNTOUCHED
- `backend/alembic/versions/*` (**EXACTLY 0 MIGRATIONS**)
- `backend/app/models.py` (**EXACTLY 0 MODEL ALTERATIONS**)
- `requirements.txt` (**EXACTLY 0 NEW DEPENDENCIES**)
- `package.json` (**EXACTLY 0 NEW DEPENDENCIES**)
- `backend/app/campaigns/*` (Frozen Module 3.10)
- `backend/app/integrations/*` (Frozen Module 3.9)
- `backend/app/threat_intelligence/*` (Frozen Module 3.8)
- `backend/app/deception/*` (Frozen Module 3.7)
- `backend/app/cases/*` (Frozen Module 3.6)

---

## 17. Final Gate Verdict

All 25 architectural contracts and safety invariants have been fully reconciled against the frozen baseline commit `5e60b7f894cf3aca9c55d5db15836ac737e75270`. Zero conflicts, zero migrations, and zero dependency additions remain.

**RECONCILIATION VERDICT:**
**APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT**
