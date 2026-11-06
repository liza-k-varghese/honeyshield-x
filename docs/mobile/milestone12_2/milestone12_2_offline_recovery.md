# Milestone 12.2 — Offline Resilience & Telemetry Resynchronization

**Document:** `milestone12_2_offline_recovery.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Disconnected State Protocol

When mobile operators operate in air-gapped zones or encounter network drops:
1. **Offline HUD Banner:** The UI immediately renders a distinct amber banner (`OFFLINE MODE — CACHED TELEMETRY`).
2. **Safe Read Cache:** Operators can review cached alerts, attacks, canary tokens, and playbook tasks from local encrypted SQLite storage. Stale data is timestamped; never labeled `LIVE`.
3. **Privilege Containment Guard:** In strict adherence to Part 16.5, **no Governor containment actions or privileged security mutations are queued for automatic replay upon reconnect**. Containment actions require real-time operator authorization.

---

## 2. Reconnection Handshake

Upon network restoration:
1. Session validity is verified against `/api/v1/auth/session/status`.
2. The real-time stream reconnects with `last_seen_cursor`.
3. Outbox events generated during the offline gap are replayed chronologically.
4. Duplicate events are discarded via local Bloom filter and sequence deduplication.

