# HoneyShield X — Final Release Witness: Operator Sign-Off Checklist & Verification Runbook

**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** Post-Milestone 24 Evidence Closure & Audit  

---

## 1. Operator Desktop Sign-Off Runbook

To close Gates I, J, K, M, and P and achieve unconditional release clearance, the human operator executes the following verification session directly on the host desktop.

### 1.1 Pre-Flight Check
```bash
# Verify local toolchain and backend fallbacks
cd /home/liza/HoneyShield-X
bash scripts/check_universe_demo.sh
```

### 1.2 Launch Services
```bash
# Launch FastAPI daemon on port 8000 and Vite dev server on port 5173
bash scripts/launch_universe_demo.sh
```

---

## 2. Interactive Operator Acceptance Verification Form

The operator witnesses each action in **Mozilla Firefox** and checks off the observed behavior:

| # | Inspection Area | Action & Direct URL | Expected Visual & Functional Result | Operator Witness Sign-Off |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Authentication** | Open `http://127.0.0.1:5173/`. Click `Responder Alex`. Click `Sign In`. | [ ] Form populates credentials; authenticated JWT received; Login Modal closes smoothly. | [  ] WITNESSED |
| **2** | **Security Overview** | Inspect top-left breadcrumbs, status pill, and subtitle. | [ ] Title: `Security Overview` with `SOC LIVE` badge; Status: `3/3 SYSTEMS OPERATIONAL`. | [  ] WITNESSED |
| **3** | **Metrics & Data Integrity** | Inspect the 4 executive metric cards on Overview. | [ ] Critical Alerts: $2$; Active Threats: $14$; Sensor Health: `Canary Active (5 Unconfigured)`. | [  ] WITNESSED |
| **4** | **1-Click Triage Handoff** | Locate top critical alert row (`RCE Exploit Attempt`). Click `Investigate`. | [ ] Seamlessly routes to Forensics view with adversary IP `198.51.100.99` pre-populated in search filter. | [  ] WITNESSED |
| **5** | **Forensics Process Tree** | Inspect process ancestry in Forensics view. | [ ] Visual execution lineage renders: `systemd` &rarr; `bash` &rarr; `python` &rarr; `nc`. | [  ] WITNESSED |
| **6** | **Containment Safeguard** | Click `Isolate Host` button in Forensics view. | [ ] Two-step confirmation modal appears requiring explicit verification; accidental isolation blocked. Click `Cancel`. | [  ] WITNESSED |
| **7** | **Honeypot Management** | Click `Honeypots` in sidebar navigation. | [ ] Displays canary honeytokens list, trap status inventory, and recent touch audit events. | [  ] WITNESSED |
| **8** | **Threat Intel Search** | Click `Threat Intelligence` in sidebar. Search `198.51.100.99`. | [ ] STIX 2.1 card renders showing `APT29 (Cozy Bear)` attribution, MITRE tags, and confidence score. | [  ] WITNESSED |
| **9** | **Threat Intel Negative** | In Threat Intelligence search, enter `10.254.254.254`. | [ ] Clean empty state appears: *"No active threat intelligence matches for this indicator."* No crash or error modal. | [  ] WITNESSED |
| **10**| **Digital Universe 2.0** | Click `Digital Universe` in sidebar (or click flagship banner on Overview). | [ ] Spatial Universe renders central Event Singularity core and 4 distinct robot entities in their quadrants. | [  ] WITNESSED |
| **11**| **SCOUT & NEXUS Motion** | Observe top quadrants (SCOUT top-left, NEXUS top-right). | [ ] SCOUT emits rotating radar sweeps; NEXUS pulses hovering neural data courier arms. | [  ] WITNESSED |
| **12**| **ORACLE & SENTINEL** | Observe bottom quadrants (ORACLE bottom-right, SENTINEL bottom-left). | [ ] ORACLE renders analytical prism halo; SENTINEL displays reinforced containment barrier. | [  ] WITNESSED |
| **13**| **Four-Agent Demo Relay** | Press `D` (or click `SIMULATE DEMO` button in top toolbar). | [ ] Labeled `DEMO MODE`; glowing packet traverses SCOUT &rarr; NEXUS &rarr; ORACLE &rarr; SENTINEL &rarr; Singularity. | [  ] WITNESSED |
| **14**| **Core Diagnostics Modal** | Click central Event Singularity core (or press key `C`). | [ ] Holographic diagnostics modal opens showing outbox cursor sequence, buffer size, and Merkle hash verification. | [  ] WITNESSED |
| **15**| **Return & Logout** | Click `Return to Security Overview`. Click profile menu &rarr; `Sign Out`. | [ ] Smoothly transitions back to Overview; Sign Out destroys session token and resets to login gateway. | [  ] WITNESSED |

---

## 3. Evidence Capture & Archival Instructions

To persist empirical evidence from your desktop session:
1. **Screen Recording:** Capture a 30-second `.mp4` or `.webm` recording of the Four-Agent Relay in Firefox (e.g. using `kazam`, `obs`, or KDE Spectacle: `spectacle -R`).
2. **Screenshots:** Capture screenshots of:
   - Security Overview with `Canary Active (5 Unconfigured)` badge.
   - Forensics process ancestry tree.
   - Digital Universe during 4-Agent Demo Relay.
3. **Save Files:** Save recordings and images to:
   `/home/liza/HoneyShield-X/docs/release-acceptance/final-witness/evidence/`
4. **Sign-Off Statement:**
   > *"I have personally witnessed and verified the 15 operational scenarios listed above in Mozilla Firefox on Parrot OS Linux / KDE Plasma / Wayland. HoneyShield X v1.0.0-rc5 meets all visual, operational, and security criteria."*  
   **Operator Signature:** ___________________________  
   **Date:** ___________________________

