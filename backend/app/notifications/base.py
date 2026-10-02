"""Base class for HoneyShield X notification providers."""

from abc import ABC, abstractmethod
from app.models import Alert


class BaseNotificationProvider(ABC):
    """Abstract interface for alert notification dispatch providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return provider identifier name (e.g. 'webhook', 'telegram')."""
        ...

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Return whether this provider has required credentials/endpoints configured."""
        ...

    @abstractmethod
    def send_alert(self, alert: Alert) -> tuple[bool, str]:
        """Send an alert to the destination provider.

        Returns:
            (sent: bool, message: str)
        """
        ...
