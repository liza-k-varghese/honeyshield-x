# Milestone 12.2 — Firebase Cloud Messaging & Notification Routing

**Document:** `milestone12_2_fcm_push.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Notification Architecture & Channels

HoneyShield X configures three distinct notification channels on Android conforming to API 26+:
- `security-critical`: High importance, urgent siren pattern, wakes device screen for critical alerts.
- `security-alerts`: Default importance, standard chime for high/medium alerts.
- `deception-hits`: High importance, double vibration for tripped honeypot canaries.

---

## 2. Deep-Link Routing Table

Notifications embed actionable deep links using the custom URI scheme `honeyshield://`:

| Deep Link URI | Target Screen | Operational Action |
|---|---|---|
| `honeyshield://alert/{id}` | Alert Detail Modal / SOC Dashboard | Direct navigation to alert triage with highlighted attack telemetry |
| `honeyshield://pairing` | Pairing Screen / QR Viewfinder | Opens camera scanner for pending desktop pairing session |
| `honeyshield://case/{id}` | Cases List Screen | Focuses target SOAR incident playbook |

---

## 3. Configuration & Test Status

- **FCM Configuration Status:** Staged in backend notification service (`app/notifications/service.py`).
- **Live Cloud Delivery Status:** **`NOT CONFIGURED / UNVERIFIED`** in offline/sandboxed development environment (no active Google FCM service account credentials configured).
- **Lock-Screen Privacy:** Sensitive payload attributes and raw credentials are never included in notification banners.

