from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attack, AttackEvent
from app.observability.metrics import default_metrics_collector
from app.schemas import AttackEventCreate, AttackEventResponse

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post(
    "/events",
    response_model=AttackEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a normalized security event",
)
@router.post(
    "/events/",
    response_model=AttackEventResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/honeypot",
    response_model=AttackEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a honeypot security event (backward-compatible alias)",
)
def ingest_event(
    event_in: AttackEventCreate,
    db: Session = Depends(get_db),
) -> AttackEvent:
    """Ingest a normalized security event and persist it into the attack_events table.

    - Validates request payload via Pydantic
    - Checks whether supplied attack_id exists (returns 404 if not found)
    - If attack_id is omitted, creates a default Attack container
    - Persists the AttackEvent record
    - Returns the created record with HTTP 201
    """
    if event_in.attack_id is not None:
        attack = db.get(Attack, event_in.attack_id)
        if not attack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attack with ID {event_in.attack_id} not found",
            )
        target_attack_id = attack.id
    else:
        attack = Attack(
            attack_type=event_in.event_type,
            source_ip=event_in.source_ip,
            severity="low",
            risk_score=0.0,
            status="detected",
        )
        db.add(attack)
        db.commit()
        db.refresh(attack)
        target_attack_id = attack.id

    event_time = event_in.event_time
    if event_time is None:
        event_time = datetime.now(timezone.utc).replace(tzinfo=None)
    elif event_time.tzinfo is not None:
        event_time = event_time.astimezone(timezone.utc).replace(tzinfo=None)

    db_event = AttackEvent(
        attack_id=target_attack_id,
        event_type=event_in.event_type,
        source_ip=event_in.source_ip,
        message=event_in.message,
        event_time=event_time,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    default_metrics_collector.record_ingest(count=1)

    # Milestone 2: Emit Digital Agent Universe lifecycle events
    try:
        from app.events.service import publish_lifecycle_event, publish_handoff_event
        # 1. SCOUT collection completed
        publish_lifecycle_event(
            agent="SCOUT",
            stage="collection",
            status="completed",
            source=f"sensor:{event_in.source_ip or 'honeypot'}",
            destination="ingestion_api",
            resource_id=str(target_attack_id),
            workflow_id=f"wf_attack_{target_attack_id}",
            transfer_id=f"tr_scout_{db_event.id}",
            severity="info",
            payload={
                "source_ip": event_in.source_ip,
                "event_type": event_in.event_type,
                "attack_id": target_attack_id,
                "message": event_in.message,
            },
            db=db,
        )
        # 2. Verified Handoff: SCOUT -> NEXUS
        publish_handoff_event(
            from_agent="SCOUT",
            to_agent="NEXUS",
            resource_id=str(target_attack_id),
            workflow_id=f"wf_attack_{target_attack_id}",
            context_message=f"Sensor event from {event_in.source_ip or 'honeypot'} ingested. Handed off to NEXUS for normalization.",
            task_type="Raw Ingestion Telemetry",
            db=db,
        )
        # 3. NEXUS normalization and transactional outbox persistence
        publish_lifecycle_event(
            agent="NEXUS",
            stage="normalization",
            status="completed",
            source="ingestion_api",
            destination="outbox_db",
            resource_id=str(target_attack_id),
            workflow_id=f"wf_attack_{target_attack_id}",
            transfer_id=f"tr_nexus_{db_event.id}",
            severity="info",
            payload={
                "attack_id": target_attack_id,
                "event_id": db_event.id,
                "normalized": True,
            },
            db=db,
        )
        db.commit()
    except Exception:
        db.rollback()

    return db_event


# Backward-compatible alias router for /ingest/*
ingest_alias_router = APIRouter(
    prefix="/ingest",
    tags=["Ingestion"],
)

@ingest_alias_router.post(
    "/events",
    response_model=AttackEventResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@ingest_alias_router.post(
    "/honeypot",
    response_model=AttackEventResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def ingest_event_alias(
    event_in: AttackEventCreate,
    db: Session = Depends(get_db),
) -> AttackEvent:
    """Backward-compatible endpoint for /api/v1/ingest/events and /api/v1/ingest/honeypot."""
    return ingest_event(event_in=event_in, db=db)

