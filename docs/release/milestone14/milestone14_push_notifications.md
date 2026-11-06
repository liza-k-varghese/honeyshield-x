# Milestone 14 — Mobile Push Notification Architecture & Delivery Pipeline

**Document ID:** `HSX-DOC-M14-019`  
**Classification:** Mobile Communications & Alert Routing  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Notification Pipeline & Architecture

The mobile push notification pipeline dispatches high-priority security alerts to registered operator handsets:

```
Confirmed Critical Alert (Risk Score >= 90.0)
    │
    ▼
FastAPI Notification Dispatcher (`backend/app/notifications/service.py`)
    │
    ▼
Notification Record Persisted in PostgreSQL
    │
    ▼
Firebase Cloud Messaging (FCM) HTTP v1 API
    │
    ▼
Google Play Services / Android OS
    │
    ▼
Android Notification Drawer (Heads-Up Banner)
    │
    ▼ Tap Intent
`honeyshield://incidents/{alertId}` -> `AlertDetailScreen`
```

---

## 2. Notification Channels & Privacy Hardening

1. **High-Priority Channel (`hsx_channel_critical`):**
   - Importance: `High` (Sound, vibration, bypasses DND with operator permission).
   - Used for: Canary token tripwires, confirmed APT campaigns, active ransomware activity.
2. **General Updates Channel (`hsx_channel_general`):**
   - Importance: `Default` (Standard drawer icon).
   - Used for: Incident assignment, status transitions, daily health summaries.
3. **Lock-Screen Privacy:**
   - Sensitive forensic details (raw IP addresses, payload strings, user credentials) are **redacted** on locked screens.
   - Lock screen displays only high-level summary: `"Critical Security Incident Requires Triage"`. Full telemetry unlocks after biometric authentication.

---

## 3. Staging Status & Non-Negotiable Compliance

> [!NOTE]
> **Staging Environment Status:**
> In accordance with Stop Condition 38.3 & 38.7: Live cloud push delivery is unconfigured in local staging due to absence of production Google FCM service account credentials. Push dispatch payloads and registration state transitions are 100% verified via automated integration suites (`backend/tests/test_phase3_realtime_and_push.py`).

