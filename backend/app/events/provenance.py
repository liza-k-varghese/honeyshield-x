"""Provenance and Synthetic Test-Data Hygiene Utility (Milestone 62).

Provides deterministic identification of synthetic test data vs operational production events
without requiring destructive modification of outbox cursors or historical tables.
"""

import ipaddress
from typing import Any

# Standard RFC test, documentation, and benchmarking IP address ranges
SYNTHETIC_TEST_NETWORKS = [
    ipaddress.ip_network("192.0.2.0/24"),    # RFC 5737 TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"), # RFC 5737 TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),  # RFC 5737 TEST-NET-3
    ipaddress.ip_network("198.18.0.0/15"),   # RFC 2544 / RFC 6890 Benchmark Testing
    ipaddress.ip_network("2001:db8::/32"),   # RFC 3849 Documentation IPv6
]


def is_synthetic_test_ip(ip_str: str | None) -> bool:
    """Determine whether an IP address belongs to designated RFC synthetic/test documentation ranges."""
    if not ip_str:
        return False
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        return any(ip in net for net in SYNTHETIC_TEST_NETWORKS)
    except ValueError:
        return False


def tag_event_provenance(payload: dict[str, Any], source_ip: str | None = None) -> dict[str, Any]:
    """Annotate an event payload with synthetic vs operational provenance metadata.

    Guarantees non-destructive tagging: does not mutate caller dict; returns enriched copy.
    """
    enriched = dict(payload)
    ip_to_check = source_ip or enriched.get("source_ip")
    is_synth = is_synthetic_test_ip(ip_to_check) or bool(enriched.get("is_synthetic", False))

    enriched["is_synthetic"] = is_synth
    enriched["data_provenance"] = (
        "synthetic_verification_probe" if is_synth else "operational_sensor"
    )
    return enriched
