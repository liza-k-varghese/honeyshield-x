# Milestone 15 — Saved Hunts Lifecycle & Visibility Governance

**System:** HoneyShield X Saved Hunts Engine  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Saved Hunt Lifecycle & Permissions

The Saved Hunts subsystem enables security analysts to persist, share, and re-execute complex search criteria:
- **Endpoints:**
  - `GET /api/v1/hunts/saved`: List accessible saved hunts
  - `POST /api/v1/hunts/saved`: Create a new saved hunt
  - `GET /api/v1/hunts/saved/{id}`: Retrieve saved hunt details
  - `DELETE /api/v1/hunts/saved/{id}`: Delete a saved hunt
  - `POST /api/v1/hunts/saved/{id}/execute`: Re-execute query with current credentials

---

## 2. Multi-Operator Visibility Isolation

Two visibility scopes are enforced:
1. **`team` Visibility:** Accessible to all authenticated operators holding `hunt:view` permissions.
2. **`private` Visibility:** Accessible strictly to the hunt creator. Other non-admin analysts receive `404 Not Found` to prevent metadata leakage.
3. **Administrative Override:** Operators with `security_administrator` role or `hunt:admin` permission retain management and deletion authority across all hunts.

---

## 3. Re-Validation on Execution

Re-executing a saved hunt (`POST /api/v1/hunts/saved/{id}/execute`) does not rely on cached results. It re-validates the calling operator's active permissions, reconstitutes the `ThreatHuntSearchRequest` filter parameters, and executes a fresh retrospective search against current database records.

