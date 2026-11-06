# Milestone 16 — Digital Agent Universe in SOC Investigation

## 1. Digital Agent Roster & Chromatic Identities
HoneyShield X features four specialized digital agents coordinating SOC operations:
1. **SCOUT** (`#3B82F6` — Electric Blue): Sensor & telemetry collection robot. Deployed to edge honeypots and network traps.
2. **NEXUS** (`#06B6D4` — Cyan): Processing courier and investigative assistant robot. Triages telemetry, performs correlation, and assists analysts.
3. **ORACLE** (`#A855F7` — Purple): Intelligence analysis and predictive modeling robot. Matches IOCs and ATT&CK patterns.
4. **SENTINEL** (`#EF4444` — Crimson Red): Alert delivery, defense guard, and containment enforcement robot. Dispatches high-priority push notifications and containment actions.

## 2. Investigative Collaboration Architecture
During threat investigation workflows:
- **Telemetry Ingestion:** SCOUT flags anomalous telemetry spikes to Redis streams.
- **Enrichment & Correlation:** ORACLE analyzes IOCs and assigns threat actor signatures.
- **Assisted Investigation:** NEXUS parses case evidence, quarantines hostile payloads, and provides contextual hypotheses via the Investigation Workspace.
- **Incident Escalation:** SENTINEL monitors critical threshold violations and broadcasts immediate mobile/desktop notifications.

## 3. Motion Physics & UI Guarantees
- Frontend agent avatars and HUD components employ cubic Bézier motion physics (`cubic-bezier(0.4, 0.0, 0.2, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)`).
- Agent states (`idle`, `patrolling`, `analyzing`, `alerting`) reflect live system status without layout thrashing.
- Verified in frontend test suite (144/144 Vitest tests passing).

