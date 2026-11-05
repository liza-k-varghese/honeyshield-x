# HoneyShield X — Digital Agent Universe: Demo and Live Modes

**Document:** `docs/digital-agents/demo_and_live_modes.md`  
**Phase:** Digital Agent Universe Implementation  
**Status:** COMPLETE & VERIFIED  
**Date:** November 4, 2026  

---

## 1. Operating Modes Isolation Framework

To maintain strict operational integrity, HoneyShield X enforces a rigid architectural separation between **LIVE BACKEND MODE** and **DEMO SIMULATION MODE**.

### 1.1 LIVE BACKEND MODE
- **Data Source:** Authenticated real-time backend streams (`/api/v1/events/stream`, `/api/v1/events/ws`) and live database records.
- **Agent States:** Strictly reflects real processing load, actual worker queues, and true service health.
- **Prohibition:** Zero synthetic or simulated events are permitted in LIVE MODE. If the SOC is quiet, the agents reflect `idle` and `observing` states accurately.

### 1.2 DEMO SIMULATION MODE
- **Data Source:** Isolated, client-side `DemoSimulationEngine`.
- **Purpose:** Enables operators, trainers, and stakeholders to test character animations, inspect multi-stage data packets, and preview emergency handoffs.
- **Safety Guarantee:** Demo events are strictly memory-resident on the client browser. No simulated packets, attacks, or alerts are ever transmitted to the FastAPI backend, committed to PostgreSQL, or pushed to mobile handsets.
- **Visual Distinction:** Prominently tagged with an amber `DEMO SIMULATION` badge in the header control bar.

