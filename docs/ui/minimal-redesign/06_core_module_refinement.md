# HONEYSHIELD X — MILESTONE 20
## 06: CORE MODULE REFINEMENT — THREATS, HONEYPOTS, INTEL & INVESTIGATIONS

**Document:** `docs/ui/minimal-redesign/06_core_module_refinement.md`  
**Classification:** Core Operations Module Alignment  
**Author:** SOC Operations Engineer & Senior Frontend Architect  
**Status:** Approved & Implemented  

---

### 1. Overview of Core Operational Modules

HoneyShield X centers around four primary cybersecurity workflows:
1. **Threats & Alerts (`/alerts`):** Real-time triage, lifecycle management (`open`, `acknowledged`, `resolved`), and alert correlation.
2. **Deception Grid (`/deception`):** Decoy canary traps across Cowrie (SSH), Dionaea (malware), SQL, and Redis protocols.
3. **Threat Intelligence (`/intel`):** STIX 2.1 IOC correlation, adversary campaign attribution, and threat score fusion.
4. **Investigations & Forensics (`/investigation`):** Deep dossier analysis, MITRE ATT&CK technique mapping, and containment execution.

Milestone 20 refines the integration between these modules and the main `SecurityOverview` dashboard to establish frictionless operator workflows.

---

### 2. Module Refinement Details

#### 2.1 Threats & Alerts
- **Overview Integration:** Top 5 priority alerts surfaced directly in `SecurityOverview` with clear severity badges (`CRITICAL`, `HIGH`).
- **One-Click Triage:** Clicking `Investigate` on any alert row immediately deep-links into the source IP investigation dossier.
- **Dedicated View (`AlertTable.tsx`):** Provides full multi-column filtering, status toggling, and bulk acknowledgment without decorative visual clutter.

#### 2.2 Deception Grid & Honeypots
- **Overview Integration:** Metric Card 3 displays real-time health across all 4 deception sensors (`4 / 4 active traps`). System 2 card summarizes active listener protocols.
- **Dedicated View (`DeceptionGridView.tsx`):** Clean tabular layout showing sensor uptime, payload capture counts, and attacker engagement sessions.

#### 2.3 Threat Intelligence
- **Overview Integration:** System 3 card highlights STIX 2.1 compliance and active threat intelligence feeds.
- **Dedicated View (`ThreatIntelView.tsx`):** Displays adversary attribution cards, confidence scoring (0-100), and automated indicator enrichment.

#### 2.4 Investigations & IP Dossier
- **Universal Access:** Accessible via (1) Header global search, (2) SecurityOverview table action buttons, and (3) Left sidebar `Investigations` link.
- **Dedicated View (`IpDossierView.tsx`):** Displays geolocated threat origin, historical attack timeline, MITRE technique tags, and incident containment controls.

---

### 3. Data Integrity & State Management

All four modules bind to authenticated REST endpoints and WebSocket feeds:
- React Query handles caching and automatic background re-validation (`staleTime: 3000ms`).
- Real-time updates propagate instantaneously via authenticated WebSocket streaming.
- Zero fabricated mock data: Every metric originates from live PostgreSQL/Redis database records.

---

### 4. Verification

- Module test suites executed cleanly across `hunting.test.tsx`, `campaigns.test.tsx`, `cases.test.tsx`, and `investigation.test.tsx`.
- 100% passing across all 170 Vitest tests.

