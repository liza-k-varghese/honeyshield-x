# HoneyShield X — Digital Agent Universe
## Milestone 3 Universe Navigation, Pan/Zoom & Node Inspection

### 1. Navigation Capabilities

The Cyber Intelligence Universe canvas provides an interactive, responsive operational map implemented entirely in lightweight SVG, CSS, and React, eliminating the heavy GPU footprint of Three.js or WebGL.

#### Controls Implemented:
1. **Pan & Zoom Canvas:**
   - **Zoom In (`+`):** Increments zoom level by +15% (up to 200%).
   - **Zoom Out (`-`):** Decrements zoom level by -15% (down to 60%).
   - **Reset View:** Re-centers canvas to 100% scale and (0,0) offset.
   - **Mouse Drag to Pan:** Operators can click and drag anywhere on the canvas background to pan across territories smoothly without stutter.
   - **Mouse Wheel / Pinch Zoom:** Ctrl + Wheel enables smooth desktop zooming.
2. **Territory Focus Selector:**
   - Four dedicated top-level legend cards allow operators to instantly pan and focus on any of the four operational territories:
     - **SCOUT Territory (Sensors & Traps):** Focuses on Sensor Grid (x: 150px, y: 50px, zoom: 1.2x).
     - **NEXUS Core (Ingest, Queue & Outbox):** Centers on processing core (x: 0px, y: 50px, zoom: 1.2x).
     - **ORACLE Territory (Threat Intelligence):** Pans to Intel Lab (x: -150px, y: 0px, zoom: 1.2x).
     - **SENTINEL Territory (Alerts & Governor):** Pans to Security Operations (x: -300px, y: 0px, zoom: 1.2x).

---

### 2. Service Node Architecture & Authentic Status

The canvas maps all operational components with zero fabricated health metrics:

| Node ID | Node Name | Territory | Agent | Status | Sensor / Service Type | Heartbeat | Pipeline Destination |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sensor-cowrie` | Cowrie SSH/Telnet Honeypot | Sensor Grid | SCOUT | `ACTIVE` | Medium-Interaction SSH Emulation | `< 15s` | Ingestion API Gateway |
| `sensor-trap` | HoneyShield Canary Trap | Sensor Grid | SCOUT | `ACTIVE` | Deception Canary Token Trap | `< 10s` | Ingestion API Gateway |
| `sensor-dionaea` | Dionaea Malware Honeypot | Sensor Grid | SCOUT | `UNCONFIGURED` | Low-Interaction Daemon | None | Ingestion API Gateway |
| `sensor-opencanary` | OpenCanary Daemon | Sensor Grid | SCOUT | `UNCONFIGURED` | Multi-Service Canary Daemon | None | Ingestion API Gateway |
| `sensor-suricata` | Suricata NIDS Listener | Sensor Grid | SCOUT | `OFFLINE` | Network IDS/IPS Sensor | Disconnected | Ingestion API Gateway |
| `sensor-zeek` | Zeek Network Monitor | Sensor Grid | SCOUT | `UNCONFIGURED` | Behavioral Traffic Analyzer | None | Ingestion API Gateway |
| `ingestion` | Ingestion API Gateway | Central Core | NEXUS | `ACTIVE` | FastAPI REST Telemetry Ingest | `< 5s` | Redis Processing Queue |
| `queue` | Redis Processing Queue | Central Core | NEXUS | `ACTIVE` | Stream Buffer (Redis Stream) | `< 5s` | PostgreSQL Event Outbox |
| `persistence` | PostgreSQL Event Outbox | Central Core | NEXUS | `ACTIVE` | Transactional ACID Outbox | Committed | Attack Detection Core |
| `detection` | Attack Detection Core | Intel Lab | ORACLE | `ACTIVE` | Correlation & Rule Engine | `< 10s` | Threat Intelligence Store |
| `intel` | Threat Intelligence Store | Intel Lab | ORACLE | `ACTIVE` | IOC Database & Risk Scorer | `< 10s` | Confirmed Alert Evaluator |
| `alerts` | Confirmed Alert Evaluator | Security Ops | SENTINEL | `ACTIVE` | Severity Triage & Thresholds | `< 5s` | SOC Push Dispatcher |
| `notifications` | SOC Push & Governor | Security Ops | SENTINEL | `ACTIVE` | WebSocket/Push & Governor | `< 5s` | Paired Android Devices |

---

### 3. Node Inspector Modal

Clicking any service node opens the `NodeInspectorModal`, displaying:
- Complete Node Identifier and Title
- System Domain tag (`SYS 1`, `SYS 2`, or `SYS 3`)
- Operational Status Badge (`OPERATIONAL (ACTIVE)`, `UNCONFIGURED`, or `OFFLINE / DISCONNECTED`)
- Responsible Agent Courier with animated SVG avatar
- Heartbeat Health status and observed latency
- Lifetime event count processed
- Explicit Architectural Transparency Note explaining whether the component is an active telemetry source or an unprovisioned service.
- Quick filter action to inspect only in-flight transfers associated with that node.

