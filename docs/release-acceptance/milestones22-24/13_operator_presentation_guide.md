# HoneyShield X — Milestones 22–24: Operator Presentation Guide & Evaluator Runbook

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestones:** 22, 23 & 24 Unified Release Engineering  

---

## 1. Preparation & Startup

Before presenting HoneyShield X to stakeholders or evaluators, verify the environment and launch the platform:

```bash
# 1. Run Preflight Diagnostics
bash scripts/check_universe_demo.sh

# 2. Launch the Platform
bash scripts/launch_universe_demo.sh
```

Open Mozilla Firefox on KDE Plasma:
- Navigate to `http://127.0.0.1:5173/`.
- On the Login Gateway, select `Responder Alex` for full operational permissions.
- Click `Sign In`.

---

## 2. Presentation Talking Points by Module

### 2.1 The Minimal Security Overview (2 Minutes)
- **Key Message:** "HoneyShield X is designed for quiet enterprise confidence. Rather than overwhelming analysts with neon animations, it presents essential operational truth: what's critical, what's active, and what needs immediate intervention."
- **Point out:**
  - 3/3 Systems Operational status pill.
  - Truthful Sensor Health badge: `Canary Active (5 Unconfigured)`. Explain that HoneyShield X never fakes a 100% healthy sensor count when external honeypots are unconfigured.

### 2.2 System 1: Security Operations & 1-Click Triage (2 Minutes)
- **Key Message:** "When a critical threat is detected, analysts shouldn't copy-paste IP addresses across 5 tabs. HoneyShield X provides 1-click forensic context."
- **Action:** Click `Investigate` on the top priority alert (`RCE Exploit Attempt`).
- **Show:** The Forensics process ancestry tree (`bash` &rarr; `python` &rarr; `nc`) and the two-step containment safeguard modal.

### 2.3 System 2 & 3: Deception & Threat Intelligence (2 Minutes)
- **Action:** Navigate to `Threat Intelligence`. Search `198.51.100.99`.
- **Show:** APT29 attribution, MITRE technique tags, and confidence score decay.
- **Action:** Search `10.254.254.254`. Show clean, non-crashing negative match state.

### 2.4 The Digital Agent Universe 2.0 (3 Minutes)
- **Action:** Click `Digital Universe` in the left sidebar.
- **Show:**
  - The central Event Singularity core and the 4 specialized robotic entities.
  - Explain what each robot represents:
    - **SCOUT (Blue):** Perimeter collection & honeypots.
    - **NEXUS (Cyan):** ACID Outbox event streaming & courier.
    - **ORACLE (Purple):** Threat intelligence & STIX 2.1 correlation.
    - **SENTINEL (Red):** Alert escalation & perimeter defense.
- **Action:** Press `D` to launch the 4-Agent Relay showcase.
- **Action:** Press `C` (or click the Singularity Core) to open the Holographic Diagnostics Modal.
- **Action:** Click `Return to Overview` to conclude the demonstration cleanly.

---

## 3. Contingency & Troubleshooting Guidance

- **If PostgreSQL or Redis is offline:** Explain to evaluators that HoneyShield X features zero-crash in-memory storage fallbacks, ensuring all API endpoints and UI components remain fully operational.
- **If WebSocket stream reconnects:** Point to the top telemetry banner showing automatic reconnection with cursor resumption.

