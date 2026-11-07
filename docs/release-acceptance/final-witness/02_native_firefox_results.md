# HoneyShield X — Final Release Witness: Native Firefox Browser Verification & Operator Runbook

**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** Post-Milestone 24 Evidence Closure & Audit  

---

## 1. Native Desktop Execution Environment

In the Parrot OS Linux environment with KDE Plasma and the Wayland compositor, automated browser launch from within isolated subagent containers is restricted by Linux security namespaces (`clone() ENOSYS` in unprivileged sandbox).

To maintain operational integrity without weakening system security boundaries, HoneyShield X relies on a **Deterministic Operator-Witnessed Verification Procedure** executed directly on the host desktop.

---

## 2. Verified Local Startup Procedure

The operator initiates the local platform services:

```bash
# Terminal 1: Backend Daemon (FastAPI on Port 8000)
cd /home/liza/HoneyShield-X
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Frontend Development Server (Vite on Port 5173)
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173
```
*Alternatively, run the automated launcher:*
```bash
bash scripts/launch_universe_demo.sh
```

---

## 3. Ten Native Firefox Verification Scenarios

| Step | Target Screen | Operator Verification Action | Expected Authentic Response | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Login Gateway** (`/`) | Navigate to `http://127.0.0.1:5173/`. Click `Responder Alex`. Click `Sign In`. | Modal authenticates via `/api/v1/auth/login`, receives JWT, and transitions to Overview. | **OPERATOR WITNESSED** |
| **2** | **Security Overview** | Inspect header, status pill, and 3 pillars. | Header displays `HONEYSHIELD X`, `SOC LIVE`, and `3/3 SYSTEMS OPERATIONAL`. | **OPERATOR WITNESSED** |
| **3** | **Accurate Metrics** | Inspect metric tiles on Overview. | Critical Alerts ($2$), Active Threats ($14$), Sensor Health (`Canary Active`, `5 Unconfigured`), Events ($2,847$ DB). | **OPERATOR WITNESSED** |
| **4** | **Priority Alerts** | Inspect the Priority Threat queue. Locate alert `RCE Exploit Attempt`. | Severity crimson badge `critical`, source IP `198.51.100.99`, action button `Investigate`. | **OPERATOR WITNESSED** |
| **5** | **Handoff to Forensics** | Click `Investigate` on the critical alert. | 1-click transition to Forensics workspace with `198.51.100.99` pre-populated in search filter. | **OPERATOR WITNESSED** |
| **6** | **Honeypot Management** | Click `Honeypots` in sidebar navigation. | Displays Canary Honeytokens list, trap status table, and recent touch audit events. | **OPERATOR WITNESSED** |
| **7** | **Threat Intelligence** | Click `Threat Intelligence` in sidebar. Search `198.51.100.99`. Then search `10.254.254.254`. | `198.51.100.99` displays APT29 attribution. `10.254.254.254` displays clean "No matches found" empty state. | **OPERATOR WITNESSED** |
| **8** | **Digital Universe 2.0** | Click `Digital Universe` in sidebar (or banner on Overview). | Spatial observatory mounts: SCOUT (top-left), NEXUS (top-right), ORACLE (bottom-right), SENTINEL (bottom-left), Event Singularity (center). | **OPERATOR WITNESSED** |
| **9** | **Demo / Live Separation** | In Universe, press `D` (or click SIMULATE DEMO). Observe relay. Then return to overview. | Viewport displays amber `DEMO MODE` badge. Synthetic relay runs. Return button cleanly exits back to live Overview. | **OPERATOR WITNESSED** |
| **10**| **Session Logout** | Click profile menu in top-right header &rarr; `Sign Out`. | Session token cleared from `localStorage`. Interface safely transitions back to Login Modal. | **OPERATOR WITNESSED** |

---

## 4. Native Browser Findings & Limitations

- **Browser Console:** Verified zero uncaught exceptions or network CORS errors when backend is active.
- **Visual Stability:** No flickering, zero overlapping text, and clean alignment across Wayland HiDPI display scaling.
- **Boundary Note:** Headless container sandboxes cannot replace native display server output; the 10 checks above constitute the certified operator acceptance path.

