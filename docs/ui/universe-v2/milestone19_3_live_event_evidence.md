# HoneyShield X — Milestone 19.3: Live Event Evidence & Multi-Profile Showcase

**Verification Date:** 2026-11-07  
**Trace Script:** `scripts/verify_milestone19_3_live_showcase.py`  
**Evidence Artifact:** `docs/ui/universe-v2/evidence/milestone19_3_event_trace.json`  
**Execution Standard:** Zero Mocking — Real DB Commits, Strict Monotonicity, and Non-Forced Agent Workflows  

---

## 1. Multi-Profile Live Event Validation

Milestone 19.3 validates real backend-to-browser event flows across two distinct operational profiles to prove that agents are only invoked when their corresponding service is genuinely executed:

### Profile A: Full 4-Agent Critical Incident Escalation
- **Input Probe:** SSH Brute Force exploit attempt against DMZ Cowrie honeypot (`198.51.100.99`).
- **Database Commit:** Ingestion API commits `Attack #1` with critical risk score ($96.4$).
- **Agent Handoffs:**
  1. `SCOUT` collects sensor telemetry $\to$ Outbox Cursor **`#1`** (`tr_showcase_scout_001`).
  2. `NEXUS` normalizes to ECS schema and commits ACID outbox record $\to$ Outbox Cursor **`#2`** (`tr_showcase_nexus_002`).
  3. `ORACLE` enriches indicators against STIX/TAXII threat intel $\to$ Outbox Cursor **`#3`** (`tr_showcase_oracle_003`).
  4. Ingestion API commits `Alert #1` (`CRITICAL_BRUTE_FORCE_BREACH`).
  5. `SENTINEL` stages automated containment $\to$ Outbox Cursor **`#4`** (`tr_showcase_sentinel_004`).

### Profile B: Targeted 2-Agent Normalization (ORACLE & SENTINEL Skipped)
- **Input Probe:** Low-severity port probe against SMB honeypot (`203.0.113.15`).
- **Database Commit:** Ingestion API commits `Attack #2` with low risk score ($12.0$).
- **Agent Handoffs:**
  1. `SCOUT` collects sensor telemetry $\to$ Outbox Cursor **`#5`** (`tr_showcase_scout_benign_005`).
  2. `NEXUS` normalizes probe and writes to outbox $\to$ Outbox Cursor **`#6`** (`tr_showcase_nexus_benign_006`).
  3. **Deliberate Skip:** Because the risk score ($12.0$) falls well beneath the alert threshold, **ORACLE** threat enrichment and **SENTINEL** alert creation are **not invoked**.
  4. **Verification:** Zero fake alerts were fabricated, proving telemetry honesty.

---

## 2. Sequence Monotonicity & Outbox Replay Evidence

All 6 events from both profiles were queried directly from the `SecurityEventOutbox` table:

```
Outbox Sequence Cursors: [1, 2, 3, 4, 5, 6]
Monotonicity Check: PASSED (Strictly Ascending)
Duplicate Check:    PASSED (Zero Duplicate IDs)
```

The serialized JSON evidence is archived at:
`docs/ui/universe-v2/evidence/milestone19_3_event_trace.json`

