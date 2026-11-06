# Milestone 15 — Known Issues & Operational Workarounds

**System:** HoneyShield X Release Engineering  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Non-Blocking Observations & Workarounds

| ID | Observation | Operational Impact | Recommended Action / Workaround | Target Resolution |
|---|---|---|---|---|
| **ISSUE-M15-01** | Deprecation warning for `datetime.utcnow()` in SQLAlchemy SQLite models under Python 3.13. | Zero runtime functional impact; tests and production run cleanly. | Replaced with `datetime.now(timezone.utc)` in all new Milestone 15 services. Existing legacy model defaults scheduled for migration in v1.1. | Milestone 16 / v1.1 |
| **ISSUE-M15-02** | Physical Android device pilot blocked pending hardware device availability. | Mobile client build is validated with 0 TypeScript errors and passes all contract tests; live hardware runtime unverified. | Release track separation enforced: Android client held at staging gate. Web and backend release tracks approved for staging. | Milestone 16 Hardware Pilot |
| **ISSUE-M15-03** | In-memory Redis fallback store is ephemeral across cold server restarts. | During Redis outages, newly created saved hunts and evidence remain in RAM until Redis reconnects. | Enterprise deployment guides mandate Redis cluster with AOF/RDB persistence enabled. | Production Deployment Guide |

