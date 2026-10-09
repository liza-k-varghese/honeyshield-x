"""Asynchronous Webhook Dispatcher & Retry Engine (Module 3.9).

Enforces:
- Bounded thread pool execution (5 worker threads).
- Strict non-blocking dispatch: detection pipelines and request threads are never blocked.
- HMAC-SHA256 signature calculation with timestamp binding (±300s window).
- Deterministic retry backoff with bounded jitter (Max 3 retries / 4 total attempts).
- Per-endpoint circuit breaker integration.
- Bounded Dead-Letter Queue (DLQ) integration on terminal failure.
- Integration with EventBus for fan-out of security events.
- Zero credential exposure in logs or telemetry.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import hmac
import logging
import os
import secrets
import time
from typing import Any
import uuid

from app.incident_command.bus import default_event_bus
from app.integrations.serializers import serialize_payload
from app.integrations.ssrf import SSRFValidationError, send_verified_http_request
from app.integrations.storage import default_integration_storage

logger = logging.getLogger(__name__)

# Bounded Worker Pool Configuration
MAX_DISPATCHER_WORKERS: int = 5
MAX_RETRIES: int = 3  # 1 initial + 3 retries = 4 total attempts
SIGNATURE_TOLERANCE_SECONDS: int = 300

# Base retry backoff delays in seconds
if os.getenv("HONEYSHIELD_FAST_RETRIES") == "1":
    RETRY_DELAYS: list[float] = [0.0, 0.01, 0.01, 0.01]
else:
    RETRY_DELAYS: list[float] = [0.0, 5.0, 10.0, 20.0]


def compute_signature(secret: str, timestamp: int, payload_bytes: bytes) -> str:
    """Compute HMAC-SHA256 signature string with canonical timestamp binding."""
    canonical = f"{timestamp}.".encode("utf-8") + payload_bytes
    sig = hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


def verify_signature(
    secret: str,
    signature_header: str,
    payload_bytes: bytes,
    current_time: int | None = None,
    tolerance_seconds: int = SIGNATURE_TOLERANCE_SECONDS,
) -> tuple[bool, str]:
    """Verify HMAC signature header with timestamp tolerance and timing attack resistance."""
    now = current_time if current_time is not None else int(time.time())

    parts: dict[str, str] = {}
    for item in signature_header.split(","):
        if "=" in item:
            k, v = item.strip().split("=", 1)
            parts[k] = v

    if "t" not in parts or "v1" not in parts:
        return False, "Malformed signature header format (expected t=...,v1=...)"

    try:
        ts = int(parts["t"])
    except ValueError:
        return False, "Invalid non-integer timestamp in signature header"

    if abs(now - ts) > tolerance_seconds:
        return False, f"Signature timestamp expired (drift: {abs(now - ts)}s > {tolerance_seconds}s)"

    expected_sig_header = compute_signature(secret, ts, payload_bytes)
    expected_v1 = expected_sig_header.split("v1=")[1]

    if not secrets.compare_digest(parts["v1"], expected_v1):
        return False, "Signature digest verification failed"

    return True, "Valid signature"


class WebhookDispatcher:
    """Enterprise webhook dispatch engine with thread pool, retries, and circuit breakers."""

    def __init__(self, max_workers: int = MAX_DISPATCHER_WORKERS) -> None:
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="hsx_integrations_",
        )
        self._is_shutdown = False

    def shutdown(self, wait: bool = False) -> None:
        """Gracefully shut down dispatcher worker threads."""
        self._is_shutdown = True
        self._executor.shutdown(wait=wait)

    # =========================================================================
    # Outbound Dispatch Execution
    # =========================================================================

    def _execute_single_attempt(
        self,
        endpoint_id: str,
        target_url: str,
        secret: str,
        event_type: str,
        delivery_id: str,
        format_preset: str,
        custom_headers: dict[str, str],
        data: dict[str, Any],
    ) -> tuple[bool, int | None, float, str | None, str | None]:
        """Execute single synchronous HTTP delivery attempt with HMAC signature."""
        now_ts = int(time.time())
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Serialize payload according to endpoint format preset
        body_bytes, content_type = serialize_payload(
            format_preset=format_preset,
            event_type=event_type,
            delivery_id=delivery_id,
            timestamp_iso=now_iso,
            data=data,
        )

        # 2. Compute HMAC signature
        signature_hdr = compute_signature(secret, now_ts, body_bytes)

        # 3. Assemble headers
        headers = {
            "Content-Type": content_type,
            "User-Agent": "HoneyShield-Integrations/3.9 (+https://honeyshield.local)",
            "X-HoneyShield-Event": event_type,
            "X-HoneyShield-Delivery": delivery_id,
            "X-HoneyShield-Delivery-Id": delivery_id,
            "X-HoneyShield-Timestamp": str(now_ts),
            "X-HoneyShield-Signature": signature_hdr,
        }
        # Merge custom headers (ignoring attempts to overwrite security headers)
        for k, v in custom_headers.items():
            if k.lower() not in (
                "x-honeyshield-signature",
                "x-honeyshield-delivery",
                "x-honeyshield-delivery-id",
                "x-honeyshield-timestamp",
                "x-honeyshield-event",
            ):
                headers[k] = v

        start_time = time.time()
        try:
            status_code, resp_headers, resp_body = send_verified_http_request(
                url=target_url,
                method="POST",
                headers=headers,
                body=body_bytes,
                connect_timeout=3.0,
                read_timeout=5.0,
            )
            latency_ms = (time.time() - start_time) * 1000.0

            # 2xx is considered successful delivery
            if 200 <= status_code < 300:
                preview = resp_body.decode("utf-8", errors="replace")[:500] if resp_body else "OK"
                return True, status_code, latency_ms, preview, None
            else:
                err_preview = resp_body.decode("utf-8", errors="replace")[:200] if resp_body else ""
                err_msg = f"Remote endpoint returned HTTP {status_code}: {err_preview}"
                return False, status_code, latency_ms, None, err_msg

        except SSRFValidationError as e:
            latency_ms = (time.time() - start_time) * 1000.0
            return False, None, latency_ms, None, f"SSRF security violation: {e}"
        except TimeoutError as e:
            latency_ms = (time.time() - start_time) * 1000.0
            return False, None, latency_ms, None, f"Connection timeout: {e}"
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000.0
            return False, None, latency_ms, None, f"Transport failure: {type(e).__name__}: {e}"

    def dispatch_to_endpoint_worker(
        self,
        endpoint: dict[str, Any],
        event_type: str,
        delivery_id: str,
        payload_data: dict[str, Any],
    ) -> None:
        """Worker thread loop executing retry backoff and DLQ routing."""
        endpoint_id = endpoint["id"]
        endpoint_name = endpoint.get("name", "Unknown")
        target_url = endpoint["target_url"]
        secret = endpoint.get("secret", "")
        format_preset = endpoint.get("format", "honeyshield_json")
        custom_headers = endpoint.get("custom_headers") or {}

        # Check circuit breaker before attempting
        permitted, reason = default_integration_storage.is_delivery_permitted(endpoint_id)
        if not permitted:
            logger.warning("Delivery %s shed: %s", delivery_id, reason)
            default_integration_storage.record_metric(success=False, latency_ms=0.0)
            return

        last_status_code: int | None = None
        last_error: str = "Unknown error"
        total_attempts = 0
        success = False

        for attempt_idx in range(len(RETRY_DELAYS)):
            total_attempts += 1
            delay = RETRY_DELAYS[attempt_idx]
            if delay > 0:
                # Add deterministic jitter in [0.0, 1.0]
                jitter = (int(hashlib.md5(f"{delivery_id}:{attempt_idx}".encode()).hexdigest(), 16) % 1000) / 1000.0
                time.sleep(delay + jitter)

            (
                attempt_success,
                status_code,
                latency_ms,
                preview,
                error_msg,
            ) = self._execute_single_attempt(
                endpoint_id=endpoint_id,
                target_url=target_url,
                secret=secret,
                event_type=event_type,
                delivery_id=delivery_id,
                format_preset=format_preset,
                custom_headers=custom_headers,
                data=payload_data,
            )

            last_status_code = status_code
            if error_msg:
                last_error = error_msg

            if attempt_success:
                success = True
                default_integration_storage.record_metric(success=True, latency_ms=latency_ms)
                default_integration_storage.record_circuit_success(endpoint_id)
                # Update endpoint live stats
                now_iso = datetime.now(timezone.utc).isoformat()
                ep_record = default_integration_storage.get_endpoint(endpoint_id, mask=False)
                if ep_record:
                    ep_record["total_sent"] = ep_record.get("total_sent", 0) + 1
                    ep_record["last_delivery_at"] = now_iso
                    ep_record["last_status_code"] = status_code
                    default_integration_storage.save_endpoint(ep_record)
                logger.info("Delivery %s to endpoint '%s' succeeded on attempt %s", delivery_id, endpoint_name, total_attempts)
                break
            else:
                logger.warning(
                    "Delivery %s attempt %s to '%s' failed: %s",
                    delivery_id,
                    total_attempts,
                    endpoint_name,
                    error_msg,
                )

        if not success:
            # All attempts exhausted
            default_integration_storage.record_metric(success=False, latency_ms=0.0)
            new_circuit_state, tripped_now = default_integration_storage.record_circuit_failure(endpoint_id)
            if tripped_now:
                logger.warning("Circuit breaker TRIPPED for endpoint '%s'", endpoint_name)

            # Update endpoint stats
            ep_record = default_integration_storage.get_endpoint(endpoint_id, mask=False)
            if ep_record:
                ep_record["total_failed"] = ep_record.get("total_failed", 0) + 1
                ep_record["last_status_code"] = last_status_code
                default_integration_storage.save_endpoint(ep_record)

            # Move to DLQ
            dlq_record = {
                "delivery_id": delivery_id,
                "endpoint_id": endpoint_id,
                "endpoint_name": endpoint_name,
                "target_url": target_url,
                "event_type": event_type,
                "payload": payload_data,
                "attempts": total_attempts,
                "last_error": last_error,
                "status_code": last_status_code,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            default_integration_storage.enqueue_dlq(dlq_record)
            logger.error("Delivery %s exhausted retries. Enqueued to DLQ: %s", delivery_id, last_error)

    # =========================================================================
    # High-Level Fan-Out
    # =========================================================================

    def fanout_event(self, event_type: str, data: dict[str, Any]) -> list[str]:
        """Asynchronously dispatch an event to all matching registered endpoints.

        Guaranteed non-blocking: submits tasks to thread pool and immediately returns.
        """
        if self._is_shutdown:
            return []

        endpoints = default_integration_storage.list_endpoints(mask=False)
        matched_delivery_ids: list[str] = []

        for ep in endpoints:
            if not ep.get("enabled", True):
                continue

            subscribed_events = ep.get("events") or []
            # Match specific event type or wildcard "*"
            if "*" in subscribed_events or event_type in subscribed_events:
                delivery_id = str(uuid.uuid4())
                matched_delivery_ids.append(delivery_id)
                self._executor.submit(
                    self.dispatch_to_endpoint_worker,
                    endpoint=dict(ep),
                    event_type=event_type,
                    delivery_id=delivery_id,
                    payload_data=data,
                )

        return matched_delivery_ids

    def dispatch_event(
        self,
        event_type: str,
        payload: dict[str, Any],
        endpoint_id: str | None = None,
        wait: bool = False,
    ) -> str:
        """Dispatch event to a specific endpoint (or fanout). If wait=True, executes synchronously."""
        delivery_id = str(uuid.uuid4())
        if endpoint_id:
            ep = default_integration_storage.get_endpoint(endpoint_id, mask=False)
            if not ep:
                raise ValueError(f"Endpoint '{endpoint_id}' not found")
            if wait:
                self.dispatch_to_endpoint_worker(
                    endpoint=dict(ep),
                    event_type=event_type,
                    delivery_id=delivery_id,
                    payload_data=payload,
                )
            else:
                self._executor.submit(
                    self.dispatch_to_endpoint_worker,
                    endpoint=dict(ep),
                    event_type=event_type,
                    delivery_id=delivery_id,
                    payload_data=payload,
                )
            return delivery_id
        else:
            ids = self.fanout_event(event_type, payload)
            return ids[0] if ids else delivery_id

    def fanout_legacy_alert(self, alert_obj: Any) -> list[str]:
        """Module 2.6 Compatibility Hook: Fan out alert to Module 3.9 targets."""
        try:
            attack_type = getattr(alert_obj, "attack_type", None)
            if not attack_type and hasattr(alert_obj, "attack") and alert_obj.attack:
                attack_type = getattr(alert_obj.attack, "attack_type", "UNKNOWN")

            source_ip = getattr(alert_obj, "source_ip", None)
            if not source_ip and hasattr(alert_obj, "attack") and alert_obj.attack:
                source_ip = getattr(alert_obj.attack, "source_ip", None)

            alert_data = {
                "alert_id": getattr(alert_obj, "id", None),
                "title": getattr(alert_obj, "title", "Alert"),
                "severity": getattr(alert_obj, "severity", "medium"),
                "status": getattr(alert_obj, "status", "open"),
                "notification_status": getattr(alert_obj, "notification_status", "delivered"),
                "attack_type": attack_type or "UNKNOWN",
                "source_ip": source_ip,
                "details": getattr(alert_obj, "details", {}),
                "source": "module_2_6_legacy_dispatch",
            }
            return self.fanout_event("alert.triggered", alert_data)
        except Exception as e:
            logger.warning("Failed fanout of legacy alert: %s", e)
            return []

    def test_ping(
        self,
        endpoint_id: str,
        event_type: str = "test.ping",
        sample_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Synchronously dispatch single test ping for analyst verification."""
        ep = default_integration_storage.get_endpoint(endpoint_id, mask=False)
        if not ep:
            return {
                "delivery_id": str(uuid.uuid4()),
                "status": "failed",
                "status_code": None,
                "latency_ms": 0.0,
                "response_preview": None,
                "error": f"Endpoint '{endpoint_id}' not found.",
            }

        delivery_id = str(uuid.uuid4())
        test_payload = sample_data or {
            "test": True,
            "message": "HoneyShield-X Test Ping Verification",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        success, status_code, latency_ms, preview, error_msg = self._execute_single_attempt(
            endpoint_id=endpoint_id,
            target_url=ep["target_url"],
            secret=ep.get("secret", ""),
            event_type=event_type,
            delivery_id=delivery_id,
            format_preset=ep.get("format", "honeyshield_json"),
            custom_headers=ep.get("custom_headers") or {},
            data=test_payload,
        )

        return {
            "delivery_id": delivery_id,
            "status": "success" if success else "failed",
            "status_code": status_code,
            "latency_ms": round(latency_ms, 2),
            "response_preview": preview,
            "error": error_msg,
        }

    def retry_dlq_item(self, delivery_id: str) -> dict[str, Any]:
        """Manually re-dispatch a dead-letter queue item."""
        dlq_item = default_integration_storage.get_dlq_item(delivery_id)
        if not dlq_item:
            return {
                "delivery_id": delivery_id,
                "status": "failed",
                "status_code": None,
                "latency_ms": 0.0,
                "response_preview": None,
                "error": f"DLQ item '{delivery_id}' not found.",
            }

        ep_id = dlq_item["endpoint_id"]
        ep = default_integration_storage.get_endpoint(ep_id, mask=False)
        if not ep:
            return {
                "delivery_id": delivery_id,
                "status": "failed",
                "status_code": None,
                "latency_ms": 0.0,
                "response_preview": None,
                "error": f"Destination endpoint '{ep_id}' no longer exists.",
            }

        new_delivery_id = str(uuid.uuid4())
        success, status_code, latency_ms, preview, error_msg = self._execute_single_attempt(
            endpoint_id=ep_id,
            target_url=ep["target_url"],
            secret=ep.get("secret", ""),
            event_type=dlq_item["event_type"],
            delivery_id=new_delivery_id,
            format_preset=ep.get("format", "honeyshield_json"),
            custom_headers=ep.get("custom_headers") or {},
            data=dlq_item["payload"],
        )

        if success:
            default_integration_storage.remove_dlq_item(delivery_id)
            default_integration_storage.record_metric(success=True, latency_ms=latency_ms)
            default_integration_storage.record_circuit_success(ep_id)

        return {
            "delivery_id": new_delivery_id,
            "status": "success" if success else "failed",
            "status_code": status_code,
            "latency_ms": round(latency_ms, 2),
            "response_preview": preview,
            "error": error_msg,
        }

    # =========================================================================
    # EventBus Listener Hook
    # =========================================================================

    def on_bus_event(self, event_type: str, payload: dict[str, Any]) -> None:
        """Callback invoked by EventBus whenever an event is published."""
        # Filter internal loopback / infrastructure events to avoid loops
        if event_type.startswith("breaker.") or event_type in ("system.connected", "heartbeat"):
            return

        # Map and fan out known event families
        self.fanout_event(event_type, payload)


# Singleton default dispatcher instance
default_dispatcher = WebhookDispatcher()
default_webhook_dispatcher = default_dispatcher

# Register dispatcher with EventBus
default_event_bus.register_listener(default_dispatcher.on_bus_event)
