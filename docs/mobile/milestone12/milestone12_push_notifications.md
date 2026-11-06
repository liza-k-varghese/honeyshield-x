# Milestone 12 — Mobile Push Notification Architecture & Channel Hierarchy

**Document:** `milestone12_push_notifications.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Android Notification Channels

HoneyShield X registers three distinct notification channels in `HoneyShieldApplication.java` conforming to Android 8.0+ (API 26+) requirements:

| Channel ID | Name | Importance | Sound / Vibration | Purpose |
|---|---|---|---|---|
| `security-critical` | Critical Security Incidents | `IMPORTANCE_HIGH` | Urgent siren pattern, screen wake | Critical alerts, Governor containment requests, active breaches |
| `security-alerts` | Operational Security Alerts | `IMPORTANCE_DEFAULT` | Standard alert chime | High/Medium severity alerts, threshold triggers |
| `deception-hits` | Active Deception Grid Hits | `IMPORTANCE_HIGH` | Double-pulse vibration | Honeypot tripwires triggered, canary token reads |

## 2. Deep-Link Action Routing

Notifications embed actionable deep links:
- Tapping a `security-critical` or `security-alerts` notification dispatches the Android intent `honeyshield://alert/{id}` directly into the alert triage view.
- Tapping a pairing request notification opens `honeyshield://pairing` to display the pairing approval dialog.

