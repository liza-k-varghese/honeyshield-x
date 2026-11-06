# Milestone 15 — Unified Investigation Workspace & Forensic Case Management

**System:** HoneyShield X SOC Case Management & Investigation Workspace  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Unified Case Lifecycle & Operational Workflows

The SOC Investigation Workspace unifies alerts, attack telemetry, forensic evidence, playbook SOP checklists, and analyst notes into coherent incident dossiers (`/api/v1/cases`):
- **Lifecycle Progression:** `new` -> `investigating` -> `containment_in_progress` -> `contained` -> `resolved` -> `closed`.
- **Role-Gated Actions:**
  - Analysts can view cases, create notes, append evidence, and check off playbook tasks.
  - Incident Responders can stage dry-run containment actions and initiate containment states.
  - Security Administrators retain exclusive authority for closure sign-off and administrative deletion.

---

## 2. Forensic Evidence Vault Integration

Each incident case can have multiple forensic evidence items attached via `POST /api/v1/cases/{case_id}/evidence`:
- Supports honeypot sessions, raw packet captures, sensor ingest logs, process execution traces, and network flow summaries.
- Automatically calculates canonical SHA-256 digests and persists provenance records.
- Verified on retrieval with zero-copy cryptographic checking.

