# HoneyShield X — Digital Agent Universe
## Milestone 2: Event Source Inventory & Backend Instrumentation

**Document:** `docs/digital-agents/milestone2_event_source_inventory.md`  
**Milestone:** 2 — Live Backend Integration, Real-Time Movement & Verified Agent Handoffs  
**Status:** COMPLETE & VERIFIED  

---

### 1. Connected Backend Event Sources

The HoneyShield X platform instruments genuine security operations across Systems 1, 2, and 3:

| Subsystem | Operation | Trigger Point | Emitted Event Type | Assigned Agent |
| :--- | :--- | :--- | :--- | :--- |
| **System 2 (Deception)** | Honeypot Probe Ingestion | `POST /api/v1/ingestion/events` | `scout.collection_completed` | **SCOUT** |
| **System 1 (SOC Core)** | Attack Normalization & Outbox Write | `backend/app/routers/ingestion.py` | `nexus.normalization_completed` | **NEXUS** |
| **System 1 (SOC Core)** | Redis Stream Ingestion | `backend/app/events/store.py` | `queue.event_persisted` | **NEXUS** |
| **System 1 (SOC Core)** | Sliding Window Rule Detection | `backend/app/detection/service.py` | `detection.rule_matched` | **ORACLE** |
| **System 3 (Threat Intel)** | Source IP Indicator Lookup | `backend/app/threat_intelligence/service.py` | `oracle.intelligence_completed` | **ORACLE** |
| **System 1 (SOC Core)** | Critical Risk Threshold Triage | `backend/app/alerts/service.py` | `alert.created` | **SENTINEL** |
| **System 1 (SOC Core)** | Notification Dispatch & Push Fanout | `backend/app/notifications/service.py` | `sentinel.notification_completed` | **SENTINEL** |
| **System 1 (Governor)** | Level-3 Containment Countermeasure | `backend/app/routers/emergency.py` | `governor.containment_executed` | **SENTINEL** |

---

### 2. Verified Autonomous Agent Handoffs

Milestone 2 implements four verified causal handoff transitions:

#### 1. SCOUT $\to$ NEXUS (Sensor Capture to Ingestion Gateway)
- **Condition:** Ingestion service receives normalized probe event from edge sensor (Cowrie / Trap).
- **Handoff Event:** `handoff.scout_to_nexus`
- **Context:** `"Sensor event from 198.51.100.123 ingested. Handed off to NEXUS for normalization."`
- **Confirmation:** Requires HTTP 201 Created and `attack_events` row committed.

#### 2. NEXUS $\to$ ORACLE (Normalization to Threat Correlation)
- **Condition:** Attack container is created and enriched against local IOC database.
- **Handoff Event:** `handoff.nexus_to_oracle`
- **Context:** `"Normalized attack record #101. Requesting threat correlation from ORACLE."`
- **Confirmation:** Requires attack container committed to database.

#### 3. ORACLE $\to$ SENTINEL (Confirmed IOC Match to Alert Triage)
- **Condition:** IOC indicator lookup confirms adversary correlation with elevated risk score ($\ge 50.0$).
- **Handoff Event:** `handoff.oracle_to_sentinel`
- **Context:** `"Threat intelligence correlated IOC 203.0.113.195 (Threat: high). Escalated to SENTINEL."`
- **Confirmation:** Requires indicator match and alert threshold evaluation.

#### 4. NEXUS $\to$ SENTINEL (Direct Alert Generation)
- **Condition:** Detection engine identifies severe attack pattern that triggers direct alerting without requiring intelligence enrichment.
- **Handoff Event:** `handoff.nexus_to_sentinel`
- **Context:** `"Immediate high-severity brute-force pattern matched. Direct dispatch to SENTINEL."`

