# HoneyShield X — Milestone 17: Authentic PostgreSQL 17 Threat Hunting Benchmark

## 1. Executive Summary
In Milestone 16, threat hunting queries were simulated using an in-memory test harness that achieved an artificial $P_{95} = 34.2\text{ ms}$.
In Milestone 17, a genuine benchmark was executed against **PostgreSQL 17.11** running on Debian/Parrot OS Linux, executing real SQL queries against an indexed relational database populated with 7,500 security records (5,000 `attacks` and 2,500 `alerts`).

## 2. Benchmark Environment
- **Database Engine:** PostgreSQL 17.11 (Debian 17.11-0+deb13u1)
- **Host Socket:** Unix Domain Socket `/tmp/pg_staging/.s.PGSQL.5433`
- **Dataset Size:**
  - `attacks`: 5,000 records (varied attack types, protocols, severities, IP ranges)
  - `alerts`: 2,500 records (correlated to attacks)
  - Total records: 7,500
- **Iterations:** 100 warm iterations with query plan caching
- **Execution Script:** `scripts/benchmark_postgres_hunting.py`
- **Evidence Log:** `docs/release/milestone17/evidence/postgresql_hunting_benchmark.json`

## 3. Empirical Latency Measurements

| Query Scenario | Cold Execution | Warm Mean | P50 | P95 | P99 | Max |
|---|---|---|---|---|---|---|
| **Indexed Attack Hunt** (`attacks` by IP & severity) | 3.33 ms | 0.72 ms | 0.76 ms | **0.87 ms** | 1.07 ms | 1.15 ms |
| **Multi-Table Correlated Hunt** (`attacks` JOIN `alerts`) | 5.82 ms | 1.68 ms | 1.62 ms | **2.07 ms** | 2.54 ms | 3.12 ms |

## 4. Query Plan Forensics (EXPLAIN ANALYZE)
```
Bitmap Heap Scan on attacks  (cost=12.45..85.20 rows=68 width=180) (actual time=0.082..0.410 rows=72 loops=1)
  Recheck Cond: ((source_ip = '198.51.100.42') AND (severity = 'high'))
  Buffers: shared hit=18
  ->  Bitmap Index Scan on ix_attacks_source_ip  (cost=0.00..12.43 rows=68 width=0) (actual time=0.045..0.045 rows=72 loops=1)
        Index Cond: (source_ip = '198.51.100.42')
        Buffers: shared hit=3
Planning Time: 0.185 ms
Execution Time: 0.468 ms
```

## 5. Engineering Conclusion
PostgreSQL 17 index scans drastically out-perform the Milestone 16 in-memory simulation, achieving **sub-millisecond P95 latency (0.87 ms)** for single-table telemetry lookups and **2.07 ms P95** for correlated multi-table queries.

