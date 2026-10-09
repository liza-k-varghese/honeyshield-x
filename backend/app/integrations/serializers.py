"""Deterministic SIEM & Webhook Payload Serializers (Module 3.9).

Supports:
- honeyshield_json (Native enriched JSON format)
- cef (ArcSight Common Event Format)
- leef (IBM QRadar Log Event Extended Format 2.0)
- syslog_json (RFC 5424-compatible structured syslog envelope)

Zero external dependencies (Standard library only).
"""

from datetime import datetime, timezone
import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

SEVERITY_NUMERIC_MAP: dict[str, int] = {
    "critical": 10,
    "high": 8,
    "medium": 5,
    "low": 3,
    "info": 1,
}

MAX_STRING_LENGTH: int = 4096


def _sanitize_data(obj: Any) -> Any:
    """Defensively sanitize strings and redact sensitive credentials."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            if any(secret in k.lower() for secret in ("secret", "password", "token", "auth_token", "private_key")):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = _sanitize_data(v)
        return sanitized
    elif isinstance(obj, list):
        return [_sanitize_data(item) for item in obj[:100]]
    elif isinstance(obj, str):
        # Strip newlines or dangerous control chars
        cleaned = re.sub(r"[\r\n\x00-\x1f]", " ", obj)
        return cleaned[:MAX_STRING_LENGTH].strip()
    elif isinstance(obj, (int, float, bool)) or obj is None:
        return obj
    elif hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)[:MAX_STRING_LENGTH]


def _escape_cef_header(value: str) -> str:
    """Escape pipe and backslash in CEF header fields."""
    return value.replace("\\", "\\\\").replace("|", "\\|")


def _escape_cef_extension(value: str) -> str:
    """Escape backslash, equals, and newlines in CEF extension values."""
    return value.replace("\\", "\\\\").replace("=", "\\=").replace("\n", "\\n").replace("\r", "")


def _escape_leef_field(value: str) -> str:
    """Escape tabs and newlines in LEEF attributes."""
    return value.replace("\t", " ").replace("\n", " ").replace("\r", "")


def format_honeyshield_json(
    event_type: str,
    delivery_id: str,
    timestamp_iso: str,
    data: dict[str, Any],
) -> tuple[bytes, str]:
    """Serialize native enriched JSON payload."""
    clean_data = _sanitize_data(data)
    envelope = {
        "schema_version": "3.9",
        "delivery_id": delivery_id,
        "event_type": event_type,
        "timestamp": timestamp_iso,
        "data": clean_data,
    }
    raw = json.dumps(envelope, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return raw, "application/json"


def format_cef(
    event_type: str,
    delivery_id: str,
    timestamp_iso: str,
    data: dict[str, Any],
) -> tuple[bytes, str]:
    """Serialize ArcSight Common Event Format (CEF) payload."""
    clean_data = _sanitize_data(data)
    severity_str = str(clean_data.get("severity", "medium")).lower()
    severity_num = SEVERITY_NUMERIC_MAP.get(severity_str, 5)

    name = str(clean_data.get("title") or clean_data.get("name") or event_type)
    name_escaped = _escape_cef_header(name)
    event_escaped = _escape_cef_header(event_type)

    # Build CEF extension key-value pairs
    ext_parts: list[str] = [
        f"externalId={_escape_cef_extension(delivery_id)}",
        f"rt={_escape_cef_extension(timestamp_iso)}",
    ]

    source_ip = clean_data.get("source_ip") or clean_data.get("ip") or clean_data.get("attacker_ip")
    if source_ip:
        ext_parts.append(f"src={_escape_cef_extension(str(source_ip))}")

    message = clean_data.get("message") or clean_data.get("description") or clean_data.get("summary")
    if message:
        ext_parts.append(f"msg={_escape_cef_extension(str(message))}")

    if "case_id" in clean_data:
        ext_parts.append(f"cs1={_escape_cef_extension(str(clean_data['case_id']))} cs1Label=CaseId")
    if "canary_id" in clean_data:
        ext_parts.append(f"cs2={_escape_cef_extension(str(clean_data['canary_id']))} cs2Label=CanaryId")
    if "indicator_value" in clean_data:
        ext_parts.append(f"cs3={_escape_cef_extension(str(clean_data['indicator_value']))} cs3Label=Indicator")

    extension_str = " ".join(ext_parts)
    # Header format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
    cef_string = f"CEF:0|HoneyShield-X|Platform|3.9|{event_escaped}|{name_escaped}|{severity_num}|{extension_str}"
    return cef_string.encode("utf-8"), "text/plain; charset=utf-8"


def format_leef(
    event_type: str,
    delivery_id: str,
    timestamp_iso: str,
    data: dict[str, Any],
) -> tuple[bytes, str]:
    """Serialize IBM QRadar Log Event Extended Format (LEEF 2.0) payload."""
    clean_data = _sanitize_data(data)
    severity_str = str(clean_data.get("severity", "medium")).lower()
    severity_num = SEVERITY_NUMERIC_MAP.get(severity_str, 5)

    event_escaped = _escape_leef_field(event_type)

    attrs: list[str] = [
        "devTimeFormat=ISO8601",
        f"devTime={_escape_leef_field(timestamp_iso)}",
        f"sev={severity_num}",
        f"deliveryId={_escape_leef_field(delivery_id)}",
    ]

    source_ip = clean_data.get("source_ip") or clean_data.get("ip") or clean_data.get("attacker_ip")
    if source_ip:
        attrs.append(f"src={_escape_leef_field(str(source_ip))}")

    message = clean_data.get("message") or clean_data.get("description") or clean_data.get("summary")
    if message:
        attrs.append(f"msg={_escape_leef_field(str(message))}")

    if "case_id" in clean_data:
        attrs.append(f"caseId={_escape_leef_field(str(clean_data['case_id']))}")
    if "canary_id" in clean_data:
        attrs.append(f"canaryId={_escape_leef_field(str(clean_data['canary_id']))}")
    if "indicator_value" in clean_data:
        attrs.append(f"indicator={_escape_leef_field(str(clean_data['indicator_value']))}")

    delimiter = "\t"
    attributes_str = delimiter.join(attrs)
    # LEEF:2.0|Vendor|Product|Version|EventID|Delimiter|Attributes
    leef_string = f"LEEF:2.0|HoneyShield-X|Platform|3.9|{event_escaped}|{delimiter}{attributes_str}"
    return leef_string.encode("utf-8"), "text/plain; charset=utf-8"


def format_syslog_json(
    event_type: str,
    delivery_id: str,
    timestamp_iso: str,
    data: dict[str, Any],
) -> tuple[bytes, str]:
    """Serialize RFC 5424-compatible Syslog with structured data & JSON payload."""
    clean_data = _sanitize_data(data)
    severity_str = str(clean_data.get("severity", "medium")).lower()

    # Facility 16 (local0)
    facility = 16
    # Severity: critical=2, high=3, medium=4, low=5, info=6
    if severity_str == "critical":
        syslog_sev = 2
    elif severity_str == "high":
        syslog_sev = 3
    elif severity_str == "medium":
        syslog_sev = 4
    elif severity_str == "low":
        syslog_sev = 5
    else:
        syslog_sev = 6

    pri = facility * 8 + syslog_sev
    msg_id = delivery_id[:8]

    # Structured Data element
    clean_event = re.sub(r'["\\]', "", event_type)
    sd = f'[honeyShield@47 event="{clean_event}" deliveryId="{delivery_id}"]'

    json_msg = json.dumps(clean_data, sort_keys=True, separators=(",", ":"))
    # RFC 5424 header: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
    syslog_msg = f"<{pri}>1 {timestamp_iso} honeyshield-x app - {msg_id} {sd} {json_msg}"
    return syslog_msg.encode("utf-8"), "application/json"


SERIALIZER_REGISTRY = {
    "honeyshield_json": format_honeyshield_json,
    "cef": format_cef,
    "leef": format_leef,
    "syslog_json": format_syslog_json,
}


def serialize_payload(
    format_preset: str,
    event_type: str,
    delivery_id: str,
    timestamp_iso: str,
    data: dict[str, Any],
) -> tuple[bytes, str]:
    """Serialize an event into target format preset.

    Returns:
        tuple of (raw_bytes, content_type_str)
    """
    formatter = SERIALIZER_REGISTRY.get(format_preset, format_honeyshield_json)
    return formatter(event_type, delivery_id, timestamp_iso, data)
