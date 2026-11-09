"""System 2 Integration and Sensor Telemetry API Router.

Versioned endpoints connecting System 1 (Central SOC Platform) with
System 2 (Future Honeypot, Network Monitoring, and Threat Intelligence Engine).

Endpoints:
- POST /api/v1/system2/telemetry/ingest: Ingest sensor telemetry events (Cowrie, Zeek, etc.)
- POST /api/v1/system2/threat-intel/enrich: Query threat intelligence context (GeoIP, ASN, IOC, Reputation)
- POST /api/v1/system2/evidence/pcap: Register network evidence metadata (PCAP references)
- GET  /api/v1/system2/status: Connectivity, health, and integration contract status
"""

from datetime import datetime, timezone
import logging
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    Request,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.system2_integration.schemas import (
    System2NetworkEvidenceRecord,
    System2SensorTelemetryEvent,
    System2TelemetryIngestResponse,
    System2ThreatIntelRequest,
    System2ThreatIntelResponse,
)
from app.system2_integration.service import default_system2_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/system2",
    tags=["System 2 Sensor & Threat Intel Integration"],
)


@router.post(
    "/telemetry/ingest",
    response_model=System2TelemetryIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest telemetry from a System 2 sensor",
)
def ingest_system2_telemetry(
    event: System2SensorTelemetryEvent,
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
    x_sensor_key: str | None = Header(None, alias="X-System2-Sensor-Key"),
    db: Session = Depends(get_db),
) -> System2TelemetryIngestResponse:
    """Ingest a normalized sensor telemetry event from System 2.

    Validates dedicated sensor credentials, checks for duplicate event_ids,
    normalizes data into PostgreSQL, emits SCOUT -> NEXUS -> SENTINEL digital
    universe events, and triggers detection alert evaluation.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_credential = x_sensor_key or authorization

    # Authenticate sensor identity and enforce rate limiting
    default_system2_service.verify_sensor_credentials(auth_credential, client_ip)

    return default_system2_service.ingest_sensor_telemetry(event=event, db=db)


@router.post(
    "/threat-intel/enrich",
    response_model=System2ThreatIntelResponse,
    status_code=status.HTTP_200_OK,
    summary="Enrich indicator via System 2 Threat Intelligence Engine",
)
def enrich_indicator_system2(
    query: System2ThreatIntelRequest,
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
    x_sensor_key: str | None = Header(None, alias="X-System2-Sensor-Key"),
    db: Session = Depends(get_db),
) -> System2ThreatIntelResponse:
    """Query System 2 Threat Intelligence Engine for deep adversary context.

    Returns GeoIP, ASN, IOC matches, reputation score, and threat profiling.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_credential = x_sensor_key or authorization
    default_system2_service.verify_sensor_credentials(auth_credential, client_ip)

    return default_system2_service.process_threat_intel_query(request=query, db=db)


@router.post(
    "/evidence/pcap",
    status_code=status.HTTP_201_CREATED,
    summary="Register network evidence (PCAP) metadata from System 2",
)
def register_pcap_evidence(
    record: System2NetworkEvidenceRecord,
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
    x_sensor_key: str | None = Header(None, alias="X-System2-Sensor-Key"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Register immutable forensic PCAP metadata from System 2.

    Enforces path safety (no raw uploads, strictly bounded REST retrieval link),
    computes SHA-256 metadata digest, and writes to transactional audit ledger.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_credential = x_sensor_key or authorization
    default_system2_service.verify_sensor_credentials(auth_credential, client_ip)

    return default_system2_service.register_network_evidence(record=record, db=db)


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Get System 1 <-> System 2 integration readiness status",
)
def get_system2_integration_status() -> dict[str, Any]:
    """Check System 1 readiness to receive System 2 telemetry."""
    return {
        "system1_status": "INTEGRATION_READY",
        "system2_status": "PENDING_HARDWARE_DEPLOYMENT",
        "supported_sensors": ["cowrie", "opencanary", "zeek", "suricata", "dionaea"],
        "api_version": "v1",
        "contracts": {
            "telemetry_ingest": "/api/v1/system2/telemetry/ingest",
            "threat_intel": "/api/v1/system2/threat-intel/enrich",
            "pcap_evidence": "/api/v1/system2/evidence/pcap",
        },
        "authentication_mode": "Dedicated Service Token (Header: X-System2-Sensor-Key or Bearer)",
        "rate_limit": "120 requests/minute per sensor source",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
