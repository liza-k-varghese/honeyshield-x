# HoneyShield X — Milestone 17: HoneyShield Landing Page Architecture

## 1. Landing View Overview
The new HoneyShield Landing Page (`frontend/src/components/HoneyShieldLanding.tsx`) introduces a high-impact cinematic entry point to the SOC command center.

## 2. Key Interface Elements
- **Monospace Pre-header & Badge:** Red pill badge `SECURITY. IN MOTION.` followed by `HONEYSHIELD X // AUTONOMOUS CYBERSECURITY OPERATIONS`.
- **Hero Title:** Massive outlined typographic header with subtle crimson accent glow.
- **Live Platform Telemetry:** Real-time statistics fetched from active hooks (`useDashboardStats`, `useAlerts`, `useAttacks`):
  - Total Attacks Detected
  - Active Alerts
  - Deception Grid Listeners (SSH, HTTP, Redis, PostgreSQL)
  - Core System Health status
- **Digital Agent Showcase:** Interactive 3D `TiltCard` instances displaying SCOUT, NEXUS, ORACLE, and SENTINEL with real-time operational state indicators and telemetry counters.
- **Direct Operational CTAs:**
  - `Launch Command Center`: Navigates immediately to Dashboard with curtain transition.
  - `Threat Hunting Lab`: Navigates directly to the Threat Hunting retrospective workspace.
  - `System Documentation`: Opens architecture guide.

## 3. Real Backend Metrics (Zero Invented Data)
All numbers, statuses, and sensor states displayed on the landing page represent real backend state queried via existing production hooks (`useDashboardStats`, `useAlerts`, `useAttacks`), strictly abiding by the authenticity constraints of Milestone 17.

