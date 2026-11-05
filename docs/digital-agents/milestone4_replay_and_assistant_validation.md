# HoneyShield X — Digital Agent Universe
## Milestone 4: Historical Replay & NEXUS Assistant Validation

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Target:** EventJourneyReplay, NexusAssistantModal, Digital Agent Universe  
**Status:** FULLY VERIFIED & COMPLIANT

---

## 1. Historical Event Journey Replay Validation

The `EventJourneyReplay` component enables SOC analysts to replay the exact multi-agent path taken by past security events.

### 1.1 The 11 Canonical Lifecycle Stages
The HoneyShield X event lifecycle is strictly partitioned into 11 canonical pipeline stages:

```
[1] Ingestion --------> [2] Normalization ----> [3] Enrichment --------> [4] Threat Lookup
                                                                               |
[8] Investigation <---- [7] Alert Generation <- [6] Correlation <------- [5] Triage
        |
        +-------------> [9] Containment ------> [10] Notification -----> [11] Archival
```

### 1.2 Honest "NOT RECORDED" Handling
In strict adherence to platform design integrity, when replaying events where certain pipeline stages were not executed or telemetry was omitted:
- The UI **does not** invent fake timestamps or synthetic processing durations.
- The stage card explicitly renders an amber warning pill labeled `NOT RECORDED`.
- The timestamp displays `Stage bypassed or unrecorded in event trace`.
- The scrubber allows stepping past unrecorded stages without crashing or halting the replay engine.

### 1.3 Replay Controls & State Isolation
- **VCR Transport Controls:** Scrub slider with millisecond positioning, Play/Pause button, Step Forward, Step Back, and Speed Selectors (0.5x, 1x, 2x, 5x).
- **Agent Avatar Tracking:** When scrubbing, the associated agent avatar (SCOUT, NEXUS, ORACLE, or SENTINEL) dynamically updates its position along the timeline.
- **State Isolation:** Replaying past events runs in an isolated virtual canvas. It does not overwrite the real-time coordinates of active live agents or trigger duplicate backend notifications.

---

## 2. NEXUS Contextual Assistant Validation

The `NexusAssistantModal` serves as an intelligent SOC operational copilot grounded directly in HoneyShield X telemetry and routing.

### 2.1 Supported Grounded Queries
The assistant provides authoritative answers across 9 canonical operational areas:

| Query Category | Example Operator Prompt | Grounded System Response & Deep Links |
|----------------|-------------------------|---------------------------------------|
| 1. High-Severity Alerts | "Show me active critical alerts" | Queries active alerts; links directly to `/soc/alerts?severity=critical`. |
| 2. Honeypot Activity | "What honeypots are seeing attacks?" | Reports SSH/Cowrie and HTTP trap telemetry; links to `/honeypots/overview`. |
| 3. Threat Indicators | "Check threat intelligence for IP" | Cross-references MITRE ATT&CK and Virustotal indicators; links to `/threat-intel/indicators`. |
| 4. Agent Workload | "Which agent has the highest queue?" | Summarizes queue depths across SCOUT, NEXUS, ORACLE, SENTINEL. |
| 5. Canary Tokens | "Have any honeytokens been tripped?" | Checks canary token database; links to `/honeypots/canary-tokens`. |
| 6. System Health | "Is the backend outbox healthy?" | Inspects Redis stream latency and PostgreSQL event outbox lag. |
| 7. Investigation Graph | "Open investigation for incident #402" | Opens incident correlation graph; links to `/soc/investigations/402`. |
| 8. Operational Territories | "Explain the 4 agent territories" | Describes Sensor Grid, Processing Hub, Threat Vault, and Incident Command. |
| 9. General Help | "What can you do?" | Explains available commands, operational boundaries, and security policies. |

### 2.2 Security Rule: Strict Containment Refusal
To maintain zero-trust security and prevent unauthorized or accidental remediation actions via conversational prompts, the NEXUS Assistant enforces strict containment boundaries:

> **Operator Request:** *"Isolate host 192.168.1.50"* or *"Block IP 203.0.113.19 on the perimeter firewall"*  
> **NEXUS Assistant Policy:** **REFUSE UNILATERAL CONTAINMENT**  
> **Assistant Response:**  
> *"Containment actions cannot be executed directly through the conversational assistant. To isolate hosts, terminate sessions, or update perimeter firewall rules, please navigate to the authorized Containment Console at [/soc/containment](file:///soc/containment) to perform manual or dual-authorization remediation."*

This refusal mechanism was tested and confirmed in both unit and integration suites.

### 2.3 Accessibility: Escape Key Modal Dismissal
To provide smooth keyboard navigation for SOC operators:
- The modal attaches an event listener for the `Escape` key (`keydown`).
- Pressing `Escape` immediately triggers the `onClose` callback, restoring keyboard focus to the main dashboard without mouse interaction.
- Verified in `milestone4_browser_motion.test.tsx` (Test #12).

