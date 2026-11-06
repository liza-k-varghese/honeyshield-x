# Milestone 16 — Risk-Score Scale Reconciliation Audit

## 1. Context & Divergence Problem
In prior milestones, two distinct risk score scales existed across the codebase:
1. **Rule Base Score ($S_{\text{rule}} \in [0, 10]$):** Used in the Detection Rule Catalog and Simulation Lab, representing CVSS-like base severity.
2. **Composite Operational Score ($S_{\text{operational}} \in [0, 100]$):** Used in live attacks, alerts, and incidents, representing multi-factor dynamic threat severity.

Without explicit schema harmonization, operators could misinterpret a rule severity score of 8.5/10 as a low 8.5/100 risk.

## 2. Mathematical Normalization Formula
The composite operational score is formulated as:
$$S_{\text{operational}} = \min(100, S_{\text{severity}} + S_{\text{intel}} + S_{\text{volume}})$$
where:
- $S_{\text{severity}} \in [0, 50]$ derived from base severity classification (Low=10, Medium=25, High=40, Critical=50).
- $S_{\text{intel}} \in [0, 40]$ derived from threat reputation matches and malicious IOC correlation.
- $S_{\text{volume}} \in [0, 10]$ derived from event frequency and burst density.

To normalize between scales:
$$S_{\text{normalized\_10}} = \text{round}\left(\frac{S_{\text{operational}}}{10.0}, 1\right)$$

## 3. Implementation in Milestone 16
In `backend/app/schemas.py` and `backend/app/routers/risk.py`:
- Added `scale: str = "0-100"` to `RiskScoreExplanationResponse`.
- Added `normalized_score_10: float = Field(..., description="Risk score normalized to CVSS 0-10 scale")`.
- Validated via `test_05_risk_score_normalization_and_scale_reconciliation` in `backend/tests/test_milestone16_forensics_and_reconciliation.py`.

