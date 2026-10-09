"""Advisory Threat Contextualizer for Module 3.7.

Principles:
- Determinism for Detection; AI for Contextualization.
- Read-only advisory analysis with ZERO autonomous authority.
- Synthesizes explainable forensic insights, adversary intent indicators, and MITRE ATT&CK mappings.
- Zero external LLM dependencies; 100% deterministic template logic.
"""

from typing import Any

from app.schemas import CanaryHitEvent, CanaryToken


def contextualize_canary_hit(canary: CanaryToken, hit: CanaryHitEvent) -> dict[str, Any]:
    """Generate advisory threat intelligence context for a canary tripwire event."""
    c_type = canary.canary_type

    if c_type == "AWS_API_KEY":
        intent = "Cloud Credential Theft & Unauthorized Infrastructure Access Attempt"
        tactics = ["TA0001: Initial Access", "TA0006: Credential Access"]
        techniques = ["T1552.001: Credentials In Files", "T1078.004: Cloud Accounts"]
        remediation_recommendations = [
            f"Audit source repository or deployment host ({canary.placement_hint or 'designated placement'}) for unauthorized read access.",
            "Verify IAM CloudTrail logs for concurrent enumeration queries.",
            f"Stage ingress containment against adversary IP {hit.source_ip} via Module 3.4 Governor with operator Level-3 approval.",
        ]

    elif c_type == "DATABASE_CREDENTIAL":
        intent = "Adversary Lateral Movement & Data Exfiltration Reconnaissance"
        tactics = ["TA0008: Lateral Movement", "TA0009: Collection"]
        techniques = ["T1552: Unsecured Credentials", "T1021.002: SMB/Windows Admin Shares / Database Service Ports"]
        remediation_recommendations = [
            f"Isolate configuration files on host {canary.placement_hint or 'local deployment'}.",
            "Inspect database proxy logs for unauthorized connection attempts.",
            f"Stage firewall block against IP {hit.source_ip} via Module 3.4 Governor with Level-3 HITL approval.",
        ]

    elif c_type == "SERVICE_API_TOKEN":
        intent = "Internal Service Forgery & Privileged API Impersonation"
        tactics = ["TA0004: Privilege Escalation", "TA0005: Defense Evasion"]
        techniques = ["T1078: Valid Accounts", "T1550.001: Application Access Token"]
        remediation_recommendations = [
            "Revoke compromised service token placeholder across all CI/CD pipelines.",
            "Analyze ingress API gateway logs for matching token signatures.",
            f"Review network telemetry for adversary IP {hit.source_ip}.",
        ]

    elif c_type == "WEB_TRIPWIRE_ENDPOINT":
        intent = "Automated Web Reconnaissance, Directory Traversal, or Crawler Probing"
        tactics = ["TA0043: Reconnaissance", "TA0001: Initial Access"]
        techniques = ["T1595: Active Scanning", "T1190: Exploit Public-Facing Application"]
        remediation_recommendations = [
            f"Correlate web server access logs for crawler footprints originating from {hit.source_ip}.",
            "Verify perimeter WAF rate-limiting policies.",
            "Evaluate adversary source IP in Module 3.2 Threat Intelligence Explorer.",
        ]

    elif c_type == "CANARY_FILE_BEACON":
        intent = "Unauthorized File Exfiltration, Document Harvesting, or Insider Misuse"
        tactics = ["TA0009: Collection", "TA0010: Exfiltration"]
        techniques = ["T1005: Data from Local System", "T1083: File and Directory Discovery"]
        remediation_recommendations = [
            f"Perform forensic audit on filesystem holding {canary.placement_hint or 'canary artifact'}.",
            "Identify user accounts with read access to the canary decoy document.",
            "Review endpoint EDR telemetry for file access events around the tripwire timestamp.",
        ]

    else:
        intent = "Presumptive Adversary Breach Signal"
        tactics = ["TA0001: Initial Access"]
        techniques = ["T1552: Unsecured Credentials"]
        remediation_recommendations = [
            f"Investigate adversary source IP {hit.source_ip}.",
            "Stage containment through Module 3.4 Governor.",
        ]

    return {
        "canary_id": canary.canary_id,
        "canary_type": canary.canary_type,
        "adversary_intent": intent,
        "presumptive_threat_level": "CRITICAL",
        "mitre_tactics": tactics,
        "mitre_techniques": techniques,
        "recommended_remediations": remediation_recommendations,
        "confidence": "HIGH_CONFIDENCE",
        "advisory_disclaimer": "Advisory context generated deterministically. Operator judgment and HITL authorization required for all actions.",
    }
