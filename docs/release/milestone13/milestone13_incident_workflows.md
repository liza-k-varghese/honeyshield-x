# Milestone 13 — Incident Response Workflows, SOAR Playbooks & Cross-Platform Triage

**Document ID:** `HSX-DOC-M13-016`  
**Classification:** Incident Response & Operational Workflows  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/services/playbook_engine.py`, `backend/app/routers/incidents.py`

---

## 1. Incident Response Lifecycle & SOAR Automation

HoneyShield X integrates automated Security Orchestration, Automation, and Response (SOAR) playbooks with human-in-the-loop triage across Web and Mobile interfaces.

### Incident State Progression:
$$\text{TRIGGER} \longrightarrow \text{DETECTED} \longrightarrow \text{TRIAGED} \longrightarrow \text{CONTAINED} \longrightarrow \text{RESOLVED}$$

1. **Trigger:** Honeypot or canary tripwire fires; threat intelligence attributes attacker.
2. **Triaged:** Operator reviews attack timeline, raw pcap extracts, and IOC correlations.
3. **Contained:** Automated or manual containment executed (dry-run mode active during staging).
4. **Resolved:** Forensic summary finalized, playbook actions closed, and outbox notification broadcast.

---

## 2. Standard SOAR Playbooks

| Playbook Identifier | Threat Scenario | Automated Actions (Dry-Run in Staging) | Required Operator Approval |
|:---|:---|:---|:---|
| **PB-01: BRUTE-FORCE** | SSH / RDP Brute Force | IP null-routing recommendation, honeypot decoy rotation | Analyst Single-Click |
| **PB-02: CANARY-EXFIL**| Canary Token Detonation | Revoke compromised credential, freeze associated IAM role | Senior Responder Step-Up |
| **PB-03: LATERAL-SCAN**| Subnet Port Sweep | Dynamic firewall rule generation, decoy injection | Analyst Single-Click |
| **PB-04: WEB-INJECT**  | SQLi / Command Injection| WAF rule update proposal, capture full session pcap | Auto-contained in Dry-Run |

---

## 3. Concurrent Multi-Operator Triage & State Synchronization

When an operator on Mobile acknowledges or updates an incident, the change is committed to PostgreSQL and published through the Redis event channel:
- Web SOC updates the incident banner and moves the card to `Acknowledged` within < 25ms.
- Other mobile operators receive the state mutation and display the locking operator's avatar and timestamp.
- Optimistic UI updates with rollback prevent race conditions or split-brain triage states.
- Verified in `backend/tests/test_phase5_e2e_integration.py` (Incident workflow lifecycle passed).

