# Milestone 8 — Operational Health Monitoring System

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-06  

---

## 1. Architectural Intent

HoneyShield X requires unified operational health monitoring to distinguish real infrastructure states without leaking internal secrets or manufacturing synthetic sensor activity.

---

## 2. 13-Subsystem Health Evaluation Architecture

Located at `backend/app/observability/health.py`:
Each subsystem is evaluated using real programmatic probes and classified strictly into one of five statuses:
- `HEALTHY`: Operational and responsive within nominal parameters.
- `DEGRADED`: Operating with degraded performance or engaging fallback resilience (e.g. Redis offline with PostgreSQL outbox fallback active).
- `UNAVAILABLE`: Critical dependency offline or failing health check.
- `NOT_CONFIGURED`: Integration not provisioned or deployed in the current environment.
- `UNKNOWN`: Probe inconclusive.

---

## 3. Subsystem Health Matrix

| # | Subsystem | Probe Mechanism | Evaluated Status | Detail / Behavior |
| :- | :--- | :--- | :--- | :--- |
| 1 | **FastAPI Backend** | Process uptime & version probe | **HEALTHY** | Uptime tracked, version `v1.0.0-rc5`, zero unhandled lifecycle exceptions. |
| 2 | **PostgreSQL** | `SELECT 1` query via SQLAlchemy / Psycopg | **HEALTHY** | Measures connection latency (`< 5ms`). Direct connect timeout capped at 2.0s. |
| 3 | **Redis** | Redis ping with 1.5s timeout | **HEALTHY / DEGRADED** | If Redis is unreachable, platform logs warning and safely engages PostgreSQL outbox fallback (`DEGRADED`). |
| 4 | **Event Outbox Publisher** | Cursor sequence & backlog depth query | **HEALTHY** | Confirms monotonic sequence; backlog < 50 items. Guaranteed at-least-once delivery. |
| 5 | **WebSocket Gateway** | Active connection count & limit check | **HEALTHY** | Enforces 5 connections per operator; maintains 15s ping/pong keepalives. |
| 6 | **SSE Fallback** | Streaming route readiness | **HEALTHY** | Accessible via `Authorization: Bearer <token>` header on `/api/v1/events/stream`. |
| 7 | **Ingestion Service** | Ingest buffer & error rate check | **HEALTHY** | Rejects un-bounded payloads (>10,000 chars); defaults risk scores to 0.0. |
| 8 | **Detection Engine** | Rule catalog & analysis probe | **HEALTHY** | SSH brute-force detection rule active with dynamic threshold evaluation. |
| 9 | **Threat Intelligence** | Local indicator store & lookup probe | **HEALTHY** | Exact IP/hash matching; exponential temporal decay enabled. |
| 10 | **Alert Evaluator** | Threshold evaluation & dedup probe | **HEALTHY** | Enforces 50.0 risk score cutoff; deduplicates open/acknowledged alerts. |
| 11 | **Push Dispatcher** | Notification queue & device registry | **HEALTHY** | Real-time WebSocket bridge active; zero sensitive PII in push payloads. |
| 12 | **Honeypot Sensors** | Deception grid registry & socket probes | **TRUTH REPORTED** | Canary honeytokens (`HEALTHY`); Cowrie, Dionaea, OpenCanary, Zeek (`NOT_CONFIGURED`). |
| 13 | **Digital Agent Universe** | Agent registration & motion engine | **HEALTHY** | SCOUT, NEXUS, ORACLE, and SENTINEL registered in `READY` state. |

---

## 4. Endpoints

- **Public Lightweight Health:** `GET /health` (Returns overall status, service name, and sanitized status without leaking connection strings).
- **Authorized Detailed Health:** `GET /api/v1/system/health/detailed` (Requires authenticated operator; returns full 13-subsystem diagnostics with latencies).

