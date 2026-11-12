# HONEYSHIELD X — SYSTEM 2 INTEGRATION CONTRACT & TELEMETRY SPECIFICATION

**Document ID:** `HSX-SPEC-SYS2-001`
**Version:** `1.0.0`
**Classification:** Technical Architecture Contract
**Producer:** System 2 — Integrated Honeypot, Network Monitoring and Threat Intelligence Engine
**Consumer:** System 1 — Central SOC Platform and Security Operations Engine
**Protocol:** HTTPS / JSON REST

---

## 1. PURPOSE & ARCHITECTURAL BOUNDARIES

This document defines the formal, versioned contract between **System 1** (Central SOC Platform) and **System 2** (Honeypot, Network Monitoring, and Threat Intelligence Engine).

### Architectural Rules
1. **Decoy Isolation:** All deliberately vulnerable decoy services (Cowrie, OpenCanary, Dionaea) and packet capture sensors (Zeek, Suricata) reside exclusively on **System 2**. Deliberately vulnerable services are never exposed on System 1.
2. **Push Telemetry Model:** System 2 forwards normalized telemetry events to System 1 via `POST /api/v1/system2/telemetry/ingest`.
3. **Pull Intelligence Model:** System 1 or System 2 queries deep infrastructure intelligence via `POST /api/v1/system2/threat-intel/enrich`.
4. **Metadata-Only Evidence Exchange:** Large PCAP packet captures remain stored in ring buffers on System 2. System 2 registers cryptographically signed metadata with System 1 via `POST /api/v1/system2/evidence/pcap`. System 1 never accepts arbitrary file paths or untrusted raw file uploads.
5. **Data Provenance:** Every event must explicitly declare its provenance (`operational_sensor` vs `synthetic_verification_probe`).

---

## 2. AUTHENTICATION & SECURITY CONTROLS

### 2.1 Sensor Service Token Authentication
All System 2 requests to System 1 must supply the dedicated sensor authentication token via either:
- HTTP Header: `X-System2-Sensor-Key: <token>`
- HTTP Header: `Authorization: Bearer <token>`

The token is validated on System 1 using constant-time string comparison (`hmac.compare_digest`) to prevent timing side-channel attacks.

### 2.2 Rate Limiting
- **Quota:** 120 requests / minute per sensor source IP.
- **Enforcement:** Sliding-window rate limiter on System 1.
- **Violation Response:** `HTTP 429 Too Many Requests`.

### 2.3 Event Idempotency & Deduplication
- Every telemetry event must contain an `event_id` (UUID or monotonically increasing sensor sequence).
- System 1 maintains an in-memory sliding-window LRU deduplication cache (5,000 entries, 300-second TTL).
- If an event is re-transmitted within the window, System 1 returns `HTTP 201` with `status: "deduplicated"` and the existing record identifiers without creating duplicate database entries.

### 2.4 Error Codes
| HTTP Status | Meaning | Condition |
| :--- | :--- | :--- |
| `201 Created` | Ingestion Successful | Event normalized, stored, and queued for pipeline processing |
| `400 Bad Request` | Security Violation | Traversal symbols (`..`, `\`) or malicious payloads detected |
| `401 Unauthorized` | Authentication Failed | Missing or invalid `X-System2-Sensor-Key` header |
| `422 Unprocessable` | Schema Validation Error | Missing required fields, invalid IP address, or invalid enum value |
| `429 Too Many Requests` | Rate Limit Exceeded | Source exceeded 120 requests/minute |
| `500 Internal Error` | Database / Pipeline Error | PostgreSQL persistence failure (rolled back cleanly) |

---

## 3. TELEMETRY INGESTION INTERFACE

**Endpoint:** `POST /api/v1/system2/telemetry/ingest`
**Description:** Ingests normalized telemetry from a System 2 sensor.

### 3.1 Request Schema (`System2SensorTelemetryEvent`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["sensor_id", "sensor_type", "event_id", "source_ip", "message"],
  "properties": {
    "sensor_id": {
      "type": "string",
      "minLength": 3,
      "maxLength": 64,
      "description": "Unique identifier of sending sensor instance"
    },
    "sensor_type": {
      "type": "string",
      "enum": ["cowrie", "opencanary", "zeek", "suricata", "dionaea", "custom"]
    },
    "event_id": {
      "type": "string",
      "minLength": 8,
      "maxLength": 64,
      "description": "Globally unique event identifier for idempotency"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of occurrence"
    },
    "source_ip": {
      "type": "string",
      "format": "ipv4",
      "description": "Attacker IP address"
    },
    "destination_ip": {
      "type": "string",
      "description": "Target honeypot listener IP address"
    },
    "protocol": {
      "type": "string",
      "default": "tcp",
      "description": "Transport protocol (tcp, udp, icmp)"
    },
    "service": {
      "type": "string",
      "default": "ssh",
      "description": "Decoy service targeted (ssh, telnet, http, smb, port_XX)"
    },
    "attack_category": {
      "type": "string",
      "enum": [
        "brute_force",
        "port_scan",
        "reconnaissance",
        "exploitation",
        "command_injection",
        "malware_drop",
        "anomalous_traffic",
        "suspicious_probe"
      ],
      "default": "suspicious_probe"
    },
    "message": {
      "type": "string",
      "minLength": 1,
      "maxLength": 10000,
      "description": "Human-readable summary of sensor event"
    },
    "session_id": {
      "type": "string",
      "description": "Interactive honeypot session identifier"
    },
    "correlation_id": {
      "type": "string",
      "description": "Cross-system correlation trace ID"
    },
    "raw_evidence_ref": {
      "type": "string",
      "description": "Optional PCAP reference ID on System 2"
    },
    "data_provenance": {
      "type": "string",
      "enum": ["operational_sensor", "synthetic_verification_probe", "integration_harness"],
      "default": "operational_sensor"
    },
    "raw_payload": {
      "type": "object",
      "description": "Raw sensor JSON telemetry for deep indexing"
    }
  }
}
```

### 3.2 Request Example (Cowrie SSH Login Failure)

```http
POST /api/v1/system2/telemetry/ingest HTTP/1.1
Host: 10.0.1.10:8000
Content-Type: application/json
X-System2-Sensor-Key: hsx-system2-sensor-token-secret-key-2026

{
  "sensor_id": "sensor-cowrie-edge-01",
  "sensor_type": "cowrie",
  "event_id": "evt-cowrie-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-09T14:30:00Z",
  "source_ip": "198.51.100.42",
  "destination_ip": "10.0.10.22",
  "protocol": "tcp",
  "service": "ssh",
  "attack_category": "brute_force",
  "message": "Cowrie SSH login failed for user 'root' from 198.51.100.42:49200",
  "session_id": "sess-cowrie-7a8b9c",
  "correlation_id": "corr-trace-20261109-001",
  "data_provenance": "operational_sensor",
  "raw_payload": {
    "username": "root",
    "password": "Password123!",
    "src_port": 49200,
    "dst_port": 2222
  }
}
```

### 3.3 Response Example

```json
{
  "status": "accepted",
  "event_id": "evt-cowrie-550e8400-e29b-41d4-a716-446655440000",
  "attack_id": 9651,
  "attack_event_id": 41750,
  "normalized_type": "cowrie:brute_force",
  "correlation_id": "corr-trace-20261109-001",
  "pipeline_triggered": true,
  "alert_generated": true,
  "alert_id": 4827,
  "provenance": "operational_sensor",
  "ingested_at": "2026-11-09T14:30:00.120Z"
}
```

---

## 4. THREAT INTELLIGENCE QUERY INTERFACE

**Endpoint:** `POST /api/v1/system2/threat-intel/enrich`
**Description:** Queries adversary infrastructure intelligence (GeoIP, ASN, IOC, Reputation).

### 4.1 Request Schema (`System2ThreatIntelRequest`)

```json
{
  "type": "object",
  "required": ["event_ref", "indicator_value"],
  "properties": {
    "event_ref": {
      "type": "string",
      "description": "Originating event or attack reference (e.g. 'atk-9651')"
    },
    "indicator_value": {
      "type": "string",
      "description": "IPv4, IPv6, domain, or SHA-256 hash to analyze"
    },
    "indicator_type": {
      "type": "string",
      "default": "ip",
      "enum": ["ip", "domain", "hash", "url"]
    },
    "requested_analysis": {
      "type": "array",
      "items": {"type": "string"},
      "default": ["reputation", "geoip", "asn", "ioc_match", "threat_profile"]
    },
    "correlation_id": {
      "type": "string"
    }
  }
}
```

### 4.2 Response Example

```json
{
  "status": "completed",
  "event_ref": "atk-9651",
  "indicator_value": "198.51.100.42",
  "indicator_type": "ip",
  "reputation": {
    "verdict": "suspicious",
    "reputation_score": 0.50,
    "reported_abuse_count": 12,
    "last_reported_at": "2026-11-09T14:00:00Z"
  },
  "geoip": {
    "country_code": "US",
    "country_name": "United States",
    "city": "Ashburn",
    "latitude": 39.0438,
    "longitude": -77.4874
  },
  "asn": {
    "asn": 14618,
    "as_org": "Amazon.com, Inc.",
    "network_cidr": "198.51.100.0/24"
  },
  "ioc_matches": [
    {
      "type": "ip",
      "value": "198.51.100.42",
      "confidence": 0.75,
      "source": "system1_threat_intel_store",
      "description": "Known automated scanner"
    }
  ],
  "threat_profile": {
    "threat_level": "medium",
    "adversary_class": "Automated Scanner / Brute-Force Botnet",
    "tactics": ["Initial Access", "Credential Access"]
  },
  "risk_assessment": {
    "risk_score": 50.0,
    "severity": "medium",
    "mitigation_recommendation": "Monitor and rate limit"
  },
  "confidence": 0.50,
  "sources": ["HoneyShield-System2-Honeypot-Feed", "Local-IOC-Ledger"],
  "correlation_id": "corr-trace-20261109-001",
  "generated_at": "2026-11-09T14:30:00.500Z"
}
```

---

## 5. NETWORK EVIDENCE (PCAP) METADATA INTERFACE

**Endpoint:** `POST /api/v1/system2/evidence/pcap`
**Description:** Registers cryptographic metadata and retrieval references for raw PCAP traces residing on System 2.

### 5.1 Request Schema (`System2NetworkEvidenceRecord`)

```json
{
  "type": "object",
  "required": [
    "pcap_ref_id",
    "sensor_id",
    "capture_start",
    "capture_end",
    "packet_count",
    "byte_size",
    "sha256_digest",
    "source_ip",
    "destination_ip",
    "retrieval_endpoint"
  ],
  "properties": {
    "pcap_ref_id": {
      "type": "string",
      "minLength": 12,
      "maxLength": 64,
      "description": "Immutable reference identifier (e.g. 'pcap-cowrie-20261109-001')"
    },
    "sensor_id": {"type": "string"},
    "session_id": {"type": "string"},
    "correlation_id": {"type": "string"},
    "capture_start": {"type": "string", "format": "date-time"},
    "capture_end": {"type": "string", "format": "date-time"},
    "packet_count": {"type": "integer", "minimum": 1},
    "byte_size": {"type": "integer", "minimum": 1},
    "sha256_digest": {
      "type": "string",
      "minLength": 64,
      "maxLength": 64,
      "description": "SHA-256 digest of PCAP file for tamper-evident verification"
    },
    "source_ip": {"type": "string"},
    "destination_ip": {"type": "string"},
    "protocol_summary": {"type": "object"},
    "retrieval_endpoint": {
      "type": "string",
      "description": "Authorized REST retrieval path on System 2 (must begin with /api/v1/sensor/evidence/)"
    },
    "access_classification": {
      "type": "string",
      "enum": ["restricted", "confidential"],
      "default": "restricted"
    }
  }
}
```

### 5.2 Security Constraints
1. **No Path Traversal:** System 1 validates that `retrieval_endpoint` strictly begins with `/api/v1/sensor/evidence/` and contains neither `..` nor `\`.
2. **Immutable Audit Persistence:** Upon registration, System 1 calculates a canonical SHA-256 digest of the entire metadata payload and commits it to `SecurityEventOutbox` and `SystemEvent` audit ledgers.

---

## 6. INTEGRATION STATUS & HEALTH INTERFACE

**Endpoint:** `GET /api/v1/system2/status`
**Description:** Returns System 1's readiness to receive System 2 telemetry.

### Response Example
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
  "checked_at": "2026-11-09T14:30:00Z"
}
```
