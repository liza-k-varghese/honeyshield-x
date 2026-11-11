# HONEYSHIELD X — SYSTEM 1 EXCELLENCE MISSION
## DOCUMENT 6: SYSTEM 2 HANDOFF & INTEGRATION READINESS VALIDATION

**Document Reference:** `HSX-SYS1-DOC-06-SYSTEM2-HANDOFF`  
**System Classification:** Inter-System API Contract & Hardware Integration Readiness  
**Target Release:** HoneyShield X Enterprise Platform  
**Target Quality Standard:** 10 / 10 Objective Verification  
**Evaluation Date:** 2026-11-11  

---

### 1. Executive Summary

HoneyShield X is engineered as a two-machine distributed architecture:
- **System 1 (Active Machine):** Central SOC Platform, Security Operations Engine, Telemetry Normalization, Correlation, Digital Agent Universe, Threat Intelligence, and Case Management.
- **System 2 (Future Machine):** Dedicated Honeypot Ingress, High-Volume Network Sensor Array (Cowrie, OpenCanary, Zeek, Suricata, Dionaea), and Threat Intelligence Probe Engine.

This document formalizes the versioned API contract, schema specifications, rate-limiting policies, synthetic simulation harnesses, and step-by-step physical deployment runbook for when the physical System 2 machine arrives.

---

### 2. Versioned API Contracts & Schema Specifications

The integration contract is defined in [`backend/app/routers/system2_integration.py`](file:///home/liza/HoneyShield-X/backend/app/routers/system2_integration.py) and typed via Pydantic in [`backend/app/system2_integration/schemas.py`](file:///home/liza/HoneyShield-X/backend/app/system2_integration/schemas.py).

#### Contract 1: System Readiness & Health Status
- **Endpoint:** `GET /api/v1/system2/status`
- **Authentication:** Public or Operator Bearer
- **Response Schema:**
```json
{
  "system1_status": "INTEGRATION_READY",
  "system2_status": "PENDING_HARDWARE_DEPLOYMENT",
  "supported_sensors": ["cowrie", "opencanary", "zeek", "suricata", "dionaea"],
  "api_version": "v1",
  "contracts": {
    "telemetry_ingest": "/api/v1/system2/telemetry/ingest",
    "threat_intel": "/api/v1/system2/threat-intel/enrich",
    "pcap_evidence": "/api/v1/system2/evidence/pcap"
  },
  "authentication_mode": "Dedicated Service Token (Header: X-System2-Sensor-Key or Bearer)",
  "rate_limit": "120 requests/minute per sensor source",
  "checked_at": "2026-11-11T01:53:57.900486+00:00"
}
```

#### Contract 2: Sensor Telemetry Ingestion Gateway
- **Endpoint:** `POST /api/v1/system2/telemetry/ingest`
- **Authentication:** `X-System2-Sensor-Key: <token>` or `Authorization: Bearer <token>`
- **Rate Limit:** 120 requests/minute per IP
- **Idempotency Window:** 300 seconds (Distributed Redis cache `hsx:system2:dedup:{event_id}`)
- **Request Payload (`System2SensorTelemetryEvent`):**
```json
{
  "sensor_id": "sensor-cowrie-dmz-01",
  "sensor_type": "cowrie",
  "event_id": "evt-cowrie-9b8a7c6d5e4f",
  "timestamp": "2026-11-11T01:45:00Z",
  "source_ip": "198.51.100.99",
  "destination_ip": "10.0.1.25",
  "source_port": 54322,
  "destination_port": 22,
  "protocol": "tcp",
  "service": "ssh",
  "attack_category": "brute_force",
  "raw_payload": "login attempt [root/toor] failed",
  "message": "SSH login failure from untrusted source",
  "correlation_id": "corr-brute-001",
  "session_id": "sess-cowrie-001",
  "data_provenance": "operational_sensor"
}
```
- **Response Payload (`System2TelemetryIngestResponse`):**
```json
{
  "status": "accepted",
  "event_id": "evt-cowrie-9b8a7c6d5e4f",
  "attack_id": 10174,
  "attack_event_id": 43560,
  "normalized_type": "cowrie:brute_force",
  "correlation_id": "corr-brute-001",
  "pipeline_triggered": true,
  "alert_generated": true,
  "alert_id": 5130,
  "provenance": "synthetic_verification_probe",
  "ingested_at": "2026-11-11T01:45:00.123456Z"
}
```

#### Contract 3: Threat Intelligence Indicator Enrichment
- **Endpoint:** `POST /api/v1/system2/threat-intel/enrich`
- **Request Payload (`System2ThreatIntelRequest`):**
```json
{
  "event_ref": "atk-10174",
  "indicator_value": "198.51.100.99",
  "indicator_type": "ip",
  "requested_analysis": ["reputation", "geoip", "asn", "threat_profile"],
  "correlation_id": "corr-brute-001"
}
```
- **Response Payload (`System2ThreatIntelResponse`):**
  Provides GeoIP coordinates, autonomous system number (ASN), organization name, reputation score, and recommended mitigations.

#### Contract 4: Forensic PCAP Network Evidence Registration
- **Endpoint:** `POST /api/v1/system2/evidence/pcap`
- **Defensive Gate:** Strict rejection of directory traversal characters (`..`, `/`, `\`).
- **Integrity Gate:** Cryptographic verification of SHA-256 payload digest.

---

### 3. Physical Hardware Integration Status & Gates

In accordance with strict operational integrity, the two physical hardware gates remain honestly documented:

| Gate Reference | Description | Status | Rationale |
| :--- | :--- | :---: | :--- |
| **Gate G1.01–G1.12** | Core SOC Engine, Data Pipelines, Detection Rules, Digital Universe, RBAC, Staging Runtime | **PASS** | 100% verified on System 1 |
| **Gate G1.13** | Physical System 2 network sensor uplink across isolated VLAN | **PENDING HARDWARE** | Awaiting physical System 2 delivery |
| **Gate G1.14** | End-to-end physical PCAP capture streaming over high-speed hardware TAP | **PENDING HARDWARE** | Awaiting physical System 2 delivery |

---

### 4. Physical System 2 Onboarding Runbook

When the physical System 2 hardware arrives on site, the operator will execute the following standard operating procedure:

#### Phase A: Network & Hardware Provisioning
1. Mount System 2 in the dedicated rack.
2. Connect System 2 Management Interface (NIC 0) to the isolated SOC Management VLAN (e.g. `10.10.100.0/24`).
3. Connect System 2 Honeypot Monitoring Interfaces (NIC 1–4) to the external DMZ or mirror ports (promiscuous mode, no IP address assigned).
4. Verify physical ping connectivity between System 2 Management IP and System 1 (`10.10.100.10` -> `10.10.100.5`).

#### Phase B: Sensor Daemon Configuration
1. On System 2, configure the HoneyShield sensor daemon configuration (`/etc/honeyshield/sensor.env`):
   ```bash
   SYSTEM1_INGEST_URL="http://10.10.100.5:8000/api/v1/system2"
   SYSTEM2_SENSOR_API_KEY="<provisioned-sensor-secret-token>"
   SYSTEM2_NODE_ID="sensor-node-physical-01"
   ```
2. Set file permissions: `chmod 0600 /etc/honeyshield/sensor.env`.

#### Phase C: Connectivity Handshake Verification
1. Run preflight connectivity probe from System 2:
   ```bash
   curl -s http://10.10.100.5:8000/api/v1/system2/status | jq .
   ```
   *Expected Output:* `"system1_status": "INTEGRATION_READY"`.
2. Send test sensor ping with authentication header:
   ```bash
   curl -s -X POST http://10.10.100.5:8000/api/v1/system2/telemetry/ingest \
     -H "X-System2-Sensor-Key: <provisioned-sensor-secret-token>" \
     -H "Content-Type: application/json" \
     -d '{"sensor_id":"test-ping","sensor_type":"cowrie","event_id":"evt-init-01","timestamp":"2026-11-11T00:00:00Z","source_ip":"198.51.100.1","protocol":"tcp","service":"ssh","attack_category":"suspicious_probe","data_provenance":"synthetic_verification_probe"}'
   ```
3. Confirm in System 1 SOC console:
   - Event appears under Active Alerts / Digital Agent Universe.
   - Status transitions to `INTEGRATION_ACTIVE`.
   - Update Gates G1.13 and G1.14 to **PASS**.
