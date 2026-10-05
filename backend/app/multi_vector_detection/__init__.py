"""HoneyShield X Multi-Vector Detection Engine & Rule Registry (Module 2.9)."""

from app.multi_vector_detection.models import (
    CANONICAL_VECTORS,
    DEFAULT_WINDOW_MINUTES,
    MAX_PAYLOAD_EVENTS,
    MAX_SCAN_LENGTH,
    MAX_WINDOW_MINUTES,
    MIN_WINDOW_MINUTES,
    DetectionRule,
    TriggeredRule,
)
from app.multi_vector_detection.registry import (
    DetectionRuleRegistry,
    default_registry,
    get_registered_rules,
)
from app.multi_vector_detection.service import (
    evaluate_attack_rules,
    evaluate_ip_rules,
)

__all__ = [
    "CANONICAL_VECTORS",
    "DEFAULT_WINDOW_MINUTES",
    "MAX_PAYLOAD_EVENTS",
    "MAX_SCAN_LENGTH",
    "MAX_WINDOW_MINUTES",
    "MIN_WINDOW_MINUTES",
    "DetectionRule",
    "DetectionRuleRegistry",
    "TriggeredRule",
    "default_registry",
    "evaluate_attack_rules",
    "evaluate_ip_rules",
    "get_registered_rules",
]
