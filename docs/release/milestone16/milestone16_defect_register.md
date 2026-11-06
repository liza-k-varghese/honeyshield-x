# Milestone 16 — Defect Register & Resolution Audit

**Project:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Milestone:** 16 — Android Native Build Forensics, Threat Hunting Validation & Release Audit  
**Evaluation Date:** 2026-11-06  

---

## 1. Verified Defect Inventory

| Defect ID | Severity | Affected Component | Root Cause & Description | Remediation & Status |
|---|:---:|---|---|---|
| **DEFECT-M16-01** | **P0 (Blocker)** | Mobile Release Artifact | Earlier report claimed a ~60KB signed APK. Structural analysis confirms the archive contains raw text XML (`AndroidManifest.xml`) rather than compiled binary AXML, and lacks `resources.arsc`. Standard Android OS `PackageParser` will reject installation. Host lacks `aapt` / full Android SDK. | **INVESTIGATED & VERIFIED**: Track D (Hardware Acceptance) held at **BLOCKED / NOT TESTED**. APK classified as an assembled package containing genuine classes/JS, but unexecutable without a compiled AXML manifest. |
| **DEFECT-M16-02** | **P1 (High)** | Risk Scoring Consistency | Inconsistent risk scales reported between Milestone 9 (0–100 composite operational score) and Milestone 15 (0–10 rule base score). | **RESOLVED**: Reconciled and formalized in `RiskScoreExplanationResponse`. Rule base scores ($S_{\text{rule}} \in [0, 10]$) in Rule Catalog/Simulation Lab map via orchestrator weights to composite operational scores ($S_{\text{operational}} \in [0, 100]$) in `Attack.risk_score`. Added explicit `scale` and `normalized_score_10` fields. |
| **DEFECT-M16-03** | **P1 (High)** | NEXUS AI Assistant | Basic regex matching alone was reported as complete prompt injection defense; lacked untrusted data quarantine and object-level authorization for private cases. | **RESOLVED**: Implemented multi-layered defense in `nexus_investigation_assist`: extended regex patterns for admin/rule overrides, strict object-level RBAC checks on case access, and automatic quarantine of hostile payloads embedded inside retrieved evidence. |
| **DEFECT-M16-04** | **P2 (Medium)** | Evidence Chain-of-Custody | Milestone 15 documentation described SHA-256 evidence hashing in terms that could imply external PKI or tamper-proof chain of custody. | **RESOLVED**: Clarified in documentation: SHA-256 digests provide cryptographic integrity checking within the existing application trust boundary, but do not protect against privileged root/DBA modification without external HSM or ledger. |
| **DEFECT-M16-05** | **P2 (Medium)** | Saved Hunts & Evidence Persistence | Dual-mode storage stores records in Redis with in-memory fallback. In environments where Redis is offline or unpersisted, records do not survive process restarts. | **RESOLVED**: Documented exact persistence boundaries: durability across cold backend restarts is guaranteed only when persistent Redis (AOF/RDB) is active; in-memory fallback is strictly ephemeral. |

