# Milestone 16 — Forensic Evidence Export Security & Redaction

## 1. Export Capabilities & Threat Model
Forensic export endpoints allow operators to extract incident bundles and telemetry packages in structured formats (JSON, CSV) for external court presentation, SIEM ingestion, or compliance archiving.

Risks addressed:
- Leakage of internal secrets or plaintext credentials captured in honeypot honeypot traps.
- Export by unauthorized operators or read-only viewers.
- Path traversal or SSRF during file generation.

## 2. Enforcement Controls
1. **RBAC Scope Enforcement:**
   - Export endpoints require `evidence:export` or `case:export` permissions (`admin` or `lead_analyst`).
   - Standard `viewer` or unprivileged roles receive `403 Forbidden`.
2. **Credential Sanitization:**
   - Before packaging, payloads are processed through `redact_sensitive_tokens()`.
   - Authorization headers, API keys, and password hashes matching patterns are masked with `[REDACTED]`.
3. **Stream Generation:**
   - Direct memory streaming via `StreamingResponse` without intermediate unencrypted temporary files on disk.

## 3. Empirical Test Validation
- Verified via `test_08_evidence_export_authorization_and_sanitization` in `backend/tests/test_milestone16_forensics_and_reconciliation.py`.
- Unauthorized requests without export scopes were blocked (HTTP 403).
- Authorized export produced sanitized bundles preserving case integrity while redacting sensitive tokens.

