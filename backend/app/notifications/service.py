"""Notification service for HoneyShield X (Module 2.6).

Handles alert dispatch to configured notification providers (e.g. Webhook)
with persistent PostgreSQL row-lock claim and deduplication protection.

Note on Distributed Delivery Semantics:
This implementation provides atomic application-level race prevention (at-least-once
delivery). In the edge case where an external webhook receiver accepts the HTTP request
but the HoneyShield X backend crashes before PostgreSQL records 'delivered', a subsequent
retry will safely re-dispatch the alert. Distributed exactly-once delivery across
independent network systems is impossible without receiver-side idempotency keys.
"""

from datetime import datetime, timezone
import os
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Alert
from app.notifications.base import BaseNotificationProvider
from app.notifications.webhook import WebhookNotificationProvider

DEFAULT_STALE_LEASE_TIMEOUT: float = 30.0


def get_stale_lease_timeout() -> float:
    """Return configured timeout in seconds after which an in_flight lease is considered stale."""
    try:
        return float(
            os.getenv("NOTIFICATION_LEASE_TIMEOUT_SECONDS", str(DEFAULT_STALE_LEASE_TIMEOUT))
        )
    except ValueError:
        return DEFAULT_STALE_LEASE_TIMEOUT


def get_notification_provider() -> BaseNotificationProvider | None:
    """Resolve and instantiate the active notification provider from configuration.

    Resolution:
    - If NOTIFICATION_PROVIDER is explicitly 'none' or 'disabled': returns None.
    - If NOTIFICATION_PROVIDER is 'webhook' or NOTIFICATION_WEBHOOK_URL is set:
      returns WebhookNotificationProvider.
    - Otherwise returns None (unconfigured).
    """
    provider_type = os.getenv("NOTIFICATION_PROVIDER", "").strip().lower()
    if provider_type in ("none", "disabled", "false"):
        return None

    if provider_type == "webhook" or os.getenv("NOTIFICATION_WEBHOOK_URL"):
        return WebhookNotificationProvider()

    return None


def dispatch_alert_notification(
    db: Session,
    alert_id: int,
    provider: BaseNotificationProvider | None = None,
) -> dict[str, Any]:
    """Dispatch an existing alert to the configured notification provider with deduplication.

    Three-Phase Execution Lifecycle:
    --------------------------------
    Phase 1 (Atomic Lease Claim - Fast DB Transaction with Row Lock):
      - Locks the Alert row via `SELECT ... FOR UPDATE`.
      - If alert does not exist: raises HTTP 404.
      - If provider is unconfigured: returns HTTP 200 with sent=False (status remains pending).
      - If notification_status == 'delivered': returns sent=False ('already notified').
      - If notification_status == 'in_flight':
          - If lease is active (< timeout): returns sent=False ('currently in flight').
          - If lease is stale (> timeout): reclaims the lease.
      - If pending or retryable failed: transitions status to 'in_flight' and stamps lease time.
      - Commits immediately, releasing the row lock and freeing the DB connection.

    Phase 2 (Outbound Network Call - Zero Database Lock Held):
      - Executes `provider.send_alert(alert)`.
      - Network timeout and sanitization are handled by the provider.

    Phase 3 (Final State Update - Fast DB Transaction with Row Lock):
      - Re-locks the Alert row.
      - On success: sets notification_status = 'delivered', notified_at = UTC now.
      - On failure: sets notification_status = 'failed', notified_at = None (allowing retry).
      - Commits immediately.
    """
    active_provider = provider if provider is not None else get_notification_provider()
    provider_name = active_provider.provider_name if active_provider else "none"

    # =========================================================================
    # Phase 1: Atomic Lease Claim (PostgreSQL Row Lock)
    # =========================================================================
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # Naive UTC matching model
    stale_timeout = get_stale_lease_timeout()

    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .with_for_update()
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found",
        )

    # If provider is not configured, do not claim lease; return safe unconfigured response
    if active_provider is None or not active_provider.is_configured:
        db.commit()
        return {
            "alert_id": alert.id,
            "provider": provider_name,
            "sent": False,
            "message": "Notification provider is not configured",
        }

    # Deduplication Guard 1: Already Delivered
    if alert.notification_status == "delivered":
        notified_str = alert.notified_at.isoformat() if alert.notified_at else "unknown"
        db.commit()
        return {
            "alert_id": alert.id,
            "provider": provider_name,
            "sent": False,
            "message": f"Alert #{alert.id} was already notified at {notified_str}",
        }

    # Deduplication Guard 2: In Flight
    if alert.notification_status == "in_flight":
        is_stale = False
        if alert.notified_at is not None:
            elapsed = (now - alert.notified_at).total_seconds()
            if elapsed > stale_timeout:
                is_stale = True

        if not is_stale:
            db.commit()
            return {
                "alert_id": alert.id,
                "provider": provider_name,
                "sent": False,
                "message": f"Alert #{alert.id} notification is currently in flight",
            }
        # If stale, proceed to reclaim lease below

    # Claim the lease: transition to 'in_flight' and record lease timestamp
    alert.notification_status = "in_flight"
    alert.notified_at = now
    db.commit()

    # =========================================================================
    # Phase 2: Outbound Network Call (Zero Database Lock Held)
    # =========================================================================
    try:
        sent, message = active_provider.send_alert(alert)
    except Exception as e:
        sent, message = False, f"Unexpected error during notification dispatch: {type(e).__name__}"

    # =========================================================================
    # Phase 3: Final State Update (Fast DB Transaction)
    # =========================================================================
    final_alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .with_for_update()
        .first()
    )

    if final_alert is not None:
        if sent:
            final_alert.notification_status = "delivered"
            final_alert.notified_at = datetime.now(timezone.utc).replace(tzinfo=None)
            try:
                from app.integrations.dispatcher import default_dispatcher
                default_dispatcher.fanout_legacy_alert(final_alert)
            except Exception:
                pass
        else:
            final_alert.notification_status = "failed"
            final_alert.notified_at = None
        db.commit()

    return {
        "alert_id": alert_id,
        "provider": provider_name,
        "sent": sent,
        "message": message,
    }


def fanout_legacy_alert(
    alert_id: int,
    severity: str = "medium",
    attack_type: str = "UNKNOWN",
    source_ip: str | None = None,
    details: dict | None = None,
) -> list[str]:
    """Helper for programmatic fanout of legacy-style alerts to Module 3.9 endpoints."""
    from app.integrations.dispatcher import default_dispatcher

    class _MockAlert:
        def __init__(self):
            self.id = alert_id
            self.title = f"Alert: {attack_type}"
            self.severity = severity
            self.status = "open"
            self.notification_status = "delivered"
            self.attack_type = attack_type
            self.source_ip = source_ip
            self.details = details or {}

    return default_dispatcher.fanout_legacy_alert(_MockAlert())
