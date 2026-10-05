"""Declarative detection rule registry for HoneyShield X (Module 2.9).

Contains immutable definitions for seeded detection rules across canonical vectors:
- auth
- web
- network
"""

import re
from app.multi_vector_detection.models import DetectionRule

# Pre-compiled linear, non-backtracking regular expressions for signature rules
_RE_PATH_TRAVERSAL = (
    re.compile(r"(?i)(?:\.\.[/\\]|[/\\]etc[/\\](?:passwd|shadow)|(?:boot|win)\.ini)"),
)

_RE_SQL_INJECTION = (
    re.compile(r"(?i)\bunion\s+(?:all\s+)?select\b"),
    re.compile(r"(?i)(?:'|\")\s*(?:or|and)\s+['\d\w]+\s*=\s*['\d\w]+"),
    re.compile(r"(?i)\bwaitfor\s+delay\b"),
    re.compile(r"(?i);\s*(?:drop|truncate|delete)\s+(?:table|from)?\b"),
    re.compile(r"(?i)'\s*(?:or|and)\s+1\s*=\s*1\b"),
)

_RE_COMMAND_INJECTION = (
    re.compile(
        r"(?i)(?:;|\||&&|\$\(|\`)\s*(?:id|whoami|uname|hostname|curl|wget|nc|cat\s+/etc/passwd|ifconfig|ip\s+a)\b"
    ),
    re.compile(r"(?i)/(?:bin|usr/bin)/(?:sh|bash|zsh|dash)\b"),
)

# Seeded rules catalog
SEEDED_RULES: tuple[DetectionRule, ...] = (
    DetectionRule(
        rule_id="AUTH_BRUTE_FORCE",
        name="Authentication Brute Force",
        vector="auth",
        description="Repeated authentication failures across generic and non-SSH services",
        severity="high",
        base_risk_score=8.0,
        rule_type="threshold",
        target_event_types=("telnet_login_failed", "ftp_login_failed", "auth_failed"),
        window_minutes=10,
        threshold_count=5,
    ),
    DetectionRule(
        rule_id="WEB_PATH_TRAVERSAL",
        name="Web Directory Traversal & LFI",
        vector="web",
        description="Directory traversal and local file inclusion patterns in web requests",
        severity="high",
        base_risk_score=8.5,
        rule_type="signature",
        target_event_types=("web_access", "web_probe", "http_request"),
        window_minutes=15,
        threshold_count=1,
        match_tokens=(
            "../",
            "..\\",
            "/etc/passwd",
            "/etc/shadow",
            "boot.ini",
            "win.ini",
            "..%2f",
            "..%5c",
            "%2e%2e%2f",
            "%2e%2e/",
        ),
        regex_patterns=_RE_PATH_TRAVERSAL,
    ),
    DetectionRule(
        rule_id="WEB_SQL_INJECTION",
        name="Web SQL Injection",
        vector="web",
        description="SQL injection syntax and query manipulation payloads in web requests",
        severity="critical",
        base_risk_score=9.5,
        rule_type="signature",
        target_event_types=("web_access", "web_probe", "http_request"),
        window_minutes=15,
        threshold_count=1,
        match_tokens=(
            "union select",
            "union all select",
            "' or '1'='1",
            "' or 1=1",
            "admin' union",
            "waitfor delay",
            "; drop table",
            "sleep(",
            "benchmark(",
        ),
        regex_patterns=_RE_SQL_INJECTION,
    ),
    DetectionRule(
        rule_id="WEB_COMMAND_INJECTION",
        name="Web Remote Command Execution",
        vector="web",
        description="Shell metacharacters and system binary execution in web requests",
        severity="critical",
        base_risk_score=9.5,
        rule_type="signature",
        target_event_types=("web_access", "web_probe", "http_request"),
        window_minutes=15,
        threshold_count=1,
        match_tokens=(
            "; id",
            "; whoami",
            "| whoami",
            "| id",
            "$(id)",
            "$(whoami)",
            "/bin/sh",
            "/bin/bash",
            "/bin/cat",
            "; cat /etc/passwd",
        ),
        regex_patterns=_RE_COMMAND_INJECTION,
    ),
    DetectionRule(
        rule_id="PORT_SCAN_SWEEP",
        name="Network Port Scan Sweep",
        vector="network",
        description="Network port scanning or reconnaissance sweep across multiple ports",
        severity="medium",
        base_risk_score=7.0,
        rule_type="threshold",
        target_event_types=("port_probe", "network_scan", "tcp_probe"),
        window_minutes=10,
        threshold_count=5,
    ),
)


class DetectionRuleRegistry:
    """Registry maintaining registered detection rules."""

    def __init__(self, rules: tuple[DetectionRule, ...] = SEEDED_RULES) -> None:
        self._rules: dict[str, DetectionRule] = {r.rule_id: r for r in rules}

    def get_rule(self, rule_id: str) -> DetectionRule | None:
        """Retrieve a rule by its unique ID."""
        return self._rules.get(rule_id)

    def get_all_rules(self) -> list[DetectionRule]:
        """Return all registered detection rules."""
        return list(self._rules.values())

    def get_rules_by_vector(self, vector: str) -> list[DetectionRule]:
        """Filter registered rules by canonical vector."""
        return [r for r in self._rules.values() if r.vector == vector]

    def get_rules_by_type(self, rule_type: str) -> list[DetectionRule]:
        """Filter registered rules by rule type ('threshold' or 'signature')."""
        return [r for r in self._rules.values() if r.rule_type == rule_type]


# Default global registry singleton
default_registry = DetectionRuleRegistry()


def get_registered_rules() -> list[DetectionRule]:
    """Retrieve all registered detection rules from default registry."""
    return default_registry.get_all_rules()
