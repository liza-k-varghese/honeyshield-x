"""Data models and constants for Multi-Vector Detection Engine & Rule Registry (Module 2.9)."""

from dataclasses import dataclass, field
import re
from typing import Any

CANONICAL_VECTORS: tuple[str, ...] = ("auth", "web", "network")

MAX_SCAN_LENGTH: int = 4096
MAX_PAYLOAD_EVENTS: int = 200

MIN_WINDOW_MINUTES: int = 1
MAX_WINDOW_MINUTES: int = 60
DEFAULT_WINDOW_MINUTES: int = 15


@dataclass(frozen=True)
class DetectionRule:
    """Immutable declarative detection rule specification."""

    rule_id: str
    name: str
    vector: str
    description: str
    severity: str
    base_risk_score: float
    rule_type: str  # "threshold" or "signature"
    target_event_types: tuple[str, ...]
    window_minutes: int = DEFAULT_WINDOW_MINUTES
    threshold_count: int = 1
    match_tokens: tuple[str, ...] = ()
    regex_patterns: tuple[re.Pattern, ...] = ()

    def __post_init__(self) -> None:
        if self.vector not in CANONICAL_VECTORS:
            raise ValueError(
                f"Invalid vector '{self.vector}'. Must be one of {CANONICAL_VECTORS}"
            )
        if self.rule_type not in ("threshold", "signature"):
            raise ValueError(
                f"Invalid rule_type '{self.rule_type}'. Must be 'threshold' or 'signature'"
            )
        if not (0.0 <= self.base_risk_score <= 10.0):
            raise ValueError(
                f"base_risk_score must be between 0.0 and 10.0, got {self.base_risk_score}"
            )


@dataclass
class TriggeredRule:
    """Evidence record for a rule triggered during evaluation."""

    rule_id: str
    rule_name: str
    vector: str
    severity: str
    risk_score: float
    evidence_count: int
    matched_patterns: list[str] = field(default_factory=list)
    description: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "vector": self.vector,
            "severity": self.severity,
            "risk_score": self.risk_score,
            "evidence_count": self.evidence_count,
            "matched_patterns": self.matched_patterns,
            "description": self.description,
        }
