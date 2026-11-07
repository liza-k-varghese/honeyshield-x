# HoneyShield X — Milestone 18: PostgreSQL 17 Threat Hunting Benchmark & Scope

## 1. Scope & Measurement Methodology
In strict compliance with **Part 20 ("Document the actual measurement scope")**, the benchmark evaluated:
- **Scope Measured:** Direct database query execution + connection round-trip via SQLAlchemy `psycopg` driver over unix domain socket.
- **Database Engine:** PostgreSQL 17.11 (Debian 17.11-0+deb13u1).
- **Dataset Size:** 7,500 real relational records (5,000 `attacks` and 2,500 `alerts`).
- **Query Filter:** Indexed lookup on `source_ip` and `severity`.
- **Query Plan:** Verified via `EXPLAIN (ANALYZE, BUFFERS)` — utilizes `Bitmap Index Scan on ix_attacks_source_ip` with 3 shared buffer hits.

## 2. Empirical Benchmark Results (100 Iterations)

| Workload Metric | Execution Time |
|---|---|
| **Cold Execution** | 1.50 ms |
| **Warm Mean Latency** | 0.67 ms |
| **Warm Median (P50)** | 0.71 ms |
| **Warm P95 Latency** | **0.88 ms** |
| **Warm P99 Latency** | 0.92 ms |
| **Multi-Table Correlated Join P95** | **2.25 ms** |

## 3. Engineering Conclusion
PostgreSQL 17 native index lookups achieve sub-millisecond $P_{95}$ performance (0.88 ms), comfortably meeting the enterprise requirement of $\le 10\text{ ms}$.
Evidence logged to `docs/release/milestone18/evidence/postgresql_hunting_benchmark.json`.

