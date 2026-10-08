"""Incident Command Subsystem for HoneyShield-X (Module 3.4).

Provides:
- Deterministic Safety Governor (action allowlist, rate limiter, cooldowns, idempotency).
- Outbound Notification Circuit Breaker (3-state failure-shedding guard).
- Real-Time Event Bus (Redis Pub/Sub with in-memory fallback).
- Virtual Incident Projections over existing Alert, Attack, and SystemEvent models.
"""
