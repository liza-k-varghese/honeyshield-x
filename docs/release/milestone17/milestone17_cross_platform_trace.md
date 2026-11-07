# HoneyShield X — Milestone 17: Cross-Platform Event Trace & Outbox Fidelity

## 1. Scope
Validates the end-to-end propagation of security events from simulated sensor ingestion to PostgreSQL transactional outbox storage and client cursor acknowledgment.

## 2. Event Propagation Pipeline
```
[Honeypot Sensor / Detection Engine]
             │
             ▼
[FastAPI Transaction Boundary]
      ├─ INSERT INTO attacks (...)
      ├─ INSERT INTO alerts (...)
      └─ INSERT INTO security_event_outbox (event_id, event_type, resource_id, payload_json)
             │
      COMMIT TRANSACTION (Strict Atomicity)
             │
             ▼
[Persistent Outbox Ledger]
      ├─ Monotonic primary key ID sequencing
      ├─ Persistent across backend recycles
      └─ Stream worker broadcast via Redis / WebSocket
             │
             ▼
[Subscribed Consumers (Web SOC / Mobile Companion)]
      ├─ Polls /api/v1/events/outbox?after_seq_id=X
      ├─ Advances local cursor: last_seen_seq_id = max(id)
      └─ Zero duplicate delivery, zero event loss
```

## 3. Empirical Verification Results
- Atomic transactional insertion verified in `test_12` (`test_milestone17_sdk_recovery_and_defense.py`).
- Monotonic cursor seeking verified across multiple outbox consumers.
- Payload fidelity: 100% preservation of JSON payload structure and source observables.

