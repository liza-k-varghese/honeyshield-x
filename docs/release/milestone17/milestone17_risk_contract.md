# HoneyShield X — Milestone 17: Risk-Score Dual-Scale Reconciliation & API Contract

## 1. Problem Definition
Prior milestones exhibited dual scale confusion between:
- **Detection Engine / CVSS Base Severity:** Standardized on 0.0 to 10.0 scale.
- **HoneyShield Operational Composite Score:** Calculated as a 0.0 to 100.0 scale incorporating threat intelligence reputation and event volume frequency.

## 2. Reconciled Contract Architecture
The endpoint `POST /api/v1/risk/explain/{attack_id}` exposes an unambiguous, deterministic schema (`RiskScoreExplanationResponse`):
```json
{
  "attack_id": 42,
  "final_score": 85.0,
  "severity": "high",
  "model_version": "v1.0-deterministic",
  "breakdown": {
    "detection_vector_points": 40.0,
    "threat_intel_points": 35.0,
    "frequency_points": 10.0,
    "total_score": 85.0
  },
  "narrative_explanation": "Server-derived risk score 85.0 (HIGH) for attack #42...",
  "evaluated_at": "2026-11-06T10:00:00Z",
  "scale": "0-100",
  "normalized_score_10": 8.5
}
```

### Reconciliation Rules
1. `final_score`: The authoritative 0–100 operational score used across SOC dashboards and containment thresholds.
2. `scale`: Explicit label `"0-100"` (or `"0-10"` if legacy low band).
3. `normalized_score_10`: Deterministic translation `round(final_score / 10.0, 1)`, providing immediate alignment with CVSS / STIX 0–10 rating models.
4. `breakdown`: Granular breakdown detailing exact point contributions from detection rules, threat intelligence reputation, and observed event frequency.

## 3. Test Verification
- Reconciled dual-scale responses verified in `test_06` (`test_milestone17_sdk_recovery_and_defense.py`).

