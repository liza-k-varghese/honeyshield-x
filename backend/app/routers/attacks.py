from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attack, AttackEvent
from app.schemas import AttackCreate, AttackEventResponse, AttackResponse

router = APIRouter(
    prefix="/attacks",
    tags=["Attacks"],
)


@router.post(
    "",
    response_model=AttackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new attack record",
)
@router.post(
    "/",
    response_model=AttackResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_attack(
    attack_in: AttackCreate,
    db: Session = Depends(get_db),
) -> Attack:
    attack_data = attack_in.model_dump(exclude_unset=True)
    if attack_data.get("detected_at") is None:
        attack_data.pop("detected_at", None)

    db_attack = Attack(**attack_data)
    db.add(db_attack)
    db.commit()
    db.refresh(db_attack)
    return db_attack


@router.get(
    "",
    response_model=list[AttackResponse],
    summary="List stored attacks",
)
@router.get(
    "/",
    response_model=list[AttackResponse],
    include_in_schema=False,
)
def get_attacks(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return"
    ),
    db: Session = Depends(get_db),
) -> list[Attack]:
    stmt = select(Attack).order_by(Attack.id.asc()).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


@router.get(
    "/{attack_id}",
    response_model=AttackResponse,
    summary="Get an attack by ID",
)
def get_attack(
    attack_id: int,
    db: Session = Depends(get_db),
) -> Attack:
    attack = db.get(Attack, attack_id)
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )
    return attack


@router.get(
    "/{attack_id}/events",
    response_model=list[AttackEventResponse],
    summary="Get chronological events for an attack",
)
def get_attack_events(
    attack_id: int,
    skip: int = Query(default=0, ge=0, description="Number of event records to skip"),
    limit: int = Query(
        default=50, ge=1, le=200, description="Maximum number of events to return (1-200)"
    ),
    db: Session = Depends(get_db),
) -> list[AttackEvent]:
    """Retrieve chronological security events associated with an attack container.

    - Validates attack existence (returns 404 if not found)
    - Orders events ascending by event_time and id
    - Supports bounded pagination (default 50, maximum 200)
    """
    attack = db.get(Attack, attack_id)
    if not attack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    stmt = (
        select(AttackEvent)
        .where(AttackEvent.attack_id == attack_id)
        .order_by(AttackEvent.event_time.asc(), AttackEvent.id.asc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
