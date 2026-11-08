# HoneyShield X — Remaining Defects & Risk Triage Log (Milestones 41–50)

**Release Candidate:** `v1.0.0-rc5`  
**Classification Standard:** Enterprise SOC Severity Levels (P0 Blocker, P1 Critical, P2 Moderate, P3 Minor)  

---

## Defect Summary Table

| Defect ID | Severity | Module / Component | Description | Current Impact | Mitigation / Operational Workaround | Target Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **P3 (Minor)** | Headless Firefox Automation | Headless Firefox automation requires `--profile $(mktemp -d)` when interactive desktop Firefox is open concurrently. | Automated screenshot commands fail with profile lock if profile argument is omitted. | Test scripts and documentation supply temporary profile directories automatically. | Tooling wrapper (v1.0.1) |
| **DEF-02** | **P3 (Minor)** | Backend Deprecation Warnings | Python 3.13 deprecation warnings on `datetime.utcnow()` and Starlette `422` symbol. | Non-breaking runtime log warnings in test output. | Completely non-breaking; core timestamp helpers modernized to `datetime.now(timezone.utc)`. | Maintenance release (v1.1.0) |
| **DEF-03** | **P3 (Minor)** | Large Frontend Bundle Warning | Vite emits a chunk size warning (> 500 kB) for `dist/assets/index-CYvUSmio.js` (883 kB raw, 203 kB gzip). | Slightly longer initial load on low-bandwidth networks ($< 300\text{ms}$ on broadband). | Enable code-splitting with `manualChunks` in `vite.config.ts`. | Performance polish (v1.0.1) |

---

## Severity Assessment
- **P0 Blockers:** **0** (No security bypasses, data loss, or stability crashes).
- **P1 Critical:** **0** (No broken workflows, authentication failures, or streaming drops).
- **P2 Moderate:** **0** (All UI views, character animations, and API routes operating within SLA).
- **P3 Minor:** **3** (All operational / tooling / non-breaking).

**Conclusion:** Zero release-blocking defects exist in HoneyShield X `v1.0.0-rc5`.
