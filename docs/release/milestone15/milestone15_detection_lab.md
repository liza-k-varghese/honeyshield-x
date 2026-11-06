# Milestone 15 — Detection Engineering Laboratory & Rule Simulation

**System:** HoneyShield X Detection Engineering Lab  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Safe Read-Only Simulation Sandbox

Detection rule engineering requires testing candidate logic against empirical and labeled test corpora without risking production degradation:
- Endpoint: `POST /api/v1/detection/rules/{rule_id}/simulate`
- **Zero Production Mutation:** Runs strictly in an isolated memory context.
- **Zero Outbox Emission:** Simulated matches produce candidate alerts within the response payload without writing to `security_event_outbox`.
- **Zero Containment Triggering:** Defensive playbooks are never dispatched.

---

## 2. Statistical Metric Calculation

When test events provide ground-truth malicious labels (`ground_truth_malicious: bool`), the simulation calculates:
- **True Positives ($TP$):** Malicious events correctly matched by rule tokens/patterns.
- **False Positives ($FP$):** Benign events incorrectly flagged by the rule.
- **True Negatives ($TN$):** Benign events correctly ignored.
- **False Negatives ($FN$):** Malicious events missed by the rule.
- **Precision:** $\frac{TP}{TP + FP}$
- **Recall:** $\frac{TP}{TP + FN}$
- **F1 Score:** $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$

Validated in `test_09`, allowing detection engineers to optimize threshold counts and regex patterns before promoting rules to production.

