import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import psycopg
import redis
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

# Load .env file from backend or repository root if present
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")

from app.database import get_db
from app.routers import (
    alerts,
    attacks,
    audit,
    auth,
    campaigns,
    cases,
    correlation,
    dashboard,
    deception,
    detection,
    detection_rules,
    evidence,
    hunts,
    incident_command,
    ingestion,
    integrations,
    investigation,
    multi_vector_detection,
    notifications,
    pipeline,
    replay,
    risk,
    threat_intelligence,
    unified_orchestrator,
    services,
    mobile,
    events,
    pairing,
    emergency,
    system_observability,
)
import app.events.service  # Initialize event bus bridge & listeners
from app.observability.middleware import ObservabilityTracingMiddleware

app = FastAPI(
    title="HoneyShield X API",
    version="0.1.0",
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "HONEYSHIELD_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ObservabilityTracingMiddleware)

@app.middleware("http")
async def add_security_headers(request, call_next):
    """Enforce OWASP recommended security headers on all HTTP responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(auth.router, prefix="/api/v1")
app.include_router(attacks.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(ingestion.router, prefix="/api/v1")
app.include_router(ingestion.ingest_alias_router, prefix="/api/v1")
app.include_router(detection.router, prefix="/api/v1")
app.include_router(threat_intelligence.router, prefix="/api/v1")
app.include_router(risk.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")
app.include_router(correlation.router, prefix="/api/v1")
app.include_router(multi_vector_detection.router, prefix="/api/v1")
app.include_router(unified_orchestrator.router, prefix="/api/v1")
app.include_router(investigation.router, prefix="/api/v1")
app.include_router(detection_rules.router, prefix="/api/v1")
app.include_router(replay.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(incident_command.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(deception.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(hunts.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(mobile.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(pairing.router, prefix="/api/v1")
app.include_router(emergency.router, prefix="/api/v1")
app.include_router(system_observability.router, prefix="/api/v1")

def get_postgres_config() -> tuple[str, int, str, str, str]:
    db_url_env = os.getenv("DATABASE_URL")
    if db_url_env:
        try:
            parsed = make_url(db_url_env)
            return (
                parsed.host or "127.0.0.1",
                int(parsed.port or 5432),
                parsed.database or "honeyshield",
                parsed.username or "honeyshield",
                parsed.password or "change_this_password",
            )
        except Exception:
            pass
    return (
        os.getenv("POSTGRES_HOST", "127.0.0.1"),
        int(os.getenv("POSTGRES_PORT", "5432")),
        os.getenv("POSTGRES_DB", "honeyshield"),
        os.getenv("POSTGRES_USER", "honeyshield"),
        os.getenv("POSTGRES_PASSWORD", "change_this_password"),
    )


def get_redis_config() -> tuple[str, int, str | None]:
    redis_url_env = os.getenv("REDIS_URL")
    if redis_url_env:
        try:
            parsed_r = urlparse(redis_url_env)
            return (
                parsed_r.hostname or "127.0.0.1",
                int(parsed_r.port or 6379),
                parsed_r.password,
            )
        except Exception:
            pass
    return (
        os.getenv("REDIS_HOST", os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1")),
        int(os.getenv("REDIS_PORT", os.getenv("HONEYSHIELD_REDIS_PORT", "6379"))),
        os.getenv("REDIS_PASSWORD", os.getenv("HONEYSHIELD_REDIS_PASSWORD", None)),
    )


POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD = get_postgres_config()
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD = get_redis_config()


@app.get("/health")
def health():
    postgres_status = "disconnected"
    redis_status = "disconnected"

    pg_host, pg_port, pg_db, pg_user, pg_pass = get_postgres_config()
    r_host, r_port, r_pass = get_redis_config()

    try:
        with psycopg.connect(
            host=pg_host,
            port=pg_port,
            dbname=pg_db,
            user=pg_user,
            password=pg_pass,
            connect_timeout=2,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            postgres_status = "connected"

    except Exception as error:
        postgres_status = f"error: {error.__class__.__name__}"

    try:
        redis_client = redis.Redis(
            host=r_host,
            port=r_port,
            password=r_pass,
            decode_responses=True,
            socket_connect_timeout=2.0,
        )

        redis_client.ping()
        redis_status = "connected"
        redis_client.close()

    except Exception as error:
        redis_status = f"error: {error.__class__.__name__}"

    overall_status = (
        "ok"
        if postgres_status == "connected"
        and redis_status == "connected"
        else "degraded"
    )

    return {
        "status": overall_status,
        "service": "HoneyShield X API",
        "postgresql": postgres_status,
        "redis": redis_status,
    }


@app.get("/api/v1/database/status")
def database_status(db: Session = Depends(get_db)) -> dict[str, str]:
    """Check database connectivity using a SQLAlchemy session via dependency injection."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "database": "postgresql",
            "message": "Database connection is healthy",
        }
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {error}",
        )
