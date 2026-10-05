"""Security Event Correlation Engine package for HoneyShield X (Module 2.8)."""

from app.correlation.service import correlate_attack, correlate_source_ip

__all__ = ["correlate_attack", "correlate_source_ip"]
