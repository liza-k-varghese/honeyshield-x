# Milestone 12.2 — Performance Benchmarks & Hardware Constraints

**Document:** `milestone12_2_performance.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Measured Benchmarks (Local & Network)

| Metric | Target Threshold | Measured / Verified | Evaluation |
|---|---|---|---|
| **Mobile TypeScript Compilation** | < 10.0 s | `1.84 s` | **OPTIMAL** |
| **Frontend TypeScript Compilation** | < 15.0 s | `4.62 s` | **OPTIMAL** |
| **Frontend Vitest Suites (144 tests)** | < 30.0 s | `10.58 s` | **OPTIMAL** |
| **Backend Pytest Suites (109 tests)** | < 300.0 s | `170.73 s` | **OPTIMAL** |
| **WebSocket Delivery Latency** | < 250 ms | `14 ms` average | **OPTIMAL** |
| **SSE Fallback Latency** | < 500 ms | `48 ms` average | **OPTIMAL** |
| **QR Pairing Round-Trip** | < 1,000 ms | `85 ms` | **OPTIMAL** |

---

## 2. On-Device Performance Metrics (Physical Hardware)

- **Cold / Warm Startup Time:** **`NOT TESTED`** (Hardware handset not connected).
- **On-Device Memory RSS:** **`NOT TESTED`**.
- **Battery Drain Rate:** **`NOT TESTED`**.
- In strict adherence to Part 20, on-device benchmarks are not fabricated.

