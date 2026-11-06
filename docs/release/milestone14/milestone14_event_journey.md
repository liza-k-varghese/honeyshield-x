# Milestone 14 — Event Journey, Packet Inspection & Historical Replay

**Document ID:** `HSX-DOC-M14-011`  
**Classification:** Real-Time Telemetry & Forensic Replay  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Packet Inspector Metadata Schema

When an operator clicks on an active or historical event packet in the Digital Agent Universe canvas, the Packet Inspector surfaces authoritative forensic metadata:

```typescript
interface EventPacketMetadata {
  eventId: string;          // e.g. "evt-b94f1c92-3a47-4921-98bc-e78a291f0412"
  workflowId: string;       // e.g. "wf-ssh-brute-force-8812"
  transferId: string;       // e.g. "tr-scout-to-nexus-001"
  correlationId: string;    // e.g. "corr-198.51.100.45"
  agent: "SCOUT" | "NEXUS" | "ORACLE" | "SENTINEL";
  source: string;           // "sensor:cowrie:01"
  destination: string;      // "soc:incident_feed"
  lifecycleStage: "STARTED" | "PENDING" | "COMPLETED" | "FAILED" | "SKIPPED";
  timestamp: string;        // ISO 8601 UTC
  severity: "critical" | "high" | "medium" | "low";
  riskScore: number;        // 0.0 - 100.0 (Server-derived)
  relatedAlertId?: number;
  outboxCursor: number;
}
```

---

## 2. Event Journey Visualization

The Event Journey component displays a linear timeline mapping the exact sequence of processing milestones:
1. `SCOUT` Ingested Telemetry (Completed @ `T+0ms`)
2. `NEXUS` Schema Normalization & Outbox Commit (Completed @ `T+3ms`)
3. `ORACLE` STIX/TAXII Threat Enrichment (Completed @ `T+5ms`)
4. `SENTINEL` Alert Creation & Push Dispatch (Completed @ `T+8ms`)

Skipped or failed stages are rendered with distinct visual treatments (`SKIPPED`: grey dashed line; `FAILED`: red cross with recorded error reason).

---

## 3. Historical Replay Engine

Operators can scrub through past security incidents:
- **Playback Controls:** Play, Pause, Resume, Step Forward (1 frame), Step Backward, Scrub Timeline, Playback Speed (0.5x, 1x, 2x, 5x).
- **Read-Only Invariant:** Replay streams from historical PostgreSQL outbox rows; it **never** triggers new backend alerts, containment actions, or push notifications.
- **Accurate Timestamps:** Event badges display the original event timestamp rather than the playback wall-clock time.

