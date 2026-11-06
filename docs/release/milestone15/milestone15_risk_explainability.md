# Milestone 15 — Deterministic Risk Score Explainability

**System:** HoneyShield X Server-Derived Risk Engine  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Deterministic Multi-Factor Risk Breakdown

To prevent black-box scoring ambiguity in SOC investigations, HoneyShield X exposes authoritative, factor-by-factor risk breakdowns (`GET /api/v1/risk/explain/{attack_id}`):
- **Base Detection Score:** Weighted score derived from triggered multi-vector rules (0–10 scale).
- **Adversary Frequency / Repetition Multiplier:** Upward adjustment for repeat probes from the same CIDR within sliding windows.
- **Threat Intelligence Multiplier:** Dynamic weighting based on active STIX 2.1 indicators (threat level and confidence).
- **Target Asset Criticality:** Honeypot decoys simulating high-value infrastructure (e.g. SCADA, core databases) apply critical weighting.
- **MITRE Tactic Escalation:** Progression along the cyber kill chain (e.g. initial access -> privilege escalation -> lateral movement) triggers escalation factors.

---

## 2. Server-Authoritative Guarantees

As verified in `test_10`, the endpoint:
1. Returns identical, deterministic score computations for identical input parameters.
2. Formulates human-readable factor contribution summaries.
3. Maps final risk scores directly to SOC severity classifications:
   - `0.0 - 3.9`: Low
   - `4.0 - 6.9`: Medium
   - `7.0 - 8.9`: High
   - `9.0 - 10.0`: Critical

