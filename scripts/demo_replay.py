#!/usr/bin/env python3
"""HoneyShield-X Controlled Security-Event Replay Runner.

Executes deterministic, multi-stage security event sequences against the HoneyShield-X
ingestion and orchestration pipeline (System 1) to drive SOC operator console
demonstrations (Presentation Tier / System 3) without requiring live honeypot sensors (System 2).

Supported Demonstration Scenarios:
1. ssh_brute_force      : Sequential failed SSH authentication attempts triggering threshold detection.
2. sqli_path_traversal  : Multi-vector web exploitation payloads triggering declarative signature rules.
3. canary_tripwire      : Synthetic honeytoken access events triggering active deception breach workflows.
4. campaign_correlation : Multi-entity coordinated telemetry triggering Disjoint Set Union campaign clustering.

Architectural Guarantees:
- Pure REST client using Python standard library (urllib.request, json). Zero new dependencies.
- Every event is explicitly labeled with synthetic/controlled demonstration markers.
- Never invokes containment actions or bypasses Governor safety approval tokens.
- Preserves all existing frozen modules and relational database contracts.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import sys
import time
from typing import Any
import urllib.error
import urllib.request

DEFAULT_API_URL: str = "http://localhost:8000"
ORCHESTRATOR_ENDPOINT: str = "/api/v1/orchestrator/ingest-and-process"
FALLBACK_ORCHESTRATOR_ENDPOINT: str = "/orchestrator/ingest-and-process"
DEFAULT_TIMEOUT_SECONDS: float = 10.0


def make_iso_timestamp(offset_seconds: int = 0) -> str:
    """Generate an ISO-8601 UTC timestamp string with optional second offset."""
    dt = datetime.now(timezone.utc)
    return dt.isoformat()


class DemoReplayRunner:
    """Orchestrates controlled security-event replay scenarios against HoneyShield-X APIs."""

    def __init__(
        self,
        base_url: str = DEFAULT_API_URL,
        delay_seconds: float = 0.05,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        dry_run: bool = False,
        verbose: bool = False,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.delay_seconds = delay_seconds
        self.timeout_seconds = timeout_seconds
        self.dry_run = dry_run
        self.verbose = verbose
        self.total_events_sent = 0
        self.total_events_succeeded = 0
        self.total_events_failed = 0

    def log(self, message: str, level: str = "INFO") -> None:
        """Structured console logging."""
        prefix = {
            "INFO": "\033[36m[*]\033[0m",
            "SUCCESS": "\033[32m[+]\033[0m",
            "WARN": "\033[33m[!]\033[0m",
            "ERROR": "\033[31m[-]\033[0m",
            "HEADER": "\033[1;35m[#]\033[0m",
        }.get(level, "[*]")
        print(f"{prefix} {message}")

    def send_event(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        """Send a single AttackEventCreate payload to the orchestrator endpoint."""
        endpoint = f"{self.base_url}{ORCHESTRATOR_ENDPOINT}"
        self.total_events_sent += 1

        if self.dry_run:
            self.log(f"[DRY-RUN] Would POST {endpoint} with payload:\n{json.dumps(payload, indent=2)}", "INFO")
            self.total_events_succeeded += 1
            return {
                "attack_id": payload.get("attack_id") or 9999,
                "pipeline_status": "dry_run_simulated",
                "execution_time_ms": 0.0,
            }

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "HoneyShield-X-ControlledReplayRunner/1.0",
                "X-Demonstration-Source": "Controlled-Security-Replay",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                status_code = resp.getcode()
                raw_body = resp.read().decode("utf-8")
                response_data = json.loads(raw_body)
                self.total_events_succeeded += 1
                if self.verbose:
                    self.log(f"HTTP {status_code} Response: {json.dumps(response_data, indent=2)}", "INFO")
                return response_data
        except urllib.error.HTTPError as e:
            if e.code == 404 and ORCHESTRATOR_ENDPOINT in endpoint:
                # Try fallback endpoint without /api/v1 prefix
                fallback_endpoint = f"{self.base_url}{FALLBACK_ORCHESTRATOR_ENDPOINT}"
                try:
                    fallback_req = urllib.request.Request(
                        fallback_endpoint,
                        data=req_data,
                        headers={
                            "Content-Type": "application/json",
                            "User-Agent": "HoneyShield-X-ControlledReplayRunner/1.0",
                            "X-Demonstration-Source": "Controlled-Security-Replay",
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(fallback_req, timeout=self.timeout_seconds) as fb_resp:
                        raw_body = fb_resp.read().decode("utf-8")
                        response_data = json.loads(raw_body)
                        self.total_events_succeeded += 1
                        return response_data
                except Exception:
                    pass
            self.total_events_failed += 1
            err_body = e.read().decode("utf-8", errors="replace")
            self.log(f"HTTP Error {e.code} posting event to {endpoint}: {err_body}", "ERROR")
            return None
        except urllib.error.URLError as e:
            self.total_events_failed += 1
            self.log(
                f"Network connection failed connecting to {endpoint}: {e.reason}.\n"
                "  Hint: Verify backend is running: "
                "'PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --port 8000'",
                "ERROR",
            )
            return None
        except Exception as e:
            self.total_events_failed += 1
            self.log(f"Unexpected error posting event: {type(e).__name__} - {str(e)}", "ERROR")
            return None

    # =========================================================================
    # Scenario 1: SSH Brute Force / Credential Stuffing
    # =========================================================================
    def run_scenario_ssh_brute_force(self) -> bool:
        """Scenario 1: SSH Brute Force & Credential Stuffing.

        Injects 8 rapid failed SSH logins from 198.51.100.42 to exceed threshold (5)
        and trigger Module 2.2 / AUTH_BRUTE_FORCE high-risk detection and alerting.
        """
        self.log("Starting Scenario 1: SSH Brute Force & Credential Stuffing", "HEADER")
        source_ip = "198.51.100.42"
        total_attempts = 8
        target_attack_id: int | None = None
        success = True

        for i in range(1, total_attempts + 1):
            payload = {
                "event_type": "ssh_login_failed",
                "source_ip": source_ip,
                "message": (
                    f"[CONTROLLED_DEMO:SSH_BRUTE_FORCE] Synthetic failed SSH login attempt {i}/{total_attempts} "
                    f"from {source_ip}:22 (user: root, auth_method: password)"
                ),
                "event_time": make_iso_timestamp(),
                "attack_id": target_attack_id,
            }

            resp = self.send_event(payload)
            if resp is None:
                success = False
                break

            if target_attack_id is None and "attack_id" in resp:
                target_attack_id = resp["attack_id"]
                self.log(f"Created/bound Attack container ID: {target_attack_id}", "INFO")

            # Check detection status on threshold reach
            ssh_det = resp.get("detection_ssh", {})
            if ssh_det.get("detected"):
                self.log(
                    f"Threshold reached on event {i}! Rule triggered: {ssh_det.get('detection_type')} "
                    f"(Severity: {ssh_det.get('severity')}, Risk: {ssh_det.get('suggested_risk_score')})",
                    "SUCCESS",
                )

            if self.delay_seconds > 0:
                time.sleep(self.delay_seconds)

        if success:
            self.log("Scenario 1 (SSH Brute Force) completed successfully.", "SUCCESS")
        else:
            self.log("Scenario 1 (SSH Brute Force) encountered errors.", "ERROR")
        return success

    # =========================================================================
    # Scenario 2: Multi-Vector Web Exploitation (SQLi + Path Traversal)
    # =========================================================================
    def run_scenario_sqli_path_traversal(self) -> bool:
        """Scenario 2: Multi-Vector Web Exploitation (SQL Injection & Path Traversal).

        Injects structured HTTP requests carrying SQL injection and directory
        traversal attack vectors from 203.0.113.88 to trigger Module 2.9
        declarative signature rules (WEB_SQL_INJECTION, WEB_PATH_TRAVERSAL).
        """
        self.log("Starting Scenario 2: Multi-Vector Web Exploitation (SQLi + Path Traversal)", "HEADER")
        source_ip = "203.0.113.88"
        target_attack_id: int | None = None
        success = True

        web_payloads = [
            (
                "web_probe",
                f"[CONTROLLED_DEMO:RECON] Reconnaissance probe GET /login.php HTTP/1.1 from {source_ip}",
            ),
            (
                "web_access",
                f"[CONTROLLED_DEMO:SQLI] GET /login.php?user=admin' UNION SELECT 1,username,password FROM users-- HTTP/1.1 from {source_ip}",
            ),
            (
                "web_access",
                f"[CONTROLLED_DEMO:PATH_TRAVERSAL] GET /download.php?file=../../../../etc/passwd HTTP/1.1 from {source_ip}",
            ),
            (
                "web_access",
                f"[CONTROLLED_DEMO:RCE] POST /cgi-bin/view.cgi HTTP/1.1; cat /etc/passwd from {source_ip}",
            ),
        ]

        for event_type, message in web_payloads:
            payload = {
                "event_type": event_type,
                "source_ip": source_ip,
                "message": message,
                "event_time": make_iso_timestamp(),
                "attack_id": target_attack_id,
            }

            resp = self.send_event(payload)
            if resp is None:
                success = False
                break

            if target_attack_id is None and "attack_id" in resp:
                target_attack_id = resp["attack_id"]
                self.log(f"Created/bound Attack container ID: {target_attack_id}", "INFO")

            mv_det = resp.get("detection_multi_vector", {})
            if mv_det.get("detected"):
                triggered = mv_det.get("rules_triggered", [])
                self.log(
                    f"Signature detected! Rules: {triggered} "
                    f"(Severity: {mv_det.get('severity')}, Risk: {mv_det.get('suggested_risk_score')})",
                    "SUCCESS",
                )

            if self.delay_seconds > 0:
                time.sleep(self.delay_seconds)

        if success:
            self.log("Scenario 2 (Web Exploitation) completed successfully.", "SUCCESS")
        else:
            self.log("Scenario 2 (Web Exploitation) encountered errors.", "ERROR")
        return success

    # =========================================================================
    # Scenario 3: Canary Honeytoken Tripwire Breach
    # =========================================================================
    def run_scenario_canary_tripwire(self) -> bool:
        """Scenario 3: Active Canary Honeytoken Tripwire Breach.

        Injects a synthetic decoy token access breach signal from unauthorized entity
        198.51.100.77 to exercise high-fidelity tripwire alerting and Incident Case escalation.
        """
        self.log("Starting Scenario 3: Active Canary Honeytoken Tripwire Breach", "HEADER")
        source_ip = "198.51.100.77"
        target_attack_id: int | None = None
        success = True

        canary_events = [
            (
                "canary_token_accessed",
                f"[CONTROLLED_DEMO:CANARY_TRIPWIRE] Decoy AWS access key AKIAIOSFODNN7EXAMPLE accessed by entity {source_ip}",
            ),
            (
                "web_probe",
                f"[CONTROLLED_DEMO:CANARY_CORRELATION] Subsequent unauthorized API scan from canary-tripped entity {source_ip}",
            ),
        ]

        for event_type, message in canary_events:
            payload = {
                "event_type": event_type,
                "source_ip": source_ip,
                "message": message,
                "event_time": make_iso_timestamp(),
                "attack_id": target_attack_id,
            }

            resp = self.send_event(payload)
            if resp is None:
                success = False
                break

            if target_attack_id is None and "attack_id" in resp:
                target_attack_id = resp["attack_id"]
                self.log(f"Created/bound Attack container ID: {target_attack_id}", "INFO")

            self.log(f"Processed tripwire event for entity {source_ip}.", "SUCCESS")

            if self.delay_seconds > 0:
                time.sleep(self.delay_seconds)

        if success:
            self.log("Scenario 3 (Canary Tripwire) completed successfully.", "SUCCESS")
        else:
            self.log("Scenario 3 (Canary Tripwire) encountered errors.", "ERROR")
        return success

    # =========================================================================
    # Scenario 4: Multi-Entity Coordinated Attack Campaign Synthesis
    # =========================================================================
    def run_scenario_campaign_correlation(self) -> bool:
        """Scenario 4: Multi-Entity Coordinated Attack Campaign Synthesis.

        Injects telemetry from multiple coordinated attacker entities in subnet 198.51.100.0/24
        sharing a common adversary User-Agent string to exercise Module 3.10 Disjoint Set Union (DSU)
        campaign clustering and topological graph synthesis.
        """
        self.log("Starting Scenario 4: Multi-Entity Attack Campaign Correlation", "HEADER")
        campaign_user_agent = "CustomAdversaryRecon/2.4 (Simulated-Campaign-Actor)"
        success = True

        campaign_entities = [
            ("198.51.100.101", "web_probe", f"[CONTROLLED_DEMO:CAMPAIGN_NODE_1] User-Agent: {campaign_user_agent} GET /api/v1/meta"),
            ("198.51.100.102", "web_probe", f"[CONTROLLED_DEMO:CAMPAIGN_NODE_2] User-Agent: {campaign_user_agent} GET /admin/dashboard"),
            ("198.51.100.103", "web_access", f"[CONTROLLED_DEMO:CAMPAIGN_NODE_3] User-Agent: {campaign_user_agent} GET /search?q=1' UNION SELECT 1,schema_name FROM information_schema.schemata--"),
            ("198.51.100.104", "auth_failed", f"[CONTROLLED_DEMO:CAMPAIGN_NODE_4] User-Agent: {campaign_user_agent} Unauthorized API token attempt"),
        ]

        for ip, event_type, message in campaign_entities:
            payload = {
                "event_type": event_type,
                "source_ip": ip,
                "message": message,
                "event_time": make_iso_timestamp(),
                "attack_id": None,  # Distinct attack containers to test multi-attack correlation
            }

            resp = self.send_event(payload)
            if resp is None:
                success = False
                break

            aid = resp.get("attack_id")
            self.log(f"Entity {ip} processed into Attack container ID {aid}.", "INFO")

            if self.delay_seconds > 0:
                time.sleep(self.delay_seconds)

        if success:
            self.log("Scenario 4 (Campaign Correlation) completed successfully.", "SUCCESS")
        else:
            self.log("Scenario 4 (Campaign Correlation) encountered errors.", "ERROR")
        return success

    # =========================================================================
    # Master Runner
    # =========================================================================
    def run(self, scenario: str = "all") -> bool:
        """Run requested demonstration scenario(s)."""
        self.log(
            "====================================================================\n"
            "       HONEYSHIELD-X CONTROLLED SECURITY EVENT REPLAY RUNNER        \n"
            "====================================================================\n"
            "  Target Backend  : " + self.base_url + "\n"
            "  Execution Mode  : " + ("DRY-RUN (Simulated)" if self.dry_run else "LIVE INGESTION REPLAY") + "\n"
            "  Selected Scope  : " + scenario.upper() + "\n"
            "  Event Labelling : Controlled Synthetic Security Telemetry\n"
            "====================================================================",
            "INFO",
        )

        scenario_map = {
            "ssh_brute_force": self.run_scenario_ssh_brute_force,
            "sqli_path_traversal": self.run_scenario_sqli_path_traversal,
            "canary_tripwire": self.run_scenario_canary_tripwire,
            "campaign_correlation": self.run_scenario_campaign_correlation,
        }

        overall_success = True

        if scenario == "all":
            for name, fn in scenario_map.items():
                print()
                sc_ok = fn()
                if not sc_ok:
                    overall_success = False
        elif scenario in scenario_map:
            overall_success = scenario_map[scenario]()
        else:
            self.log(f"Unknown scenario '{scenario}'. Available: {', '.join(scenario_map.keys())}, all", "ERROR")
            return False

        print()
        self.log(
            f"Execution Summary: Total Sent={self.total_events_sent}, "
            f"Succeeded={self.total_events_succeeded}, Failed={self.total_events_failed}",
            "SUCCESS" if overall_success else "ERROR",
        )
        return overall_success


def main() -> None:
    """CLI Entrypoint."""
    parser = argparse.ArgumentParser(
        description="HoneyShield-X Controlled Security-Event Replay Demonstration Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry-run validation of all demonstration scenarios
  python scripts/demo_replay.py --scenario all --dry-run

  # Execute SSH brute-force replay against local server
  python scripts/demo_replay.py --scenario ssh_brute_force

  # Execute all scenarios with 0.1s visual pacing
  python scripts/demo_replay.py --scenario all --delay 0.1 --api-url http://localhost:8000
        """,
    )

    parser.add_argument(
        "--scenario",
        "-s",
        choices=["ssh_brute_force", "sqli_path_traversal", "canary_tripwire", "campaign_correlation", "all"],
        default="all",
        help="Demonstration scenario to execute (default: all)",
    )
    parser.add_argument(
        "--api-url",
        "-u",
        default=DEFAULT_API_URL,
        help=f"Base URL of HoneyShield-X backend API (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--delay",
        "-d",
        type=float,
        default=0.05,
        help="Delay in seconds between replayed events for visual pacing (default: 0.05)",
    )
    parser.add_argument(
        "--timeout",
        "-t",
        type=float,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"HTTP request timeout in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and log event payloads without sending network requests",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Print verbose response payloads from pipeline stages",
    )

    args = parser.parse_args()

    runner = DemoReplayRunner(
        base_url=args.api_url,
        delay_seconds=args.delay,
        timeout_seconds=args.timeout,
        dry_run=args.dry_run,
        verbose=args.verbose,
    )

    ok = runner.run(scenario=args.scenario)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

