"""Detection rules configuration for HoneyShield X (Module 2.2)."""

from dataclasses import dataclass


# Configurable defaults for SSH brute-force detection rule
DEFAULT_SSH_EVENT_TYPE: str = "ssh_login_failed"
DEFAULT_SSH_THRESHOLD: int = 5
DEFAULT_SSH_WINDOW_MINUTES: int = 5
DEFAULT_SSH_SEVERITY: str = "high"
DEFAULT_SSH_RISK_SCORE: float = 8.0
DEFAULT_SSH_DETECTION_TYPE: str = "ssh_brute_force"


@dataclass(frozen=True)
class SSHBruteForceConfig:
    """Configuration container for SSH brute-force detection rule."""

    event_type: str = DEFAULT_SSH_EVENT_TYPE
    threshold: int = DEFAULT_SSH_THRESHOLD
    window_minutes: int = DEFAULT_SSH_WINDOW_MINUTES
    severity: str = DEFAULT_SSH_SEVERITY
    risk_score: float = DEFAULT_SSH_RISK_SCORE
    detection_type: str = DEFAULT_SSH_DETECTION_TYPE
    detected_message: str = "Multiple failed SSH login attempts detected from the same source."
    not_detected_message: str = "No SSH brute-force pattern detected."


# Default rule instance
DEFAULT_SSH_RULE = SSHBruteForceConfig()
