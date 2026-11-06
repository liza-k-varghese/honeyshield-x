# Milestone 15 — Secure Investigation Dossier Export & Formula Defense

**System:** HoneyShield X Export Service  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Export Formats & Use Cases

The case investigation export endpoint (`GET /api/v1/cases/{case_id}/export?format={json|csv}`) generates complete forensic dossiers suitable for legal holds, incident retrospectives, and compliance reporting:
- Includes incident metadata (case ID, title, severity, status, handler ID, timestamps).
- Full table of attached forensic evidence items with source records and canonical SHA-256 digests.
- Sequential journal of analyst forensic notes and task checklist status.

---

## 2. CSV Formula Injection Defense

Adversary payloads embedded in user notes, raw attack headers, or usernames may contain dynamic spreadsheet formula triggers (`=`, `+`, `-`, `@`). When opened in software like Microsoft Excel or LibreOffice Calc, unescaped formulas can execute malicious local commands (e.g., `=cmd|' /C calc'!A0`).

HoneyShield X enforces strict input neutralization:
- Any cell string whose trimmed content begins with `=`, `+`, `-`, or `@` is automatically prepended with a single quotation mark (`'`).
- The escaping renders the formula as inert literal text in spreadsheet software.
- Validated in `test_12` where injected test formulas (`=SUM(1,2)*cmd|' /C calc'!A0`) were exported safely as `\'=SUM(1,2)...`.

---

## 3. Cryptographic Non-Repudiation Header

All dossier exports (CSV and JSON) include the custom HTTP response header:
```http
X-Content-SHA256: <computed_64_char_digest>
```
allowing consuming legal and forensic tools to verify that the downloaded payload was transmitted without tampering or truncation.

