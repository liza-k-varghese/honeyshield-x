# HONEYSHIELD X — MILESTONE 20
## 05: LOGIN EXPERIENCE, APP SHELL & NAVIGATION REDESIGN

**Document:** `docs/ui/minimal-redesign/05_login_and_navigation.md`  
**Classification:** Authentication UX & App Shell Engineering  
**Author:** Principal Full-Stack Engineering Lead  
**Status:** Approved & Verified  

---

### 1. App Shell Architecture

The HoneyShield X App Shell (`frontend/src/App.tsx`) forms the unified frame across all operational modules. The redesign simplifies the shell into three seamless layers:
1. **Top Header (`Header.tsx`):** Fixed sticky header (height 56px) providing category breadcrumbs, universal IP/IOC search, live system health status, notifications drawer, and authenticated user controls.
2. **Left Sidebar (`Sidebar.tsx`):** Collapsible desktop sidebar (240px expanded / 64px collapsed) with distinct Primary and Secondary operational tiers.
3. **Responsive Main Viewport:** Smooth reveal transitions (`Reveal` from `CyberMotion.tsx`) hosting the active view without extraneous nested scrollbars.

---

### 2. Header Redesign Specification

#### Eliminated Elements:
- Removed 5 duplicate view switcher buttons (`Dashboard`, `Cinematic`, `Analytics`, `Systems`) that created navigational dissonance with the left sidebar.

#### Added & Refined Elements:
- **Breadcrumb Context:** Renders dynamic `Category / Page Title` based on the active view (e.g., `Operations / Security Overview`, `Defense / Honeypot Grid`, `Intelligence / Threat Intelligence`).
- **Global Investigation Search:** Monospaced input field allowing operators to immediately submit an IP address (e.g. `198.51.100.44`) or file hash, deep-linking into the forensic dossier.
- **Dynamic Service Health Pill:** Sourced from `SystemHealth` (API, PostgreSQL, Redis); displays `System Online`, `System Degraded`, or `System Critical` with corresponding color pulses.
- **Notifications Dropdown:** Unread triage counter badge (`critical` + `high` open alerts), expandable to reveal the 5 most recent alerts with click-to-triage links.
- **Operator Identity & Switch Action:** Displays active operator username (`responder_alex`), role pill (`Responder`), and explicit `Switch` button for fast operator switching.

---

### 3. Sidebar Redesign Specification

#### Group 1: Primary Operations (Mandated Core Views)
- **Overview:** Executive security overview (`SecurityOverview.tsx`).
- **Alerts:** Critical and high triage alerts queue with live counter badge (`AlertTable.tsx`).
- **Honeypots:** Active deception grid and canary sensors (`DeceptionGridView.tsx`).
- **Threat Intelligence:** STIX 2.1 indicator correlation and threat actor mapping (`ThreatIntelView.tsx`).
- **Forensics:** Deep IP investigations and forensic timeline (`IpDossierView.tsx`).
- **Digital Universe:** Spatial cyber observatory and multi-agent showcase (`UniverseCommandCenter.tsx`).

#### Group 2: Secondary Defense & Administration
- **Network:** Incident Command and containment war room.
- **Attack Detection:** Detection rule catalog, tuning, and replay.
- **AI Analysis:** Threat actor campaigns and generative AI hunting.
- **Analytics:** Long-term trend analysis and metric reporting.
- **Systems:** SIEM/SOAR integrations and external webhooks.
- **Configuration:** Audit logging and platform configuration.

---

### 4. Login Modal Experience (`LoginModal.tsx`)

The authentication modal was upgraded into a modern, high-trust security portal:
- **Title:** `HoneyShield-X SOC Console`
- **Brand Subtext:** `Unified Security Operations // Detect. Deceive. Defend.`
- **Dual Tab Mode:**
  1. **Operator Sign In:** Clean credentials form with seeded quick persona triggers (`Responder Alex`, `Analyst Sarah`, `Admin Chief`, `Viewer Dan`).
  2. **Break-Glass Emergency:** High-privilege override mode with mandatory 20-character justification check, audit broadcast, and time-boxed 30-minute administrator session.
- **Session Expiry Warning:** Clear amber alert banner when re-authentication is required due to token timeout.

---

### 5. Verification & Test Suite Compatibility

The refined shell and modal were verified against `auth.test.tsx` and `command_center.test.tsx`:
- All 7 tests in `auth.test.tsx` passing (persona switching, session persistence, break-glass validation, role badge display).
- All 13 tests in `command_center.test.tsx` passing (sidebar items, mobile drawer toggles, gauge meters).

