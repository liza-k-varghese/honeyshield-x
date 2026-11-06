# Milestone 12 — Mobile-Backend API Compatibility Audit

**Document:** `milestone12_api_compatibility.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. REST Endpoint Contract Matrix

| Endpoint | Method | Mobile Client Hook | Auth / Security Boundary |
|---|---|---|---|
| `/api/v1/auth/login` | `POST` | `authApi.login()` | Operator credentials -> JWT Access/Refresh tokens |
| `/api/v1/auth/pair/initiate` | `POST` | `authApi.initiatePairing()` | Admin step-up approval required; emits 180s TTL token |
| `/api/v1/auth/pair/complete` | `POST` | `authApi.completePairing()` | Device fingerprint + single-use challenge exchange |
| `/api/v1/auth/devices` | `GET` | `devicesApi.getDevices()` | Scoped device list for active operator |
| `/api/v1/auth/devices/{id}/revoke`| `DELETE` | `devicesApi.revokeDevice()` | Instant device revocation, token blacklisting |
| `/api/v1/attacks/recent` | `GET` | `socApi.getRecentAttacks()` | Telemetry attack events feed |
| `/api/v1/alerts` | `GET` | `socApi.getAlerts()` | Multi-vector detection alerts list |
| `/api/v1/canaries` | `GET` | `deceptionApi.getCanaries()` | Minted tripwire tokens |
| `/api/v1/canaries/mint` | `POST` | `deceptionApi.mintCanary()` | Dynamic tripwire token deployment |
| `/api/v1/canary-hits` | `GET` | `deceptionApi.getCanaryHits()` | Adversary canary interactions |
| `/api/v1/decoys` | `GET` | `deceptionApi.getDecoyHosts()` | Emulated honeypot hosts |
| `/api/v1/intel/indicators` | `GET` | `intelApi.getIndicators()` | High-confidence STIX/TAXII IoCs |
| `/api/v1/intel/campaigns` | `GET` | `intelApi.getCampaigns()` | Tracked adversary campaigns |
| `/api/v1/intel/lookup` | `POST` | `intelApi.lookupIndicator()` | Real-time threat indicator enrichment |
| `/api/v1/cases` | `GET` | `casesApi.getCases()` | SOAR incident response playbooks |
| `/api/v1/governor/containment` | `POST` | `governorApi.executeContainment()` | Level-3 host isolation, dry-run simulation |

All endpoints strictly adhere to JSON contract schemas validated by `backend/tests/test_mobile_api_contract.py`.

