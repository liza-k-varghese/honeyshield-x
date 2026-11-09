# SYNTHETIC TEST-DATA PROVENANCE & DATABASE HYGIENE

**File Reference:** `backend/app/events/provenance.py`  
**Test Suite Reference:** `backend/tests/test_synthetic_provenance.py`  
**Release Gate:** G07, G08, G09  

---

## 1. BACKGROUND & PROBLEM STATEMENT

During Milestone 54 and Milestone 56 live ingestion verifications, synthetic reconnaissance probe events were injected using documentation IP `198.51.100.244` (RFC 5737 TEST-NET-2). This generated:
- Attack ID `9484` & Attack Event ID `41164`
- Attack ID `9485` & Attack Event ID `41165`
- Outbox Event IDs `1491` through `1496`

In database architectures utilizing transactional outbox tables and monotonic sequence cursors, **destructive deletion of historical test records (`DELETE FROM attacks...`) corrupts cursor continuity**, breaks client reconciliation cursors (`outbox.cursor.#XXXX`), and invalidates historical audit trails.

---

## 2. NON-DESTRUCTIVE PROVENANCE TAGGING ARCHITECTURE

In Milestone 62, a non-destructive provenance tagging mechanism was implemented in `backend/app/events/provenance.py`:

```python
import ipaddress
from typing import Any

SYNTHETIC_TEST_NETWORKS = [
    ipaddress.ip_network("192.0.2.0/24"),    # RFC 5737 TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"), # RFC 5737 TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),  # RFC 5737 TEST-NET-3
    ipaddress.ip_network("198.18.0.0/15"),   # RFC 2544 / RFC 6890 Benchmark Testing
    ipaddress.ip_network("2001:db8::/32"),   # RFC 3849 Documentation IPv6
]

def is_synthetic_test_ip(ip_str: str | None) -> bool:
    """Determine whether an IP address belongs to designated RFC synthetic/test documentation ranges."""
    if not ip_str:
        return False
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        return any(ip in net for net in SYNTHETIC_TEST_NETWORKS)
    except ValueError:
        return False

def tag_event_provenance(payload: dict[str, Any], source_ip: str | None = None) -> dict[str, Any]:
    """Annotate an event payload with synthetic vs operational provenance metadata."""
    enriched = dict(payload)
    ip_to_check = source_ip or enriched.get("source_ip")
    is_synth = is_synthetic_test_ip(ip_to_check) or bool(enriched.get("is_synthetic", False))

    enriched["is_synthetic"] = is_synth
    enriched["data_provenance"] = (
        "synthetic_verification_probe" if is_synth else "operational_sensor"
    )
    return enriched
```

---

## 3. INGESTION ROUTER INTEGRATION

`backend/app/routers/ingestion.py` enriches incoming security events:
- Automatically detects RFC test addresses (`198.51.100.244`, `192.0.2.1`, etc.).
- Attaches `"is_synthetic": True` and `"data_provenance": "synthetic_verification_probe"` to the payload.
- Stores operational events with `"is_synthetic": False` and `"data_provenance": "operational_sensor"`.

---

## 4. DATABASE INTEGRITY VERIFICATION

Database queries executed directly against PostgreSQL 17 verify:
1. `Attack 9484`: IP `198.51.100.244` — **PRESERVED INTACT**
2. `Attack 9485`: IP `198.51.100.244` — **PRESERVED INTACT**
3. `AttackEvent 41165`: IP `198.51.100.244`, Attack `9485` — **PRESERVED INTACT**
4. `Outbox Events 1491-1496`: Monotonic cursor ordering preserved without holes or offset shifts.
5. `Outbox Event 2075`: New Milestone 62 probe created for Attack `9631` with full provenance annotations.

Zero operational data was dropped; zero cursor corruption occurred.
