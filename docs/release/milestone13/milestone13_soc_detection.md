# Milestone 13 — Multi-Vector SOC Detection, Alerting & Server-Derived Risk Scoring

**Document ID:** `HSX-DOC-M13-009`  
**Classification:** Detection Engineering & SOC Telemetry  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/routers/attacks.py`, `backend/app/routers/alerts.py`, `backend/app/services/detection_engine.py`

---

## 1. Detection Engine Architecture

System 1 (SOC Detection & Alerting) executes continuous ingestion, event correlation, and risk scoring across physical network sensors, deception tripwires, and digital agent telemetry.

### Core Detection Capabilities:
1. **Multi-Vector Threat Ingestion:** Ingests brute-force SSH attacks, web application exploits (SQLi/XSS), lateral movement scans, honeypot port probes, and canary credential access.
2. **Deterministic Risk Scoring:**
   - Risk scores are computed **exclusively on the backend** using a multi-factor weighting formula:
     $$\text{RiskScore} = \min(100, \; w_v \cdot \text{VectorWeight} + w_c \cdot \text{CanaryMultiplier} + w_r \cdot \text{ReputationPenalty} + w_f \cdot \text{Frequency})$$
   - Client applications (Web SOC and Mobile SOC) are strictly forbidden from altering or computing synthetic risk scores.
3. **Attack-to-Alert Correlation:**
   - Raw probe events are aggregated into high-fidelity `Alert` entities.
   - Alerts retain direct foreign-key linkages to triggering `Attack` records.
4. **Containment State Machine:**
   - Alerts progress through verified states: `detected` $\rightarrow$ `investigating` $\rightarrow$ `acknowledged` $\rightarrow$ `contained` $\rightarrow$ `resolved`.
   - Containment triggers automated SOAR playbook suggestions.

---

## 2. Ingestion & Detection Verification Matrix

| Attack Vector | Ingest Path | Associated Threat Actor / Campaign | Risk Score | Target Agent Stage |
|:---|:---|:---|:---|:---|
| **SSH Brute Force** | Honeypot Cowrie Node | `APT-29 / Midnight Blizzard` | 94.0 (Critical) | `SENTINEL` Alert Confirmed |
| **SQL Injection Probe** | NGINX Honey Proxy | `FIN7 / Carbanak` | 82.5 (High) | `ORACLE` IOC Correlated |
| **Canary Token Trigger**| AWS Canary Decoy Key | `Internal Threat / Recon` | 98.0 (Critical) | `SENTINEL` Quarantine Suggested |
| **Port Sweep / TCP SYN**| Network Deception Grid| `Automated Internet Scanner` | 42.0 (Medium) | `SCOUT` Ingestion Logged |

---

## 3. Verification & Validation Evidence

Tested via `scripts/verify_cross_platform_event_trace.py` and backend test suites (`test_digital_agent_live_events.py`, `test_milestone8_operational_readiness.py`):
- High-risk attack ingestion generated valid `Alert` with risk score 94.0.
- Outbox event was published and linked with monotonically increasing cursor `cursor=4`.
- Alerts correctly filtered by severity, status, and associated attack ID.

