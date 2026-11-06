# Milestone 13 — Mobile Push Notification Architecture & Notification Routing

**Document ID:** `HSX-DOC-M13-015`  
**Classification:** Mobile Communications & Alert Routing  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/services/push_service.py`, `mobile/src/services/notifications.ts`

---

## 1. Push Notification Architecture

HoneyShield X delivers critical SOC notifications to registered mobile devices when operator triage is urgently required (e.g., critical risk threshold $\ge 90.0$ or canary tripwire triggers).

### Android Notification Channel Configuration:
1. **Critical Threat Alerts Channel (`hsx_channel_critical`):**
   - Importance: `High` (Sound, vibration, heads-up banner, bypasses Do Not Disturb if authorized).
   - Used for: Canary token detonation, active ransomware lateral movement, high-confidence APT detection.
2. **Standard SOC Updates Channel (`hsx_channel_general`):**
   - Importance: `Default` (Standard notification drawer icon).
   - Used for: Shift change handovers, resolved incidents, system health warnings.

---

## 2. Notification Payload & Deep-Link Routing Table

Push notification payloads are structured as data-only or data+notification payloads to allow the application to process incoming intents securely:

```json
{
  "to": "<FCM_DEVICE_TOKEN>",
  "priority": "high",
  "data": {
    "type": "INCIDENT_ALERT",
    "alert_id": "1",
    "severity": "critical",
    "risk_score": 94.0,
    "title": "CRITICAL INCIDENT: Canary Triggered",
    "body": "APT-29 threat correlated with Cowrie SSH sensor",
    "deep_link": "honeyshield://incidents/1",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
}
```

### Deep-Link Routing Map:
| Deep-Link URI | Destination Screen | Parameters Passed | Action Upon Tap |
|:---|:---|:---|:---|
| `honeyshield://incidents/{id}` | `AlertDetailScreen` | `alertId: id` | Loads incident details, prompts triage |
| `honeyshield://agents` | `AgentsScreen` | `activeStage: stage` | Focuses on responding agent (e.g. SENTINEL) |
| `honeyshield://sensors/{id}` | `SensorsScreen` | `sensorId: id` | Displays compromised honeypot node |

---

## 3. Production Readiness & Staging Disclaimer

> [!IMPORTANT]
> **Push Notification Status in Staging:**
> In staging and isolated local environments without external Firebase Cloud Messaging (FCM) or Google Play Services credentials configured, push dispatch logs are recorded locally via `MockPushProvider` / logging backend.
> As required by Part 32 Stop Conditions: **NO FAKE PUSH**. No synthetic claim of physical on-device push delivery is asserted without live FCM credentials and an attached Android handset. Local event dispatching and notification payload serialization were 100% verified in `test_phase3_realtime_and_push.py`.

