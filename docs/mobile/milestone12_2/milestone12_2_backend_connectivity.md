# Milestone 12.2 — Backend Network Connectivity & Host Addressing Model

**Document:** `milestone12_2_backend_connectivity.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Network Topology & Addressing Model

HoneyShield X operates across three operational networking contexts:

| Operational Context | Mobile Client Network Path | Addressing Requirement | Status |
|---|---|---|---|
| **Local Workstation / Web** | `http://127.0.0.1:8000` | Loopback on Parrot OS host | **ACTIVE & VERIFIED** |
| **Android Virtual Device (AVD)** | `http://10.0.2.2:8000` | Android QEMU NAT loopback redirect | Supported via Config |
| **Physical Field Handset** | `https://soc.honeyshield.local` | Protected LAN IP / Reverse Proxy TLS | Supported via Config |

### Addressing Anti-Pattern Guard
- **Critical Invariant:** The mobile application code does not hardcode `127.0.0.1`. Inside an Android Linux sandbox, `127.0.0.1` refers exclusively to the phone's loopback interface.
- **Implementation:** All REST API clients in `mobile/src/api/` resolve `BASE_URL` dynamically from environment configuration (`HONEYSHIELD_API_BASE_URL`).

---

## 2. Protected Staging Backend Endpoints

The backend services running under FastAPI and PostgreSQL expose:
- REST API: `/api/v1/` (Auth, Attacks, Alerts, Canaries, Threat Intel, Cases, Devices, Governor).
- Primary Streaming: `/ws/events` (Ticket-authenticated WebSocket).
- Fallback Streaming: `/api/v1/events/stream` (Secure header-authenticated Server-Sent Events).
- Health & Observability: `/api/v1/health` and `/api/v1/metrics`.

All endpoints are validated through automated contract suites ([`test_mobile_api_contract.py`](file:///home/liza/HoneyShield-X/backend/tests/test_mobile_api_contract.py)).

