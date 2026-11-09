# MILESTONE 67 — SYNTHETIC EVENT PROVENANCE & LIVE DATA QUALITY

**Directory:** `docs/final-engineering/milestones62-75/67_data_provenance/`  
**Target Subsystems:** Ingestion Pipeline, Provenance Tagger (`provenance.py`), Outbox Store  
**Evaluation Gates:** G07, G08, G09, G33  

---

## 1. PROBLEM IDENTIFICATION & RECONCILIATION

During previous verification milestones, automated testing scripts injected synthetic honeypot events using documentation IP `198.51.100.244` (RFC 5737 TEST-NET-2). This created:
- Attack IDs `9484`, `9485`, and `9631`
- Attack Event IDs `41164`, `41165`, and `41730`
- Outbox Records `1491`–`1496` and `2075`

### Danger of Database Record Deletion:
Executing `DELETE FROM attacks WHERE source_ip = '198.51.100.244'` damages outbox sequence consistency, creates cursor gaps, and breaks client sync reconciliation.

---

## 2. PROVENANCE ENRICHMENT ARCHITECTURE

In [`backend/app/events/provenance.py`](file:///home/liza/HoneyShield-X/backend/app/events/provenance.py):
1. **RFC Test Range Detection:**
   - Evaluates whether an IP belongs to RFC 5737 (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), RFC 2544 (`198.18.0.0/15`), or RFC 3849 (`2001:db8::/32`).
2. **Payload Annotation:**
   ```python
   def tag_event_provenance(payload: dict[str, Any], source_ip: str | None = None) -> dict[str, Any]:
       enriched = dict(payload)
       ip_to_check = source_ip or enriched.get("source_ip")
       is_synth = is_synthetic_test_ip(ip_to_check) or bool(enriched.get("is_synthetic", False))
       enriched["is_synthetic"] = is_synth
       enriched["data_provenance"] = "synthetic_verification_probe" if is_synth else "operational_sensor"
       return enriched
   ```
3. **Ingestion Router Integration:**
   - [`backend/app/routers/ingestion.py`](file:///home/liza/HoneyShield-X/backend/app/routers/ingestion.py#L85-L135) enriches event payloads on ingest, providing explicit provenance metadata to frontend consumers.

---

## 3. DATA INTEGRITY & AUDIT VERDICT

- **Zero Data Loss:** Historical test records (9484, 9485, 41165) are fully preserved.
- **Cursor Continuity:** Outbox monotonic IDs remain contiguous.
- **Query Disambiguation:** Dashboards and security feeds can filter or badge events using the explicit `is_synthetic` flag without modifying database state.
