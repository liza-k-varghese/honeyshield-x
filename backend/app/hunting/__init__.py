"""Module 3.11: Retrospective Threat Hunting & Adversary Hypothesis Engine (Threat Hunting Core).

Provides:
- Deterministic retrospective query compilation and execution across historical telemetry.
- Fail-closed AST/syntax regex safety validation.
- Dual-mode Redis + thread-safe in-memory hunt storage with capacity bounds and FIFO eviction.
- Governed closed-loop promotion to Module 3.3 Draft Detection Rules and Module 3.6 Incident Cases.
- EventBus publication and strict recursion prevention.
- SOC Threat Hunting Console support.
"""

from app.hunting.engine import RetrospectiveQueryEngine, validate_regex_pattern
from app.hunting.service import HuntService, default_hunt_service
from app.hunting.storage import HuntStore, default_hunt_store

__all__ = [
    "HuntStore",
    "default_hunt_store",
    "RetrospectiveQueryEngine",
    "validate_regex_pattern",
    "HuntService",
    "default_hunt_service",
]
