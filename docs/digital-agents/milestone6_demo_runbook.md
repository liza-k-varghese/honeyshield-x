# HoneyShield X — Digital Agent Universe
## Milestone 6: Live SOC Demonstration Runbook

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Platform Release:** `v1.0.0-rc5`  
**Target Audience:** SOC Leads, Sales Engineers, Security Architects & Operators  

---

## 1. Demonstration Environment Preparation

Ensure the following processes are active on the host machine prior to the demonstration:

```bash
# Terminal 1: Backend FastAPI Server
cd /home/liza/HoneyShield-X
source backend/.venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend Development Server
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173

# Terminal 3: Browser Launch (Firefox on KDE Plasma / Wayland)
firefox http://127.0.0.1:5173
```

Verify backend connectivity:
```bash
curl -s http://127.0.0.1:8000/api/v1/health | grep '"status":"healthy"'
```

---

## 2. Demonstration Script & Operational Walkthrough

```
+===================================================================================================+
| 5-STAGE SOC DEMONSTRATION WALKTHROUGH                                                             |
+=======+===========================+=======================================+=======================+
| Phase | Title                     | Operator Action                       | Visual Climax         |
+=======+===========================+=======================================+=======================+
| 1     | Welcome & Character Intro | Navigate to 'Agent Gallery'           | 4 Distinct SVG Agents |
| 2     | Navigation & Territories  | Switch to 'Universe Mode' View        | Pan/Zoom 4 Quadrants  |
| 3     | 4-Agent Coordinated Relay | Click 'Run Multi-Agent Relay'         | SCOUT->NX->OR->SN     |
| 4     | Live HoneyShield Ingestion| Trigger curl SSH attack injection     | Real-time courier run |
| 5     | Historical Replay & NEXUS | Open Event Journey & Query Assistant  | Time-scrubbing & AI   |
+=======+===========================+=======================================+=======================+
```

---

### Phase 1: Character Design Showcase (Agent Gallery)
1. In the left navigation menu, click **Digital Agents** $\to$ **Agent Gallery**.
2. Highlight the four cyber agents to the audience:
   - **SCOUT (Blue):** Security sensor scout with continuous 360° radar sweep.
   - **NEXUS (Cyan):** High-speed event courier with vertical hover oscillation and active payload slot.
   - **ORACLE (Purple):** Threat intelligence analyst enveloped in pulsing geometric threat auras.
   - **SENTINEL (Red):** Alert dispatch and perimeter defense agent with orbiting red shields.
3. Toggle state pills: demonstrate `Idle`, `In-Transit`, `Processing`, and `Error` modes for each character.

### Phase 2: Territory Navigation (Universe Mode)
1. Click the top tab **Universe Mode**.
2. Click and drag the canvas to demonstrate fluid pan navigation across all four operational territories:
   - *Territory Alpha (Collection)* $\to$ *Territory Beta (Processing)* $\to$ *Territory Gamma (Intelligence)* $\to$ *Territory Delta (Defense)*.
3. Use the mouse scroll wheel to zoom in to `2.2x` magnification on an active Honeytrap node.
4. Click on the node: `NodeInspectorModal` opens displaying live connection counts, latency, and CPU load. Click **Close** or press `Esc`.
5. Click **Reset View** to instantly recenter the tactical canvas.

### Phase 3: The 4-Agent Coordinated Demonstration Relay
1. In the upper right control bar, locate the **Demonstration Mode** toolbar.
2. Click **Run 4-Agent Relay**.
3. Point out the synchronized progression:
   - *Stage 1:* SCOUT intercepts the sensor ping.
   - *Stage 2:* SCOUT approaches NEXUS; at $d < 40\text{ px}$, docking brackets clamp and handoff occurs.
   - *Stage 3:* NEXUS accelerates across the main data conduit to ORACLE.
   - *Stage 4:* ORACLE receives the payload; purple threat bloom pulses as IOC correlation runs.
   - *Stage 5:* ORACLE hands off to SENTINEL; SENTINEL accelerates towards the response quadrant with orbiting shields flaring red.
4. Open the **Agent Communication Panel** on the right side to show the real-time audit log confirming all handshakes.

### Phase 4: Live HoneyShield Attack Ingestion
1. Switch toggle from **Demo Mode** to **Live Mode**.
2. Open a terminal and run the live attack generator:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/ingestion/events \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login -d '{"username":"admin_chief","password":"password123"}' | jq -r .access_token)" \
     -d '{
       "source_ip": "185.220.101.5",
       "destination_port": 22,
       "protocol": "SSH-2.0",
       "payload_excerpt": "Root login failure: invalid credential sequence",
       "threat_signature": "SIG-BRUTE-EXTREME",
       "risk_score": 98.0
     }'
   ```
3. Direct audience attention to the screen:
   - Within `< 50ms`, the live WebSocket receives cursor `1043`.
   - NEXUS immediately departs the central hub, collects the newly spawned packet, and delivers it to the outbox node.
   - The global header ribbon increments the event counter.

### Phase 5: Historical Replay & AI Assistant
1. In the lower dock, expand the **Event Journey Replay** bar.
2. Click on the timeline slider and scrub backwards to inspect the injected attack.
3. Demonstrate speed multipliers (`1x`, `2x`, `4x`) and single-step traversal.
4. Click the **NEXUS Assistant** icon in the navigation bar.
5. In the modal chat window, click the quick prompt: *"Summarize threat severity and recommended containment."*
6. Observe the instant streaming analysis detailing the brute-force IOC and recommending firewall blacklisting.

---

## 3. Trouble-Clearing & Recovery Cheat Sheet

- **If WebSocket disconnects:**
  The client automatically reconnects within 3 seconds using exponential backoff. If WebSockets are blocked by corporate proxies, the client seamlessly falls back to authenticated Server-Sent Events (`/events/stream`).
- **If canvas appears zoomed out:**
  Click the **Reset View** button in the lower left corner of the universe canvas.
- **If session expires:**
  Refresh the browser window (`Ctrl + F5`) or re-authenticate via the login dialog.

