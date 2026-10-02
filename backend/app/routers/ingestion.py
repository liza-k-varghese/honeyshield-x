from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attack, AttackEvent
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
    return db_event
