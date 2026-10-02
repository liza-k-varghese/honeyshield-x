"""HoneyShield X Detection Engine (Module 2.2)."""

from app.detection.rules import (
    DEFAULT_SSH_DETECTION_TYPE,
    DEFAULT_SSH_EVENT_TYPE,
    DEFAULT_SSH_RISK_SCORE,
    DEFAULT_SSH_RULE,
    DEFAULT_SSH_SEVERITY,
    DEFAULT_SSH_THRESHOLD,
    DEFAULT_SSH_WINDOW_MINUTES,
    SSHBruteForceConfig,
)
from app.detection.service import detect_ssh_brute_force

__all__ = [
    "detect_ssh_brute_force",
    "SSHBruteForceConfig",
    "DEFAULT_SSH_RULE",
    "DEFAULT_SSH_EVENT_TYPE",
    "DEFAULT_SSH_THRESHOLD",
    "DEFAULT_SSH_WINDOW_MINUTES",
    "DEFAULT_SSH_SEVERITY",
    "DEFAULT_SSH_RISK_SCORE",
    "DEFAULT_SSH_DETECTION_TYPE",
]
