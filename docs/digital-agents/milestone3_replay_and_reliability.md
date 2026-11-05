# HoneyShield X — Digital Agent Universe
## Milestone 3 Historical Event Replay & State Isolation

### 1. Replay Architecture
Historical Event Replay allows operators to step through recorded event journeys reconstructed from persistent PostgreSQL `security_event_outbox` records via `/api/v1/events/replay`.

```
+-------------------------------------------------------------------------------+
|                            REPLAY STATE MACHINE                               |
+-------------------------------------------------------------------------------+
|                                                                               |
|   PostgreSQL Event Outbox ---> GET /api/v1/events/replay?since_cursor=...     |
|                                            |                                  |
|                                            v                                  |
|                              [Isolated Replay Timeline]                       |
|                                 (isReplayMode = true)                         |
|                                            |                                  |
|                    +-----------------------+-----------------------+          |
|                    |                       |                       |          |
|              VCR Play/Pause         Speed: 0.5x, 1x, 2x       Step Forward/Back|
|                    |                       |                       |          |
|                    v                       v                       v          |
|           Replay UI Canvas         Replay Badge           Avatar Animation    |
|                                                                               |
|   [!] STRICT ISOLATION GUARD: Zero messages emitted to live WebSocket stream  |
|   [!] STRICT BACKEND GUARD: Zero mutations sent to PostgreSQL or Redis        |
+-------------------------------------------------------------------------------+
```

---

### 2. VCR Playback Controls & Features
- **VCR Controls:** Play, Pause, Resume, Restart (jump to Stage 0), Step Backward, and Step Forward.
- **Speed Multipliers:**
  - `0.5x`: Slow-motion inspection (3000ms per stage) for forensic analysis.
  - `1.0x`: Real-time normalized speed (1500ms per stage).
  - `2.0x`: Accelerated review (750ms per stage) for rapid incident triage.
- **Prominent REPLAY MODE Badge:**
  An amber/purple high-contrast animated badge clearly indicates that the operator is reviewing historical records.

---

### 3. Absolute State Isolation Guarantees
1. **Zero Live Stream Pollution:** Replay events are maintained inside an isolated component timeline state. They never enter `activePackets` or trigger live WebSocket broadcasts.
2. **Zero Backend Mutations:** Replay operations are read-only. Stepping through or restarting a replay never invokes ingestion endpoints or modifies outbox cursors.
3. **Lossless Historical Preservation:** All original recorded timestamps, durations, and agent ownership assignments are preserved exactly as logged. Missing stages are rendered honestly without backfilling or fabrication.

