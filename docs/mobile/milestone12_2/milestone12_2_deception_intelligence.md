# Milestone 12.2 — Deception Mesh & Threat Intelligence Integration

**Document:** `milestone12_2_deception_intelligence.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. System 2: Active Deception Grid

`DeceptionDashboardScreen.tsx` monitors honeypots and canary tripwires:
- **Minted Canary Tokens:** Live list of active tripwire tokens retrieved from `/api/v1/canaries`.
- **Canary Hit Telemetry:** Real-time logging of tripped decoys with attacker IP, geolocation, and severity.
- **Emulated Decoy Hosts:** Status of decoy hosts (`ACTIVE` vs `COMPROMISED`) and interaction counts.
- **Mobile Canary Minting:** Dispatches canary creation requests to backend `/api/v1/canaries/mint`.

---

## 2. System 3: Threat Intelligence Feed

`ThreatIntelScreen.tsx` provides threat intelligence operations:
- **Global IoC Lookup Bar:** Queries IP addresses, domains, file hashes, and CVEs against the STIX/TAXII indicator database.
- **Adversary Campaigns:** Tracks APT threat actor profiles, associated infrastructure, and MITRE tactics.
- **Hunting Hypotheses:** Hypothesis-driven threat hunts with findings counters.
- **Integrity Rule:** Failed lookups explicitly report no match found; no synthetic confidence scores are invented.

