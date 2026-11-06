"""Production Observability Metrics Collector for HoneyShield X (Milestone 8).

Thread-safe, lightweight metrics registry supporting JSON and Prometheus-style exposition.
Zero external dependencies beyond standard Python library.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
import threading
import time
from typing import Any


@dataclass
class LatencyTracker:
    samples: list[float] = field(default_factory=list)
    max_samples: int = 1000

    def add(self, latency_ms: float) -> None:
        if len(self.samples) >= self.max_samples:
            # Drop older half to maintain bounded memory
            self.samples = self.samples[len(self.samples) // 2 :]
        self.samples.append(latency_ms)

    def percentiles(self) -> dict[str, float]:
        if not self.samples:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "avg": 0.0}
        sorted_s = sorted(self.samples)
        n = len(sorted_s)
        p50 = sorted_s[int(n * 0.50)]
        p95 = sorted_s[min(int(n * 0.95), n - 1)]
        p99 = sorted_s[min(int(n * 0.99), n - 1)]
        avg = sum(sorted_s) / n
        return {
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "avg": round(avg, 2),
        }


class MetricsCollector:
    """Thread-safe operational telemetry collector for HoneyShield X."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.start_time = time.time()

        # Request Counters: (method, endpoint, status_code) -> count
        self._request_counts: dict[str, int] = defaultdict(int)
        self._endpoint_latencies: dict[str, LatencyTracker] = defaultdict(LatencyTracker)

        # Real-time WebSocket & SSE
        self.active_websockets: int = 0
        self.total_websocket_connects: int = 0
        self.total_websocket_disconnects: int = 0
        self.websocket_auth_failures: int = 0
        self.stream_revocations_total: int = 0
        self.reconnection_attempts_total: int = 0

        # Distributed Auth & Ticket Security
        self.session_validation_failures: int = 0
        self.ticket_replay_attempts: int = 0
        self.ticket_expirations_total: int = 0
        self.auth_coordination_failures: int = 0
        self.authorization_failures_total: int = 0

        # Event Pipeline & Outbox
        self.ingested_events_total: int = 0
        self.ingestion_errors_total: int = 0
        self.outbox_committed_total: int = 0
        self.outbox_published_total: int = 0
        self.last_outbox_cursor: int = 0
        self.outbox_backlog_count: int = 0

        # SOC Analytics & Detection
        self.detection_runs_total: int = 0
        self.threat_intel_lookups_total: int = 0
        self.threat_intel_hits_total: int = 0
        self.alerts_evaluated_total: int = 0
        self.alerts_created_total: int = 0
        self.containment_actions_attempted: int = 0
        self.containment_actions_executed: int = 0

        # Push Notifications
        self.push_dispatched_total: int = 0
        self.push_failed_total: int = 0

        # Error Classification Counters
        self._error_counts: dict[str, int] = defaultdict(int)

    def record_request(self, method: str, path: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            key = f"{method} {path} {status_code}"
            self._request_counts[key] += 1
            endpoint_key = f"{method} {path}"
            self._endpoint_latencies[endpoint_key].add(duration_ms)

    def record_error(self, category: str) -> None:
        with self._lock:
            self._error_counts[category] += 1

    def set_websocket_connections(self, active: int) -> None:
        with self._lock:
            self.active_websockets = active

    def increment_ws_connect(self) -> None:
        with self._lock:
            self.total_websocket_connects += 1
            self.active_websockets += 1

    def increment_ws_disconnect(self) -> None:
        with self._lock:
            self.total_websocket_disconnects += 1
            if self.active_websockets > 0:
                self.active_websockets -= 1

    def increment_ws_auth_failure(self) -> None:
        with self._lock:
            self.websocket_auth_failures += 1
            self._error_counts["WEBSOCKET_AUTH_FAILED"] += 1

    def increment_session_validation_failure(self) -> None:
        with self._lock:
            self.session_validation_failures += 1
            self._error_counts["SESSION_VALIDATION_FAILED"] += 1

    def increment_ticket_replay(self) -> None:
        with self._lock:
            self.ticket_replay_attempts += 1
            self._error_counts["TICKET_REPLAY_ATTEMPT"] += 1

    def increment_ticket_expiration(self) -> None:
        with self._lock:
            self.ticket_expirations_total += 1
            self._error_counts["TICKET_EXPIRED"] += 1

    def increment_stream_revocation(self) -> None:
        with self._lock:
            self.stream_revocations_total += 1
            self._error_counts["STREAM_REVOCATION"] += 1

    def increment_auth_coordination_failure(self) -> None:
        with self._lock:
            self.auth_coordination_failures += 1
            self._error_counts["AUTH_COORDINATION_FAILED"] += 1

    def increment_reconnection_attempt(self) -> None:
        with self._lock:
            self.reconnection_attempts_total += 1

    def increment_authorization_failure(self) -> None:
        with self._lock:
            self.authorization_failures_total += 1
            self._error_counts["AUTHORIZATION_FAILED"] += 1

    def record_ingest(self, count: int = 1, is_error: bool = False) -> None:
        with self._lock:
            if is_error:
                self.ingestion_errors_total += count
                self._error_counts["INGESTION_ERROR"] += count
            else:
                self.ingested_events_total += count

    def record_outbox(self, cursor: int, backlog: int = 0) -> None:
        with self._lock:
            self.outbox_committed_total += 1
            self.outbox_published_total += 1
            if cursor > self.last_outbox_cursor:
                self.last_outbox_cursor = cursor
            self.outbox_backlog_count = backlog

    def snapshot(self) -> dict[str, Any]:
        """Return comprehensive telemetry snapshot."""
        with self._lock:
            uptime = time.time() - self.start_time
            latencies = {
                k: v.percentiles() for k, v in self._endpoint_latencies.items()
            }
            # Global latency percentiles across all endpoints
            all_samples: list[float] = []
            for tracker in self._endpoint_latencies.values():
                all_samples.extend(tracker.samples)
            global_lat = LatencyTracker(samples=all_samples).percentiles()

            return {
                "uptime_seconds": round(uptime, 1),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "requests": {
                    "total_counts": dict(self._request_counts),
                    "global_latency_ms": global_lat,
                    "endpoint_latency_ms": latencies,
                },
                "realtime": {
                    "active_websockets": self.active_websockets,
                    "total_connects": self.total_websocket_connects,
                    "total_disconnects": self.total_websocket_disconnects,
                    "auth_failures": self.websocket_auth_failures,
                    "stream_revocations": self.stream_revocations_total,
                    "reconnections_total": self.reconnection_attempts_total,
                },
                "auth_security": {
                    "session_validation_failures": self.session_validation_failures,
                    "ticket_replay_attempts": self.ticket_replay_attempts,
                    "ticket_expirations_total": self.ticket_expirations_total,
                    "auth_coordination_failures": self.auth_coordination_failures,
                    "authorization_failures_total": self.authorization_failures_total,
                },
                "event_pipeline": {
                    "ingested_events_total": self.ingested_events_total,
                    "ingestion_errors_total": self.ingestion_errors_total,
                    "outbox_committed_total": self.outbox_committed_total,
                    "outbox_published_total": self.outbox_published_total,
                    "last_cursor": self.last_outbox_cursor,
                    "outbox_backlog_count": self.outbox_backlog_count,
                },
                "soc_operations": {
                    "detection_runs_total": self.detection_runs_total,
                    "threat_intel_lookups_total": self.threat_intel_lookups_total,
                    "threat_intel_hits_total": self.threat_intel_hits_total,
                    "alerts_evaluated_total": self.alerts_evaluated_total,
                    "alerts_created_total": self.alerts_created_total,
                    "containment_attempted": self.containment_actions_attempted,
                    "containment_executed": self.containment_actions_executed,
                },
                "notifications": {
                    "push_dispatched_total": self.push_dispatched_total,
                    "push_failed_total": self.push_failed_total,
                },
                "error_classification": dict(self._error_counts),
            }

    def to_prometheus(self) -> str:
        """Format metrics in Prometheus text-based exposition standard."""
        snap = self.snapshot()
        lines = [
            "# HELP honeyshield_uptime_seconds Platform uptime in seconds",
            "# TYPE honeyshield_uptime_seconds gauge",
            f"honeyshield_uptime_seconds {snap['uptime_seconds']}",
            "",
            "# HELP honeyshield_active_websockets Current active authenticated WebSockets",
            "# TYPE honeyshield_active_websockets gauge",
            f"honeyshield_active_websockets {snap['realtime']['active_websockets']}",
            "",
            "# HELP honeyshield_outbox_cursor Authoritative monotonic cursor sequence",
            "# TYPE honeyshield_outbox_cursor gauge",
            f"honeyshield_outbox_cursor {snap['event_pipeline']['last_cursor']}",
            "",
            "# HELP honeyshield_outbox_backlog Current unconfirmed outbox backlog count",
            "# TYPE honeyshield_outbox_backlog gauge",
            f"honeyshield_outbox_backlog {snap['event_pipeline']['outbox_backlog_count']}",
            "",
            "# HELP honeyshield_ingested_events_total Total sensor events ingested",
            "# TYPE honeyshield_ingested_events_total counter",
            f"honeyshield_ingested_events_total {snap['event_pipeline']['ingested_events_total']}",
            "",
            "# HELP honeyshield_ingestion_errors_total Total ingestion rejections/errors",
            "# TYPE honeyshield_ingestion_errors_total counter",
            f"honeyshield_ingestion_errors_total {snap['event_pipeline']['ingestion_errors_total']}",
            "",
            "# HELP honeyshield_alerts_created_total Total security alerts generated",
            "# TYPE honeyshield_alerts_created_total counter",
            f"honeyshield_alerts_created_total {snap['soc_operations']['alerts_created_total']}",
            "",
        ]
        # Append error classification counters
        for err_type, count in snap["error_classification"].items():
            lines.append(f'honeyshield_errors_total{{category="{err_type}"}} {count}')
        return "\n".join(lines) + "\n"


default_metrics_collector = MetricsCollector()

