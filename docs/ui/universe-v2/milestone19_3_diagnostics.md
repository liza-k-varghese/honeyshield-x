# HoneyShield X — Milestone 19.3: Live Diagnostics & Operator Audit Panel

**Component:** `UniverseCommandCenter.tsx` (Core Diagnostics & Trust Vault Modal)  
**Security Standard:** Sanitized Operator Export — Zero Sensitive Tokens or Credentials Leaked  

---

## 1. Operator Diagnostics Panel Specifications

Located inside the **Holographic Core Diagnostics Modal** (accessed via `DIAGNOSTICS` button, clicking the Event Singularity, or pressing `C` / `5`), this panel displays 12 authorized operational metric tiles:

| Metric Name | Value / Representation | Description |
| :--- | :--- | :--- |
| **Build Version** | `v1.0.0-rc5` | Current release candidate version |
| **Operating Mode** | `LIVE STREAM` / `DEMO SIMULATION` / `HISTORICAL REPLAY` | Distinguishes authentic SOC traffic from synthetic demo |
| **WS Stream State** | `connected` / `connecting` / `disconnected` | Status of real-time WebSocket connection manager |
| **Last Outbox Cursor** | e.g. `#6` (Live) or `#DEMO-104` (Demo) | Monotonic integer sequence number from Outbox |
| **Last Received Event** | e.g. `evt_1` or canonical UUID | Event identifier of most recent inbound telemetry |
| **Last Transfer ID** | e.g. `tr_showcase_scout_001` | Active courier transfer identifier |
| **Active Couriers** | e.g. `1 COURIER(S)` | Real count of animated packet carriers in motion |
| **Pending Transfers** | e.g. `0 PENDING` | Real count of unacknowledged queued transfers |
| **Failed Transfers** | e.g. `0 FAILED` | Real count of dropped or failed packet transfers |
| **Selected Agent** | `SCOUT` / `NEXUS` / `ORACLE` / `SENTINEL` | Currently focused agent territory |
| **Animation State** | `LOCOMOTION (TRANSIT)` / `PAUSED` | Kinematic engine state and transit phase |
| **Routing Topology** | `quadrant:scout -> singularity:core` | Spatial origin and destination topology |

---

## 2. Sanitized Clipboard Export Functionality

Operators reporting issues can export runtime state with a single click:
- Action: Click **`COPY SANITIZED DIAGNOSTICS`**.
- Visual Feedback: Button transitions to `COPIED TO CLIPBOARD` with a green checkmark for 2.0 seconds.
- Sanitized Payload Example:
  ```json
  {
    "build_version": "v1.0.0-rc5",
    "timestamp": "2026-11-07T00:48:20.104Z",
    "mode": "LIVE STREAM",
    "websocket_state": "connected",
    "last_stream_cursor": 6,
    "last_received_event_id": "evt_1",
    "last_displayed_transfer_id": "tr_showcase_scout_001",
    "selected_agent": "SCOUT",
    "animation_state": "ACTIVE (TRANSIT)",
    "source_node": "quadrant:scout",
    "destination_node": "singularity:core",
    "service_health": "3/3 HEALTHY",
    "subsystems": {
      "api": "healthy",
      "postgresql": "connected",
      "redis": "connected"
    },
    "last_frontend_error": "NONE (ALL SYSTEMS NOMINAL)"
  }
  ```
- **Security Audit:** Zero passwords, bearer tokens, private keys, session cookies, or raw malicious payloads are included.

