from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Attack(Base):
    __tablename__ = "attacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attack_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_ip: Mapped[str | None] = mapped_column(String(45))
    destination_ip: Mapped[str | None] = mapped_column(String(45))
    protocol: Mapped[str | None] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20), default="low")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="detected")
    detected_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    events: Mapped[list["AttackEvent"]] = relationship(
        back_populates="attack",
        cascade="all, delete-orphan",
    )


class AttackEvent(Base):
    __tablename__ = "attack_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attack_id: Mapped[int] = mapped_column(
        ForeignKey("attacks.id"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_ip: Mapped[str | None] = mapped_column(String(45))
    message: Mapped[str | None] = mapped_column(Text)
    event_time: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    attack: Mapped["Attack"] = relationship(
        back_populates="events"
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attack_id: Mapped[int | None] = mapped_column(
        ForeignKey("attacks.id")
    )
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="low")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    notified_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, default=None
    )
    notification_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class ThreatIntelligence(Base):
    __tablename__ = "threat_intelligence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    indicator_type: Mapped[str] = mapped_column(String(30), nullable=False)
    indicator_value: Mapped[str] = mapped_column(String(255), nullable=False)
    threat_level: Mapped[str] = mapped_column(String(20), default="unknown")
    source: Mapped[str | None] = mapped_column(String(100))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class SystemEvent(Base):
    __tablename__ = "system_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[str | None] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20), default="info")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
