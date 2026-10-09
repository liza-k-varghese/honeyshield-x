"""HoneyShield-X Enterprise Integration & SIEM-SOAR Webhook Gateway (Module 3.9)."""

from app.integrations.dispatcher import (
    compute_signature,
    default_dispatcher,
    default_webhook_dispatcher,
    verify_signature,
)
from app.integrations.serializers import (
    SERIALIZER_REGISTRY,
    serialize_payload,
)
from app.integrations.ssrf import (
    SSRFValidationError,
    is_test_loopback_allowed,
    send_verified_http_request,
    validate_destination_url,
)
from app.integrations.storage import (
    default_integration_storage,
    generate_endpoint_secret,
    mask_secret,
)

__all__ = [
    "compute_signature",
    "default_dispatcher",
    "default_integration_storage",
    "generate_endpoint_secret",
    "is_test_loopback_allowed",
    "mask_secret",
    "send_verified_http_request",
    "serialize_payload",
    "SERIALIZER_REGISTRY",
    "SSRFValidationError",
    "validate_destination_url",
    "verify_signature",
]
