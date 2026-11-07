# HoneyShield X — Milestone 21: Threat Intelligence & STIX 2.1 IOC Enrichment

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Scope of System 3: Threat Intelligence

System 3 enriches security events with global adversary context, indicators of compromise (IOCs), threat actor attribution, and MITRE ATT&CK mapping. Rather than presenting isolated alert messages, HoneyShield X correlates observed IPs, hashes, and domains against curated intelligence feeds.

Key components validated:
- STIX 2.1 standard JSON representation.
- Dynamic indicator lookup (IP, CIDR, MD5/SHA256, domain).
- Time-based decay scoring algorithm.
- APT attribution and confidence metrics.
- Clean negative match handling (unlisted benign indicators).

---

## 2. STIX 2.1 Data Model & Enrichment Engine

HoneyShield X ingests structured STIX 2.1 feeds and stores indicators with standard fields:
- `id`: `indicator--<uuid>`
- `spec_version`: `2.1`
- `pattern`: `[ipv4-addr:value = '198.51.100.99']`
- `threat_actors`: `APT29 (Cozy Bear)`, `FIN7`, `Lazarus Group`
- `kill_chain_phases`: `initial-access`, `execution`, `lateral-movement`
- `confidence`: Integer between 0 and 100.

### 2.1 Confidence Decay Function
Indicators lose relevance over time as adversary infrastructure churns. HoneyShield X calculates decayed confidence:
$$\text{Decayed Score} = \text{Initial Score} \cdot e^{-\lambda \Delta t}$$
where $\Delta t$ is days elapsed since last verified activity and $\lambda$ is the half-life decay constant ($0.035$).

---

## 3. Negative Match & Graceful Fallback Handling

When an operator queries an IP or domain not present in the intelligence repository:
- The system returns HTTP 200 with `match_found: false`.
- The UI displays a clean, reassuring empty state: *"No active threat intelligence matches for this indicator. Indicator appears benign or uncataloged."*
- Prevents UI crashes or unhandled promise rejections.

---

## 4. Test Verification Summary

- **E2E-05:** Verified in `milestone21_e2e_flows.test.tsx` that the Threat Intelligence pillar is clearly defined on the overview and opens the dedicated intelligence search workspace.
- **Frontend Unit Tests:** `threat_intel.test.tsx` (4/4 passed) verifies search input, STIX 2.1 indicator cards, and attribution tags.
- **Backend Tests:** `test_milestone15_threat_hunting_and_forensics.py` verifies IOC correlation and database hunting performance.

