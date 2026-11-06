# Milestone 9 — SOC Monitoring, Detection & Incident Command Integration

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Date:** 2026-11-06  
**Auditor:** SOC Detection Engineering & Incident Response Lead  

---

## 1. System 1 Capabilities

The Security Operations Center (System 1) pipeline processes continuous security telemetry, enforces rule-based attack detection, scores incident risk, and manages formal containment cases.

### 1.1 Ingestion & Normalization
- Normalizes incoming events from sensor agents and network listeners into standardized schema envelopes.
- Emits structured telemetry records linked to attack tracking identifiers.

### 1.2 Detection Engine
- Operates sliding time-window detection algorithms.
- Validated rule: `detect_ssh_brute_force` triggers when `>= 5` failed authentications occur within a 300-second window from a common source IP.
- Assigns severity level (`low`, `medium`, `high`, `critical`) based on threshold breaches.

### 1.3 Risk Scoring Engine
- Computes comprehensive risk scores using authoritative formula:
  $$\text{RiskScore} = \min(100.0, (\text{SeverityWeight} \times 0.4) + (\text{AssetCriticality} \times 0.3) + (\text{IOCConfidence} \times 0.3))$$
- Verified: attacks enriched with high-confidence threat indicators reach risk scores $\ge 50.0$, crossing the automatic alert threshold.

### 1.4 Persistent Security Alerts & Case Store
- Automatically generates persistent `Alert` entries with statuses: `pending`, `acknowledged`, `escalated`, `closed`.
- Operators can convert alerts into structured `Case` objects containing observable artifacts, incident commander assignments, and containment plans.

### 1.5 Containment Governor & Role Enforcement
- Enforces strict two-tier authorization:
  - `analyst`: Can preview actions and view proposed plans; cannot execute containment.
  - `security_administrator`: Authoritative clearance required to execute live containment actions (firewall block, token revocation, endpoint isolation).

