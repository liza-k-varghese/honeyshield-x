# MODULE 3.10 ARCHITECTURE RECONCILIATION REPORT
**Platform:** HoneyShield-X Enterprise Autonomous Defense & SOC Platform
**Target Module:** Module 3.10 — Cross-Module Attack Campaign Intelligence & Multi-Entity Correlation Graph (Campaign Intelligence Core)
**Evaluator:** Architecture Reconciliation Gate
**Frozen Predecessor Baseline:** `30b09bf26f6a6e585364d05df9590fbfced4a5c5` (Module 3.9 Frozen Locally)
**Research Reference Artifact:** `module_3_10_architecture_research.md`
**Status:** **APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT**
**Remote Push Status:** **STRICTLY ZERO PUSH**
**Database Migrations:** **EXACTLY 0**
**SQLAlchemy Model Changes:** **EXACTLY 0**
**New Dependencies:** **EXACTLY 0**
**Code Modifications in this Gate:** **EXACTLY 0**

---

## 1. Executive Verdict

**VERDICT: APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT**

The architecture for **Module 3.10: Cross-Module Attack Campaign Intelligence & Multi-Entity Correlation Graph (Campaign Intelligence Core)** has been fully reconciled against the authoritative frozen baseline commit `30b09bf26f6a6e585364d05df9590fbfced4a5c5`.

Every interface, schema, state transition, resource boundary, RBAC entitlement, Governor safety gate, EventBus contract, storage structure, and frontend component has been verified against existing production code. No architectural, security, or backward-compatibility ambiguities remain.

```
+----------------------------------------------------------------------------------------------------+
|                                HONEYSHIELD-X ARCHITECTURAL SYNTHESIS                               |
+----------------------------------------------------------------------------------------------------+
| Modules 2.x - 3.3  : Ingestion, Detection, Unified Pipeline, MITRE Mapping, Replay Studio          |
| Modules 3.4 - 3.5  : Incident Command Core, Safety Governor (HITL), 4-Tier RBAC, Audit Engine      |
| Modules 3.6 - 3.8  : Incident Case Management, Active Deception Grid, Threat Intel & IOC Fusion   |
| Module 3.9         : Enterprise Defensive Integration & SIEM-SOAR Webhook Gateway (SSRF/DLQ/HMAC)  |
+----------------------------------------------------------------------------------------------------+
| MODULE 3.10 (CORE) : Deterministic Cross-Module Campaign Clustering & Multi-Entity DAG Read-Model  |
|                      - Bounded Union-Find Clustering (Jaccard >= 0.60, 4h window, 7d boundary)     |
|                      - Multi-Entity DAG Graph Read-Model (Max 100 nodes, 200 edges, 4 hops)        |
|                      - Zero-Migration Dual-Mode Redis + Memory Storage (Max 500 active campaigns)  |
|                      - Tier-3 Governor HITL Gatekeeper for Bulk Containment                        |
|                      - 4-Tier RBAC (campaign:view, campaign:update, campaign:admin)               |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Frozen Baseline Verification

The authoritative baseline commit is `30b09bf26f6a6e585364d05df9590fbfced4a5c5` (`feat: add enterprise defensive integration and SIEM-SOAR webhook gateway`). Clean-room repository verification confirms that all prerequisite subsystems are frozen, functional, and available for integration:

| Module | Source Location | Verified Capabilities & Contracts |
|---|---|---|
| **Module 2.8** | `backend/app/correlation/` | Temporal multi-attack pattern matching, windowed correlation scoring (24h). |
| **Module 2.10** | `backend/app/unified_orchestrator/` | 7-stage deterministic detection pipeline, composite risk scoring, alert deduplication. |
| **Module 3.1** | `frontend/src/components/`, `backend/app/routers/dashboard.py` | SOC telemetry dashboard, KPI ribbons, real-time metrics. |
| **Module 3.2** | `backend/app/investigation/` | Localized single-IP DAG generator (`graph.py`, max 50 nodes), MITRE ATT&CK catalog (`mitre.py`, 8 canonical tactics, `TACTIC_KILLCHAIN_ORDER`). |
| **Module 3.3** | `backend/app/detection_rules/`, `replay/` | Rule catalog, replay studio, simulation sandbox. |
| **Module 3.4** | `backend/app/incident_command/` | `SafetyGovernor` (12 allowlisted actions, 3 blast tiers, 60s approval token TTL, emergency lockout), `EventBus` (`hsx:events:broadcast`, listener callbacks). |
| **Module 3.5** | `backend/app/auth/` | 4-tier deterministic RBAC (`viewer`, `analyst`, `incident_responder`, `security_administrator`), `SystemEvent` audit logging, session management. |
| **Module 3.6** | `backend/app/cases/` | `CaseStore` (Redis `hsx:case:{id}` + in-memory fallback), SANS/NIST playbooks, SLA metrics. |
| **Module 3.7** | `backend/app/deception/` | Active Canary Deception Grid (5 token types, high-confidence 0.95 tripwire alerts, Redis + memory store). |
| **Module 3.8** | `backend/app/threat_intelligence/` | Multi-factor confidence scoring, exponential half-life decay, whitelist precedence, STIX 2.1 / CSV export, rudimentary string-based campaign grouping (`list_campaigns`). |
| **Module 3.9** | `backend/app/integrations/` | SIEM/SOAR webhook dispatcher, SSRF validation (`ssrf.py`), HMAC-SHA256 signatures, bounded DLQ (500 items), circuit breaker (`NotificationCircuitBreaker`). |

---

## 3. Research Proposal Reconciliation

The findings and proposals of `module_3_10_architecture_research.md` are reconciled as follows:

1. **Defensive Invariant:** Module 3.10 is strictly defensive. It performs passive read-model synthesis, correlation analysis, and operational telemetry fusion. It contains zero offensive probing, automated exploitation, or adversary counter-measures.
2. **Determinism & Explainability:** All campaign clustering and graph construction algorithms are 100% deterministic, mathematically verifiable, and explainable. No stochastic algorithms, machine learning models, or non-deterministic heuristics are permitted.
3. **Read-Model Orientation:** Graph derivation is computed dynamically on-the-fly from existing telemetry and cached campaign states. The graph topology is never persisted in a relational database.
4. **Operator Sovereignty:** Autonomous action is restricted to read-model derivation and passive advisory tagging. Any active remediation (e.g., bulk network isolation or campaign containment) is strictly guarded by the Module 3.4 Safety Governor requiring human-in-the-loop (HITL) authorization.
5. **No LLM / ML Authority:** No language model or predictive classifier possesses decision-making authority over campaign formation, state transitions, or containment execution.

---

## 4. Candidate Decision Confirmation

The research evaluation scorecard from `module_3_10_architecture_research.md` is confirmed:

- **Selected Winner:** **Candidate G: Cross-Module Attack Campaign Intelligence & Multi-Entity Correlation Graph (Score: 9.45 / 10.0)**
- **Runner-Up:** Candidate E: Attack Campaign Graph (Score: 8.65 / 10.0)
- **Selection Rationale:** Candidate E provides topological graph visualization but lacks automatic multi-vector campaign clustering (Candidate A). Candidate G unites deterministic campaign clustering (temporal windowing, Union-Find, Jaccard similarity) with multi-hop cross-module graph correlation (linking attacks, alerts, cases, canaries, IOCs, and webhooks).
- **Explicitly Deferred Scope:**
  - *Candidate B (Behavioral Anomaly Correlation):* Deferred. Eliminates statistical noise and non-deterministic baseline drifts.
  - *Candidate F (Detection-as-Code / Sigma):* Deferred. Avoids external compilation libraries (`pySigma`) and preserves the zero-dependency invariant.

---

## 5. Campaign Identity & Lifecycle Contract

### 5.1 Campaign Identity
- **ID Generation:** Deterministic identifier formatted as `camp-[hex_hash]` where `hex_hash` is a 12-character lowercase hex string derived from SHA-256 of the cluster's canonical root entity identifier and creation timestamp, or `camp-[uuid4_hex[:12]]`.
- **Identity Stability:** Once synthesized, a campaign retains a stable canonical ID across its active lifecycle. New events matching the campaign are appended to its member entity sets without changing its ID.
- **Ordering:** Deterministic multi-key sorting:
  $$\text{Sort Order} = (-\text{severity\_weight},\; -\text{highest\_confidence},\; -\text{entity\_count},\; \text{campaign\_id})$$

### 5.2 Campaign Lifecycle State Machine

```
                      +-------------------+
                      |                   |
                      |      ACTIVE       |<--------------------+
                      |                   |                     |
                      +---------+---------+                     |
                                |                               |
                    (idle > 24h)|     (new correlated event)    |
                                v                               |
                      +-------------------+                     |
                      |                   |                     |
                      |      DORMANT      |---------------------+
                      |                   |
                      +---------+---------+
                                |
             (operator resolve) | (requires justification)
                                v
                      +-------------------+
                      |                   |
                      |     RESOLVED      |
                      |                   |
                      +---------+---------+
                                |
          (retention > 30 days) | (or FIFO capacity eviction)
                                v
                      +-------------------+
                      |                   |
                      |     ARCHIVED      |  (Terminal State)
                      |                   |
                      +-------------------+
```

### 5.3 State Transition Matrix

| Current State | Target State | Trigger Type | Authority / RBAC | Validation Rules & Preconditions |
|---|---|---|---|---|
| `ACTIVE` | `DORMANT` | Automatic / Manual | System Background / `campaign:update` | No correlated events observed for $> 24$ hours. |
| `DORMANT` | `ACTIVE` | Automatic / Manual | System Ingestion / `campaign:update` | New correlated event linked, or manual analyst reactivation. |
| `ACTIVE` | `RESOLVED` | Manual | `campaign:update` | Operator marks resolved; requires resolution note ($\ge 5$ chars). |
| `DORMANT` | `RESOLVED` | Manual | `campaign:update` | Operator marks resolved; requires resolution note ($\ge 5$ chars). |
| `RESOLVED` | `ACTIVE` | Manual (Resurrect) | `campaign:admin` | Requires Level-2 Governor justification ($\ge 5$ chars). |
| `RESOLVED` | `ARCHIVED` | Automatic / Manual | System Storage / `campaign:admin` | Resolved age $> 30$ days or evicted via FIFO when store exceeds 500 campaigns. |
| `ARCHIVED` | Any | **Forbidden** | None | `ARCHIVED` is terminal and read-only. |

### 5.4 Merge and Split Semantics
- **Merge Operation (`POST /api/v1/campaigns/merge`):**
  - Authority: `security_administrator` (`campaign:admin`).
  - Request: `{"primary_campaign_id": "camp-1", "secondary_campaign_id": "camp-2", "justification": "..."}`.
  - Semantics: All entity associations, alerts, canaries, and cases from `camp-2` are atomically merged into `camp-1`. `camp-2` status transitions to `ARCHIVED` with metadata `{"merged_into": "camp-1"}`.
  - Audit: Emits `SystemEvent` with action `CAMPAIGN_MERGED`.
- **Split Operation:**
  - Authority: `security_administrator` (`campaign:admin`).
  - Semantics: Operator removes designated entities from a campaign. The removed entities are either returned to the unclustered telemetry pool or initialized as a new child campaign.
  - Audit: Emits `SystemEvent` with action `CAMPAIGN_SPLIT`.

---

## 6. Deterministic Clustering Contract

### 6.1 Feature Classification & Weights

| Feature Name | Category | Weight ($w_i$) | Description / Extraction Rule |
|---|---|---|---|
| `canary_id` | **Strong Anchor** | **3.0** | Module 3.7 Canary token tripwire ID. Highest confidence (0.95). |
| `ioc_value` | **Strong Anchor** | **2.5** | Module 3.8 Active IOC indicator match (confidence $\ge 0.70$). |
| `source_ip` | **Strong Link** | **2.0** | Attacker source IPv4/IPv6 address. |
| `case_id` | **Strong Link** | **2.0** | Module 3.6 Incident Case reference. |
| `rule_id` | **Moderate Link** | **1.5** | Module 3.3 Detection rule identifier (e.g., `AUTH_BRUTE_FORCE`). |
| `attack_type` | **Moderate Link** | **1.0** | Module 2.x Attack classification (e.g., `ssh_brute_force`). |
| `mitre_technique` | **Moderate Link** | **1.0** | MITRE ATT&CK technique code (e.g., `T1110`). |
| `subnet_cidr` | **Weak Link** | **0.5** | IPv4 /24 subnet or IPv6 /64 prefix. |
| `destination_ip` | **Weak Link** | **0.5** | Targeted internal decoy IP. |
| `user_agent` | **Weak Link** | **0.5** | HTTP user-agent string (post-sanitization and stop-list filter). |

### 6.2 Strict Stop-Lists (Prohibited Linkage Features)
The following attributes MUST NEVER be used to link distinct entities into a campaign:
1. **Public DNS Resolvers:** `8.8.8.8`, `8.8.4.4`, `1.1.1.1`, `1.0.0.1`, `9.9.9.9`.
2. **Loopback & Unspecified:** `127.0.0.0/8`, `::1`, `0.0.0.0`.
3. **Common Public CDNs & Cloud Fronts:** Known Cloudflare, Fastly, Akamai, and AWS CloudFront IP ranges.
4. **Default Gateway Addresses:** `192.168.1.1`, `192.168.0.1`, `10.0.0.1`.
5. **Generic User-Agents:** `curl/*`, `python-requests/*`, `Mozilla/5.0`, `Wget/*`, empty/blank strings.
6. **Whitelisted / Revoked IOCs:** Any IOC with status `whitelisted` or `revoked` in Module 3.8.

### 6.3 Similarity Metric & Clustering Rule
- **Weighted Jaccard Similarity Formula:**
  $$J(E_a, E_b) = \frac{\sum_{i \in \text{Features}} w_i \cdot |F_i(E_a) \cap F_i(E_b)|}{\sum_{i \in \text{Features}} w_i \cdot |F_i(E_a) \cup F_i(E_b)|}$$
- **Clustering Rule:** Two entities $E_a$ and $E_b$ belong to the same cluster if and only if:
  1. **Temporal Proximity:** $|t(E_a) - t(E_b)| \le 4\text{ hours}$ (sliding window) AND both events are within the 7-day clustering boundary; **AND**
  2. **EITHER** they share at least one **Strong Anchor** (`canary_id` or active `ioc_value`), **OR** their multi-feature similarity satisfies $J(E_a, E_b) \ge 0.60$.
- **Union-Find Disjoint Set Algorithm:**
  - Employs Disjoint Set Union (DSU) with path compression and union-by-rank.
  - **Deterministic Tie-Breaking:** When merging disjoint sets of equal rank, the root whose identifier is lexicographically smaller becomes the parent.
  - Complexity: Near-linear $\mathcal{O}(N \cdot \alpha(N))$ where $\alpha$ is the Inverse Ackermann function.

---

## 7. Multi-Entity Graph Contract

### 7.1 Node Schema
Every node in the derived graph read-model conforms to the following schema:

```json
{
  "id": "string",
  "type": "campaign | source_ip | destination_ip | attack | attack_event | alert | canary | ioc | case | detection_rule | mitre_tactic | integration_delivery",
  "label": "string",
  "stage": "string",
  "severity": "low | medium | high | critical",
  "confidence": 0.95,
  "first_seen": "ISO8601",
  "last_seen": "ISO8601",
  "metadata": {}
}
```

### 7.2 Allowed Directed Edges (DAG Invariant)
The graph read-model is strictly a Directed Acyclic Graph (DAG). Cycles are forbidden.

| Source Node Type | Target Node Type | Edge Type / Label | Semantics |
|---|---|---|---|
| `campaign` | `source_ip` | `MEMBER_ATTACKER` | Primary attacker infrastructure participating in campaign. |
| `campaign` | `canary` | `MEMBER_DECEPTION` | Decoy honeytoken tripped within campaign scope. |
| `campaign` | `case` | `LINKED_CASE` | Incident case opened to investigate campaign. |
| `source_ip` | `attack` | `ORIGINATED` | Attacker source IP originated attack session. |
| `source_ip` | `ioc` | `MATCHED_INDICATOR` | Attacker IP matched external threat intelligence IOC. |
| `attack` | `attack_event` | `CONTAINS_EVENT` | Individual protocol event belonging to attack session. |
| `attack` | `mitre_tactic` | `KILLCHAIN_STAGE` | Attack behavior mapped to MITRE ATT&CK tactic. |
| `attack_event` | `alert` | `TRIGGERED_ALERT` | Specific payload or event tripped detection alert. |
| `attack` | `canary` | `TRIPPED_DECEPTION` | Attack activity directly interacted with honeytoken. |
| `alert` | `case` | `ESCALATED_TO` | Alert linked to structured incident response case. |
| `alert` | `integration_delivery` | `DISPATCHED_TO` | Outbound SIEM/SOAR webhook delivery notification. |

### 7.3 Graph Limits & Deterministic Truncation Policy
- **Limits:** Max **100 nodes**, max **200 edges**, max **4 traversal hops** from campaign root.
- **Truncation Policy:** If the derived graph exceeds 100 nodes, nodes are prioritized deterministically:
  1. *Priority 1:* `campaign` root node (never dropped).
  2. *Priority 2:* `canary` nodes (high-value tripwires).
  3. *Priority 3:* `case` nodes (active incident cases).
  4. *Priority 4:* `ioc` nodes (threat intelligence indicators).
  5. *Priority 5:* `alert` nodes (critical and high alerts first).
  6. *Priority 6:* `source_ip` nodes (attacker endpoints).
  7. *Priority 7:* `mitre_tactic` nodes (killchain progression).
  8. *Priority 8:* `attack` session records.
  9. *Priority 9:* `attack_event` granular leaves and `integration_delivery` nodes (dropped first).
- **Zero Silent Discarding:** If any node or edge is pruned, the API explicitly returns truncation metadata:
  ```json
  "truncation": {
    "is_truncated": true,
    "total_nodes_discovered": 142,
    "rendered_nodes": 100,
    "pruned_nodes_count": 42,
    "pruned_by_type": {
      "attack_event": 38,
      "integration_delivery": 4
    }
  }
  ```

---

## 8. Storage & Persistence Architecture

### 8.1 Zero-Migration Dual-Mode Storage
Campaign persistence strictly follows the proven zero-migration pattern established in Modules 3.6, 3.7, 3.8, and 3.9:
- **No Database Migrations:** `backend/alembic/versions/` remains completely untouched.
- **No SQLAlchemy Model Changes:** `backend/app/models.py` remains completely untouched.
- **Dual-Mode Persistence:** Redis as primary shared state with resilient in-memory fallback.

```
+------------------------------------------------------------------------------------+
|                             CAMPAIGN STORAGE ARCHITECTURE                          |
+------------------------------------------------------------------------------------+
|   [CampaignStorage]                                                                |
|          |                                                                         |
|          +---> Primary: Redis (decode_responses=True, timeout=1.0s)                |
|          |       Key: 'hsx:campaigns:items'       (Hash: campaign_id -> JSON)      |
|          |       Key: 'hsx:campaigns:active_ids'  (Set: active campaign IDs)       |
|          |       Key: 'hsx:campaigns:entity_idx'  (Hash: entity_key -> campaign_id)|
|          |                                                                         |
|          +---> Resilient Fallback: MemoryStore (threading.RLock protected)         |
|                  Dict: _items {campaign_id: Campaign}                              |
|                  Set:  _active_ids                                                 |
|                  Dict: _entity_index                                               |
+------------------------------------------------------------------------------------+
```

### 8.2 Redis & Memory Semantics
- **Hash `hsx:campaigns:items`:** Stores JSON-serialized campaign objects. Maximum object size bounded to 64 KB.
- **Set `hsx:campaigns:active_ids`:** Maintains set of currently active campaign IDs for rapid $O(1)$ indexing.
- **Hash `hsx:campaigns:entity_idx`:** Reverse lookup mapping entity identifiers (e.g., `ip:192.168.1.50`, `canary:CAN-01`) to their assigned `campaign_id`.
- **Fault Tolerance & Consistency:**
  - Redis calls are wrapped in fail-safe try/except blocks with 1.0s connect/read timeouts.
  - If Redis is down, storage operates in in-memory mode without raising errors.
  - When Redis becomes available again, new writes populate Redis; no blocking synchronization loops are executed.
  - In an offline-Redis environment, restarting the process triggers deterministic re-clustering bootstrap from existing relational records (`attacks`, `alerts`, `cases`, `threat_intel`).

---

## 9. Resource Bounds & Safety Limits

| Resource / Parameter | Boundary Cap | Enforcement Mechanism & Failure Behavior |
|---|---|---|
| **Max Active Campaigns** | **500** | FIFO eviction of `ARCHIVED` or oldest `RESOLVED` campaigns. If all are active, oldest low-severity campaign is transitioned to `ARCHIVED`. |
| **Max Graph Nodes** | **100** | Deterministic priority pruning with explicit `"is_truncated": true` response header/body. |
| **Max Graph Edges** | **200** | Pruned alongside truncated nodes. |
| **Max Traversal Depth** | **4 hops** | BFS/DFS traversal halts at depth 4 from campaign root. |
| **Clustering Temporal Window** | **7 days** | Events older than 7 days from the current timestamp are excluded from candidate clustering. |
| **Event Slotted Sliding Window** | **4 hours** | Consecutive events must occur within 4 hours to establish a direct clustering edge. |
| **Max Input Events per Run** | **1,000** | Truncated to 1,000 most recent events sorted chronologically. |
| **Max Candidate Pair Comparisons**| **500,000** | Inverted entity index groups candidates; combinatorial cartesian product is strictly bounded. |
| **Clustering Concurrency Lock** | **1 Job** | Mutex lock (`_clustering_lock`); concurrent trigger returns HTTP 409 Conflict. |
| **Manual Clustering Rate Limit** | **1 req / 10s** | Per-operator sliding rate limiter (HTTP 429). |
| **Max API Payload Size** | **128 KB** | Bounded responses with pagination on list endpoints (max 100 items per page). |

---

## 10. API Specification (`/api/v1/campaigns`)

### Endpoint 1: `GET /api/v1/campaigns`
- **Purpose:** List campaigns with pagination and filtering.
- **Auth & RBAC:** Bearer Token, `campaign:view`.
- **Query Parameters:** `status` (optional: `active`, `dormant`, `resolved`, `archived`), `severity` (optional), `limit` (int, default 50, max 100), `offset` (int, default 0).
- **Response:** `200 OK` -> `CampaignListResponse` (`campaigns: list[CampaignSummary]`, `total: int`, `limit: int`, `offset: int`).
- **Audit:** None (read-only query).

### Endpoint 2: `GET /api/v1/campaigns/{campaign_id}`
- **Purpose:** Retrieve full dossier for a specific campaign.
- **Auth & RBAC:** Bearer Token, `campaign:view`.
- **Response:** `200 OK` -> `CampaignDossierResponse` (metadata, entity lists, killchain summary, linked cases, metrics). `404 Not Found` if missing.
- **Audit:** None (read-only query).

### Endpoint 3: `GET /api/v1/campaigns/{campaign_id}/graph`
- **Purpose:** Retrieve derived multi-entity DAG graph for visualization.
- **Auth & RBAC:** Bearer Token, `campaign:view`.
- **Response:** `200 OK` -> `CampaignGraphResponse` (`campaign_id: str`, `nodes: list[GraphNode]`, `edges: list[GraphEdge]`, `summary: GraphSummary`, `truncation: TruncationMeta`).
- **Audit:** None (read-only query).

### Endpoint 4: `GET /api/v1/campaigns/{campaign_id}/timeline`
- **Purpose:** Chronological sequence of all attacks, alerts, and canary trips in campaign.
- **Auth & RBAC:** Bearer Token, `campaign:view`.
- **Query Parameters:** `limit` (int, default 100, max 200).
- **Response:** `200 OK` -> `CampaignTimelineResponse` (`timeline_events: list[TimelineItem]`, `total: int`).
- **Audit:** None (read-only query).

### Endpoint 5: `POST /api/v1/campaigns/cluster`
- **Purpose:** Trigger on-demand deterministic re-clustering analysis.
- **Auth & RBAC:** Bearer Token, `campaign:update`.
- **Rate Limit:** 1 request per 10 seconds per operator.
- **Request Body:** None or optional `{"lookback_hours": int}` (max 168h / 7d).
- **Response:** `200 OK` -> `{"status": "completed", "campaigns_created": int, "campaigns_updated": int, "duration_ms": float}`. `409 Conflict` if clustering already in flight.
- **Audit:** Emits `SystemEvent` with action `CAMPAIGN_CLUSTER_REQUESTED`.

### Endpoint 6: `PATCH /api/v1/campaigns/{campaign_id}`
- **Purpose:** Update campaign metadata (name, status, notes, tags).
- **Auth & RBAC:** Bearer Token, `campaign:update`.
- **Request Body:** `CampaignUpdateRequest` (`name?: str`, `status?: str`, `notes?: str`, `tags?: list[str]`).
- **Response:** `200 OK` -> Updated `CampaignDossierResponse`.
- **Audit:** Emits `SystemEvent` with action `CAMPAIGN_UPDATED` or `CAMPAIGN_STATUS_CHANGED`.

### Endpoint 7: `POST /api/v1/campaigns/merge`
- **Purpose:** Administratively merge two campaigns into one.
- **Auth & RBAC:** Bearer Token, `campaign:admin`.
- **Request Body:** `CampaignMergeRequest` (`primary_campaign_id: str`, `secondary_campaign_id: str`, `justification: str`).
- **Response:** `200 OK` -> Merged `CampaignDossierResponse`.
- **Audit:** Emits `SystemEvent` with action `CAMPAIGN_MERGED`.

### Endpoint 8: `POST /api/v1/campaigns/{campaign_id}/contain`
- **Purpose:** Governor Level-3 guarded bulk containment dispatch against all campaign entities.
- **Auth & RBAC:** Bearer Token, `command:stage_containment` AND `campaign:admin`.
- **Headers:** `X-Idempotency-Key` (UUID v4 mandatory).
- **Request Body:** `CampaignContainmentRequest` (`approval_token: str`, `justification: str` [min 10 chars], `containment_type: str`).
- **Response:** `200 OK` -> `{"status": "dispatched", "contained_entities": list[str], "governor_eval": dict}`. `401 Unauthorized` on invalid/expired token. `503 Service Unavailable` if emergency lockout engaged.
- **Audit:** Emits `SystemEvent` with action `CAMPAIGN_CONTAINMENT_DISPATCHED`.

### Endpoint 9: `GET /api/v1/campaigns/metrics`
- **Purpose:** High-level campaign operational metrics for SOC dashboard KPI ribbon.
- **Auth & RBAC:** Bearer Token, `campaign:view`.
- **Response:** `200 OK` -> `CampaignMetricsResponse` (`active_campaigns: int`, `critical_campaigns: int`, `mean_dwell_time_hours: float`, `top_mitre_tactics: list[dict]`).
- **Audit:** None (read-only query).

---

## 11. Role-Based Access Control (RBAC) Contract

### 11.1 Dynamic Permission Set
Module 3.10 adds three deterministic permissions to `backend/app/auth/registry.py`:
- `campaign:view`: Read-only access to campaign listings, dossiers, graphs, timelines, and metrics.
- `campaign:update`: Authority to rename campaigns, update status, add notes, link cases, and trigger re-clustering.
- `campaign:admin`: Authority to merge campaigns, split campaigns, archive campaigns, and execute bulk containment.

### 11.2 Deterministic Role Entitlement Mapping

```python
CAMPAIGN_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "viewer": {
        "campaign:view",
    },
    "analyst": {
        "campaign:view",
        "campaign:update",
    },
    "incident_responder": {
        "campaign:view",
        "campaign:update",
    },
    "security_administrator": {
        "campaign:view",
        "campaign:update",
        "campaign:admin",
    },
}
```

### 11.3 Granular Operation Authorization Matrix

| SOC Operation | Required Permission | Viewer | Analyst | Responder | Sec Admin |
|---|---|:---:|:---:|:---:|:---:|
| View Campaigns / Graph / Timeline | `campaign:view` | **Yes** | **Yes** | **Yes** | **Yes** |
| Trigger Re-Clustering Analysis | `campaign:update` | No | **Yes** | **Yes** | **Yes** |
| Update Campaign Notes / Tags | `campaign:update` | No | **Yes** | **Yes** | **Yes** |
| Change Campaign Status (Resolve) | `campaign:update` | No | **Yes** | **Yes** | **Yes** |
| Link / Unlink Incident Case | `campaign:update` | No | **Yes** | **Yes** | **Yes** |
| Merge Two Campaigns | `campaign:admin` | No | No | No | **Yes** |
| Split / Eject Entity from Campaign | `campaign:admin` | No | No | No | **Yes** |
| Resurrect Archived Campaign | `campaign:admin` | No | No | No | **Yes** |
| Dispatch Bulk Campaign Containment | `campaign:admin` + Governor Tier 3 | No | No | No | **Yes** |

---

## 12. Safety Governor & HITL Gatekeeper Contract

### 12.1 Governor Action Allowlist Registration
Module 3.10 registers two actions in `backend/app/incident_command/governor.py`:
1. `CAMPAIGN_CONTAINMENT_DISPATCH` -> **Blast-Radius Tier 3**
2. `CAMPAIGN_STATUS_OVERRIDE` -> **Blast-Radius Tier 2**

```python
ALLOWED_ACTIONS: set[str] = {
    # ... existing 12 actions ...
    "CAMPAIGN_CONTAINMENT_DISPATCH",
    "CAMPAIGN_STATUS_OVERRIDE",
}

BLAST_RADIUS_TIERS: dict[str, int] = {
    # ... existing tiers ...
    "CAMPAIGN_STATUS_OVERRIDE": 2,
    "CAMPAIGN_CONTAINMENT_DISPATCH": 3,
}
```

### 12.2 Action Governance Policies

| Policy Attribute | `CAMPAIGN_CONTAINMENT_DISPATCH` | `CAMPAIGN_STATUS_OVERRIDE` |
|---|---|---|
| **Blast Radius Tier** | **Tier 3 (High Impact)** | **Tier 2 (Moderate Impact)** |
| **Two-Phase Preview Required** | **Mandatory** (`/api/v1/commands/preview`) | Not Required |
| **Approval Token Requirement** | **Mandatory** (Single-use, 60s TTL) | Not Required |
| **Operator Identity Binding** | Strict (`token.operator_id == current_user`) | Enforced by session |
| **Target Binding** | Strict (`token.target_id == campaign_id`) | Strict (`target_id == campaign_id`) |
| **Mandatory Justification** | **Yes ($\ge 10$ characters)** | **Yes ($\ge 5$ characters)** |
| **Idempotency Key Required** | **Yes (`X-Idempotency-Key` UUID v4)** | **Yes (`X-Idempotency-Key` UUID v4)** |
| **Emergency Lockout Gate** | **Strictly Blocked (HTTP 503)** | Permitted (Internal State) |
| **Target Entity Cooldown** | 30.0 seconds | 30.0 seconds |
| **Operator Rate Limit** | 10 commands / 60 seconds | 10 commands / 60 seconds |

---

## 13. EventBus & Telemetry Ingestion Contract

### 13.1 Consumed & Produced Events

```
  Consumed Events (Inbound)                     Produced Events (Outbound)
+------------------------------------+        +----------------------------------------+
| alert.triggered, alert.escalated   |        | campaign.created                       |
| canary.tripped                     | -----> | campaign.updated                       |
| case.created, case.escalated       |        | campaign.status_changed                |
| ioc.created, ioc.decayed           |        | campaign.merged                        |
| governor.lockout                   |        | campaign.containment_dispatched        |
+------------------------------------+        +----------------------------------------+
```

### 13.2 Recursive Processing & Loop Prevention
- **The Risk:** Publishing a `campaign.created` or `campaign.updated` event to the EventBus could trigger downstream handlers that publish further telemetry, creating an uncontrolled infinite feedback loop.
- **The Mitigation:**
  1. The campaign EventBus listener explicitly drops any event matching `event_type.startswith("campaign.")`.
  2. Background campaign re-clustering runs on an idempotent, de-bounced schedule (minimum 10-second gap) and never triggers immediate recursive re-clustering upon publishing its own events.

---

## 14. Cross-Module Compatibility (Modules 3.6, 3.7, 3.8, 3.9)

### 14.1 Module 3.6 (Case Management)
- **Relationship:** One campaign may be linked to multiple incident cases (1-to-N). A single case can belong to at most one campaign.
- **Authority:** Operators with `campaign:update` and `case:update` can link or unlink cases.
- **Storage:** Campaign stores a set of `case_ids: list[str]`. Reverse lookup queries cases where `case.campaign_id == campaign.id`.

### 14.2 Module 3.7 (Active Deception Grid)
- **Tripwire Ingestion:** When a canary token is tripped (`canary.tripped`), the event contains `canary_id`, `token_type`, and `attacker_ip`.
- **Anchor Priority:** The canary token ID acts as a Strong Anchor ($w_i = 3.0$, confidence $0.95$). Any attack events involving that attacker IP within 4 hours of the tripwire are immediately clustered into the campaign.
- **Zero Secret Exposure:** Honeytoken secrets and cryptographic credentials are never exposed in campaign graph labels or API responses.

### 14.3 Module 3.8 (Threat Intelligence & IOC Fusion)
- **Indicator Matching:** Campaign entities (IPs, domains) are evaluated against active IOCs.
- **Precedence Hierarchy:**
  1. *Whitelisted IOCs:* Disregarded entirely. Never used as clustering features.
  2. *Revoked IOCs:* Disregarded. Never used as clustering features.
  3. *Active / Decaying IOCs:* Ingested as correlation features with decayed confidence.
- **Elevating `list_campaigns`:** Module 3.8 previously contained a rudimentary string group-by on `indicator.campaign`. Module 3.10 replaces this with true multi-entity correlation while remaining backward-compatible with Module 3.8 schemas.

### 14.4 Module 3.9 (SIEM/SOAR Webhook Gateway)
- **Outbound Fanout:** Outbound webhook endpoints subscribed to `campaign.*` or wildcard `*` automatically receive serialized campaign notifications via `default_dispatcher.fanout_event`.
- **Serialization:** Supported formats: `honeyshield_json`, `cef`, `leef`, `syslog_json`.
- **Isolation:** Failures in webhook deliveries are captured in the Module 3.9 DLQ and never block campaign clustering or graph rendering.

---

## 15. Audit & Compliance Contract (`SystemEvent`)

Every state-altering operation emits an immutable, structured audit event to the PostgreSQL `system_events` table (or in-memory audit store in test mode):

| Audit Event Action | Triggering Operation | Logged Metadata |
|---|---|---|
| `CAMPAIGN_CREATED` | New campaign synthesized | `campaign_id`, `name`, `severity`, `entity_count`, `anchor_type` |
| `CAMPAIGN_UPDATED` | Metadata, tags, notes modified | `campaign_id`, `changed_fields`, `operator_id` |
| `CAMPAIGN_STATUS_CHANGED` | Status transition (e.g. resolve) | `campaign_id`, `old_status`, `new_status`, `justification`, `operator_id` |
| `CAMPAIGN_MERGED` | Two campaigns merged | `primary_id`, `secondary_id`, `justification`, `operator_id` |
| `CAMPAIGN_SPLIT` | Entity detached from campaign | `campaign_id`, `ejected_entity_id`, `justification`, `operator_id` |
| `CAMPAIGN_CASE_LINKED` | Case linked or unlinked | `campaign_id`, `case_id`, `action` (`link`/`unlink`), `operator_id` |
| `CAMPAIGN_CLUSTER_REQUESTED`| Manual clustering executed | `operator_id`, `duration_ms`, `campaigns_updated` |
| `CAMPAIGN_CONTAINMENT_DISPATCHED`| Bulk containment executed | `campaign_id`, `contained_entities`, `justification`, `approval_token`, `operator_id` |
| `CAMPAIGN_AUTH_DENIED` | RBAC permission failure | `operator_id`, `attempted_action`, `required_permission`, `target_id` |

*Note:* Read-only graph, timeline, and metric queries emit zero audit events to prevent log pollution.

---

## 16. Frontend Architecture & Operator Experience

### 16.1 Navigation & Layout
- **New Tab:** `Campaigns` tab added to the top navigation bar (`Header.tsx`) positioned between `Incident Cases` and `Deception Grid`.
- **Role Visibility:** Visible to all authenticated operators (`viewer`, `analyst`, `responder`, `admin`). Action buttons (Resolve, Merge, Contain) are conditionally rendered based on operator permissions.

### 16.2 Core Frontend Components
1. **`CampaignsView.tsx`:**
   - KPI Ribbon: Active Campaigns, High/Critical Campaigns, Mean Dwell Time, Top MITRE Tactic.
   - Status Filters: `All`, `Active`, `Dormant`, `Resolved`, `Archived`.
   - Inventory Table: Campaign ID, Name, Severity Badge, Entity Count, Stage Progression Pills, Last Activity, Quick Actions.
2. **`CampaignDossierDrawer.tsx`:**
   - Slide-over drawer detailing campaign metadata, timeline, linked cases, and associated entities.
   - Interactive controls: Edit Name, Resolve Campaign, Link Case, Quick-contain trigger.
3. **`CampaignGraphView.tsx`:**
   - Interactive SVG/Canvas Directed Acyclic Graph (DAG) rendering.
   - Grouped by MITRE ATT&CK killchain columns (Reconnaissance -> Initial Access -> Lateral Movement -> Impact).
   - Node badges for Canaries (gold shield), Alerts (red pulse), IOCs (cyan target), and Cases (indigo folder).
   - Visible truncation banner: Renders amber notification badge if graph nodes exceed 100 with pruned count.
4. **`CampaignContainmentModal.tsx`:**
   - Multi-step modal: (1) Preview target entities and blast radius, (2) Request Governor Level-3 preview approval token, (3) Capture operator justification ($\ge 10$ chars), (4) Execute containment.
   - Emergency lockout banner: Disables containment button if system lockout is active.

### 16.3 Security & Rendering Integrity
- **Zero `dangerouslySetInnerHTML`:** Strict enforcement across all campaign components.
- **Attacker Input Sanitization:** All user-agents, attacker IPs, and payload fragments are rendered as escaped React JSX text nodes.

---

## 17. Security Threat Model & Hostile Audit Matrix

| Threat Vector | Severity | Attack Scenario | Deterministic Defense Mechanism |
|---|:---:|---|---|
| **Adversarial Cluster Flooding** | High | Attacker generates thousands of unique source IPs to exhaust memory. | Bounded storage: max 500 campaigns, max 1,000 input events per clustering run, FIFO eviction. |
| **Forced False Merge (Poisoning)** | High | Attacker injects shared public DNS (`8.8.8.8`) or generic headers to merge unrelated campaigns. | Strict stop-lists filter shared public infrastructure; multi-factor similarity ($J \ge 0.60$) required. |
| **Governor Containment Bypass** | Critical | Rogue operator attempts bulk containment without Level-3 approval token. | Fails closed: Governor `evaluate_command_policy` enforces single-use token, operator binding, $\ge 10$ char justification. |
| **Privilege Escalation** | High | `viewer` or `analyst` attempts to merge campaigns or dispatch containment. | Backend RBAC enforcement: `campaign:admin` required for merge; `command:stage_containment` for containment. |
| **Stored XSS via Attacker Metadata** | High | Attacker injects `<script>` in user-agent, attack message, or canary label. | Input regex sanitization; React JSX text node escaping; 0 `dangerouslySetInnerHTML`. |
| **Graph Traversal Exhaustion (DoS)** | Medium | Attacker creates cyclic or deep graphs to cause infinite loops or stack overflow. | DAG invariant enforced; maximum traversal depth strictly capped at 4 hops; max 100 nodes / 200 edges. |
| **Event Replay / Idempotency Flapping** | Medium | Attacker or buggy client replays containment request. | Mandatory `X-Idempotency-Key` (UUID v4) with 300s TTL cache in Safety Governor. |
| **Emergency Lockout Evasion** | High | Operator attempts campaign containment while system is in emergency lockout. | Fails closed: Governor checks `_emergency_lockout` and returns HTTP 503 before any action. |
| **Concurrent Clustering Race Condition** | Medium | Multiple analysts trigger re-clustering simultaneously causing state corruption. | Threading mutex lock (`_clustering_lock`) enforces single-flight execution; returns HTTP 409 Conflict. |

---

## 18. Performance Targets & Benchmark Methodology

The following performance numbers represent **architectural target benchmarks**, not unverified claims:

| Operational Metric | Architectural Target | Hard Acceptance Threshold | Verification Methodology |
|---|:---:|:---:|---|
| **Graph Read-Model Derivation** | $< 3.0\text{ ms}$ | $< 15.0\text{ ms}$ | Measured across 100 iterations on a 100-node / 200-edge graph. |
| **Clustering Execution (500 events)** | $< 5.0\text{ ms}$ | $< 25.0\text{ ms}$ | Measured across 50 iterations with 500 events using DSU Union-Find. |
| **Campaign Dossier API Latency** | $< 10.0\text{ ms}$ | $< 35.0\text{ ms}$ | Fastly cached Redis hash retrieval. |
| **Full Campaign Graph API Latency** | $< 25.0\text{ ms}$ | $< 75.0\text{ ms}$ | End-to-end FastAPI test client request latency. |

---

## 19. Zero-Migration & Dependency Decision

- **Database Migrations:** **EXACTLY 0.** No files added to `backend/alembic/versions/`.
- **SQLAlchemy Models:** **EXACTLY 0.** No modifications to `backend/app/models.py`.
- **Third-Party Dependencies:** **EXACTLY 0.** Implemented strictly with Python standard library (`collections`, `dataclasses`, `uuid`, `time`, `json`, `threading`, `re`, `ipaddress`, `math`). Graph traversal and clustering algorithms implemented directly without `networkx` or graph databases.
- **Frontend Dependencies:** **EXACTLY 0.** Uses existing Lucide icons, Tailwind CSS, and TanStack React Query.

---

## 20. Implementation File Boundary

The following file changes are strictly demarcated for implementation:

### Files to Create (New Modules)
1. `backend/app/campaigns/__init__.py` — Package initialization and export catalog.
2. `backend/app/campaigns/clustering.py` — Deterministic Union-Find clustering and Jaccard similarity engine.
3. `backend/app/campaigns/graph.py` — Multi-entity DAG read-model derivation with priority truncation.
4. `backend/app/campaigns/storage.py` — Dual-mode Redis + thread-safe memory campaign store.
5. `backend/app/campaigns/service.py` — Campaign lifecycle, EventBus subscriptions, and orchestration service.
6. `backend/app/routers/campaigns.py` — REST endpoints under `/api/v1/campaigns`.
7. `backend/tests/test_module_3_10_campaigns.py` — Unit tests for clustering, DSU, Jaccard, and graph logic.
8. `backend/tests/test_module_3_10_rbac.py` — RBAC boundary test suite for all campaign endpoints.
9. `backend/tests/test_module_3_10_integration.py` — End-to-end telemetry-to-campaign synthesis tests.
10. `backend/tests/test_module_3_10_hostile.py` — Hostile security test suite (poisoning, limits, Governor bypass).
11. `frontend/src/components/CampaignsView.tsx` — Main SOC campaign inventory view.
12. `frontend/src/components/CampaignDossierDrawer.tsx` — Campaign detail drawer.
13. `frontend/src/components/CampaignGraphView.tsx` — Multi-entity interactive attack graph component.
14. `frontend/src/components/CampaignContainmentModal.tsx` — Governor Level-3 containment modal.
15. `frontend/src/hooks/useCampaigns.ts` — TanStack React Query hooks for campaigns.
16. `frontend/src/tests/campaigns.test.tsx` — Vitest component and UI tests.

### Files to Modify (Explicit Integration Points)
1. `backend/app/main.py` — Include `campaigns.router` under `/api/v1`.
2. `backend/app/schemas.py` — Add Pydantic schemas for campaign models, graph nodes, and requests.
3. `backend/app/auth/registry.py` — Add `CAMPAIGN_ROLE_PERMISSIONS` and wire into `Operator.permissions`.
4. `backend/app/incident_command/governor.py` — Register `CAMPAIGN_CONTAINMENT_DISPATCH` (Tier 3) and `CAMPAIGN_STATUS_OVERRIDE` (Tier 2).
5. `frontend/src/App.tsx` — Add `'campaigns'` view state and view switcher routing.
6. `frontend/src/components/Header.tsx` — Add `Campaigns` button to navigation bar.
7. `frontend/src/types.ts` — Add TypeScript types for campaigns and graph nodes.

### Strictly Untouched Files (Frozen Boundaries)
- `backend/alembic/versions/*` — Untouched (0 migrations).
- `backend/app/models.py` — Untouched (0 model changes).
- `requirements.txt` — Untouched (0 dependencies).
- `package.json` — Untouched (0 dependencies).
- Core detection algorithms of Modules 2.x, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 3.9 remain untouched.

---

## 21. Test & Acceptance Gates

### Implementation Gate
- 100% pass across all new Module 3.10 backend test suites (`campaigns`, `rbac`, `integration`, `hostile`).
- 100% pass across all predecessor regression test suites (Modules 2.x–3.9).
- 100% pass across frontend Vitest suites.
- Clean frontend production build (`npm run build`).
- Exactly 0 database migrations, 0 model alterations, 0 dependency changes.

### Hostile Security Audit Gate
- Cluster Poisoning Suite: Verifies stop-lists block public DNS and generic user-agents from merging distinct campaigns.
- Resource Exhaustion Suite: Verifies 500 campaign cap, 100 node cap, and 1,000 input event limits under load.
- RBAC Enforcement Suite: Verifies 403 Forbidden for unauthorized roles across all endpoints.
- Governor Gatekeeper Suite: Verifies Tier-3 approval token validation, justification, and emergency lockout enforcement.
- Input Sanitization & XSS Suite: Verifies zero code execution or HTML injection across metadata fields.

### Freeze Gate
- Clean working directory diff verified against baseline `30b09bf26f6a6e585364d05df9590fbfced4a5c5`.
- Local git commit created with structured message.
- Remote push status: **STRICTLY ZERO PUSH**.

---

## 22. System 2 / System 3 Safety Reconciliation

Module 3.10 is the **foundational deterministic substrate** required before any autonomous cognitive reasoning architecture can be responsibly evaluated:
1. **Determinism as a Prerequisite:** Autonomous reasoning (System 2 deliberative planning, System 3 multi-agent collaboration) cannot function reliably on disconnected, noisy telemetry. It requires structured, topological, and bounded threat campaign objects.
2. **Strict Separation of Synthesis vs. Authority:** Module 3.10 synthesizes intelligence; it does NOT possess autonomous execution authority. All disruptive actions remain strictly behind the Governor Level-3 human-in-the-loop (HITL) gatekeeper.
3. **Evidence Requirement for Future System 2 Evaluation:** System 2 evaluation requires complete, deterministic campaign graph synthesis, zero false merges under hostile stress testing, and proven Governor HITL containment isolation.

---

## 23. Deferred Scope

1. **Sigma Detection-as-Code Compiler:** Deferred to avoid introducing external parser dependencies (`pySigma`).
2. **Volumetric Baseline ML / Statistical Anomaly Detection:** Deferred to avoid non-deterministic statistical noise and high false-positive rates.
3. **Automated Autonomous Remediation:** Strictly forbidden. Autonomous containment without operator approval violates the core safety invariants of HoneyShield-X.

---

## 24. Final Architecture Verdict

```
========================================================================================
FINAL RECONCILIATION VERDICT:
APPROVED FOR IMPLEMENTATION — READY FOR DEVELOPMENT
========================================================================================
All 24 architectural contracts have been verified and reconciled against the frozen
baseline commit 30b09bf26f6a6e585364d05df9590fbfced4a5c5.

Summary of Gate Status:
- Code Modifications in this Gate : EXACTLY ZERO
- Database Migrations              : EXACTLY ZERO
- SQLAlchemy Model Modifications   : EXACTLY ZERO
- New Third-Party Dependencies     : EXACTLY ZERO
- Commits Created                  : EXACTLY ZERO
- Remote Push Status               : STRICTLY ZERO PUSH
========================================================================================
```
