# Milestone 15 — Threat Intelligence Pivoting & Observable Correlation

**System:** HoneyShield X IOC Pivoting Engine  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. IOC Pivot Capabilities

The Threat Intelligence Pivot endpoint (`GET /api/v1/investigation/pivot/{indicator_type}/{indicator_value}`) enables rapid bi-directional cross-system navigation:
- Supported indicator types: `ip`, `domain`, `hash_md5`, `hash_sha256`, `url`.
- Automatically aggregates:
  - Direct matches against the threat intelligence repository (`threat_intelligence`), including threat levels, confidence ratings, and adversary attribution.
  - Linked active honeypot attacks targeting or originating from the indicator.
  - Confirmed alerts triggered across detection rules.
  - Associated security event outbox records with correlation IDs.

---

## 2. Multi-Hop Graph Traversal

When an analyst pivots on an adversary source IP (e.g. `198.51.100.45` in test `test_08`), the system returns complete provenance:
- Matched threat intelligence records with threat level (`critical`), confidence, and threat actor tags.
- Related attack containers across decoy SSH, HTTP, and database traps.
- Correlated alert IDs for immediate case assembly.

