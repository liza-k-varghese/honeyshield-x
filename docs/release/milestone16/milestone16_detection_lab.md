# Milestone 16 — Detection Rule Lab & Simulation Verification

## 1. Overview
The Detection Rule Lab allows security engineers to author, test, and tune custom correlation rules without triggering live alert outbox cascades or corrupting incident databases.

## 2. Simulation Execution Model
- Input: Rule specification (conditions, threshold, severity, MITRE tag, target telemetry types) + historical or synthetic telemetry batch.
- Output: Matches, matched record IDs, and statistical evaluation metrics:
  - True Positives ($TP$)
  - False Positives ($FP$)
  - False Negatives ($FN$)
  - Precision: $P = \frac{TP}{TP + FP}$
  - Recall: $R = \frac{TP}{TP + FN}$
  - F1-Score: $F_1 = 2 \cdot \frac{P \cdot R}{P + R}$

## 3. Side-Effect Free Guarantees
- The simulation router (`backend/app/routers/detection_rules.py`) performs evaluation purely in memory.
- No writes are dispatched to PostgreSQL `alerts` or Redis event streams.
- Operators can iteratively adjust thresholds until target F1-score is attained.

## 4. Empirical Test Validation
- Verified in `backend/tests/test_milestone16_forensics_and_reconciliation.py` (`test_07_detection_rule_simulation_and_metrics`).
- Rule simulation returned precision, recall, and harmonic mean $F_1$-score accurately calculated on sample telemetry without database side effects.

