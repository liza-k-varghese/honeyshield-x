# HoneyShield X — Digital Agent Universe
## Milestone 5.1: Browser Environment & Execution Capabilities Audit

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Target:** Host Desktop Environment, Firefox Execution, Automated vs. Operator Testing  
**Audit Conducted By:** Lead Browser Automation Engineer & Independent QA Acceptance Auditor  
**Status:** AUTOMATION BLOCKED — OPERATOR-ASSISTED DESKTOP ACCEPTANCE DELIVERED

---

## 1. Executive Summary & Verification Mandate

In strict compliance with HoneyShield X verification ethics and Milestone 5.1 directives:
> *"Do not claim that a browser test passed unless a real browser executed it. Do not claim production readiness based solely on unit tests or DOM simulations. A blocked browser environment is not permission to mark visual acceptance as passed."*

This document provides a thorough audit of the host environment, investigates all four preferred browser execution methods in hierarchical order, documents the exact technical root cause preventing headless automated execution, and details the operator-assisted acceptance procedure for the running KDE Plasma 6 desktop.

---

## 2. Host Environment & Session Inventory

### 2.1 Operating System & Desktop Session Details
```text
Operating System:       Parrot OS Linux (Debian-based Security Distribution)
Kernel Version:         6.6.137+
Desktop Environment:    KDE Plasma 6 (Session: plasma, Desktop: KDE)
Display Protocol:       Wayland
Display Identifier:     WAYLAND_DISPLAY=wayland-0
Runtime Directory:      XDG_RUNTIME_DIR=/run/user/1000
Session Socket:         /run/user/1000/wayland-0
User Identity:          liza (UID: 1000, GID: 1000)
Active Desktop Apps:    VSCodium, KDE Shell, Wayland Compositor (KWin)
```

### 2.2 Installed Browser & Tooling Audit
- **Installed Native Browser:** `/bin/firefox` — Mozilla Firefox 144.0 (installed and fully functional on host).
- **Installed GUI Utilities:** `/bin/codium`, `/bin/xterm`.
- **Absent Browsers:** Google Chrome (`google-chrome`), Chromium (`chromium`, `chromium-browser`), Brave (`brave-browser`) are absent from system `$PATH`.
- **Absent Automation Drivers:** Neither `geckodriver` nor `chromedriver` is present in system paths, user directories, or Python virtual environments.
- **Absent Virtual Display Servers:** Neither `Xvfb`, `xvfb-run`, nor `xpra` is installed.
- **Node Package Dependencies:** Node.js v20.19.2 is installed; `frontend/node_modules/` contains `@testing-library/react`, `happy-dom`, `jsdom`, `vite`, and `vitest`. No Playwright or Puppeteer browser binaries exist in `node_modules`.

---

## 3. Investigation of Browser Execution Options (Hierarchical Order)

In accordance with Phase 2 instructions, four options were evaluated in priority order:

### Option 1: Use an Already Accessible Graphical Browser Session
- **Evaluation:** The host currently runs an active KDE Plasma 6 Wayland desktop session (`wayland-0`). However, processes spawned inside the terminal sandbox run within isolated mount and network namespaces that do not have access to `/run/user/1000/wayland-0` (`ls: cannot access '/run/user/1000/': No such file or directory`).
- **Conclusion:** Automated commands inside the sandbox cannot directly inherit the host Wayland socket without explicit desktop invocation by the operator.

### Option 2: Use an Available Supported Browser Automation Tool
- **Evaluation:** Selenium is present in `/usr/lib/python3/dist-packages/selenium/`, but lacks `geckodriver` in `$PATH`. Node packages do not include Playwright or Puppeteer binaries.
- **Conclusion:** No automated headless WebDriver driver is installed or runnable without administrative system changes.

### Option 3: Use an Existing Isolated Browser Testing Environment
- **Evaluation:** Attempted direct headless execution:
  ```bash
  firefox --headless --screenshot /tmp/test.png /tmp/test.html
  ```
  **Technical Failure Analysis:**
  1. **User Namespace Restrictions (`ENOSYS`):**
     `Sandbox: CanCreateUserNamespace() clone() failure: Function not implemented (ENOSYS)`  
     Firefox multi-process content sandboxing mandates Linux user namespaces (`CLONE_NEWUSER`). The sandbox environment disallows this syscall.
  2. **SWGL Framebuffer Mapping Failure (`no dt`):**
     `[GFX1-]: glxtest: Could not connect to wayland display, WAYLAND_DISPLAY=wayland-0`  
     `[GFX1-]: RenderCompositorSWGL failed mapping default framebuffer, no dt`  
     Even when `--headless` is specified, Mozilla's WebRender software compositor (`RenderCompositorSWGL`) requires a native surface from Wayland, X11, or a virtual framebuffer (Xvfb) to map a draw target (`dt`).
- **Conclusion:** Without an Xvfb virtual framebuffer device or Wayland socket, headless Firefox cannot initialize its graphics rendering pipeline.

### Option 4: Operator-Assisted Acceptance on the KDE Desktop (Selected Path)
- **Evaluation:** The operator is logged into an active KDE Plasma 6 Wayland desktop session with `/bin/firefox` installed.
- **Decision:** In strict compliance with security directives (*"Do not weaken operating-system sandbox protections; Do not install privileged system packages without approval"*), HoneyShield X utilizes a comprehensive, reproducible operator-assisted acceptance procedure.

---

## 4. Operator-Assisted Desktop Acceptance Runbook

The operator executes this verification directly in their Parrot OS KDE Plasma 6 session:

### Step 1: Start Backend API Services
In a Parrot OS terminal:
```bash
cd /home/liza/HoneyShield-X
source backend/.venv/bin/activate
export PYTHONPATH=backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Expected Output:* `Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`

### Step 2: Start Frontend Development Server
In a second terminal:
```bash
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173
```
*Expected Output:* `VITE v6.4.4 ready in ~250 ms | Local: http://127.0.0.1:5173/`

### Step 3: Launch Native Firefox Browser
In a third terminal (or via KDE Application Menu):
```bash
firefox http://127.0.0.1:5173 &
```

### Step 4: Verification Navigation & Observation
1. **Authentication:** Log in using `admin_chief` (or choose the Administrator persona from the selector).
2. **Digital Agents Gallery:** Navigate to `/digital-agents` $\to$ Inspect the four robot cards.
3. **Movement Prototype:** Click **Start Movement** $\to$ Observe Bézier curve translation and packet carrying.
4. **4-Agent Relay:** Toggle **4-Agent Chain Relay** $\to$ Observe sequential handoffs across all 4 characters.
5. **NEXUS Assistant:** Click the floating copilot pill $\to$ Query system state and test containment refusal.
6. **Historical Replay:** Open Event Journey $\to$ Observe REPLAY MODE and honest NOT RECORDED badges.

