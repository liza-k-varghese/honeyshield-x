"""Native HTTP Webhook notification provider for HoneyShield X."""

import json
import os
import urllib.error
import urllib.request
from typing import Any

from app.models import Alert
from app.notifications.base import BaseNotificationProvider


class WebhookNotificationProvider(BaseNotificationProvider):
    """Dispatches alert notifications via HTTP/HTTPS POST webhook."""

    def __init__(
        self,
        webhook_url: str | None = None,
        secret_token: str | None = None,
        timeout: float = 5.0,
    ) -> None:
        self.webhook_url = webhook_url or os.getenv("NOTIFICATION_WEBHOOK_URL", "")
        self.secret_token = secret_token or os.getenv("NOTIFICATION_WEBHOOK_SECRET", "")
        self.timeout = timeout

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "webhook"

    @property
    def is_configured(self) -> bool:
        """Return True if target webhook URL is configured."""
        return bool(self.webhook_url and self.webhook_url.strip())

    def format_payload(self, alert: Alert) -> dict[str, Any]:
        """Format an Alert SQLAlchemy model instance into a webhook JSON payload."""
        return {
            "event": "alert.triggered",
            "alert_id": alert.id,
            "attack_id": alert.attack_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "status": alert.status,
            "message": alert.message,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        }

    def send_alert(self, alert: Alert) -> tuple[bool, str]:
        """Dispatch the alert payload to the configured webhook endpoint.

        Returns:
            (sent: bool, message: str)
        """
        if not self.is_configured:
            return False, "Notification provider is not configured"

        payload = self.format_payload(alert)
        data = json.dumps(payload).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "HoneyShield-X-Notification/1.0",
        }
        if self.secret_token and self.secret_token.strip():
            headers["Authorization"] = f"Bearer {self.secret_token.strip()}"

        req = urllib.request.Request(
            url=self.webhook_url.strip(),
            data=data,
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                status_code = response.getcode()
                if 200 <= status_code < 300:
                    return True, f"Notification dispatched successfully (HTTP {status_code})"
                return False, f"Webhook delivery returned unexpected HTTP status {status_code}"
        except urllib.error.HTTPError as e:
            return False, f"Webhook delivery failed with HTTP {e.code}: {e.reason}"
        except urllib.error.URLError as e:
            # e.reason may be an Exception instance or string
            reason_str = str(getattr(e, "reason", e))
            return False, f"Webhook connection error: {reason_str}"
        except TimeoutError:
            return False, "Webhook delivery timed out"
        except Exception as e:
            return False, f"Webhook delivery error: {type(e).__name__}"
