# HONEYSHIELD X — REMAINING WORK & SYSTEM 2 ONBOARDING ROADMAP

**Document ID:** `HSX-ROADMAP-SYS2-001`
**Classification:** Operational Engineering Plan
**Target Architecture:** Two-Physical-System Distributed Cybersecurity Operations Platform
- **SYSTEM 1:** Central SOC Platform and Security Operations Engine (*Current Physical Machine*)
- **SYSTEM 2:** Integrated Honeypot, Network Monitoring, and Threat Intelligence Engine (*Future Physical Machine*)
**Git Baseline Commit:** `6381f3080a7abc5f1bef65e152ce45f739f0b711`
**Status:** **AWAITING SYSTEM 2 PHYSICAL HARDWARE**

---

## 1. PURPOSE & ARCHITECTURAL BOUNDARIES

System 1 has reached complete **SYSTEM 1 INTEGRATION READY** status. All backend and frontend pipelines, PostgreSQL databases, Redis messaging, detection rules, multi-event correlation, Digital Agent Universe state machines, and System 2 integration ingestion endpoints are active and verified.

Under the core architecture directive:
> **DO NOT deploy live honeypots or expose deliberately vulnerable services on System 1.**

Therefore, all remaining engineering activities relate specifically to provisioning the future **System 2** physical hardware, deploying its isolated honeypots, configuring its network taps, and establishing mutual TLS communication with System 1.

This document serves as the complete, actionable task checklist for when the System 2 machine becomes physically available.

---

## 2. DEFERRED WORK BREAKDOWN & DETAILED TASK MATRIX

| Task ID | Task Description | Status | Relevant Files | Actual Changes Made on System 1 | Tests Performed | Evidence | Remaining Issues | Approval Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RW-01** | **Physical Hardware Provisioning & OS Installation** | **PENDING HARDWARE** | `docs/system1-readiness/SYSTEM2_CONNECTION_GUIDE.md` | Documented minimum hardware specs (8 cores, 32GB RAM, 2x 1Gbps NICs, Linux Kernel 6.8+) | Specification review | Hardware guide Section 2 | Physical machine procurement and rack/desk installation | **YES** (Operator hardware provisioning) |
| **RW-02** | **Dual Network Interface Configuration** | **PENDING HARDWARE** | `docs/system1-readiness/SYSTEM2_CONNECTION_GUIDE.md` | Defined network topology: `eth0` (Management: 10.0.1.20) and `eth1` (Decoy/DMZ: 10.0.10.0/24) | Static network route planning | Connection Guide Section 2.1 | Physical patch cabling and VLAN assignment on network switch | **YES** (Network admin authorization) |
| **RW-03** | **Mutual TLS (mTLS) Certificate Authority Setup** | **PENDING HARDWARE** | `docs/system1-readiness/SYSTEM2_INTEGRATION_CONTRACT.md` | Implemented bearer token and sensor key authentication (`X-System2-Sensor-Key`) | Token authentication unit tests pass | System 2 router unit tests | Generation of internal CA, System 1 server cert, and System 2 client cert | **YES** (Security administrator approval) |
| **RW-04** | **Cowrie SSH & Telnet Decoy Deployment** | **PENDING HARDWARE** | `backend/app/system2_integration/schemas.py` | Built normalized schema for Cowrie SSH events; validated in 13-stage E2E test | Synthetic Cowrie test scenario passes (100%) | E2E verification evidence JSON | Containerized Cowrie deployment on System 2 binding to decoy ports 22/2222 | No (Internal to System 2) |
| **RW-05** | **OpenCanary Multi-Service Deception Deployment** | **PENDING HARDWARE** | `backend/app/system2_integration/schemas.py` | Built normalized schema for OpenCanary sweep events | Synthetic OpenCanary scenario passes (8 ports) | Integration harness test output | OpenCanary service configuration and decoy port binding on System 2 | No (Internal to System 2) |
| **RW-06** | **Dionaea Malware Capture Decoy Deployment** | **PENDING HARDWARE** | `backend/app/system2_integration/schemas.py` | Prepared generic sensor event model for Dionaea binary captures | Schema validation tests pass | `backend/tests/test_system2_integration.py` | Dionaea deployment inside isolated sandbox container on System 2 | No (Internal to System 2) |
| **RW-07** | **Physical Network TAP / SPAN Port Mirroring** | **PENDING HARDWARE** | `docs/system1-readiness/SYSTEM2_CONNECTION_GUIDE.md` | Configured System 1 to process PCAP metadata digests | Path traversal and SHA-256 digest tests pass | Integration harness Scenario 6 | Switch port mirror configuration to feed `eth1` in promiscuous mode | **YES** (Network infrastructure approval) |
| **RW-08** | **Suricata IDS/IPS Deployment & Rule Tuning** | **PENDING HARDWARE** | `backend/app/system2_integration/schemas.py` | Configured Suricata alert normalization and outbox publishing | Synthetic Suricata alert scenario passes | Integration harness Scenario 6 | Suricata daemon installation and ET Open rule set updates on System 2 | No (Internal to System 2) |
| **RW-09** | **Zeek Protocol Analyzer Deployment** | **PENDING HARDWARE** | `backend/app/system2_integration/schemas.py` | Prepared Zeek connection and notice log ingestion schema | Schema validation tests pass | Schema unit tests pass | Zeek service configuration and cluster startup on System 2 | No (Internal to System 2) |
| **RW-10** | **Rotating PCAP Ring Buffer Implementation** | **PENDING HARDWARE** | `backend/app/routers/system2_integration.py` | Implemented `POST /api/v1/system2/evidence/pcap` metadata endpoint with digest validation | Traversals blocked with HTTP 400 | Evidence router tests pass | `dumpcap` daemon deployment with 50GB rotating FIFO ring buffer on System 2 | No (Internal to System 2) |
| **RW-11** | **System 2 Telemetry Forwarder Agent** | **PENDING HARDWARE** | `docs/system1-readiness/SYSTEM2_CONNECTION_GUIDE.md` | Created reference forwarder agent architecture and buffering queue design | Ingestion endpoint verified via Python script | Script execution logs | Packaging and systemd service installation of forwarder on System 2 | No (Internal to System 2) |
| **RW-12** | **End-to-End Live Sensor Smoke Test** | **PENDING HARDWARE** | `scripts/system2_integration_harness.py` | Built synthetic test harness validating all 7 real-world scenarios against live API | 7/7 harness scenarios pass | Harness terminal output | Live trigger from System 2 decoys verified in System 1 SOC console | **YES** (Operator acceptance walkthrough) |
| **RW-13** | **Production Staging Destination Authorization** | **OPERATOR CONTROLLED** | `docker/docker-compose.staging.yml` | Staging container environment isolated, hardened, and verified with dedicated secrets | Preflight launcher test passes | Launcher smoke test output | Explicit operator sign-off for destination host / network target | **YES** (Operator authorization required) |
| **RW-14** | **Final v1.0.0 Release Tagging & Sign-Off** | **OPERATOR CONTROLLED** | `docs/system1-readiness/SYSTEM1_COMPLETION_REPORT.md` | Full audit report compiled; 834 automated tests passing fresh | Complete test suite passes (0 failures) | Milestone reports and test summaries | Formal operator signature on release gate G64 | **YES** (Release authority approval) |

---

## 3. STEP-BY-STEP SYSTEM 2 ONBOARDING PROCEDURE

When the physical System 2 machine is delivered, follow this sequence:

### Step 1: System 2 Operating System & Networking
1. Install standard Linux OS (Parrot OS Security or Debian 12 / Ubuntu 24.04 LTS).
2. Configure network interfaces:
   ```bash
   # /etc/network/interfaces or Netplan:
   # eth0: Management (10.0.1.20/24) -> Gateway 10.0.1.1
   # eth1: Decoy / SPAN TAP (Promiscuous mode, no IP or Decoy IP 10.0.10.22/24)
   ```
3. Verify ping connectivity from System 2 to System 1 (`10.0.1.10`).

### Step 2: Establish Secure Ingestion Credentials
1. Generate a strong cryptographic sensor token on System 1:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
2. Store the token in System 1's environment: `SYSTEM2_SENSOR_KEY=<generated_token>`.
3. Configure the identical token on System 2 in `/etc/honeyshield/forwarder.env`:
   ```bash
   HONEYSHIELD_ENDPOINT="https://10.0.1.10:8000/api/v1/system2"
   HONEYSHIELD_SENSOR_KEY="<generated_token>"
   ```

### Step 3: Deploy Sensors & Deception Services on System 2
1. Launch Cowrie SSH/Telnet container listening on `eth1:22` and `eth1:23`.
2. Launch OpenCanary listening on ports 21 (FTP), 80 (HTTP), 443 (HTTPS), 3306 (MySQL), 3389 (RDP).
3. Start Suricata IDS listening on `eth1` in passive capture mode.
4. Start Zeek network security monitor analyzing traffic on `eth1`.
5. Configure `dumpcap` for rolling packet capture:
   ```bash
   dumpcap -i eth1 -b filesize:50000 -b files:10 -w /var/log/honeyshield/pcap/sensor_capture.pcap
   ```

### Step 4: Deploy & Start System 2 Forwarder Agent
1. Deploy the telemetry forwarder daemon on System 2.
2. The daemon monitors:
   - `/var/log/cowrie/cowrie.json`
   - `/var/log/opencanary/opencanary.log`
   - `/var/log/suricata/eve.json`
3. Normalize records according to `SYSTEM2_INTEGRATION_CONTRACT.md`.
4. Stream records to System 1 via `POST /api/v1/system2/telemetry/ingest`.

### Step 5: Live End-to-End Validation
1. Trigger a synthetic probe against System 2's Cowrie SSH listener:
   ```bash
   ssh -p 22 invaliduser@10.0.10.22
   ```
2. Observe System 1's SOC Console on `http://10.0.1.10:5173`:
   - Real-time notification appears on WebSocket feed.
   - Attack record generated with provenance `operational_sensor`.
   - Alert generated for SSH brute-force activity.
   - Digital Agent Universe reflects agent investigation lifecycle.

---

## 4. CONCLUSION

System 1 development is complete and verified. No further modifications to System 1's core architecture, database, detection engines, or UI components are required. Once System 2 hardware is delivered, the DevSecOps team can proceed directly with Step 1 above.
