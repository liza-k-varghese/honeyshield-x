# Milestone 12.2 — Cross-Platform Digital Agent Universe Correlation

**Document:** `milestone12_2_digital_agent_correlation.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Preserving Digital Agent Identities

The 4 robotic digital agents maintain consistent visual identities and operational domains across Web Command Center and Mobile Android SOC:
- **SCOUT (`#3B82F6`):** Ingests sensor probes and raw attack events.
- **NEXUS (`#06B6D4`):** Central nervous system, streams real-time courier updates.
- **ORACLE (`#A855F7`):** Correlates indicators with STIX/TAXII threat intelligence.
- **SENTINEL (`#EF4444`):** Coordinates canary traps and Governor containment defenses.

---

## 2. Event Correlation Trace Integrity

In accordance with Part 17.5:
- **No False Correlation:** ORACLE is not activated if threat intelligence enrichment did not occur; SENTINEL is not animated if no alert was created.
- **Authoritative Outbox Sequence:** The mobile `DigitalAgentStatusPanel.tsx` derives state directly from the PostgreSQL transactional outbox sequence.
- **Handoff Trace:** When an event moves through the pipeline, the courier handoff route (`SCOUT -> NEXUS -> ORACLE -> SENTINEL`) is updated synchronously on both desktop and mobile.

