# Milestone 15 — Multi-Operator RBAC & Isolation Governance

**System:** HoneyShield X Role-Based Access Control  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. 4-Tier SOC Role Matrix for Milestone 15 Capabilities

HoneyShield X enforces strict deterministic role boundaries across all new Milestone 15 capabilities:

| Permission Name | `viewer` | `analyst` | `incident_responder` | `security_administrator` |
|---|:---:|:---:|:---:|:---:|
| `telemetry:view` / `hunt:view` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `hunt:create` / `hunt:update` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** |
| `hunt:execute` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** |
| `hunt:admin` | DENY (403) | DENY (403) | DENY (403) | **ALLOW** |
| `evidence:attach` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** |
| `evidence:verify` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** |
| `investigation:view` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `simulation:execute` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** |
| `case:export` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `case:close` / `case:admin` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** |

---

## 2. Multi-Operator Verification & Audit Trail

- Every evidence attachment, verification check, saved hunt lifecycle change, and simulation execution is logged to `system_events`.
- Private saved hunts are strictly isolated: operators cannot view or execute private queries created by peers.
- All actions link the authenticated operator username and timestamp.

