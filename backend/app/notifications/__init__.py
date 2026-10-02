"""HoneyShield X Notification / Dispatch Layer (Module 2.6)."""

from app.notifications.base import BaseNotificationProvider
from app.notifications.service import (
    dispatch_alert_notification,
    get_notification_provider,
)
from app.notifications.webhook import WebhookNotificationProvider

__all__ = [
    "BaseNotificationProvider",
    "WebhookNotificationProvider",
    "dispatch_alert_notification",
    "get_notification_provider",
]
