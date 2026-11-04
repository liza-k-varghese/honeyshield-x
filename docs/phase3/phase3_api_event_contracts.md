# HoneyShield X — Phase 3 API & Event Contracts
## Real-Time Gateway, WebSocket Protocol & Event Envelope Specifications

### 1. Security Event Envelope Schema

All real-time events published across WebSocket, SSE, and Replay endpoints conform to the following JSON schema:

```json
{
  "event_id": "9f1b4c3e-8e2b-4d6a-9a4c-5f8e1b2c3d4e",
  "event_type": "alert.created",
  "timestamp": "2026-10-30T10:15:30.123456Z",
  "schema_version": "1.0",
  "resource_id": "42",
  "severity": "critical",
  "payload": {
    "alert_id": 42,
    "attack_id": 108,
    "severity": "critical",
    "status": "open",
    "summary": "Security Alert: SSH Brute Force detected with CRITICAL risk",
    "attack_type": "SSH Brute Force"
  },
  "correlation_id": "corr-uuid-optional",
  "cursor": 154
}
```

#### Field Specifications:
- `event_id` (`string`, UUID v4): Unique event instance identifier for client deduplication.
- `event_type` (`string`): Dot-delimited qualified event name (e.g., `alert.created`, `attack.created`, `deception.canary_triggered`, `incident.updated`, `system.service_status_changed`).
- `timestamp` (`string`, ISO 8601 UTC): Generation timestamp.
- `schema_version` (`string`): Current contract schema version (`1.0`).
- `resource_id` (`string`): Primary key of the affected entity.
- `severity` (`string`): One of `"critical"`, `"high"`, `"medium"`, `"low"`, `"info"`.
- `payload` (`object`): Authorized, sanitized entity metadata. Sensitive fields (passwords, tokens, private keys) are automatically stripped.
- `cursor` (`integer`): Monotonically increasing sequence number for historical catch-up.

---

### 2. Supported Event Types

| Event Type | Producer Trigger | Severity | Minimal Payload Content |
| :--- | :--- | :---: | :--- |
| `attack.created` | New probe recorded by honeypot or ingestion | `low` - `critical` | `attack_id`, `source_ip`, `attack_type`, `risk_score` |
| `alert.created` | Threat risk score &ge; 50 or multi-vector correlation | `high` / `critical` | `alert_id`, `attack_id`, `severity`, `status`, `summary` |
| `alert.updated` | Alert acknowledged, escalated, or resolved | Inherited | `alert_id`, `status`, `severity` |
| `incident.created` | SOC case opened from high-priority alert | `high` / `critical` | `case_id`, `title`, `severity`, `assigned_to` |
| `incident.updated` | Playbook task completed, containment staged | Inherited | `case_id`, `status`, `completed_task` |
| `deception.canary_triggered` | Decoy token accessed in active grid | `critical` | `canary_id`, `canary_type`, `source_ip`, `hit_time` |
| `threat_intel.indicator_matched` | Observable matched with threat feed | `medium` - `high` | `indicator_id`, `value`, `threat_level` |
| `system.service_status_changed` | Host daemon restarted via Supervisor RPC | `medium` | `service`, `action`, `status`, `operator` |
| `system.heartbeat` | Gateway keepalive ping emitted every 15s | `info` | `status: "alive"`, `current_cursor` |

---

### 3. Real-Time Gateway Endpoints

#### 3.1 POST /api/v1/events/ticket
- **Summary:** Acquire a single-use connection ticket for authenticating WebSockets.
- **Authentication:** `Authorization: Bearer <session_token>`
- **Response (200 OK):**
  ```json
  {
    "ticket": "hsx_wstk_8f9e...32_chars",
    "expires_in": 60,
    "ws_endpoint": "/api/v1/events/ws"
  }
  ```

#### 3.2 WebSocket /api/v1/events/ws?ticket={ticket}
- **Summary:** Authenticated bidirectional event stream.
- **Protocol:**
  - Client connects with `?ticket=<ticket>`.
  - Gateway consumes ticket; if valid, sends `system.connected` frame:
    ```json
    {
      "event_type": "system.connected",
      "timestamp": "2026-10-30T10:15:00Z",
      "operator": "admin_chief",
      "role": "security_administrator",
      "current_cursor": 154
    }
    ```
  - Gateway pushes `SecurityEventEnvelope` frames matching operator permissions.
  - Client sends `{"type": "ping"}`; Gateway responds with `{"event_type": "system.pong", "cursor": 154}`.
- **Closure Codes:**
  - `4401`: Missing ticket.
  - `4403`: Expired, tampered, or already-consumed ticket.
  - `4429`: Connection limit exceeded (&gt; 5 concurrent connections for operator).

#### 3.3 GET /api/v1/events/replay
- **Summary:** Retrieve historical security events occurring since the specified cursor.
- **Query Parameters:**
  - `since_cursor` (`integer`, optional): Last acknowledged event cursor.
  - `limit` (`integer`, default: 50, max: 200).
- **Authentication:** `Authorization: Bearer <session_token>`
- **Response (200 OK):**
  ```json
  {
    "events": [ ... ],
    "next_cursor": 154,
    "total": 12,
    "has_more": false
  }
  ```

---

### 4. Push Notification & Preference Contracts

#### 4.1 POST /api/v1/mobile/device/register
```json
{
  "push_token": "ExponentPushToken[AbCdEf123456]",
  "platform": "android",
  "metadata": {
    "brand": "Google",
    "modelName": "Pixel 8 Pro",
    "osVersion": "14",
    "platformApiLevel": 34
  }
}
```

#### 4.2 GET / PUT /api/v1/mobile/preferences
```json
{
  "min_severity": "HIGH",
  "enable_canary_push": true,
  "enable_governor_stepup_push": true,
  "enable_service_failure_push": true,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "categories": [
    "attacks",
    "alerts",
    "deception",
    "incidents",
    "service"
  ]
}
```

