# Milestone 16 — Saved Hunts Persistence & Lifecycle Audit

**Project:** HoneyShield X — Saved Hunts Engine  
**Milestone:** 16  
**Evaluation Date:** 2026-11-06  

---

## 1. Dual-Mode Storage Architecture

Saved threat hunting queries (`SavedHuntStore`) operate under a dual-mode persistence architecture:
- **Primary Tier:** Redis Hash at key `hsx:hunts:saved`. When Redis is running with standard RDB/AOF persistence, saved hunts survive backend process restarts and multi-worker deployments.
- **Fallback Tier:** Thread-safe in-memory dictionary. Activated automatically if Redis connectivity fails.

---

## 2. Cold Restart Audit & Limitations

- **Redis Active:** In staging environments with persistent Redis, queries survive server restarts and process recycling.
- **Memory Fallback Limitation:** In environments where Redis is unavailable, saved queries exist strictly in process memory and are purged on cold restarts.
- **Enterprise Requirement:** Production deployments must mandate clustered Redis with persistence enabled to ensure durable query retention.

