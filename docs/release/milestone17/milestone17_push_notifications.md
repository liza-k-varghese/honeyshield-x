# HoneyShield X — Milestone 17: Push Notification & Outbox Dispatch Architecture

## 1. Scope
Ensures timely delivery of high-severity cybersecurity alerts (`critical`, `high`) and Digital Agent notifications to paired Android companion clients.

## 2. Notification Dispatch Pipeline
1. **Event Capture:** Detection rules or honeypot triggers commit attack events and alerts into `security_event_outbox` in the same database transaction.
2. **Outbox Poller / Stream Worker:** Dispatches events asynchronously to active WebSocket connections and mobile push endpoints.
3. **Payload Sanitization:** Push payloads omit sensitive cleartext credentials, sanitizing IOC strings and payload blobs.
4. **Local Android Channels:**
   - Channel 1: `honeyshield_critical_alerts` — High importance, sound, vibration, heads-up display.
   - Channel 2: `honeyshield_agent_events` — Default importance for SCOUT/NEXUS/ORACLE status updates.

## 3. Resilience and Failover
- In the event of push delivery failure or network sleep, the client's `DigitalAgentSyncService` queries `/api/v1/events/outbox?after_seq_id={cursor}` upon reconnection.
- Zero event loss is guaranteed by monotonic integer sequence IDs.

