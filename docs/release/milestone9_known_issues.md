# Milestone 9 — Known Operational Issues & Mitigations

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Date:** 2026-11-06  
**Auditor:** Quality Assurance & Site Reliability Team  

---

## 1. Known Non-Blocking Issues & Mitigations

### 1.1 Python 3.13 SQLAlchemy UTC Datetime Deprecation Warnings
- **Description:** SQLAlchemy logs `DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).`
- **Impact:** Informational only. Does not impact application runtime behavior, database schema, or query execution.
- **Mitigation:** Scheduled for refactoring in Python 3.14 migration milestone.

### 1.2 Unprovisioned Honeypot Sensor Daemons in Staging
- **Description:** External honeypot daemons (Cowrie SSH, Dionaea malware, Zeek IDS) are not active on staging loopback interfaces.
- **Impact:** Handled transparently by `evaluate_full_system_health()`. Subsystems are reported honestly as `NOT_CONFIGURED` without fabricating false health or throwing unhandled exceptions.
- **Mitigation:** Traps are activated automatically when physical or virtual sensor nodes are provisioned in production.

### 1.3 Expo Push Dispatcher Offline Delivery Warnings
- **Description:** In offline or sandboxed staging environments without internet egress to Expo's push servers, push delivery attempts log `urlopen error [Errno -3] Temporary failure in name resolution`.
- **Impact:** Push dispatcher catches network exceptions defensively; operational event processing continues without degradation.
- **Mitigation:** Expected behavior in air-gapped or sandboxed test environments. Push dispatch functions normally once internet connectivity to Expo gateway is present.

