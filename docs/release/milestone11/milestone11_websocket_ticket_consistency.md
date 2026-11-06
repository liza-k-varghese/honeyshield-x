# Milestone 11 — Atomic WebSocket Ticket Consistency & Anti-Replay

**Component:** HoneyShield X Real-Time Ticket Gateway  
**Files Audited & Remediated:** `backend/app/events/tickets.py`  
**Security Status:** ATOMIC LUA `GETDEL` IMPLEMENTED  

---

## 1. Concurrency Flaw Identified in Legacy Code

In prior revisions, `TicketService.consume_ticket()` executed two separate non-atomic Redis operations:
```python
# VULNERABLE NON-ATOMIC PATTERN
raw = self._redis_client.get(key)
if raw:
    self._redis_client.delete(key) # Race condition! Concurrent GET could execute between GET and DELETE!
```
Under concurrent worker loads, two WebSocket handshakes presenting the exact same ticket simultaneously could both pass `get(key)` before either deleted it, allowing replay attacks.

## 2. Remediated Atomic Lua Script

Milestone 11 replaces the multi-step sequence with an atomic Lua script `LUA_ATOMIC_GETDEL`:

```lua
local val = redis.call('GET', KEYS[1])
if val then
    redis.call('DEL', KEYS[1])
end
return val
```

### Verification Results:
- **First Consumption:** Successfully returns the serialized `Operator` and deletes the key in the exact same Redis atomic engine cycle.
- **Replay Attempt:** Returns `None`, immediately increments `ticket_replay_attempts`, and rejects the handshake.
- **60s Expiration:** Tickets carry a 60-second TTL (`hsx:ws_ticket:<uuid>`). Expired tickets are reclaimed and tracked under `ticket_expirations_total`.

