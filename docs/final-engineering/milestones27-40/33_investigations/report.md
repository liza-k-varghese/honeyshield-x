# Milestone 33 — Investigations & Incident Case Management

**Release Candidate:** `v1.0.0-rc5`  
**Frontend Views:** `http://127.0.0.1:5173/?view=cases` and `http://127.0.0.1:5173/?view=investigation`  
**Backend Endpoints:** `/api/v1/cases`, `/api/v1/investigation`, `/api/v1/evidence`  
**Status:** **PASSED / VERIFIED WITH FIREFOX VISUAL PROOF**  

---

## 1. Investigation Architecture

Milestone 33 validates the complete incident response lifecycle from initial alert triage through forensic evidence collection and case closure.

### Key Workflows Tested
1. **Interactive Investigation Graph:**
   - Visual entity-relationship graph connecting Attacker IPs, Attacked Assets, Deception Lures, Detection Alerts, and Forensic Evidence.
   - Dynamic node expansion, blast-radius calculation, and MITRE phase progression.
2. **SOC Incident Case Management:**
   - Formal case tickets with assigned Tier 1/2/3 handlers, severity categorization, status tracking (Open, Under Investigation, Containment In Progress, Resolved).
   - Playbook execution tracking and timeline reconstruction.
3. **Cryptographic Forensic Evidence Vault:**
   - Immutable evidence attachment with canonical SHA-256 computation and anti-tamper verification.

---

## 2. Visual Proof

Native Firefox screenshots captured at:
- `docs/final-engineering/milestones27-40/evidence/m33_case_management.png`: Case overview table, case status metrics, priority breakdown, and active playbooks.
- `docs/final-engineering/milestones27-40/evidence/m33_investigations.png`: Investigation entity graph, correlation timeline, and evidence summary.

---

## 3. Test Verification

- **Cases Test Suite (`frontend/src/components/__tests__/cases.test.tsx`):** **6 / 6 passed**.
- **Investigation Suite (`frontend/src/components/__tests__/investigation.test.tsx`):** **5 / 5 passed**.
- **Backend Evidence Pytest (`backend/tests/test_milestone16_forensics_and_reconciliation.py`):** **24 / 24 passed**.
