# MODULE 3.11 ARCHITECTURE RESEARCH REPORT

**Platform:** HoneyShield-X Enterprise Autonomous Defense & SOC Platform
**Target Module:** Module 3.11 — Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)
**Evaluator:** Architecture & Research Review Gate
**Frozen Predecessor Baseline:** `5e60b7f894cf3aca9c55d5db15836ac737e75270` (Module 3.10 Frozen Locally)
**Status:** **PROPOSED — REQUIRES ARCHITECTURE RECONCILIATION**
**Remote Push Status:** **STRICTLY ZERO PUSH**
**Database Migrations Required:** **EXACTLY 0**
**SQLAlchemy Model Changes:** **EXACTLY 0**
**New Third-Party Dependencies:** **EXACTLY 0**

---

## 1. Executive Summary

HoneyShield-X has established a robust, deterministic, multi-layered defensive security platform spanning real-time attack detection (Modules 2.1–2.10), operator visualization (3.1–3.2), detection rule management and deterministic replay (3.3), incident command and safety governor (3.4), operator authentication and RBAC (3.5), incident case management and playbooks (3.6), active deception grids and canary honeytokens (3.7), threat intelligence and IOC decay fusion (3.8), enterprise outbound SIEM/SOAR gateways (3.9), and cross-module attack campaign intelligence with multi-entity correlation graphs (3.10).

However, the platform currently operates primarily in a **reactive** paradigm: security events must match static detection rules, trigger active honeytokens, match known IOCs, or cross temporal correlation thresholds before an operator is alerted or a campaign is formed. Advanced persistent threats (APTs), low-and-slow reconnaissance, dormant lateral movement, and evasion techniques frequently operate below instantaneous threshold triggers.

**Module 3.11: Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)** introduces a structured, hypothesis-driven, proactive threat hunting workspace to HoneyShield-X. It empowers SOC analysts and threat hunters to formulate formal adversary hypotheses (e.g., "Adversaries leveraging Tor exit nodes interacting with deception tokens during non-business hours", "Subnet-wide lateral movement probing internal port 445 without generating alerts"), execute deterministic retrospective scans across historical telemetry, collect forensic evidence into Hunt Dossiers, and seamlessly pivot validated findings into new Detection Rules (Module 3.3) or Incident Cases (Module 3.6).

This research report evaluates 5 candidate module directions, establishes a weighted selection framework, specifies the complete state, API, EventBus, Governor, RBAC, and storage models for the winning architecture, performs a comprehensive security threat model, and sets the acceptance boundary for subsequent architecture reconciliation.

---

## 2. Frozen Baseline Verification

The authoritative frozen baseline is commit:
`5e60b7f894cf3aca9c55d5db15836ac737e75270` (`feat: add cross-module attack campaign intelligence`).

Verification confirms:
1. **Repository Head:** `5e60b7f894cf3aca9c55d5db15836ac737e75270` on branch `main`.
2. **Remote Push Status:** Strictly ZERO PUSH. No commits pushed to any remote.
3. **Working Tree State:** Clean; zero uncommitted modifications in tracked files.
4. **Frozen Reports:**
   - `module_3_10_freeze_report.md`
   - `module_3_10_hostile_pre_freeze_audit.md`
   - `module_3_10_implementation_report.md`
   - `module_3_10_architecture_reconciliation.md`
   - `module_3_10_architecture_research.md`
5. **Code Invariants:** All modules from Module 2.1 through Module 3.10 are frozen and immutable. Zero code modifications will occur during this research phase.

---

## 3. Current Platform Capability Inventory

A thorough audit of the frozen repository baseline (`5e60b7f894cf3aca9c55d5db15836ac737e75270`) confirms the following existing capabilities:

| Module | Core Capability | Frozen Subsystems & Contracts |
|---|---|---|
| **Module 2.1–2.5** | Ingestion & Telemetry | Multi-vector honeypot traps, attack logging, basic ingestion pipelines. |
| **Module 2.6** | Notification Dispatch | Multi-channel dispatch (Slack, Webhook, Email, PagerDuty), suppression windows. |
| **Module 2.8** | Correlation Engine | Sliding temporal window (24h), pattern matching, multi-attack correlation scoring. |
| **Module 2.9** | Multi-Vector Detection | Vector classification (`sqli`, `bruteforce`, `portscan`, `c2`, `traversal`). |
| **Module 2.10** | Unified Security Engine | Real-time event ingestion, threat score evaluation, pipeline integration. |
| **Module 3.1** | SOC Dashboard | KPI ribbons, live attack feed, severity distribution, threat posture overview. |
| **Module 3.2** | Investigation Explorer | Attack Chain graph visualization, entity progression, bidirectional link tracing. |
| **Module 3.3** | Detection Rule Console & Replay | Rule management (`DET-RULE-XXX`), deterministic event replay, rule testing. |
| **Module 3.4** | Incident Command & Governor | Circuit breaker, emergency lockout, idempotency validation, EventBus pub/sub. |
| **Module 3.5** | Operator Auth & RBAC | Session management, password hashing, 4-tier roles (`viewer`, `analyst`, `incident_responder`, `security_administrator`). |
| **Module 3.6** | Incident Case Management | Cases (`CASE-YYYY-XXXX`), SOP playbooks, task checklists, forensic notes. |
| **Module 3.7** | Active Deception Grid | Canary honeytokens (`canary_id`), tripwire hit tracking, token minting. |
| **Module 3.8** | Threat Intelligence Core | IOC lifecycle, half-life confidence decay, indicator tagging, STIX 2.1 / JSON exports. |
| **Module 3.9** | Enterprise SIEM/SOAR Gateway | Outbound webhooks, CEF/LEEF/Syslog/JSON serializers, HMAC signatures, SSRF protection, DLQ replay. |
| **Module 3.10** | Campaign Intelligence Core | Deterministic DSU clustering, Jaccard similarity ($\ge 0.60$), 4h sliding temporal window, DAG read-model, Tier-3 Governor bulk containment. |

---

## 4. Identified Architectural Gap

With Module 3.10 in place, HoneyShield-X possesses complete visibility over **past and clustered incidents**. However, the platform remains strictly **reactive**:

1. **Reactive Bias:** Telemetry is only examined when an explicit detection rule fires (Module 3.3) or when correlated attacks breach density thresholds (Modules 2.8, 3.10). Stealthy adversaries who space out probes across days or who manipulate benign parameters remain latent in historical telemetry.
2. **Absence of Hypothesis-Driven Hunting:** In an enterprise SOC, Tier-2 and Tier-3 analysts formulate intelligence-driven hypotheses based on external threat advisories, new MITRE ATT&CK techniques, or newly published zero-days. Currently, analysts have no structured capability within HoneyShield-X to execute, track, and document hypothesis-driven retrospective hunts.
3. **Disconnected Forensic Journals:** When analysts investigate historical data today, their queries and insights are ephemeral. There is no persistent "Hunt Dossier" capturing the hypothesis, the query parameters, the matching evidence, and the forensic conclusions.
4. **Missing Closed-Loop Feedback:** When an analyst discovers a novel attacker pattern during manual queries, there is no deterministic mechanism to convert that discovery into a permanent Detection Rule (Module 3.3), an active Incident Case (Module 3.6), or a tracked Threat Indicator (Module 3.8).

**The Critical Platform Gap:** A deterministic, explainable **Threat Hunting Core** that bridges the gap between reactive detection, active deception, threat intelligence, and long-term detection engineering.

---

## 5. Candidate Module Directions

We evaluate 5 materially distinct candidate architectures for Module 3.11:

### Candidate A: Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)
- **Purpose:** Provide a proactive, structured threat hunting workspace where analysts define threat hypotheses, execute retrospective multi-vector query scans over historical telemetry, compile forensic hunt dossiers, and promote discoveries into detection rules or incident cases.
- **Capabilities:**
  - Formal hypothesis drafting with MITRE ATT&CK mapping and severity classification.
  - Multi-attribute retrospective query builder (time range, source/destination IPs, attack types, canary interactions, IOC matches, user-agents, payload substrings).
  - Deterministic execution engine with pagination, rate limiting, and result bounding.
  - Evidence collation into structured Hunt Dossiers with analyst forensic notes.
  - One-click deterministic promotion: Hunt Findings $\to$ Detection Rule Draft (Module 3.3) or Incident Case (Module 3.6).
- **Existing Reuse:** Integrates directly with Attacks/Alerts (2.x), Cases (3.6), Canaries (3.7), Threat Intel (3.8), and Campaigns (3.10).
- **New State:** Hunt records, Hunt Hypotheses, Hunt Query templates, Hunt Execution Results, Hunt Evidence links.
- **What It Deliberately Does NOT Do:** Does not perform autonomous remediation; does not execute unsupervised background crawling; does not use non-deterministic LLM/ML matching.

### Candidate B: Continuous Defensive Verification & Adversary Emulation Engine (Defense Verification & BAS Core)
- **Purpose:** Execute safe, synthetic, benign adversary probe sequences against HoneyShield-X endpoints to verify that detection rules, canary honeytokens, and SIEM webhooks are functioning without degradation.
- **Capabilities:**
  - Synthetic probe generator for safe protocol checks (canary access ping, test SQLi signature, test SSH banner probe).
  - End-to-end verification telemetry tracing (Probe injected $\to$ Alert fired $\to$ Webhook dispatched).
  - Defense Verification Scorecard measuring mean time to detect (MTTD) and rule trip fidelity.
- **Existing Reuse:** Tests Detection Rules (3.3), Canaries (3.7), SIEM Gateways (3.9).
- **New State:** Emulation profiles, Probe execution runs, Verification results.
- **What It Deliberately Does NOT Do:** Does not exploit production vulnerabilities; does not attack external infrastructure; does not bypass Governor safety controls.

### Candidate C: MITRE ATT&CK Defense Matrix & Security Posture Exposure Analytics (Threat Coverage Core)
- **Purpose:** Provide holistic enterprise defensive coverage analytics, mapping HoneyShield-X rules, canaries, and campaigns onto the MITRE ATT&CK Enterprise Matrix to identify blind spots.
- **Capabilities:**
  - Visual MITRE ATT&CK heatmap aggregating coverage across detection rules, decoys, and threat intelligence.
  - Quantitative defense posture scoring (Coverage Depth, Detection Density, Deception Blind Spots).
  - Gap analysis highlighting unmonitored tactics and techniques.
- **Existing Reuse:** Ingests metadata from Rules (3.3), Deception (3.7), Threat Intel (3.8), Campaigns (3.10).
- **New State:** Matrix coverage cache, Posture evaluation snapshots.
- **What It Deliberately Does NOT Do:** Pure read-model; does not execute queries, create cases, or take defensive actions.

### Candidate D: SOC Response Playbook Automation & Workflow Orchestrator (SOAR Workflow Automation Core)
- **Purpose:** Automate multi-step response actions in response to incidents and campaigns beyond manual checklist tasks.
- **Capabilities:**
  - DAG-based workflow builder (Step A $\to$ Step B $\to$ Step C).
  - Automated trigger on `CAMPAIGN_DETECTED` or `ALERT_ESCALATED`.
  - Step actions: Dispatch SIEM webhook, tag IOC, notify Slack, stage containment.
- **Existing Reuse:** Extends Cases (3.6), Governor (3.4), SIEM Gateway (3.9).
- **New State:** Workflow definitions, Workflow runs, Step execution logs.
- **What It Deliberately Does NOT Do:** Does not bypass Governor Tier-3 human approval for destructive actions.
- **Risk:** High overlap with external enterprise SOAR engines that HoneyShield-X already integrates with via Module 3.9.

### Candidate E: Adaptive Decoy Grid & Dynamic Protocol Listener Fabric (Adaptive Honeynet Core)
- **Purpose:** Dynamically provision virtual decoy service listeners (mock SSH, mock HTTP admin, mock Redis) with protocol-level interaction emulation.
- **Capabilities:**
  - Protocol response state machines for simulated services.
  - Dynamic port binding and decoy service rotation.
  - In-depth interactive attacker session recording.
- **Existing Reuse:** Extends Active Deception (3.7).
- **New State:** Listener definitions, Decoy sessions, Raw session interaction transcripts.
- **What It Deliberately Does NOT Do:** Does not run full vulnerable operating systems; does not bridge to internal LAN.
- **Risk:** Requires low-level network socket binding, introduces operational deployment complexity, and expands attack surface.

---

## 6. Weighted Candidate Scoring Matrix

Every candidate is evaluated against the 10 approved architecture criteria:

| Evaluation Criterion | Weight | Candidate A (Threat Hunting) | Candidate B (Defensive Verification) | Candidate C (MITRE Coverage) | Candidate D (SOAR Workflow) | Candidate E (Dynamic Decoy) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Defensive Security Value** | 20% | **9.5** (1.90) | 9.0 (1.80) | 7.5 (1.50) | 8.0 (1.60) | 8.0 (1.60) |
| **SOC / Operator Value** | 15% | **10.0** (1.50) | 8.0 (1.20) | 8.0 (1.20) | 8.5 (1.28) | 7.0 (1.05) |
| **Architectural Leverage** | 15% | **10.0** (1.50) | 8.5 (1.28) | 8.0 (1.20) | 8.0 (1.20) | 6.5 (0.98) |
| **Enterprise Applicability** | 10% | **9.5** (0.95) | 8.5 (0.85) | 8.5 (0.85) | 7.5 (0.75) | 6.5 (0.65) |
| **Determinism / Explainability** | 10% | **10.0** (1.00) | 9.0 (0.90) | 9.5 (0.95) | 7.5 (0.75) | 8.0 (0.80) |
| **Compatibility with Frozen Architecture** | 10% | **10.0** (1.00) | 9.0 (0.90) | 9.5 (0.95) | 7.5 (0.75) | 7.5 (0.75) |
| **Zero-Migration Feasibility** | 5% | **10.0** (0.50) | 9.0 (0.45) | 10.0 (0.50) | 7.5 (0.38) | 6.5 (0.33) |
| **Security Boundary Clarity** | 5% | **10.0** (0.50) | 8.0 (0.40) | 10.0 (0.50) | 7.0 (0.35) | 6.5 (0.33) |
| **Performance / Scalability Potential** | 5% | **9.0** (0.45) | 8.5 (0.43) | 9.0 (0.45) | 7.5 (0.38) | 7.0 (0.35) |
| **System 2 / System 3 Readiness** | 5% | **10.0** (0.50) | 8.5 (0.43) | 7.5 (0.38) | 8.0 (0.40) | 6.5 (0.33) |
| **TOTAL WEIGHTED SCORE** | **100%** | **9.80 / 10** | **8.64 / 10** | **8.48 / 10** | **7.84 / 10** | **7.17 / 10** |

---

## 7. Selection Verdict: Winner & Runner-Up

### WINNER: Candidate A — Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)
- **Weighted Score:** **9.80 / 10**
- **Core Justification:** Candidate A provides the highest immediate defensive value and architectural leverage. It transforms HoneyShield-X from a reactive alerting engine into a proactive, investigative SOC powerhouse. It directly consumes and bridges all frozen modules (telemetry, canaries, IOCs, campaigns, rules, cases), operates with 100% determinism, adheres strictly to zero migrations via Redis/in-memory dual-mode persistence, and embodies the ultimate System 2 operator decision-support paradigm.

### RUNNER-UP: Candidate B — Continuous Defensive Verification & Adversary Emulation Engine
- **Weighted Score:** **8.64 / 10**
- **Status:** Recommended for future Module 3.12 or subsequent validation expansion.

### Rejection Rationale for Other Candidates:
- **Candidate C (MITRE Coverage):** While visually appealing and useful for executive reporting, it is largely a static analytical projection rather than an active operational workflow. Deferred for future SOC analytics enhancement.
- **Candidate D (SOAR Workflow):** Partially redundant with Module 3.9 (which delegates complex orchestration to enterprise SIEM/SOARs like Splunk SOAR and Cortex XSOAR) and introduces risks of autonomous execution loops and race conditions.
- **Candidate E (Dynamic Decoy):** Introduces protocol listener complexity, daemon lifecycle management, and potential attack surface expansion that exceeds HoneyShield-X's clean, zero-dependency, containerized architecture.

---

## 8. Detailed Architecture: Module 3.11 Winning Design

### 8.1 Module Mission & Core Ownership
Module 3.11 (**Threat Hunting Core**) owns:
1. **Hypothesis Management:** Creation, validation, lifecycle tracking, and archiving of structured SOC threat hunt hypotheses.
2. **Deterministic Retrospective Querying:** High-performance, multi-attribute parameter scanning over historical attack telemetry, alerts, deception logs, and campaign graphs.
3. **Forensic Evidence Journaling:** Collation of matching entities into structured Hunt Findings and analyst investigation journals.
4. **Closed-Loop Rule & Case Promotion:** Deterministic translation of confirmed threat hunt findings into new Detection Rule drafts (Module 3.3) or Incident Cases (Module 3.6).
5. **Hunt Audit & Governance:** Immutable operator logging (`SystemEvent`), execution rate limiting, and RBAC enforcement.

```
+-------------------------------------------------------------------------------------------------------+
|                                    MODULE 3.11 THREAT HUNTING CORE                                    |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  +---------------------------+     +-------------------------------+     +-------------------------+  |
|  |     Hunt Hypothesis       |     |  Retrospective Query Engine   |     |    Hunt Finding &       |  |
|  | - Title & Description     | --> | - Temporal Windowing (<=30d)  | --> |    Evidence Dossier     |  |
|  | - MITRE Technique Tags    |     | - Multi-Attribute Predicates  |     | - Matched Attacks/Alerts|  |
|  | - Severity & Priority     |     | - Stop-list & Input Sanitizer |     | - Canaries & IOC Links  |  |
|  +---------------------------+     +-------------------------------+     | - Forensic Journal Notes|  |
|                                                                          +-------------------------+  |
|                                                                                       |               |
|                                            CLOSED-LOOP PROMOTION                      |               |
|                           +-----------------------------------------------------------+               |
|                           |                                                           |               |
|                           v                                                           v               |
|         +------------------------------------+                     +--------------------------------+ |
|         |    Module 3.3 Detection Rule       |                     |    Module 3.6 Incident Case    | |
|         | - Deterministic Rule Draft Creation|                     | - Case Creation & Playbook Link| |
|         +------------------------------------+                     +--------------------------------+ |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 9. State Model & Lifecycle

### 9.1 Hunt Entity Lifecycle State Machine
Threat Hunts advance through a deterministic, strictly unidirectional state machine:

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

1. **`DRAFT`:** Hypothesis and query predicates defined by an analyst. Not yet executed.
2. **`SCHEDULED`:** Queued for execution in the single-flight queue.
3. **`RUNNING`:** Actively executing scan across historical database/cache telemetry.
4. **`COMPLETED`:** Scan complete. Matched entities and evidence populated in Hunt Finding.
5. **`CONCLUDED`:** Analyst has reviewed findings, added forensic conclusions, and optionally promoted findings to a Rule or Case.
6. **`ARCHIVED`:** Terminal read-only state. Immutable; preserved for SOC compliance.

### 9.2 Hunt Record Schemas

#### HuntHypothesis
- `hunt_id`: `str` — Format: `hunt-[12 hex chars]` (e.g., `hunt-a1b2c3d4e5f6`), deterministically generated from hypothesis title and creator timestamp.
- `title`: `str` (10–150 chars) — Clear description of the threat hypothesis.
- `description`: `str` (max 2,000 chars) — Threat narrative, rationale, and expected attacker behavior.
- `status`: `str` — `draft`, `scheduled`, `running`, `completed`, `concluded`, `archived`.
- `severity`: `str` — `low`, `medium`, `high`, `critical`.
- `mitre_tactics`: `list[str]` — MITRE ATT&CK tactics (e.g., `Persistence`, `Lateral Movement`).
- `mitre_techniques`: `list[str]` — MITRE ATT&CK techniques (e.g., `T1021.002`, `T1078`).
- `created_by`: `str` — Operator username.
- `created_at`: `str` — ISO 8601 UTC.
- `updated_at`: `str` — ISO 8601 UTC.
- `concluded_at`: `str | None` — ISO 8601 UTC.
- `conclusion_summary`: `str | None` — Final analyst verdict (`malicious_confirmed`, `benign_activity`, `inconclusive`).

#### HuntQuerySpec
- `time_range_start`: `str` — ISO 8601 UTC (maximum 30 days lookback).
- `time_range_end`: `str` — ISO 8601 UTC.
- `source_ips`: `list[str]` — Optional filter by source IP or CIDR.
- `destination_ips`: `list[str]` — Optional filter by decoy target IP.
- `attack_types`: `list[str]` — Attack vector classification filters.
- `rule_ids`: `list[str]` — Associated detection rule identifiers.
- `user_agent_pattern`: `str | None` — Regex or substring filter.
- `payload_pattern`: `str | None` — Substring filter (sanitized, max 255 chars).
- `canary_ids`: `list[str]` — Canary honeytoken interaction filters.
- `ioc_values`: `list[str]` — Threat intelligence observable filters.
- `max_results`: `int` — Maximum records to match (hard cap: 200, default: 50).

#### HuntEvidenceRecord
- `evidence_id`: `str` — `ev-[12 hex chars]`.
- `entity_type`: `str` — `attack`, `alert`, `canary_hit`, `ioc_match`, `campaign`.
- `entity_id`: `str` — Reference to underlying entity.
- `timestamp`: `str` — Observation timestamp.
- `summary`: `str` — Formatted summary of observed anomalous behavior.
- `attributes`: `dict[str, Any]` — Key telemetry attributes (IP, port, technique, payload snippet).

#### HuntDossier
Complete aggregate document containing the hypothesis, query parameters, execution statistics (execution time, total scanned, total matched), evidence list, analyst forensic journal notes, and promotion history.

---

## 10. API Surface Specification

All endpoints are mounted under `/api/v1/hunts` and adhere strictly to HoneyShield-X REST conventions:

| Method | Endpoint Path | Purpose | RBAC Permission | Rate Limit | Mutation Behavior |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/hunts` | List threat hunts with status, severity, and author filtering | `hunt:view` | 60/min | Read-only |
| `POST` | `/api/v1/hunts` | Create a new threat hunt hypothesis | `hunt:create` | 20/min | Immutable draft creation |
| `GET` | `/api/v1/hunts/{hunt_id}` | Retrieve complete hunt dossier, query specs, and findings | `hunt:view` | 60/min | Read-only |
| `PATCH` | `/api/v1/hunts/{hunt_id}` | Update hypothesis metadata, notes, or concluding verdict | `hunt:update` | 20/min | Metadata update |
| `POST` | `/api/v1/hunts/{hunt_id}/execute` | Trigger retrospective query execution against telemetry | `hunt:execute` | 6/min (1/10s per op) | Single-flight execution lock |
| `POST` | `/api/v1/hunts/{hunt_id}/promote/rule` | Promote hunt query pattern into Detection Rule draft (M3.3) | `hunt:promote` | 10/min | Cross-module dispatch |
| `POST` | `/api/v1/hunts/{hunt_id}/promote/case` | Escalate confirmed hunt findings to new Incident Case (M3.6) | `hunt:promote` | 10/min | Cross-module dispatch |
| `POST` | `/api/v1/hunts/{hunt_id}/archive` | Move concluded hunt to permanent archived state | `hunt:admin` | 10/min | Lifecycle transition |
| `GET` | `/api/v1/hunts/metrics/summary` | Retrieve SOC hunting KPIs (active hunts, hit rate, promotions) | `hunt:view` | 60/min | Read-only aggregation |

---

## 11. Governor Interaction & Safety Policy

All actions that interact with containment, cross-module rule creation, or case promotion are evaluated against the Module 3.4 **Governor**:

1. **Observational Queries (`GET /hunts`, `GET /hunts/{id}`):**
   - **Governor Tier:** Observational (Zero Governor overhead, bypasses circuit breaker).
2. **Hunt Execution (`POST /hunts/{id}/execute`):**
   - **Governor Tier:** Tier 1 (Low Blast Radius).
   - Read-only database query execution; single-flight concurrency lock; operator rate-limited (1 request per 10s).
3. **Hunt Conclude & Archive (`PATCH /hunts/{id}`, `POST /hunts/{id}/archive`):**
   - **Governor Tier:** Tier 2 (Moderate Blast Radius).
   - Validates state transition; requires audit rationale; enforces operator tracking.
4. **Promotion to Incident Case (`POST /hunts/{id}/promote/case`):**
   - **Governor Tier:** Tier 2 (Incident Response Staging).
   - Dispatches case creation via Module 3.6 service; links evidence.
5. **Promotion to Detection Rule (`POST /hunts/{id}/promote/rule`):**
   - **Governor Tier:** Tier 2 (Detection Rule Authoring).
   - Mints an inactive/draft rule in Module 3.3 for analyst review; never autonomously activates live blocking rules.
6. **Emergency Lockout Compliance:**
   - When Governor emergency lockout is active (`is_locked_out = True`), read operations and query execution remain accessible for investigation, but any outbound notification or case promotion actions are rejected with `HTTP 503 Service Unavailable`.

---

## 12. Role-Based Access Control (RBAC) Model

Module 3.11 defines 5 granular permissions mapped deterministically across all 4 SOC operator roles in `backend/app/auth/registry.py`:

- `hunt:view`: View hunts, dossiers, evidence, and hunting KPI metrics.
- `hunt:create`: Create new hunt hypotheses and query specifications.
- `hunt:update`: Update hunt notes, add forensic commentary, and edit drafts.
- `hunt:execute`: Trigger retrospective telemetry scan execution.
- `hunt:promote`: Promote hunt findings to Detection Rules (3.3) or Incident Cases (3.6).
- `hunt:admin`: Archive, delete, or override hunt status.

### Role Entitlement Matrix

| Permission | Viewer | Analyst | Incident Responder | Security Administrator |
|---|:---:|:---:|:---:|:---:|
| `hunt:view` | **ALLOWED** | **ALLOWED** | **ALLOWED** | **ALLOWED** |
| `hunt:create` | DENIED (403) | **ALLOWED** | **ALLOWED** | **ALLOWED** |
| `hunt:update` | DENIED (403) | **ALLOWED** | **ALLOWED** | **ALLOWED** |
| `hunt:execute` | DENIED (403) | **ALLOWED** | **ALLOWED** | **ALLOWED** |
| `hunt:promote` | DENIED (403) | **ALLOWED** | **ALLOWED** | **ALLOWED** |
| `hunt:admin` | DENIED (403) | DENIED (403) | DENIED (403) | **ALLOWED** |

---

## 13. EventBus Integration & Loop Prevention

### 13.1 Published Events
Module 3.11 publishes structured events to `hsx:events:broadcast`:
- `hunt.created`: Published when a new hypothesis is registered.
- `hunt.executed`: Published when retrospective execution completes (contains execution time, match count).
- `hunt.concluded`: Published when an analyst finalizes conclusions.
- `hunt.promoted`: Published when findings are promoted to a Rule or Case.

### 13.2 Consumed Events
Module 3.11 optionally listens to:
- `campaign.detected`: Allows automated hypothesis suggestion (e.g. suggesting an expanded hunt when a new campaign is clustered).
- `canary.tripwire`: Records active decoy touches.

### 13.3 Loop & Cascading Recursion Prevention
To prevent feedback loops where a hunt creates a rule or case which then generates new events that trigger another hunt:
1. Hunt execution is strictly **operator-initiated (HITL)**. Zero automatic cron or self-triggering hunt runs.
2. The EventBus listener strictly filters out any event with prefix `hunt.*` or `system.*`.
3. Dispatched promotions invoke the respective module services directly using the authenticated operator's identity.

---

## 14. Dual-Mode Storage Architecture (Zero-Migration)

Following the proven zero-migration patterns of Modules 3.7, 3.8, 3.9, and 3.10:

```
+------------------------------------------------------------------------------------+
|                             DUAL-MODE HUNT STORAGE LAYER                           |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  [ PRIMARY REDIS STORE ]                                                           |
|  - Hash `hsx:hunts:items`        : JSON-serialized HuntDossier (Key: hunt_id)      |
|  - Set  `hsx:hunts:active_ids`   : Active/Non-archived Hunt IDs                    |
|  - Hash `hsx:hunts:mitre_idx`    : Mapping MITRE technique -> Set of hunt_ids      |
|                                                                                    |
|  [ IN-MEMORY THREAD-SAFE FALLBACK ]                                                |
|  - `threading.RLock()` guarding in-memory dictionaries                             |
|  - Offline testing & zero-Redis resilience                                         |
|                                                                                    |
|  [ STRICT CAPACITY & PAYLOAD BOUNDS ]                                              |
|  - Maximum Active Hunts          : 500 (Deterministic FIFO eviction of archived)   |
|  - Maximum Results Per Run       : 200 matched records                             |
|  - Maximum Dossier Payload       : 64 KB (JSON bound)                              |
|  - Maximum Historical Lookback   : 30 days                                         |
|                                                                                    |
+------------------------------------------------------------------------------------+
```

### Relational Projection
Historical telemetry (attacks, alerts, threat intel) is queried directly from existing SQLAlchemy models (`Attack`, `Alert`, `ThreatIntelligence`) as read-only projections. **Zero changes to database schemas or SQLAlchemy models are required.**

---

## 15. Security Threat Model & Adversarial Defenses

| Threat ID | Adversarial Threat Scenario | Impact | Deterministic Mitigation Mechanism |
|---|---|---|---|
| **THREAT-01** | **Resource Exhaustion via Unbounded Wildcard Query** | High | Attacker/operator queries `*` over 10 years of data, causing CPU/memory starvation. | Strict query bounding: Max 30-day temporal lookback; max 200 matched entities; SQL `LIMIT 200` enforced. |
| **THREAT-02** | **ReDoS via Malicious User-Agent Regex** | High | Operator submits catastrophic backtracking regex in `user_agent_pattern`. | Regex complexity validation; fallback to literal substring search if regex evaluation exceeds 5ms. |
| **THREAT-03** | **Concurrent Query Flooding DoS** | High | Rapid repeated `/execute` calls exhaust database connection pool. | Single-flight execution lock (`threading.Lock()`); competing requests return `409 Conflict`. |
| **THREAT-04** | **Privilege Escalation on Rule Promotion** | Critical | `viewer` or unauthorized role attempts to create detection rules or incident cases. | Strict RBAC guards: `hunt:promote` required; checks calling operator against Module 3.3/3.6 permissions. |
| **THREAT-05** | **Governor Containment Bypass** | Critical | Operator attempts to trigger automated bulk containment through a hunt finding. | Module 3.11 has ZERO containment authority. All containment must route through Governor Tier-3 in Module 3.4/3.10. |
| **THREAT-06** | **Stored XSS in Forensic Notes** | High | Attacker injects `<script>` payloads in hypothesis title, narrative, or notes. | Pydantic regex sanitization; React JSX text-node escaping; zero `dangerouslySetInnerHTML`. |
| **THREAT-07** | **Operator Spoofing in Evidence Journal** | Medium | Rogue operator alters forensic conclusions of another analyst. | Creator binding: Only creator or `security_administrator` can modify conclusion; all edits generate `SystemEvent` audit log. |
| **THREAT-08** | **Payload Injection via Forensic Search** | High | SQL injection payloads injected into search predicates. | SQLAlchemy parameterized queries; zero raw SQL string concatenation. |
| **THREAT-09** | **Redis Failure State Inconsistency** | Medium | Redis server restarts or connection drops during hunt execution. | Dual-mode in-memory fallback with `threading.RLock()` guarantees fail-safe operation. |
| **THREAT-10** | **Cascading EventBus Infinite Loop** | High | Hunt promotion publishes events that re-trigger hunting workflows. | Operator-only execution trigger; EventBus subscriber ignores all `hunt.*` events. |

---

## 16. Cross-Module Compatibility Matrix

| Module | Relationship | Compatibility Status | Interaction Mechanism |
|---|---|:---:|---|
| **Module 2.6 Notification Dispatch** | Downstream Notification | **Compatible** | Publishes `hunt.concluded` to EventBus for optional operator notification. |
| **Module 2.8 Correlation Engine** | Telemetry Source | **Compatible** | Queries historical correlation burst metrics as hunting evidence. |
| **Module 2.9 Multi-Vector Detection** | Telemetry Source | **Compatible** | Filters historical attacks by vector classifications (`sqli`, `bruteforce`). |
| **Module 2.10 Unified Security Engine** | Telemetry Source | **Compatible** | Read-only projection over real-time processed attacks and alerts. |
| **Module 3.1 SOC Dashboard** | KPI Ribbon & Navigation | **Compatible** | Exposes hunting summary metrics (`active_hunts`, `confirmed_threats`). |
| **Module 3.2 Investigation Explorer** | Forensic Pivot | **Compatible** | Deep-links from Hunt Evidence directly to Attack Chain graph nodes. |
| **Module 3.3 Detection Rule Console** | Closed-Loop Promotion | **Compatible** | Direct API adapter to stage novel hunt findings as draft detection rules. |
| **Module 3.4 Incident Command / Governor** | Safety Gatekeeper | **Compatible** | Enforces circuit breakers, emergency lockout, and audit trails on promotions. |
| **Module 3.5 Operator Auth & RBAC** | Identity & Access | **Compatible** | Enforces `hunt:*` permissions across all operator roles. |
| **Module 3.6 Incident Case Management** | Closed-Loop Promotion | **Compatible** | Direct API adapter to promote confirmed hunt discoveries into active cases. |
| **Module 3.7 Active Deception Grid** | Deception Correlation | **Compatible** | Correlates historical canary honeytoken touches during retrospective hunts. |
| **Module 3.8 Threat Intelligence Core** | Intelligence Fusion | **Compatible** | Cross-references active IOCs against historical hunt telemetry. |
| **Module 3.9 SIEM/SOAR Gateway** | Outbound Telemetry | **Compatible** | Publishes hunt completion events to EventBus for outbound SIEM dispatch. |
| **Module 3.10 Campaign Intelligence Core** | Macro-Cluster Analysis | **Compatible** | Correlates hunt evidence against existing multi-entity campaign clusters. |

---

## 17. Performance & Resource Architecture

### Performance Targets vs Hard Safety Limits

| Metric | Aspirational Target | Hard Safety Limit | Deterministic Enforcement Mechanism |
|---|:---:|:---:|---|
| **Hunt Dossier Retrieval** | $< 5$ ms | $< 25$ ms | In-memory key lookup / Redis hash fetch |
| **Retrospective Query (7 days)** | $< 250$ ms | $< 1,500$ ms | Indexed SQL timestamp bounds, indexed IP columns |
| **Retrospective Query (30 days)** | $< 800$ ms | $< 3,000$ ms | Temporal partition bounds, `LIMIT 200` |
| **Promotion Dispatch Latency** | $< 50$ ms | $< 200$ ms | In-process service invocation |
| **Dossier Serialization Size** | $< 16$ KB | $< 64$ KB | Bounded evidence list (max 200), array truncation |
| **Active Hunt Capacity** | 200 hunts | 500 hunts | FIFO eviction of archived hunts |
| **Concurrent Query Executions** | 1 at a time | 1 at a time | Single-flight execution mutex lock |

---

## 18. Frontend & SOC Operator Experience

Module 3.11 introduces a dedicated **Threat Hunting Console** accessible via the top navigation bar (`/hunts`):

1. **KPI Ribbon:**
   - Active Hunts | Completed Hunts | Confirmed Threats | Detection Rule Conversions.
2. **Hunt Inventory Table:**
   - Filterable by Status (`draft`, `running`, `completed`, `concluded`, `archived`), Severity (`low` to `critical`), and MITRE Tactic.
3. **Hypothesis Authoring Drawer:**
   - Structured builder for threat hypotheses, MITRE ATT&CK technique tags, and query predicate builders.
4. **Hunt Dossier Workspace:**
   - **Hypothesis Narrative Tab:** Background, rationale, timeline.
   - **Query Execution Tab:** Parameter settings, date range picker, dry-run match count.
   - **Evidence & Findings Tab:** Collated table of matched attacks, canary hits, and IOCs with severity badges.
   - **Forensic Journal Tab:** Timestamped analyst investigation notes and observations.
5. **Closed-Loop Promotion Modal:**
   - Dialog to promote finding to a **Draft Detection Rule** (pre-filling pattern, threshold, and classification in Module 3.3) or an **Incident Case** (pre-filling case title, evidence, and playbook in Module 3.6).

---

## 19. Implementation Boundary

### Files to CREATE
- `backend/app/hunting/__init__.py`
- `backend/app/hunting/engine.py` (Retrospective query engine, feature filters, bounding)
- `backend/app/hunting/storage.py` (Dual-mode `HuntStore`, FIFO eviction, 64KB bound)
- `backend/app/hunting/service.py` (`HuntService`, promotion adapters, single-flight lock)
- `backend/app/routers/hunts.py` (FastAPI REST endpoints with RBAC guards)
- `backend/tests/test_module_3_11_hunting.py` (Unit tests)
- `backend/tests/test_module_3_11_rbac.py` (RBAC entitlement tests)
- `backend/tests/test_module_3_11_integration.py` (Promotion and cross-module tests)
- `backend/tests/test_module_3_11_hostile.py` (Hostile security and adversarial tests)
- `frontend/src/components/ThreatHuntingView.tsx` (Main SOC hunting workspace)
- `frontend/src/components/HuntDossierDrawer.tsx` (Dossier overview, evidence, journal)
- `frontend/src/components/HuntHypothesisModal.tsx` (Hypothesis creation modal)
- `frontend/src/components/HuntPromotionModal.tsx` (Promotion to rule/case modal)
- `frontend/src/hooks/useThreatHunting.ts` (React Query hooks)
- `frontend/src/tests/hunting.test.tsx` (Frontend test suite)

### Files to MODIFY (Minimal Reconciled Touchpoints)
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

## 20. Test & Acceptance Strategy

1. **Unit Test Suite:**
   - Hypothesis state transitions (`DRAFT` $\to$ `SCHEDULED` $\to$ `COMPLETED` $\to$ `CONCLUDED` $\to$ `ARCHIVED`).
   - Query predicate compilation and SQL parameterization.
   - Dual-mode storage capacity limits (500 cap) and FIFO eviction.
   - 64KB dossier serialization bounds.
2. **Hostile Security Test Suite:**
   - Unbounded wildcard lookback queries ($>30$ days) rejected.
   - Malicious regex backtracking strings rejected.
   - SQL injection payloads in query predicates safely handled via parameterized queries.
   - Stored XSS payloads in hypothesis narrative safely inert.
   - Concurrency race: parallel executions rejected with `409 Conflict`.
   - Rate limit enforcement: rapid execution attempts return `429 Too Many Requests`.
3. **RBAC & Governor Security Suite:**
   - `viewer` blocked from creating, editing, executing, or promoting hunts (403).
   - `analyst` and `incident_responder` permitted to execute and promote.
   - `security_administrator` permitted to archive.
   - Governor emergency lockout blocks promotion dispatches (503).
4. **Cross-Module Integration Suite:**
   - Promotion to Module 3.3 verifies draft rule appears in detection rule store.
   - Promotion to Module 3.6 verifies incident case is created with evidence linked.
5. **Frontend Suite & Build:**
   - All component test suites passing with 100% assertions.
   - Production Vite build clean with zero errors.

---

## 21. System 2 / System 3 Readiness

- **Current Status:** Module 3.11 operates purely as a **System 2 Operator Decision-Support Substrate**.
- **Human Authority:** All threat hypotheses are created, executed, and evaluated under direct human operator control. Consequential actions (rule creation, case escalation) require explicit analyst confirmation.
- **Future System 3 Readiness:** Module 3.11 establishes the deterministic query language and evidence structures required for future autonomous agents to evaluate hypotheses, but reserves all authorization to human operators.

---

## 22. Risks & Deterministic Mitigations

1. **Database Query Latency under Heavy Telemetry:**
   - *Mitigation:* Queries strictly bound to indexed columns (`timestamp`, `source_ip`, `attack_type`) with maximum 30-day temporal windows and hard `LIMIT 200`.
2. **False Positives in Promoted Rules:**
   - *Mitigation:* Promoted rules are created in `draft` / inactive status in Module 3.3, requiring mandatory operator testing via deterministic replay before activation.
3. **Storage Bloat in Redis:**
   - *Mitigation:* Hard 500-campaign active bound with FIFO eviction and 64KB JSON payload limit.

---

## 23. Research Gate Recommendation

**RECOMMENDATION:**
Proceed to the **MODULE 3.11 ARCHITECTURE RECONCILIATION GATE** with **Candidate A: Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core)** as the approved architecture.

**GATE VERDICT:**
`PROPOSED — REQUIRES ARCHITECTURE RECONCILIATION`
