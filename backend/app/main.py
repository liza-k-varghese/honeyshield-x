import os
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import psycopg
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import (
    alerts,
    attacks,
    audit,
    auth,
    cases,
    correlation,
    dashboard,
    detection,
    detection_rules,
    incident_command,
    ingestion,
    investigation,
    multi_vector_detection,
    notifications,
    pipeline,
    replay,
    risk,
    threat_intelligence,
    unified_orchestrator,
)

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

app.include_router(auth.router, prefix="/api/v1")
app.include_router(attacks.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(ingestion.router, prefix="/api/v1")
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

POSTGRES_HOST = "127.0.0.1"
POSTGRES_PORT = 5432
POSTGRES_DB = "honeyshield"
POSTGRES_USER = "honeyshield"
POSTGRES_PASSWORD = "change_this_password"

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379


@app.get("/health")
def health():
    postgres_status = "disconnected"
    redis_status = "disconnected"

    try:
        with psycopg.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            postgres_status = "connected"

    except Exception as error:
        postgres_status = f"error: {error}"

    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
        )

        redis_client.ping()
        redis_status = "connected"
        redis_client.close()

    except Exception as error:
        redis_status = f"error: {error}"

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
