"""Domain models, bounds, and risk composition logic for Unified Orchestrator (Module 2.10)."""

from dataclasses import dataclass, field
from typing import Any

# Window evaluation bounds
MIN_WINDOW_MINUTES: int = 1
MAX_WINDOW_MINUTES: int = 60
DEFAULT_WINDOW_MINUTES: int = 15

MIN_WINDOW_HOURS: int = 1
MAX_WINDOW_HOURS: int = 168
DEFAULT_WINDOW_HOURS: int = 24

# Alert threshold consistent with Module 2.5
ALERT_THRESHOLD_SCORE: float = 50.0


@dataclass
class CompositeRiskAssessment:
    """Provenance and results of the Module 2.10 risk composition algebra."""

    baseline_risk: float
    detection_risk: float
    correlation_boost: float
    operational_risk: float
    operational_severity: str
    rules_triggered_count: int
    correlation_type: str
    correlation_confidence: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "baseline_risk": self.baseline_risk,
            "detection_risk": self.detection_risk,
            "correlation_boost": self.correlation_boost,
            "operational_risk": self.operational_risk,
            "operational_severity": self.operational_severity,
            "rules_triggered_count": self.rules_triggered_count,
            "correlation_type": self.correlation_type,
            "correlation_confidence": self.correlation_confidence,
        }


def get_operational_severity(score: float) -> str:
    """Map a 0-100 numerical operational risk score into standardized severity bands:
    - 0 to <40  = low
    - 40 to <70 = medium
    - 70 to <90 = high
    - 90 to 100 = critical
    """
    if score < 40.0:
        return "low"
    elif score < 70.0:
        return "medium"
    elif score < 90.0:
        return "high"
    else:
        return "critical"


def compose_operational_risk(
    baseline_score: float,
    suggested_risk_score: float,
    rules_triggered: bool,
    rules_count: int,
    correlation_type: str,
    correlation_confidence: float,
) -> CompositeRiskAssessment:
    """Synthesize composite operational risk score from upstream modules.

    Formula:
    operational_risk_score = clamp(
        max(baseline_score, detection_score) + correlation_boost,
        0.0,
        100.0
    )

    Where:
    - baseline_score: Module 2.4 output (0.0 to 100.0).
    - detection_score: Module 2.9 suggested_risk_score * 10.0 if rules triggered, else 0.0.
    - correlation_boost:
      +10.0 if correlation_confidence >= 0.70 and correlation_type in ("multi_vector", "distributed_burst").
      +5.0 if correlation_confidence >= 0.70 and correlation_type == "persistent_attacker".
      0.0 otherwise.
    """
    detection_score = round(suggested_risk_score * 10.0, 1) if rules_triggered else 0.0

    correlation_boost = 0.0
    if correlation_confidence >= 0.70:
        if correlation_type in ("multi_vector", "distributed_burst"):
            correlation_boost = 10.0
        elif correlation_type == "persistent_attacker":
            correlation_boost = 5.0

    base_max = max(baseline_score, detection_score)
    operational_score = round(min(100.0, max(0.0, base_max + correlation_boost)), 1)
    severity = get_operational_severity(operational_score)

    return CompositeRiskAssessment(
        baseline_risk=round(baseline_score, 1),
        detection_risk=detection_score,
        correlation_boost=correlation_boost,
        operational_risk=operational_score,
        operational_severity=severity,
        rules_triggered_count=rules_count,
        correlation_type=correlation_type,
        correlation_confidence=correlation_confidence,
    )
