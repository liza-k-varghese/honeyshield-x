"""Incident Case Management & Response Playbooks (Module 3.6).

Zero-Migration Architecture:
- Redis primary case store with thread-safe in-memory fallback.
- Deterministic SANS/NIST response playbooks (SOPs).
- Integration with Module 3.4 Governor & Level-3 HITL approval tokens.
- Integration with Module 3.5 Bearer authentication and 4-tier RBAC.
- Immutable SystemEvent audit logging.
"""

from app.cases.service import CaseManagementService, default_case_service

__all__ = ["CaseManagementService", "default_case_service"]
