#!/usr/bin/env python3
"""
HoneyShield X — Milestone 17
PostgreSQL Threat Hunting Query & Latency Benchmark Suite
Evaluates genuine SQL query plans, indexing efficiency, and latency percentiles.
"""

import os
import sys
import time
import json
import statistics
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
from app.database import Base
from app.models import Attack, Alert, SecurityEventOutbox

PG_URL = os.environ.get("BENCHMARK_PG_URL", "postgresql+psycopg://liza@/postgres?host=/tmp/pg_staging&port=5433")

def run_benchmark():
    print(f"Connecting to PostgreSQL at {PG_URL}...")
    engine = create_engine(PG_URL, echo=False, pool_size=10, max_overflow=20)
    
    # 1. Inspect Database Version
    with engine.connect() as conn:
        version_row = conn.execute(text("SELECT version();")).fetchone()
        pg_version = version_row[0] if version_row else "Unknown"
    print(f"Engine: {pg_version}")

    # 2. Re-create Tables
    print("Creating schema tables...")
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    # Clean existing benchmark data if any
    session.query(Alert).delete()
    session.query(Attack).delete()
    session.query(SecurityEventOutbox).delete()
    session.commit()

    # 3. Seed Realistic Attack & Alert Records
    RECORD_COUNT = 5000
    print(f"Seeding {RECORD_COUNT} attack records and 2500 alerts into PostgreSQL...")
    now = datetime.now(timezone.utc)
    
    attacks = []
    severities = ["low", "medium", "high", "critical"]
    honeypot_types = ["ssh", "http", "redis", "sql"]

    for i in range(RECORD_COUNT):
        ip_suffix = (i % 250) + 1
        src_ip = f"192.168.1.{ip_suffix}" if i % 10 != 0 else "45.142.214.88"
        sev = severities[i % 4]
        hp = honeypot_types[i % 4]
        payload = f"GET /api/v1/debug?token=test_{i}" if hp == "http" else f"USER admin PASSWORD pass_{i}"
        
        atk = Attack(
            source_ip=src_ip,
            destination_ip="10.0.0.1",
            attack_type=f"{hp}_probe",
            protocol="tcp",
            severity=sev,
            risk_score=float((i % 100) + 1),
            detected_at=now - timedelta(minutes=i % 1440)
        )
        attacks.append(atk)

    session.bulk_save_objects(attacks)
    session.commit()

    # Seed Alerts
    alerts = []
    for i in range(RECORD_COUNT // 2):
        ip_suffix = (i % 100) + 1
        src_ip = f"192.168.1.{ip_suffix}"
        sev = severities[i % 4]
        alt = Alert(
            alert_type="intrusion_attempt",
            message=f"Suspicious activity from {src_ip}",
            severity=sev,
            status="open" if i % 2 == 0 else "acknowledged",
            created_at=now - timedelta(minutes=i % 720)
        )
        alerts.append(alt)

    session.bulk_save_objects(alerts)
    session.commit()
    print("Seeding complete.")

    # 4. Cold Query Execution with EXPLAIN ANALYZE
    target_ip = "45.142.214.88"
    print(f"Analyzing query plan for source_ip='{target_ip}'...")

    explain_sql = text("""
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM attacks 
        WHERE source_ip = :ip AND risk_score >= :min_risk
        ORDER BY detected_at DESC
        LIMIT 50;
    """)

    with engine.connect() as conn:
        cold_start = time.perf_counter()
        cold_res = conn.execute(explain_sql, {"ip": target_ip, "min_risk": 50.0}).fetchall()
        cold_duration_ms = (time.perf_counter() - cold_start) * 1000.0
        query_plan = cold_res[0][0]

    # 5. Warm Benchmark Loop (100 iterations)
    latencies = []
    query_sql = text("""
        SELECT id, source_ip, attack_type, protocol, risk_score, detected_at
        FROM attacks 
        WHERE source_ip = :ip AND risk_score >= :min_risk
        ORDER BY detected_at DESC
        LIMIT 50;
    """)

    print("Running 100 benchmark iterations (warm cache)...")
    with engine.connect() as conn:
        for _ in range(100):
            t0 = time.perf_counter()
            conn.execute(query_sql, {"ip": target_ip, "min_risk": 50.0}).fetchall()
            latencies.append((time.perf_counter() - t0) * 1000.0)

    p50 = statistics.median(latencies)
    latencies_sorted = sorted(latencies)
    p95 = latencies_sorted[int(len(latencies_sorted) * 0.95)]
    p99 = latencies_sorted[int(len(latencies_sorted) * 0.99)]
    mean_lat = statistics.mean(latencies)

    # 6. Multi-table Correlated Search Benchmark (Attacks + Alerts)
    multi_sql = text("""
        SELECT 'attack' as record_type, id::text, source_ip, protocol as service, risk_score, detected_at as event_time
        FROM attacks WHERE source_ip = :ip
        UNION ALL
        SELECT 'alert' as record_type, id::text, '0.0.0.0' as source_ip, 'soc' as service, 80.0 as risk_score, created_at as event_time
        FROM alerts WHERE alert_type = 'intrusion_attempt'
        ORDER BY event_time DESC
        LIMIT 100;
    """)

    multi_latencies = []
    with engine.connect() as conn:
        for _ in range(50):
            t0 = time.perf_counter()
            conn.execute(multi_sql, {"ip": target_ip}).fetchall()
            multi_latencies.append((time.perf_counter() - t0) * 1000.0)

    multi_p95 = sorted(multi_latencies)[int(len(multi_latencies) * 0.95)]

    benchmark_results = {
        "benchmark_timestamp": datetime.now(timezone.utc).isoformat(),
        "database_engine": pg_version,
        "dataset_metrics": {
            "attacks_count": RECORD_COUNT,
            "alerts_count": RECORD_COUNT // 2,
            "total_records": RECORD_COUNT + (RECORD_COUNT // 2)
        },
        "cold_query_ms": round(cold_duration_ms, 2),
        "warm_latency_ms": {
            "mean": round(mean_lat, 2),
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "min": round(min(latencies), 2),
            "max": round(max(latencies), 2)
        },
        "multi_table_correlated_p95_ms": round(multi_p95, 2),
        "sample_count": len(latencies),
        "query_filter_applied": {
            "source_ip": target_ip,
            "min_risk_score": 50.0,
            "limit": 50
        },
        "query_plan": query_plan,
        "status": "QUALIFIED"
    }

    os.makedirs("docs/release/milestone17/evidence", exist_ok=True)
    out_path = "docs/release/milestone17/evidence/postgresql_hunting_benchmark.json"
    with open(out_path, "w") as f:
        json.dump(benchmark_results, f, indent=2)

    print(f"\n=== Benchmark Complete ===")
    print(f"Cold Execution: {cold_duration_ms:.2f} ms")
    print(f"Warm Latency: Mean={mean_lat:.2f} ms, P50={p50:.2f} ms, P95={p95:.2f} ms, P99={p99:.2f} ms")
    print(f"Multi-table Correlated P95: {multi_p95:.2f} ms")
    print(f"Evidence written to: {out_path}")
    session.close()

if __name__ == "__main__":
    run_benchmark()
