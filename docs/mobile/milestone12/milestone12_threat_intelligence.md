# Milestone 12 — Mobile Threat Intelligence & Adversary Tracking

**Document:** `milestone12_threat_intelligence.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. System 3: Threat Intelligence Feed Integration

`ThreatIntelScreen.tsx` provides mobile intelligence capabilities:
- **Global IoC Lookup Bar:**
  - Live query field accepting IP addresses, file hashes (SHA-256), domain names, or CVE identifiers.
  - Queries backend `/api/v1/intel/lookup` and displays real threat classification and confidence score.
- **Tracked Adversary Campaigns:**
  - Active APT campaign profiles, threat actor attribution, associated infrastructure, and MITRE ATT&CK tactic tags.
- **High-Confidence Indicators (IoCs):**
  - Normalized STIX/TAXII indicators with confidence percentages and feed sources.
- **Hypothesis-Driven Threat Hunts:**
  - Open threat hunting hypotheses with findings counters and MITRE technique links.

## 2. Integrity Verification

All static fallback campaign objects (Operation DarkMirage, ShadowLocker) were removed. Failed lookups now explicitly inform the operator that no match was found rather than inventing mock confidence scores.

