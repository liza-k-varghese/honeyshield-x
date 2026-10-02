import ipaddress
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Attack, ThreatIntelligence


def lookup_indicator(
    db: Session,
    indicator_type: str,
    indicator_value: str,
) -> dict[str, Any]:
    """Look up an indicator in the local Threat Intelligence database.

    Supports exact matching for indicators. For indicator_type == 'ip',
    strictly validates IPv4 and IPv6 format using python's ipaddress module.
    """
    if indicator_type == "ip":
        try:
            ipaddress.ip_address(indicator_value)
        except ValueError:
            raise ValueError(f"Invalid IP address: '{indicator_value}'")

    statement = (
        select(ThreatIntelligence)
        .where(
            ThreatIntelligence.indicator_type == indicator_type,
            ThreatIntelligence.indicator_value == indicator_value,
        )
        .limit(1)
    )

    record = db.scalar(statement)

    if record is None:
        return {
            "found": False,
            "indicator_type": indicator_type,
            "indicator_value": indicator_value,
            "threat_level": None,
            "source": None,
            "confidence": None,
            "description": None,
        }

    return {
        "found": True,
        "indicator_type": record.indicator_type,
        "indicator_value": record.indicator_value,
        "threat_level": record.threat_level,
        "source": record.source,
        "confidence": record.confidence,
        "description": record.description,
    }


def enrich_attack(
    db: Session,
    attack_id: int,
) -> dict[str, Any]:
    """Enrich an existing Attack with local Threat Intelligence based on source_ip.

    Validates attack existence, inspects source_ip, and returns threat intelligence.
    Maintains deterministic conservative behavior without overwriting detection results.
    """
    attack = db.query(Attack).filter(Attack.id == attack_id).first()
    if attack is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack with ID {attack_id} not found",
        )

    if not attack.source_ip:
        return {
            "found": False,
            "indicator_type": "ip",
            "indicator_value": "",
            "threat_level": None,
            "source": None,
            "confidence": None,
            "description": "Attack has no source IP for threat intelligence lookup",
        }

    try:
        return lookup_indicator(
            db=db,
            indicator_type="ip",
            indicator_value=attack.source_ip,
        )
    except ValueError as err:
        return {
            "found": False,
            "indicator_type": "ip",
            "indicator_value": attack.source_ip,
            "threat_level": None,
            "source": None,
            "confidence": None,
            "description": f"Attack source IP is invalid: {err}",
        }
