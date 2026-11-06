# Milestone 8 — Three-System Operations & Reliability

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-06  

---

## 1. System 1: SOC Monitoring, Detection & Incident Command

- **Telemetry Ingestion:** Validated via `/api/v1/ingestion/events`. Ingested events default to `risk_score=0.0` and `severity="low"` to prevent client-side scoring forgery.
- **Detection Rules:** Evaluates SSH brute force in `backend/app/detection/service.py` across a configurable sliding time window (default 10 mins).
- **Dynamic Risk Scoring:** Multi-vector scoring algorithm calculates attack severity and risk score (0–100 scale).
- **Alert Deduplication:** `backend/app/alerts/service.py` checks for existing `open` or `acknowledged` alerts for the same attack before creating a new record, suppressing alert storms.
- **Governor Level 3 Containment Safeguards:**
  - Automated or external telemetry **cannot** directly trigger active containment actions.
  - Active containment (`CONTAINMENT_STAGING_REQUEST`) is strictly classified as Level 3 (high blast radius).
  - Only authenticated operators with `administrator` role can approve or execute containment dispatches.

---

## 2. System 2: Deception Infrastructure & Canary Tokens

- **Canary Honeytoken Minting:** Supports active deployment of inert honeytokens (AWS API keys, database credentials, PDF document beacons, webhook endpoints).
- **Trap Listener Hit Contextualization:**
  - `/api/v1/deception/validate/{token_id}` serves as the trap listener.
  - Incoming requests capture client IP, User-Agent, and forensic headers, emitting `canary.tripwire.tripped` events.
- **Honeypot Sensor Operational Status Audit:**
  - **Canary Traps:** `HEALTHY` (Active in-memory & database registry).
  - **Suricata:** `NOT_CONFIGURED` (Network IDS not active on host).
  - **Cowrie:** `NOT_CONFIGURED` (SSH honeypot daemon not active).
  - **Dionaea:** `NOT_CONFIGURED` (Multi-protocol malware trap not active).
  - **OpenCanary / Zeek:** `NOT_CONFIGURED`.
  > Sensor activity is **not manufactured**. Unconfigured integrations are honestly classified as `NOT_CONFIGURED`.

---

## 3. System 3: Threat Intelligence & Correlation

- **Indicator Ingestion & Validation:** Validates IP addresses (IPv4/IPv6 via standard `ipaddress` library), domains (regex syntax), and file hashes (MD5, SHA1, SHA256).
- **Correlation & Attack Enrichment:** Matches incoming source IPs against active IOC records, elevating attack severity upon match.
- **Mathematical Exponential Decay:** Incorporates half-life degradation based on indicator type (e.g. 14 days for IP addresses, 90 days for file hashes).
- **Fail-Soft Lookups:** If an external intelligence feed is unreachable, the system gracefully falls back to local cached IOCs without stalling the ingestion pipeline.

