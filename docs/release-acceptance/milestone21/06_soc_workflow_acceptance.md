# HoneyShield X — Milestone 21: SOC Workflow Acceptance & System 1 Detection Operations

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Scope of System 1: Security Operations & Detection

System 1 represents the analytical heartbeat of HoneyShield X. It ingests raw telemetry, applies real-time behavioral and signature detection rules, calculates composite risk scores, and surfaces actionable security alerts to SOC operators.

Key components evaluated in this milestone:
- Real-time event ingestion and parsing (`/api/v1/attacks`, `/api/v1/alerts`).
- Detection rule evaluation engine (e.g. brute-force, SQL injection, RCE, honeytoken access).
- Risk scoring algorithm (0 to 100 severity calculation).
- Priority alert triage interface and 1-click investigation handoff.

---

## 2. Ingestion & Rule Evaluation

When security events arrive at the backend (via agent telemetry, honeypot loggers, or external SIEM webhooks), they pass through the detection pipeline:
1. **Normalization:** Payloads are validated against Pydantic schemas (`AttackCreate`, `AlertCreate`).
2. **Correlation:** Events matching known threat signatures or canary token fingerprints trigger rule alerts.
3. **Risk Scoring:** 
   $$\text{Risk} = w_{\text{sev}} \cdot S + w_{\text{freq}} \cdot F + w_{\text{asset}} \cdot A$$
   Critical exploits (e.g., RCE attempts) receive risk scores $\ge 90$, automatically escalating them to the Priority Alert Queue.

---

## 3. Operator Triage & 1-Click Investigation Workflow

### 3.1 Priority Threat Display
The top of the SOC overview renders active critical alerts with:
- **Timestamp (UTC)**
- **Attack Classification:** (e.g., `RCE Exploit Attempt`, `Canary Honeytoken Access`)
- **Attacker IP & Target Endpoint:** (e.g., `198.51.100.99` &rarr; `/api/v1/auth`)
- **Severity & Status:** Visual badges (`critical` / `open`)
- **Action Control:** Dedicated `Investigate` button.

### 3.2 1-Click Forensic Transition
Clicking `Investigate` triggers the verified handler:
```typescript
onInvestigateIp(alert.attacker_ip);
```
This single operator action:
1. Navigates the operator to the **Forensics Workspace** (`view='forensics'`).
2. Populates the global search filter with the adversary IP.
3. Queries backend forensic records for associated process ancestry, connection timelines, and reverse DNS records.

---

## 4. Test Verification Summary

- **E2E-03:** Validated in `milestone21_e2e_flows.test.tsx` that clicking `Investigate` on a critical alert immediately invokes `onInvestigateIp` with the attacker's IP.
- **Backend API Tests:** `test_phase5_e2e_integration.py` confirms that alert creation, triage state updates (`open` &rarr; `acknowledged` &rarr; `resolved`), and event correlation execute without database deadlocks.

