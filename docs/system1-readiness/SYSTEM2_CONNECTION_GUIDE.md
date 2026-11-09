# HONEYSHIELD X — SYSTEM 2 CONNECTION & OPERATIONAL ONBOARDING GUIDE

**Document ID:** `HSX-GUIDE-SYS2-001`
**Target Audience:** DevSecOps Engineers, System Administrators, SOC Integrators
**Scope:** Procedure to physically connect, configure, and onboard **System 2** (Honeypot, Network Monitoring, and Threat Intelligence Engine) to **System 1** (Central SOC Platform).

---

## 1. PHYSICAL & LOGICAL ARCHITECTURE OVERVIEW

HoneyShield X deploys across two dedicated physical systems to isolate vulnerable decoy services from production SOC infrastructure:

```
+-------------------------------------------------------------+
|                          SYSTEM 1                           |
|       Central SOC Platform & Security Operations Engine     |
|                                                             |
|  - Management IP: 10.0.1.10 (Eth0)                          |
|  - PostgreSQL 17 (Port 5432)                                |
|  - Redis 7 Event Broker (Port 6379)                         |
|  - FastAPI Backend API (Port 8000)                          |
|  - React 19 Frontend Web Console (Port 5173 / 5174)         |
|  - Digital Agent Universe (SCOUT, NEXUS, SENTINEL, ORACLE)  |
|  - Security & Detection Correlation Engines                 |
+-------------------------------------------------------------+
                              ^
                              | Dedicated Integration Link
                              | (HTTPS / X-System2-Sensor-Key)
                              v
+-------------------------------------------------------------+
|                          SYSTEM 2                           |
|  Honeypot, Network Monitoring & Threat Intelligence Engine  |
|                                                             |
|  - Ingestion Transit IP: 10.0.1.20 (Eth0 - Management)      |
|  - Decoy Listener IP: 10.0.10.0/24 (Eth1 - DMZ / Decoy)     |
|  - Sensors: Cowrie (SSH/Telnet), OpenCanary, Dionaea        |
|  - Network Monitors: Zeek (Bro), Suricata IDS/IPS           |
|  - Packet Capture: Dumpcap ring buffers (PCAP storage)      |
|  - System 2 Forwarder Agent: `system2-telemetry-forwarder`   |
+-------------------------------------------------------------+
```

---

## 2. PRE-REQUISITES & NETWORK CONFIGURATION

### 2.1 Interface Assignment on System 2
- **Interface 1 (`eth0` - Management):** Connects to the secure internal management switch.
  - IP: `10.0.1.20/24`
  - Gateway: `10.0.1.1`
  - Routes directly to System 1 (`10.0.1.10`) on TCP port 8000 (Production: 443).
- **Interface 2 (`eth1` - Deception/DMZ):** Connects to the decoy network segment or span/mirror port.
  - IP: Assigned to decoy subnet (e.g. `10.0.10.22/24`).
  - No default routing to corporate assets.
  - Promiscuous mode enabled for Zeek and Suricata.

### 2.2 Firewall Rules on System 1
Ensure System 1's firewall permits incoming telemetry from System 2:
```bash
# Allow System 2 Management IP to access System 1 API
sudo iptables -A INPUT -p tcp -s 10.0.1.20 --dport 8000 -j ACCEPT
# Reject all incoming traffic from System 2 Decoy interface
sudo iptables -A INPUT -s 10.0.10.0/24 -j DROP
```

---

## 3. STEP-BY-STEP SENSOR CONFIGURATION ON SYSTEM 2

### 3.1 Cowrie SSH/Telnet Honeypot Setup
1. Install Cowrie inside an isolated virtual environment:
   ```bash
   sudo apt-get install -y git python3-venv libssl-dev libffi-dev build-essential
   git clone http://github.com/micheloosterhof/cowrie.git /opt/cowrie
   cd /opt/cowrie && python3 -m venv cowrie-env
   source cowrie-env/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
   ```
2. Configure `/opt/cowrie/etc/cowrie.cfg`:
   ```ini
   [honeypot]
   hostname = srv-prod-gateway01
   log_path = /var/log/cowrie
   [ssh]
   enabled = true
   listen_port = 2222
   [output_jsonlog]
   enabled = true
   logfile = /var/log/cowrie/cowrie.json
   ```
3. Redirect external port 22 on the decoy interface to Cowrie:
   ```bash
   sudo iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 22 -j REDIRECT --to-port 2222
   ```

### 3.2 OpenCanary Multi-Protocol Decoy Setup
1. Install OpenCanary:
   ```bash
   sudo pip install opencanary
   ```
2. Configure `/etc/opencanaryd/opencanary.conf` to monitor ports (FTP, HTTP, SMB):
   ```json
   {
     "device.node_id": "sensor-opencanary-dmz-01",
     "ftp.enabled": true,
     "ftp.port": 21,
     "http.enabled": true,
     "http.port": 80,
     "smb.enabled": true,
     "smb.port": 445,
     "logger": {
       "class": "PyDotLog",
       "kwargs": {
         "formatters": {"plain": {"format": "%(message)s"}},
         "handlers": {"file": {"class": "logging.FileHandler", "filename": "/var/log/opencanary.json"}}
       }
     }
   }
   ```

### 3.3 Suricata Network IDS Setup
1. Configure Suricata on the span/mirror interface (`eth1`):
   ```yaml
   # /etc/suricata/suricata.yaml
   af-packet:
     - interface: eth1
       cluster-id: 99
       cluster-type: cluster_flow
       defrag: yes
   outputs:
     - eve-log:
         enabled: yes
         filetype: regular
         filename: /var/log/suricata/eve.json
         types:
           - alert:
               payload: yes
               payload-buffer-size: 4kb
               packet: yes
   ```

---

## 4. SYSTEM 2 TELEMETRY FORWARDER AGENT

To forward telemetry from `/var/log/cowrie/cowrie.json`, `/var/log/opencanary.json`, and `/var/log/suricata/eve.json` to System 1, deploy the standard HoneyShield X forwarder daemon on System 2:

```python
#!/usr/bin/env python3
# /opt/honeyshield/forwarder.py
import json, time, urllib.request, uuid

SYSTEM1_URL = "http://10.0.1.10:8000/api/v1/system2/telemetry/ingest"
SENSOR_KEY = "hsx-system2-sensor-token-secret-key-2026"

def forward_event(sensor_id, sensor_type, category, src_ip, msg, raw):
    payload = {
        "sensor_id": sensor_id,
        "sensor_type": sensor_type,
        "event_id": f"evt-{uuid.uuid4().hex[:12]}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_ip": src_ip,
        "attack_category": category,
        "message": msg,
        "data_provenance": "operational_sensor",
        "raw_payload": raw
    }
    req = urllib.request.Request(
        SYSTEM1_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-System2-Sensor-Key": SENSOR_KEY},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status
```

---

## 5. PCAP BUFFER STORAGE & RETRIEVAL SERVICE

1. Run continuous rotating packet capture on System 2:
   ```bash
   dumpcap -i eth1 -b filesize:50000 -b files:200 -w /var/log/honeyshield/pcap/capture.pcap
   ```
2. When an intrusion alert triggers, the forwarder extracts the relevant slice and calculates SHA-256:
   ```bash
   sha256sum /var/log/honeyshield/pcap/incident_slice.pcap
   ```
3. System 2 registers metadata with System 1 via `POST /api/v1/system2/evidence/pcap`.
4. Authorized SOC analysts retrieve the packet capture via authenticated GET on System 2:
   `GET /api/v1/sensor/evidence/pcap/<pcap_ref_id>.pcap`

---

## 6. ONBOARDING & VERIFICATION PROCEDURE

When physical System 2 hardware is powered on and connected:

### Step 1: Connectivity Preflight
Verify network reachability from System 2 to System 1:
```bash
ping -c 3 10.0.1.10
curl -f http://10.0.1.10:8000/health
```

### Step 2: System 1 Integration Status
Query the integration status contract:
```bash
curl -s http://10.0.1.10:8000/api/v1/system2/status
# Expected: {"system1_status": "INTEGRATION_READY", ...}
```

### Step 3: Run Integration Test Harness
From System 2, run the verified integration harness to confirm end-to-end communication:
```bash
python scripts/system2_integration_harness.py --url http://10.0.1.10:8000
```
Expected output:
```
ALL SYSTEM 2 INTEGRATION SCENARIOS EXECUTED SUCCESSFULLY [100% PASS]
```

### Step 4: Verify SOC Dashboard
Log into the HoneyShield X SOC Console on System 1 (`http://10.0.1.10:5173/`).
Confirm that incoming test telemetry from System 2 appears under:
1. **Threats & Alerts:** Alert generated and classified.
2. **Security Overview:** Event counts updated.
3. **Digital Agent Universe:** SCOUT and NEXUS icons reflect active processing.
4. **Audit Trail:** Ingestion and correlation actions logged with cryptographic digests.
