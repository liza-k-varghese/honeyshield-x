# OPERATOR RELEASE CHECKLIST & WITNESS PROTOCOL

**Application:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Target Release:** `v1.0.0` (Release Candidate `v1.0.0-rc5`)  
**Target Browser:** Mozilla Firefox ESR (Parrot OS / KDE Plasma / Wayland)  

---

## 1. OPERATOR INTERACTIVE VISUAL WITNESS PROTOCOL (GATE G38)

To visually confirm four-robot locomotion in your running Firefox browser:

1. **Open HoneyShield X in Firefox:**
   Navigate to: `http://127.0.0.1:5173/`
2. **Authenticate:**
   Log in as `admin_chief` using `[REDACTED_OPERATOR_CREDENTIAL]`.
3. **Navigate to Digital Universe:**
   Click **Security Overview** -> **Digital Universe** (or press `U`).
4. **Initiate Robot Relay:**
   Click the **START RELAY** button (or press `Space`).
5. **Verify Robot Locomotion Sequence:**
   - **Stage 1 (SCOUT — Blue `#3b82f6`):** Observes honeypot perimeter; takes off from top-left quadrant; carries glowing packet to Singularity Core; hands off.
   - **Stage 2 (NEXUS — Cyan `#00e5ff`):** Takes off from top-right quadrant; carries normalized packet to Core; hands off.
   - **Stage 3 (ORACLE — Purple `#a855f7`):** Takes off from bottom-right quadrant; analyzes IOC threat actors; carries threat intel packet to Core; hands off.
   - **Stage 4 (SENTINEL — Red `#ef4444`):** Takes off from bottom-left quadrant; executes containment blast; carries final action packet to Core; completes cycle.
   - **Cycle Rollover:** Relay increments to next run ID cleanly without freezing or skipping agents.

---

## 2. PRODUCTION SECRETS INJECTION (GATE G39)

Before launching in production:
1. Generate production password hashes using `OperatorRegistry` PBKDF2 helper.
2. Set `APP_ENV=production`.
3. Provide `HONEYSHIELD_OPERATORS_JSON` containing only authorized operator hashes.
4. Verify that default test accounts (`admin_chief`, etc.) cannot authenticate in production.

---

## 3. RELEASE TAG PROMOTION (GATE G40)

Upon operator satisfaction with visual behavior and security configuration:
```bash
git tag -a v1.0.0 -m "HoneyShield X v1.0.0 Enterprise Release"
```
*(Do not execute tag or remote push without explicit operator authorization).*
