"""Deterministic MITRE ATT&CK mapping catalog for HoneyShield X (Module 3.2).

Provides static, declarative translation of HoneyShield detection rules and
raw event types into standardized MITRE ATT&CK tactics and techniques.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MitreMapping:
    tactic_id: str
    tactic_name: str
    technique_id: str
    technique_name: str
    confidence: float
    description: str


# Canonical MITRE ATT&CK Tactic dictionary
TACTICS: dict[str, str] = {
    "TA0043": "Reconnaissance",
    "TA0001": "Initial Access",
    "TA0002": "Execution",
    "TA0006": "Credential Access",
    "TA0007": "Discovery",
    "TA0008": "Lateral Movement",
    "TA0010": "Exfiltration",
    "TA0000": "Uncategorized",
}

# Static declarative rule-level mappings (Module 2.9 detection rules)
RULE_MAPPINGS: dict[str, MitreMapping] = {
    "PORT_SCAN_SWEEP": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1046",
        technique_name="Network Service Discovery",
        confidence=1.0,
        description="Network port scan or reconnaissance sweep across multiple ports",
    ),
    "WEB_PATH_TRAVERSAL": MitreMapping(
        tactic_id="TA0001",
        tactic_name="Initial Access",
        technique_id="T1190",
        technique_name="Exploit Public-Facing Application",
        confidence=1.0,
        description="Directory traversal and local file inclusion patterns in web requests",
    ),
    "WEB_SQL_INJECTION": MitreMapping(
        tactic_id="TA0001",
        tactic_name="Initial Access",
        technique_id="T1190",
        technique_name="Exploit Public-Facing Application",
        confidence=1.0,
        description="SQL injection syntax and query manipulation payloads in web requests",
    ),
    "AUTH_BRUTE_FORCE": MitreMapping(
        tactic_id="TA0006",
        tactic_name="Credential Access",
        technique_id="T1110",
        technique_name="Brute Force",
        confidence=1.0,
        description="Repeated authentication failures across generic and non-SSH services",
    ),
    "WEB_COMMAND_INJECTION": MitreMapping(
        tactic_id="TA0002",
        tactic_name="Execution",
        technique_id="T1059",
        technique_name="Command and Scripting Interpreter",
        confidence=1.0,
        description="Shell metacharacters and system binary execution in web requests",
    ),
}

# Static declarative event-type fallback mappings
EVENT_FALLBACK_MAPPINGS: dict[str, MitreMapping] = {
    "ssh_login_failed": MitreMapping(
        tactic_id="TA0006",
        tactic_name="Credential Access",
        technique_id="T1110",
        technique_name="Brute Force",
        confidence=0.9,
        description="SSH authentication failure / password guessing",
    ),
    "telnet_login_failed": MitreMapping(
        tactic_id="TA0006",
        tactic_name="Credential Access",
        technique_id="T1110",
        technique_name="Brute Force",
        confidence=0.9,
        description="Telnet authentication failure / brute force",
    ),
    "ftp_login_failed": MitreMapping(
        tactic_id="TA0006",
        tactic_name="Credential Access",
        technique_id="T1110",
        technique_name="Brute Force",
        confidence=0.9,
        description="FTP authentication failure / brute force",
    ),
    "ssh_command_exec": MitreMapping(
        tactic_id="TA0002",
        tactic_name="Execution",
        technique_id="T1059.004",
        technique_name="Unix Shell",
        confidence=0.95,
        description="Direct interactive command execution inside honeypot shell",
    ),
    "port_probe": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1046",
        technique_name="Network Service Discovery",
        confidence=0.85,
        description="Single or multi-port connection probe",
    ),
    "tcp_probe": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1046",
        technique_name="Network Service Discovery",
        confidence=0.85,
        description="TCP handshake or banner probe",
    ),
    "network_scan": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1046",
        technique_name="Network Service Discovery",
        confidence=0.85,
        description="Network-level port or service sweep",
    ),
    "web_probe": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1595",
        technique_name="Active Scanning",
        confidence=0.8,
        description="Inbound HTTP probe or directory scan",
    ),
    "web_access": MitreMapping(
        tactic_id="TA0043",
        tactic_name="Reconnaissance",
        technique_id="T1595",
        technique_name="Active Scanning",
        confidence=0.8,
        description="Inbound HTTP access request to emulated honeypot web server",
    ),
}

# Default unmapped fallback
UNKNOWN_MAPPING = MitreMapping(
    tactic_id="TA0000",
    tactic_name="Uncategorized",
    technique_id="T0000",
    technique_name="Generic Security Event",
    confidence=0.5,
    description="Security event without specific ATT&CK taxonomy rule",
)

# Standard kill-chain progression order for sorting stages
TACTIC_KILLCHAIN_ORDER: dict[str, int] = {
    "TA0043": 1,  # Reconnaissance
    "TA0001": 2,  # Initial Access
    "TA0006": 3,  # Credential Access
    "TA0002": 4,  # Execution
    "TA0007": 5,  # Discovery
    "TA0008": 6,  # Lateral Movement
    "TA0010": 7,  # Exfiltration
    "TA0000": 8,  # Uncategorized
}


def map_rule_to_mitre(rule_id: str) -> MitreMapping | None:
    """Map a detection rule identifier to its static MITRE ATT&CK mapping."""
    return RULE_MAPPINGS.get(rule_id)


def map_event_to_mitre(event_type: str) -> MitreMapping:
    """Map an event type to its static MITRE ATT&CK mapping.

    Falls back to UNKNOWN_MAPPING if the event type is not recognized.
    """
    normalized_type = event_type.strip().lower()
    return EVENT_FALLBACK_MAPPINGS.get(normalized_type, UNKNOWN_MAPPING)


def get_mitre_catalog() -> list[dict[str, Any]]:
    """Return all catalog entries formatted for API responses."""
    entries: list[dict[str, Any]] = []

    for rule_id, mapping in RULE_MAPPINGS.items():
        entries.append(
            {
                "rule_or_event_id": rule_id,
                "mapping_type": "rule",
                "tactic_id": mapping.tactic_id,
                "tactic_name": mapping.tactic_name,
                "technique_id": mapping.technique_id,
                "technique_name": mapping.technique_name,
                "confidence": mapping.confidence,
                "description": mapping.description,
            }
        )

    for event_type, mapping in EVENT_FALLBACK_MAPPINGS.items():
        entries.append(
            {
                "rule_or_event_id": event_type,
                "mapping_type": "event_fallback",
                "tactic_id": mapping.tactic_id,
                "tactic_name": mapping.tactic_name,
                "technique_id": mapping.technique_id,
                "technique_name": mapping.technique_name,
                "confidence": mapping.confidence,
                "description": mapping.description,
            }
        )

    entries.append(
        {
            "rule_or_event_id": "* (unknown)",
            "mapping_type": "unknown",
            "tactic_id": UNKNOWN_MAPPING.tactic_id,
            "tactic_name": UNKNOWN_MAPPING.tactic_name,
            "technique_id": UNKNOWN_MAPPING.technique_id,
            "technique_name": UNKNOWN_MAPPING.technique_name,
            "confidence": UNKNOWN_MAPPING.confidence,
            "description": UNKNOWN_MAPPING.description,
        }
    )

    return entries
