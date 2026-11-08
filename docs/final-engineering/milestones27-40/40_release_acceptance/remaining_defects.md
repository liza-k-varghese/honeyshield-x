# HoneyShield X — Remaining Defects & Triage Log

**Release Candidate:** `v1.0.0-rc5`  
**Classification Standard:** Enterprise SOC Severity Levels (P0 Blocker, P1 Critical, P2 Moderate, P3 Minor)  

---

## Defect Summary Table

| Defect ID | Severity | Module / Component | Description | Current Impact | Mitigation / Workaround | Target Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **P3 (Minor)** | Headless Firefox Automation | Headless Firefox requires an isolated profile directory (`--profile $(mktemp -d)`) when an interactive Firefox GUI session is running concurrently on the desktop. | Automation scripts fail with "Firefox is already running" if profile argument is omitted. | Test runner and screenshot scripts always pass an isolated temporary profile directory. | Automated harness wrapper (v1.0.1) |
| **DEF-02** | **P3 (Minor)** | Backend Deprecation Warnings | Python 3.13 deprecation warnings regarding `datetime.utcnow()` in legacy models and Starlette `HTTP_422_UNPROCESSABLE_ENTITY`. | Non-breaking runtime warnings logged in test output. | Fully functional in Python 3.13; update to `datetime.now(timezone.utc)` and `HTTP_422_UNPROCESSABLE_CONTENT`. | Next maintenance release (v1.1.0) |
| **DEF-03** | **P3 (Minor)** | EventStore DB Replay Limit | In standalone tests without test DB isolation, replay queries can retrieve historical records from prior test runs unless `since_cursor` is explicitly specified. | May cause unexpected counts in tests assuming an empty table. | Tests specify exact `since_cursor=ev.cursor` rather than assuming 0. | Test fixture isolation (v1.0.1) |

---

## Severity Assessment
- **P0 Blockers:** **0** (No critical stability, data loss, or blocking security defects).
- **P1 Critical:** **0** (No broken workflows, authentication bypasses, or core service failures).
- **P2 Moderate:** **0** (All UI views, animations, and API contracts functioning within spec).
- **P3 Minor:** **3** (All mitigated with documented operational procedures).

**Conclusion:** The platform contains zero P0/P1 defects and is cleared for production operator sign-off.
