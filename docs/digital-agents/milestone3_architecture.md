# HoneyShield X — Digital Agent Universe
## Milestone 3 Architecture & Operational System Overview

### 1. Executive Summary
Milestone 3 transforms HoneyShield X from an agent courier prototype into an interactive, multi-territory **Cyber Intelligence Universe**. It grounds the visual movements, telemetry handoffs, and workload states of four distinct robotic digital agents directly in genuine backend operational infrastructure:
- **SCOUT (`#3B82F6`)**: Autonomous Sensor Grid & Honeypot Collection Agent (SYS 2)
- **NEXUS (`#00E5FF`)**: Central Processing Core, Normalization & Outbox Courier (SYS 1)
- **ORACLE (`#A855F7`)**: Threat Intelligence, Adversary Analysis & Risk Scorer (SYS 3)
- **SENTINEL (`#EF4444`)**: Alert Delivery, Governor Operations & Security Response (SYS 1)

### 2. Four Operational Territories

```
+---------------------------------------------------------------------------------------------------+
|                                 HONEYSHIELD X DIGITAL AGENT UNIVERSE                              |
+---------------------------------------------------------------------------------------------------+
|  TERRITORY 1: SENSOR GRID       TERRITORY 2: CENTRAL CORE        TERRITORY 3: INTEL LAB   TERRITORY 4: SECURITY OPS |
|  (SCOUT - #3B82F6)              (NEXUS - #00E5FF)                (ORACLE - #A855F7)       (SENTINEL - #EF4444)      |
|                                                                                                                     |
|  [Cowrie Honeypot: ACTIVE]  --> [Ingestion API: ACTIVE]      --> [Detection Core]    --> [Alert Evaluator]          |
|  [Canary Trap:     ACTIVE]      [Validation & Normalizer]         [Threat Intel Store]     [Triage & Incident]      |
|  [Dionaea:   UNCONFIGURED]      [Redis Stream Queue]              [IOC / ASN Matcher]      [Push Dispatcher]        |
|  [OpenCanary:UNCONFIGURED]      [PostgreSQL Outbox Commit]        [Dynamic Risk Scorer]    [Governor Console]       |
|  [Suricata NIDS:  OFFLINE]                                                                                          |
|  [Zeek Monitor:UNCONFIGURED]                                                                                        |
+---------------------------------------------------------------------------------------------------+
```

#### Territory 1 — Sensor Grid
- **Agent Assigned:** SCOUT (Sensor Collector)
- **Subsystem Domain:** SYS 2 — Deception & Telemetry
- **Verified Active Sensors:** Cowrie SSH/Telnet honeypot (port 2222 emulation), HoneyShield Canary Trap listener.
- **Authentic Unconfigured / Offline State:** Dionaea (`UNCONFIGURED`), OpenCanary (`UNCONFIGURED`), Suricata NIDS (`OFFLINE`), Zeek (`UNCONFIGURED`).
- **Telemetry Realism:** No false sensor health or fabricated daemon packets are generated. Unconfigured components display explicit notices in the Node Inspector.

#### Territory 2 — Central Processing Core
- **Agent Assigned:** NEXUS (Central Core Processor & Courier)
- **Subsystem Domain:** SYS 1 — Core Telemetry Ingestion & Persistence
- **Components:** Ingestion API Gateway (FastAPI REST `/api/v1/ingest/events`), Pydantic Schema Validation, ECS Normalization, Redis Stream Queue, and transactional PostgreSQL Event Outbox (`security_event_outbox`).
- **Commit Guarantee:** Animations and delivery markers are only marked confirmed after the underlying database transaction commits with a monotonic sequence cursor.

#### Territory 3 — Intelligence Lab
- **Agent Assigned:** ORACLE (Threat Intelligence Analyst)
- **Subsystem Domain:** SYS 3 — Threat Intelligence & Adversary Correlation
- **Components:** Attack Detection Core, IOC matching, IP reputation, ASN enrichment, and multi-factor risk scoring.
- **Restrained Visual Language:** Analytical holographic motifs with deep purple luminescence (`#A855F7`). Generative AI inference is honestly marked `NOT RECORDED` when external LLM endpoints are unmounted.

#### Territory 4 — Security Operations (SOC)
- **Agent Assigned:** SENTINEL (Alert Delivery & Security Response)
- **Subsystem Domain:** SYS 1 — Incident Management & Containment
- **Components:** Confirmed Alert Evaluator, Alert Triage, Incident Tracking, WebSocket/Push Dispatcher, and Governor Level-3 Console.
- **Stage Distinction:** Explicit visual separation between alert creation, outbox publication, push gateway transmission, and verified Android device delivery.

---

### 3. Core Architectural Modules & Files

| Module | File Path | Purpose |
| :--- | :--- | :--- |
| **Cyber Universe Canvas** | `frontend/src/digital-agents/components/LiveDataFlow.tsx` | Interactive 4-territory universe, SVG pan/zoom, node status, and courier tracking |
| **Node Inspector** | `frontend/src/digital-agents/components/NodeInspectorModal.tsx` | Deep inspection of authentic node health, throughput, sensor type, and status |
| **Event Journey Replay** | `frontend/src/digital-agents/components/EventJourneyReplay.tsx` | Signature 11-stage chronological timeline reconstruction, VCR playback, speed multipliers |
| **Agent Workload Panel** | `frontend/src/digital-agents/components/AgentWorkloadPanel.tsx` | Real-time task queue depth, active/completed/failed transfers, connection status |
| **NEXUS Assistant** | `frontend/src/digital-agents/components/NexusAssistantModal.tsx` | Deterministic, grounded Q&A with record links and containment safety guardrail |
| **Agent Handoffs** | `frontend/src/digital-agents/components/AgentCommunicationPanel.tsx` | Verified 4-path inter-agent handoff stream with confirmed timestamps |
| **Threat Map** | `frontend/src/digital-agents/components/ThreatMapView.tsx` | Verified IP attack telemetry with honest GeoIP transparency (zero fake arcs) |
| **Universe Container** | `frontend/src/digital-agents/components/UniverseModeView.tsx` | Multi-tab command center integrating all universe views and stream health |
| **Event Store & Replay API** | `backend/app/routers/events.py` & `backend/app/events/store.py` | Outbox persistence, RBAC-filtered replay, journey timeline query, and workload metrics |

