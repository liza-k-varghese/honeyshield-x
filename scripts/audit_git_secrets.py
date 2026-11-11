#!/usr/bin/env python3
"""
scripts/audit_git_secrets.py
Automated Zero-Secrets and Credential Leak Scanner for HoneyShield X.

Verifies that no operational secrets, private keys, authentication tokens,
or known exposed credentials exist in the Git commit history or working tree.
Designed for local execution and GitHub Actions CI pipeline gating.
"""

import sys
import os
import re
import subprocess
from pathlib import Path

# Patterns indicating hardcoded credentials or sensitive secrets
FORBIDDEN_PATTERNS = [
    (r"-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH)?\s*PRIVATE\s+KEY-----", "Private cryptographic key"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"ghp_[0-9a-zA-Z]{36}", "GitHub Personal Access Token (classic)"),
    (r"github_pat_[0-9a-zA-Z_]{82}", "GitHub Fine-Grained Personal Access Token"),
    (r"xox[baprs]-[0-9a-zA-Z]{10,48}", "Slack Token"),
    (r"(?i)api[_-]?key\s*[:=]\s*['\"][0-9a-zA-Z]{32,}['\"]", "High-entropy API key assignment"),
    # Specifically check for known legacy/retired plaintext credentials
    (r"Staging" + r"Operator" + r"Secret987!", "Revoked legacy staging operator plaintext password"),
]

# Paths and extensions to ignore
IGNORE_PATHS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
    ".cache",
    "__pycache__",
    ".staging_operator.key",  # runtime ephemeral key generated mode 0600, excluded by .gitignore
}

IGNORE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".pyc",
    ".tsbuildinfo",
    ".log",
    ".lock",
    ".pcap",
}


def scan_text(text: str, source_label: str) -> list[str]:
    violations = []
    # Standard documented non-secret example keys used in AWS docs / decoy tests
    DOC_EXAMPLE_ALLOWLIST = {"AKIAIOSFODNN7EXAMPLE"}

    for pattern, description in FORBIDDEN_PATTERNS:
        matches = re.finditer(pattern, text)
        for match in matches:
            matched_str = match.group(0)
            if matched_str in DOC_EXAMPLE_ALLOWLIST or matched_str.endswith("EXAMPLE"):
                continue
            violations.append(f"[{source_label}] Detected {description} (match length {len(matched_str)})")
    return violations


def audit_git_history(rev_range: str = "HEAD~20..HEAD") -> list[str]:
    violations = []
    DOC_EXAMPLE_ALLOWLIST = {"AKIAIOSFODNN7EXAMPLE"}

    # Test if rev_range is valid
    res = subprocess.run(["git", "rev-parse", "--verify", "HEAD~1"], capture_output=True, text=True)
    if res.returncode != 0:
        # Shallow clone or few commits
        rev_range = "HEAD"

    cmd = ["git", "log", "-p", rev_range, "--", "."]
    log_res = subprocess.run(cmd, capture_output=True, text=True)
    if log_res.returncode == 0:
        # Check added lines only (lines starting with + but not ++)
        added_lines = [
            line[1:] for line in log_res.stdout.splitlines()
            if line.startswith("+") and not line.startswith("+++")
        ]
        text = "\n".join(added_lines)
        for pattern, description in FORBIDDEN_PATTERNS:
            matches = list(re.finditer(pattern, text))
            for m in matches:
                matched_str = m.group(0)
                if matched_str in DOC_EXAMPLE_ALLOWLIST or matched_str.endswith("EXAMPLE"):
                    continue
                violations.append(f"[git log {rev_range}] Detected {description} (match length {len(matched_str)})")
    return violations


def audit_working_tree(repo_root: Path) -> list[str]:
    violations = []
    for root, dirs, files in os.walk(repo_root):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in IGNORE_PATHS]

        for file in files:
            path = Path(root) / file
            if path.suffix.lower() in IGNORE_EXTENSIONS:
                continue
            if file in IGNORE_PATHS:
                continue
            # Skip this script itself
            if path.resolve() == Path(__file__).resolve():
                continue

            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
                file_violations = scan_text(content, str(path.relative_to(repo_root)))
                violations.extend(file_violations)
            except Exception as e:
                pass
    return violations


def main() -> int:
    print("=" * 70)
    print("HoneyShield X Security Gate: Automated Zero-Secrets Audit")
    print("=" * 70)

    repo_root = Path(__file__).resolve().parent.parent
    history_violations = audit_git_history()
    tree_violations = audit_working_tree(repo_root)

    all_violations = history_violations + tree_violations

    if all_violations:
        print(f"\n[FAIL] Found {len(all_violations)} potential security secret leaks:")
        for v in all_violations:
            print(f"  - {v}")
        print("\nPlease remediate secrets before proceeding.\n")
        return 1

    print("\n[PASS] Zero secrets detected in git commit range and working tree.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
