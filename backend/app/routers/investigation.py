"""Threat Intelligence, Multi-Vector Correlation & Attack-Chain Explorer router (Module 3.2).

Provides read-oriented investigation endpoints for SOC analysts:
- Attacker Entity Dossier (IP profile, threat intelligence, correlation, alerts)
- Attack-Chain DAG Graph (single attack container or cross-attack IP)
- Cross-Attack Event Timeline (bounded, chronological, MITRE-annotated)
- Declarative MITRE ATT&CK Catalog
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.investigation.mitre import get_mitre_catalog
from app.investigation.service import (
    get_attack_graph,
    get_cross_attack_events,
    get_ip_dossier,
    get_ip_graph,
    validate_ip_address,
)
from app.schemas import (
    AttackGraphResponse,
    CrossAttackEventResponse,
    IpDossierResponse,
    MitreCatalogResponse,
)

router = APIRouter(
    prefix="/investigation",
    tags=["Investigation & Attack-Chain Explorer"],
)


@router.get(
    "/ip/{source_ip}",
    response_model=IpDossierResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Attacker Entity Dossier for a source IP",
)
def get_ip_dossier_endpoint(
    source_ip: str,
    window_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Sliding investigation window in hours (1-168)",
    ),
    db: Session = Depends(get_db),
) -> IpDossierResponse:
    """Retrieve comprehensive Attacker Entity Dossier for a source IP.

    - Validates source IP format (returns 422 if malformed)
    - Reuses Module 2.3 Threat Intelligence lookup
    - Reuses Module 2.8 Cross-Attack Behavioral Correlation
    - Reuses Module 2.9 Multi-Vector Rule Evaluation
    - Aggregates active alerts and attack container history
    """
    result = get_ip_dossier(
        db=db,
        source_ip=source_ip,
        window_hours=window_hours,
    )
    return IpDossierResponse(**result)


@router.get(
    "/attacks/{attack_id}/graph",
    response_model=AttackGraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Get derived Attack-Chain DAG for an attack container",
)
def get_attack_graph_endpoint(
    attack_id: int,
    db: Session = Depends(get_db),
) -> AttackGraphResponse:
    """Derive Attack-Chain DAG read-model for a single Attack container.

    - 404 if attack does not exist
    - Pure in-memory read projection (zero DB writes/migrations)
    - Groups chronological events into MITRE ATT&CK tactic stages
    - Enforces maximum 50 nodes limit
    """
    result = get_attack_graph(
        db=db,
        attack_id=attack_id,
    )
    return AttackGraphResponse(**result)


@router.get(
    "/ip/{source_ip}/graph",
    response_model=AttackGraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Get derived cross-attack progression DAG for a source IP",
)
def get_ip_graph_endpoint(
    source_ip: str,
    window_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Sliding investigation window in hours (1-168)",
    ),
    db: Session = Depends(get_db),
) -> AttackGraphResponse:
    """Derive cross-attack progression DAG across all attack containers for a source IP.

    - Validates source IP format (returns 422 if malformed)
    - Bounded to 200 events and 50 nodes
    - Connects reconnaissance, access, execution, and generated alerts
    """
    result = get_ip_graph(
        db=db,
        source_ip=source_ip,
        window_hours=window_hours,
    )
    return AttackGraphResponse(**result)


@router.get(
    "/ip/{source_ip}/events",
    response_model=list[CrossAttackEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get chronological cross-attack events with MITRE taxonomy",
)
def get_cross_attack_events_endpoint(
    source_ip: str,
    window_hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Sliding investigation window in hours (1-168)",
    ),
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of event records to skip",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Maximum number of events to return (1-200)",
    ),
    db: Session = Depends(get_db),
) -> list[CrossAttackEventResponse]:
    """Retrieve chronological attack events across all containers for a source IP.

    - Validates source IP format (returns 422 if malformed)
    - Enforces max 200 events limit
    - Chronological ascending ordering
    - Attaches deterministic MITRE ATT&CK taxonomy
    - Attacker strings returned as plain data (no HTML rendering)
    """
    events = get_cross_attack_events(
        db=db,
        source_ip=source_ip,
        window_hours=window_hours,
        skip=skip,
        limit=limit,
    )
    return [CrossAttackEventResponse(**e) for e in events]


@router.get(
    "/mitre/catalog",
    response_model=MitreCatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="Get declarative MITRE ATT&CK mapping catalog",
)
def get_mitre_catalog_endpoint() -> MitreCatalogResponse:
    """Inspect deterministic MITRE ATT&CK mapping catalog for HoneyShield-X.

    Returns static mapping rules, event fallbacks, and uncategorized handlers.
    Zero external AI or LLM dependency.
    """
    catalog = get_mitre_catalog()
    return MitreCatalogResponse(
        catalog=catalog,
        total_entries=len(catalog),
    )
