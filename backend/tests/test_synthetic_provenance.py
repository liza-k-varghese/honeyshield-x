"""Unit tests for Milestone 62 synthetic test-data provenance and hygiene."""

from app.events.provenance import is_synthetic_test_ip, tag_event_provenance


def test_synthetic_ip_classification():
    """Verify RFC 5737, 2544, and 3849 test addresses are recognized as synthetic."""
    assert is_synthetic_test_ip("198.51.100.244") is True
    assert is_synthetic_test_ip("198.51.100.1") is True
    assert is_synthetic_test_ip("192.0.2.100") is True
    assert is_synthetic_test_ip("203.0.113.88") is True
    assert is_synthetic_test_ip("198.18.5.5") is True
    assert is_synthetic_test_ip("2001:db8::1") is True


def test_operational_ip_classification():
    """Verify operational IPs are recognized as non-synthetic."""
    assert is_synthetic_test_ip("8.8.8.8") is False
    assert is_synthetic_test_ip("1.1.1.1") is False
    assert is_synthetic_test_ip("142.250.190.46") is False
    assert is_synthetic_test_ip(None) is False
    assert is_synthetic_test_ip("invalid-ip") is False


def test_tag_event_provenance():
    """Verify payload annotation for synthetic vs operational events."""
    synthetic_payload = tag_event_provenance(
        {"source_ip": "198.51.100.244", "event_type": "ssh_login_failed"}
    )
    assert synthetic_payload["is_synthetic"] is True
    assert synthetic_payload["data_provenance"] == "synthetic_verification_probe"

    operational_payload = tag_event_provenance(
        {"source_ip": "195.201.201.1", "event_type": "ssh_login_failed"}
    )
    assert operational_payload["is_synthetic"] is False
    assert operational_payload["data_provenance"] == "operational_sensor"
