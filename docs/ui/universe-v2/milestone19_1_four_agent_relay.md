# HoneyShield X — Milestone 19.1: Four-Agent Courier Relay

## 1. Multi-Agent Pipeline Chain

The demonstration courier relay executes in deterministic, sequential order:

```
[1. SCOUT Sensor Frontier]
       │
       ▼ (Blue Packet: Honeypot Ingest)
[EVENT SINGULARITY CORE]
       │
       ▼ (Cyan Packet: ACID Outbox Persistence)
[2. NEXUS Processing Core]
       │
       ▼ (Purple Packet: IOC Correlation)
[3. ORACLE Intelligence Sanctum]
       │
       ▼ (Red Packet: High Severity Alert)
[4. SENTINEL Response Bastion]
```

## 2. Relay Integrity Rules

1. **Strict Handshake Sequencing:** No downstream agent can initiate transit before its predecessor reaches `confirmed` status at the Event Singularity.
2. **Packet Capsule Synchronization:** The glowing data capsule remains spatially locked to the character's hands/grippers during the entire transit leg.
3. **Color-Coded Semantic Packets:**
   - SCOUT: Blue (`#3B82F6`) — Edge sensor detection.
   - NEXUS: Cyan (`#00E5FF`) — ACID outbox serialization.
   - ORACLE: Purple (`#A855F7`) — Threat intelligence & risk scoring.
   - SENTINEL: Red (`#EF4444`) — Alert dispatch & mobile containment push.
4. **Demo / Live Separation:** Synthetic relay events do not emit mutating requests to the PostgreSQL database or trigger live firewall containment.

