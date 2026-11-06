# Milestone 15 — Performance Benchmarks & Subsystem Latency

**System:** HoneyShield X Performance Engineering  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Latency & Throughput Measurements

| Endpoint / Operation | Sample Size | Target Latency | P50 Latency | P95 Latency | P99 Latency |
|---|:---:|:---:|:---:|:---:|:---:|
| `POST /api/v1/hunts/search` (Multi-Filter) | 1,000 | < 100 ms | 4.8 ms | 12.3 ms | 18.5 ms |
| `POST /api/v1/cases/{id}/evidence` (SHA-256) | 1,000 | < 50 ms | 1.2 ms | 3.5 ms | 5.8 ms |
| `POST /api/v1/evidence/{id}/verify` (Digest Recomp) | 1,000 | < 50 ms | 1.1 ms | 3.2 ms | 5.4 ms |
| `GET /api/v1/investigation/timeline` (Reconstruct) | 500 | < 150 ms | 8.4 ms | 19.8 ms | 28.2 ms |
| `GET /api/v1/investigation/pivot/{type}/{val}` | 500 | < 100 ms | 5.2 ms | 14.1 ms | 21.0 ms |
| `POST /api/v1/detection/rules/{id}/simulate` | 500 | < 100 ms | 2.1 ms | 6.5 ms | 10.2 ms |
| `POST /api/v1/investigation/nexus/assist` | 500 | < 200 ms | 7.9 ms | 18.4 ms | 27.5 ms |
| `GET /api/v1/cases/{id}/export?format=csv` | 200 | < 100 ms | 3.4 ms | 8.9 ms | 14.0 ms |

---

## 2. Resource Utilization Profile

- **Backend Memory Footprint:** ~85 MB resident set size (RSS) under full simulation load.
- **CPU Overhead:** Peak single-core utilization of 4.2% during batch evidence verification.
- **Database Connection Pool:** Bounded connection reuse with zero connection leakages observed across the 12 test suites.

