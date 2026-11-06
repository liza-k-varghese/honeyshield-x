# Milestone 14 — Subsystem Architecture & Topology Specification

**Document ID:** `HSX-DOC-M14-003`  
**Classification:** Enterprise System Architecture  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. System Topology Overview

HoneyShield X unifies active deception, automated threat intelligence, Security Operations Center (SOC) incident response, and a kinetic Digital Agent Universe across web and mobile clients.

```
                           +----------------------------------------+
                           |           External Ingress             |
                           |   (TLS 1.3 / Reverse Proxy / NGINX)   |
                           +-------------------+--------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
        +-------------------------+                         +-------------------------+
        |   Web SOC Console       |                         |  Android SOC Companion  |
        |   (React 19 / Vite)     |                         |  (React Native / Expo)  |
        +------------+------------+                         +------------+------------+
                     |                                                   |
                     +-------------------------+-------------------------+
                                               |
                                               v
                           +----------------------------------------+
                           |          FastAPI Gateway Tier          |
                           |   - Ingestion (/api/v1/attacks)        |
                           |   - Alerts & Incidents (/api/v1/*)     |
                           |   - Deception Grid (/api/v1/honeypots) |
                           |   - Threat Intel (/api/v1/threat-intel)|
                           |   - Streaming (/ws/events, /stream)    |
                           +-------------------+--------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
        +-------------------------+                         +-------------------------+
        |       PostgreSQL        |                         |       Redis 7+          |
        |  - Operational Tables   |                         |  - PubSub Event Bus     |
        |  - Transactional Outbox |                         |  - Session Denylist     |
        |  - Monotonic Cursors    |                         |  - WebSocket Tickets    |
        +-------------------------+                         +-------------------------+
```

---

## 2. Event Envelope & Transactional Outbox Flow

Every lifecycle security event adheres to a standardized schema:
```json
{
  "event_id": "evt-b94f1c92-3a47-4921-98bc-e78a291f0412",
  "workflow_id": "wf-ssh-brute-force-8812",
  "transfer_id": "tr-scout-to-nexus-001",
  "correlation_id": "corr-198.51.100.45",
  "source": "sensor:cowrie:01",
  "destination": "soc:incident_feed",
  "timestamp": "2026-11-06T02:08:52.484210Z",
  "lifecycle_status": "COMMITTED",
  "processing_stage": "INGESTION",
  "agent": "SCOUT",
  "alert_id": 1,
  "outbox_cursor": 1,
  "payload": {
    "attack_id": 1,
    "vector": "SSH_BRUTE_FORCE",
    "risk_score": 94.0
  }
}
```

---

## 3. Subsystem Trust Boundaries

1. **Ingestion Boundary:** Low-trust external sensor inputs are strictly validated and normalized before persistence. External requests cannot force severity or risk scores.
2. **Persistence Boundary:** Database transactions atomically write both entity records and outbox rows, preventing outbox phantom entries or uncommitted leaks.
3. **Distribution Boundary:** Real-time event streaming enforces ticket validation (WebSocket) and HTTP Authorization headers (SSE).
4. **Mobile Boundary:** Mobile clients store cryptographic tokens in Android Keystore / EncryptedSharedPreferences and require active network connection for state modifications.

