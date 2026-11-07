# HoneyShield X — Milestone 21: Investigations & Deep Forensic Analysis

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Deep Forensic Investigation Workspace

The **Forensics Workspace** (`Forensics.tsx`) is the primary investigative command center where analysts reconstruct the blast radius of security incidents. It consolidates host telemetry, network socket states, process ancestry trees, and tamper-evident audit logs.

Key forensic capabilities verified:
1. **Process Ancestry Tree:** Interactive graphical rendering of process lineage (`systemd` &rarr; `bash` &rarr; `python` &rarr; `nc`).
2. **MITRE ATT&CK Mapping:** Tactic and technique classification (e.g., `T1059.004 Unix Shell`, `T1071.001 Web Protocols`).
3. **Artifact Timeline:** Millisecond-accurate chronology of adversary actions and canary touches.
4. **Two-Step Containment Safeguards:** Mandatory confirmation modal before host/IP isolation to prevent accidental disruption.

---

## 2. Process Tree & Telemetry Reconstruction

When an IP or process PID is selected, HoneyShield X queries the forensic graph:
- Visual nodes display PID, execution user (`root`, `www-data`), and launch arguments.
- Suspicious spawn chains (such as web server children spawning network shells) are highlighted with high-contrast crimson border indicators.
- File integrity hashes are cross-checked with the Threat Intelligence IOC repository.

---

## 3. Two-Step Containment Protocol

To protect production infrastructure from accidental isolation, all remediation actions require an explicit two-step authorization workflow:
1. **Step 1: Initiate Containment:** Analyst clicks "Isolate Host" or "Block Attacker IP".
2. **Step 2: Dual-Confirmation Modal:**
   - Displays affected CIDR range, hostname, and potential blast radius.
   - Requires explicit verification click with safety warnings.
   - Invokes backend containment broker with cryptographic operator token.

---

## 4. Test Verification Summary

- **Frontend Tests:** `investigation.test.tsx` (5/5 passed) verifies process tree nodes, MITRE badge generation, and modal confirmation states.
- **Backend Tests:** `test_milestone16_forensics_and_reconciliation.py` (12/12 passed) confirms tamper-evident forensic hash chains (`SHA-256` Merkle chain) and case lifecycle persistence.

