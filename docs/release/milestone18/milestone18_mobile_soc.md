# HoneyShield X — Milestone 18: Mobile SOC Operations & Screen Navigation

## 1. Mobile Screen Architecture
The mobile client provides six dedicated operational views configured in `mobile/src/navigation/MainTabs.tsx`:
1. **SOC Dashboard (`SocDashboardScreen.tsx`):**
   - KPI telemetry (Active Attacks, Unresolved Alerts, Health Status).
   - High-priority alert banner with containment trigger.
2. **Attack Explorer (`AttackExplorerScreen.tsx`):**
   - Filterable attack container feed (SSH Brute Force, Web Scanning, Port Probes).
   - Attack timeline drilldown with MITRE ATT&CK technique mapping.
3. **Alerts Inbox (`AlertsListScreen.tsx`):**
   - Severity-coded list (Critical, High, Medium, Low).
   - Direct button to escalate alert to an active Incident Case.
4. **Threat Intelligence (`ThreatIntelScreen.tsx`):**
   - Observable reputation lookups (IP addresses, domains, file hashes).
   - Feed status and confidence scoring indicator.
5. **Active Deception Grid (`DeceptionDashboardScreen.tsx`):**
   - Canary token inventory and listener status (SSH 2222, HTTP 8080, Redis 6379, Postgres 5432).
6. **Incident Cases (`CasesListScreen.tsx`):**
   - Multi-operator collaborative case dossiers with evidence attachment.

## 2. Implementation Integrity
All screens connect to typed API clients in `mobile/src/api/` using `@tanstack/react-query` with automatic retry and cache invalidation.
TypeScript compilation passes cleanly with 0 errors.

