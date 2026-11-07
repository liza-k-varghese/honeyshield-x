import os
from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Load .env file from backend or repository root if present
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")

POSTGRES_USER = os.getenv("POSTGRES_USER", "honeyshield")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "change_this_password")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "honeyshield")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}",
)


class Base(DeclarativeBase):
    pass


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a SQLAlchemy database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

