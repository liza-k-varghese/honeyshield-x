# Milestone 14 — Security Event Ingestion & Server-Derived Detection Quality

**Document ID:** `HSX-DOC-M14-007`  
**Classification:** Detection Engineering & Ingestion Pipeline  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Multi-Stage Ingestion Pipeline

Incoming security telemetry traverses 10 mandatory processing stages before reaching operator dashboards:

```
Telemetry Source (Honeypot / Canary / Agent)
    │
    ▼
1. Source Authentication & Identity Validation (HMAC / Token)
    │
    ▼
2. Schema & Content-Length Enforcement (Strict Pydantic / Max 64KB)
    │
    ▼
3. Input Sanitization & Character Boundary Normalization
    │
    ▼
4. STIX 2.1 / TAXII Schema Mapping
    │
    ▼
5. Attack Association & Deduplication
    │
    ▼
6. Atomic PostgreSQL Transaction Commit (Entity + Outbox)
    │
    ▼
7. Server-Derived Risk Score Evaluation (Deterministic Formula)
    │
    ▼
8. Threat Intelligence Cache Lookup (System 3)
    │
    ▼
9. Alert Generation & Escalation Rules
    │
    ▼
10. Redis PubSub Dispatch to Live Streaming Clients
```

---

## 2. Low-Trust Telemetry Defense

> [!IMPORTANT]
> **Strict Rejection of Externally Supplied Risk Decisions:**
> External telemetry sources (decoy listeners, remote collectors) cannot dictate risk scores, threat actor labels, or automated containment actions.
> - Client-provided `risk_score` fields in request bodies are ignored.
> - Risk scores are computed **exclusively by backend logic**:
>   $$\text{Score} = \min\left(100.0, \; w_{\text{vector}} \cdot V + w_{\text{canary}} \cdot C + w_{\text{reputation}} \cdot R + w_{\text{freq}} \cdot F\right)$$
> - Any attempt to spoof critical severity from unverified endpoints is normalized to untrusted low-priority probes.

---

## 3. Ingestion Test Coverage Matrix

Validated in `backend/tests/test_multi_vector_detection.py` and `test_detection.py`:
- [x] Oversized payloads ($> 64\text{ KB}$) rejected with HTTP 413.
- [x] Malformed JSON rejected with HTTP 422.
- [x] Out-of-order timestamps sorted by monotonic database sequence.
- [x] High-frequency duplicate probes deduplicated within the sliding window.
- [x] Validated causal chain: Telemetry $\rightarrow$ Detection $\rightarrow$ Scoring $\rightarrow$ Commit $\rightarrow$ Outbox.

