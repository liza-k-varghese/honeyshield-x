from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attack
from app.schemas import AttackCreate, AttackResponse

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
