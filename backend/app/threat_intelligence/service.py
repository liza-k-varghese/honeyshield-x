"""Threat Intelligence Service for HoneyShield-X (Module 3.8).

Provides:
- Backward-compatible exact indicator lookup and attack enrichment (Phase 2 / Module 2.3).
- Deterministic multi-factor confidence scoring and mathematical exponential temporal decay.
- Deterministic IOC lifecycle management (active -> decaying -> retired, revoked, whitelisted).
- Automated promotion from Module 3.7 Canary Honeytoken tripwires and Module 3.6 Incident Cases.
- Deterministic campaign clustering and infrastructure overlap attribution.
- Hardened defensive feed exports in JSON, CSV (Firewall EDL), and dependency-free STIX 2.1.
- Zero-migration Option B persistence reusing PostgreSQL 'threat_intelligence' and 'system_events'.
"""

from datetime import datetime, timezone
import ipaddress
import json
import logging
import math
import re
import threading
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Attack, SystemEvent, ThreatIntelligence
from app.schemas import (
    CampaignCluster,
    IndicatorStatus,
    IndicatorType,
    PromoteCaseObservableRequest,
    ThreatIndicatorCreate,
    ThreatIndicatorResponse,
    ThreatIndicatorUpdate,
)
from app.threat_intelligence.storage import (
    deserialize_ioc_metadata,
    serialize_ioc_metadata,
    threat_intel_store,
)

logger = logging.getLogger(__name__)

# =============================================================================
# Constants & Model Parameters
# =============================================================================

BASE_CONFIDENCE_MAP: dict[str, float] = {
    "canary_tripwire": 0.95,
    "honeypot_trap": 0.90,
    "incident_case": 0.85,
    "manual_analyst": 0.80,
    "external_feed": 0.70,
    "unknown": 0.50,
}

HALF_LIFE_MAP: dict[str, int] = {
    "ip": 14,
    "cidr": 30,
    "domain": 30,
    "hash": 90,
    "user_agent": 7,
    "canary_token": 60,
}

DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)
HASH_REGEX = re.compile(r"^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$")
CONTROL_CHARS_REGEX = re.compile(r"[\r\n\x00-\x1f\x7f-\x9f]")


# =============================================================================
# Validation Utilities
# =============================================================================

def validate_indicator(indicator_type: str, indicator_value: str) -> tuple[str, bool]:
    """Validate indicator syntax, bounds, and check if internal/private.

    Returns:
        (normalized_value, is_internal_or_private)
    Raises:
        ValueError if malformed, oversized, or contains control characters.
    """
    if not indicator_value or not indicator_value.strip():
        raise ValueError("Indicator value cannot be empty")

    cleaned = indicator_value.strip()
    if len(cleaned) > 255:
        raise ValueError(f"Indicator value exceeds maximum length of 255 characters (length: {len(cleaned)})")

    if CONTROL_CHARS_REGEX.search(cleaned):
        raise ValueError("Indicator value contains illegal control characters or line breaks")

    t_lower = indicator_type.lower()
    is_internal = False

    if t_lower == "ip":
        try:
            ip_obj = ipaddress.ip_address(cleaned)
            is_internal = (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
            )
            return str(ip_obj), is_internal
        except ValueError:
            raise ValueError(f"Invalid IP address format: '{cleaned}'")

    elif t_lower == "cidr":
        try:
            net_obj = ipaddress.ip_network(cleaned, strict=False)
            is_internal = (
                net_obj.is_private
                or net_obj.is_loopback
                or net_obj.is_link_local
                or net_obj.is_multicast
                or net_obj.is_reserved
            )
            return str(net_obj), is_internal
        except ValueError:
            raise ValueError(f"Invalid CIDR network format: '{cleaned}'")

    elif t_lower == "domain":
        cleaned_domain = cleaned.lower().rstrip(".")
        if len(cleaned_domain) > 253 or not DOMAIN_REGEX.match(cleaned_domain):
            raise ValueError(f"Invalid FQDN domain name format: '{cleaned}'")
        if cleaned_domain.endswith(".local") or cleaned_domain.endswith(".internal") or cleaned_domain == "localhost":
            is_internal = True
        return cleaned_domain, is_internal

    elif t_lower == "hash":
        cleaned_hash = cleaned.lower()
        if not HASH_REGEX.match(cleaned_hash):
            raise ValueError(f"Invalid hash format (must be hex MD5, SHA1, or SHA256): '{cleaned}'")
        return cleaned_hash, False

    elif t_lower == "user_agent":
        if len(cleaned) < 2:
            raise ValueError("User-Agent string too short")
        return cleaned, False

    elif t_lower == "canary_token":
        if len(cleaned) < 3 or not re.match(r"^[a-zA-Z0-9_\-:]+$", cleaned):
            raise ValueError(f"Invalid canary token identifier format: '{cleaned}'")
        return cleaned, True  # Internal deception asset

    else:
        raise ValueError(f"Unsupported indicator type: '{indicator_type}'")


# =============================================================================
# Deterministic Confidence & Temporal Decay Mathematics
# =============================================================================

def calculate_boosted_confidence(base_conf: float, hit_count: int) -> float:
    """Calculate repeat-hit saturation confidence.

    Formula:
        C_boosted(k) = C_base + (1.0 - C_base) * (1 - exp(-0.3 * (k - 1)))
    Mathematically bounded: C_base <= C_boosted <= 1.0.
    """
    b = max(0.0, min(1.0, float(base_conf)))
    k = max(1, int(hit_count))
    if k <= 1:
        return round(b, 4)
    saturation = 1.0 - math.exp(-0.3 * (k - 1))
    boosted = b + (1.0 - b) * saturation
    return round(max(0.0, min(1.0, boosted)), 4)


def calculate_temporal_decay(
    boosted_conf: float,
    last_seen_dt: datetime,
    half_life_days: int,
    current_dt: datetime | None = None,
) -> float:
    """Calculate exponential temporal decay based on elapsed days.

    Formula:
        C(t) = C_boosted * 2^(-delta_t / T_half_life)
    Bounded: 0.0 <= C(t) <= boosted_conf <= 1.0.
    """
    now = current_dt or datetime.now(timezone.utc)
    # Ensure timezone awareness
    if last_seen_dt.tzinfo is None:
        last_seen_aware = last_seen_dt.replace(tzinfo=timezone.utc)
    else:
        last_seen_aware = last_seen_dt

    if now.tzinfo is None:
        now_aware = now.replace(tzinfo=timezone.utc)
    else:
        now_aware = now

    delta_seconds = max(0.0, (now_aware - last_seen_aware).total_seconds())
    delta_days = delta_seconds / 86400.0

    hl = max(1, int(half_life_days))
    decayed = float(boosted_conf) * (2.0 ** (-delta_days / hl))
    return round(max(0.0, min(1.0, decayed)), 4)


def derive_status_and_threat_level(
    current_status: str,
    decayed_confidence: float,
) -> tuple[str, str]:
    """Derive lifecycle status and threat level following approved precedence.

    Precedence: WHITELISTED > REVOKED > ACTIVE > DECAYING > RETIRED.
    """
    s_lower = current_status.lower()
    if s_lower == "whitelisted":
        return "whitelisted", "low"
    if s_lower == "revoked":
        return "revoked", "low"

    conf = max(0.0, min(1.0, decayed_confidence))
    if conf >= 0.65:
        status = "active"
    elif conf >= 0.15:
        status = "decaying"
    else:
        status = "retired"

    if conf >= 0.85:
        threat_level = "critical"
    elif conf >= 0.65:
        threat_level = "high"
    elif conf >= 0.40:
        threat_level = "medium"
    else:
        threat_level = "low"

    return status, threat_level


# =============================================================================
# Legacy Invariant Functions (Preserved for Phase 2 / Module 3.2)
# =============================================================================

def lookup_indicator(
    db: Session,
    indicator_type: str,
    indicator_value: str,
) -> dict[str, Any]:
    """Look up an indicator in the local Threat Intelligence database.

    Supports exact matching for indicators. For indicator_type == 'ip',
    strictly validates IPv4 and IPv6 format using python's ipaddress module.
    Preserves 100% backward-compatibility, returning clean human notes in 'description'.
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

    # Clean human description extraction for legacy callers
    _, clean_notes = deserialize_ioc_metadata(record.description)
    display_desc = clean_notes if clean_notes else record.description

    return {
        "found": True,
        "indicator_type": record.indicator_type,
        "indicator_value": record.indicator_value,
        "threat_level": record.threat_level,
        "source": record.source,
        "confidence": record.confidence,
        "description": display_desc,
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


# =============================================================================
# Module 3.8 Extended Threat Intelligence Service
# =============================================================================

class ThreatIntelService:
    """Orchestrates deterministic IOC lifecycle, temporal decay, and feed exports."""

    def __init__(self) -> None:
        self._lock = threading.Lock()

    @staticmethod
    def _model_to_response(record: ThreatIntelligence) -> ThreatIndicatorResponse:
        """Convert a PostgreSQL ThreatIntelligence record to ThreatIndicatorResponse."""
        meta, notes = deserialize_ioc_metadata(record.description)
        base_conf = float(meta.get("base_confidence", record.confidence or 0.85))
        hit_count = int(meta.get("hit_count", 1))
        hl_days = int(meta.get("half_life_days", HALF_LIFE_MAP.get(record.indicator_type, 14)))
        status_curr = str(meta.get("status", "active"))

        # Parse last_seen
        raw_last_seen = meta.get("last_seen")
        if raw_last_seen:
            try:
                last_seen_dt = datetime.fromisoformat(raw_last_seen.replace("Z", "+00:00"))
            except Exception:
                last_seen_dt = record.created_at or datetime.now(timezone.utc)
        else:
            last_seen_dt = record.created_at or datetime.now(timezone.utc)

        # Dynamic decay calculation
        if status_curr == "whitelisted" or status_curr == "revoked":
            decayed_conf = 0.0
            effective_status = status_curr
            effective_threat = "low"
        else:
            boosted = calculate_boosted_confidence(base_conf, hit_count)
            decayed_conf = calculate_temporal_decay(boosted, last_seen_dt, hl_days)
            effective_status, effective_threat = derive_status_and_threat_level(status_curr, decayed_conf)

        first_seen_str = str(meta.get("first_seen") or (record.created_at.isoformat() if record.created_at else ""))
        last_seen_str = last_seen_dt.isoformat()
        created_str = record.created_at.isoformat() if record.created_at else datetime.now(timezone.utc).isoformat()

        return ThreatIndicatorResponse(
            id=record.id,
            indicator_type=record.indicator_type,
            indicator_value=record.indicator_value,
            threat_level=effective_threat,
            source=record.source,
            base_confidence=round(base_conf, 4),
            decayed_confidence=round(decayed_conf, 4),
            status=effective_status,
            half_life_days=hl_days,
            hit_count=hit_count,
            first_seen=first_seen_str,
            last_seen=last_seen_str,
            campaign=meta.get("campaign"),
            tags=list(meta.get("tags") or []),
            description=notes or record.description,
            created_at=created_str,
        )

    def create_indicator(
        self,
        db: Session,
        data: ThreatIndicatorCreate,
        operator_username: str,
    ) -> ThreatIndicatorResponse:
        """Create a new Threat Intelligence indicator."""
        norm_val, is_internal = validate_indicator(data.indicator_type.value, data.indicator_value)
        ind_type = data.indicator_type.value

        with self._lock:
            # Check existing duplicate
            existing = db.scalar(
                select(ThreatIntelligence).where(
                    ThreatIntelligence.indicator_type == ind_type,
                    ThreatIntelligence.indicator_value == norm_val,
                ).limit(1)
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Indicator '{norm_val}' of type '{ind_type}' already exists with ID {existing.id}",
                )

            now = datetime.now(timezone.utc)
            now_str = now.isoformat()

            tags = list(data.tags or [])
            if is_internal and "internal_network" not in tags:
                tags.append("internal_network")

            meta = {
                "meta_version": 1,
                "status": "active",
                "base_confidence": float(data.confidence),
                "half_life_days": int(data.half_life_days),
                "hit_count": 1,
                "first_seen": now_str,
                "last_seen": now_str,
                "campaign": data.campaign,
                "tags": tags,
                "notes": data.description or "",
                "created_by": operator_username,
            }

            desc_json = serialize_ioc_metadata(meta)

            record = ThreatIntelligence(
                indicator_type=ind_type,
                indicator_value=norm_val,
                threat_level=data.threat_level,
                source=data.source,
                confidence=float(data.confidence),
                description=desc_json,
                created_at=now.replace(tzinfo=None),
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            # Audit
            db.add(
                SystemEvent(
                    event_type="IOC_CREATED",
                    source="threat_intelligence_service",
                    severity="info",
                    message=json.dumps({
                        "action": "create",
                        "id": record.id,
                        "indicator_type": ind_type,
                        "indicator_value": norm_val,
                        "confidence": data.confidence,
                        "threat_level": data.threat_level,
                        "campaign": data.campaign,
                        "operator": operator_username,
                    }),
                    created_at=now.replace(tzinfo=None),
                )
            )
            db.commit()

            resp = self._model_to_response(record)
            threat_intel_store.save_indicator(resp.model_dump())
            return resp

    def get_indicator(self, db: Session, indicator_id: int) -> ThreatIndicatorResponse:
        """Retrieve an indicator by ID with real-time decayed confidence."""
        record = db.get(ThreatIntelligence, indicator_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threat indicator with ID {indicator_id} not found",
            )
        resp = self._model_to_response(record)
        threat_intel_store.save_indicator(resp.model_dump())
        return resp

    def update_indicator(
        self,
        db: Session,
        indicator_id: int,
        data: ThreatIndicatorUpdate,
        operator_username: str,
    ) -> ThreatIndicatorResponse:
        """Update indicator metadata, notes, campaign, or status."""
        record = db.get(ThreatIntelligence, indicator_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threat indicator with ID {indicator_id} not found",
            )

        meta, notes = deserialize_ioc_metadata(record.description)

        if data.threat_level is not None:
            record.threat_level = data.threat_level
        if data.campaign is not None:
            meta["campaign"] = data.campaign
        if data.tags is not None:
            meta["tags"] = data.tags
        if data.description is not None:
            meta["notes"] = data.description
        if data.half_life_days is not None:
            meta["half_life_days"] = data.half_life_days
        if data.status is not None:
            meta["status"] = data.status

        meta["updated_by"] = operator_username
        meta["updated_at"] = datetime.now(timezone.utc).isoformat()

        record.description = serialize_ioc_metadata(meta)
        db.commit()
        db.refresh(record)

        # Audit
        db.add(
            SystemEvent(
                event_type="IOC_UPDATED",
                source="threat_intelligence_service",
                severity="info",
                message=json.dumps({
                    "action": "update",
                    "id": record.id,
                    "indicator_type": record.indicator_type,
                    "indicator_value": record.indicator_value,
                    "status": meta["status"],
                    "operator": operator_username,
                }),
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
        )
        db.commit()

        resp = self._model_to_response(record)
        threat_intel_store.save_indicator(resp.model_dump())
        return resp

    def revoke_indicator(
        self,
        db: Session,
        indicator_id: int,
        reason: str,
        operator_username: str,
    ) -> ThreatIndicatorResponse:
        """Revoke an indicator, dropping effective confidence to 0.0."""
        with self._lock:
            record = db.get(ThreatIntelligence, indicator_id)
            if not record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Threat indicator with ID {indicator_id} not found",
                )

            meta, _ = deserialize_ioc_metadata(record.description)
            meta["status"] = "revoked"
            meta["revoked_by"] = operator_username
            meta["revocation_reason"] = reason
            meta["revoked_at"] = datetime.now(timezone.utc).isoformat()

            record.description = serialize_ioc_metadata(meta)
            record.confidence = 0.0
            record.threat_level = "low"
            db.commit()
            db.refresh(record)

            # Audit
            db.add(
                SystemEvent(
                    event_type="IOC_REVOKED",
                    source="threat_intelligence_service",
                    severity="info",
                    message=json.dumps({
                        "action": "revoke",
                        "id": record.id,
                        "indicator_value": record.indicator_value,
                        "reason": reason,
                        "operator": operator_username,
                    }),
                    created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
            )
            db.commit()

            resp = self._model_to_response(record)
            threat_intel_store.save_indicator(resp.model_dump())
            return resp

    def whitelist_indicator(
        self,
        db: Session,
        indicator_id: int,
        reason: str,
        operator_username: str,
    ) -> ThreatIndicatorResponse:
        """Mark an indicator as whitelisted, exempting from alerts and exports."""
        with self._lock:
            record = db.get(ThreatIntelligence, indicator_id)
            if not record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Threat indicator with ID {indicator_id} not found",
                )

            meta, _ = deserialize_ioc_metadata(record.description)
            meta["status"] = "whitelisted"
            meta["whitelisted_by"] = operator_username
            meta["whitelist_reason"] = reason
            meta["whitelisted_at"] = datetime.now(timezone.utc).isoformat()

            record.description = serialize_ioc_metadata(meta)
            record.confidence = 0.0
            record.threat_level = "low"
            db.commit()
            db.refresh(record)

        # Audit
        db.add(
            SystemEvent(
                event_type="IOC_WHITELISTED",
                source="threat_intelligence_service",
                severity="info",
                message=json.dumps({
                    "action": "whitelist",
                    "id": record.id,
                    "indicator_value": record.indicator_value,
                    "reason": reason,
                    "operator": operator_username,
                }),
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
        )
        db.commit()

        resp = self._model_to_response(record)
        threat_intel_store.save_indicator(resp.model_dump())
        return resp

    def list_indicators(
        self,
        db: Session,
        status: str | None = None,
        indicator_type: str | None = None,
        campaign: str | None = None,
        min_confidence: float | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[ThreatIndicatorResponse], int]:
        """List and search indicators with bounded pagination and dynamic decay."""
        # Query database records
        query = select(ThreatIntelligence)
        if indicator_type:
            query = query.where(ThreatIntelligence.indicator_type == indicator_type.lower())

        records = list(db.scalars(query.order_by(ThreatIntelligence.id.desc())).all())
        responses = [self._model_to_response(r) for r in records]

        # Apply in-memory/store filters for computed fields
        filtered: list[ThreatIndicatorResponse] = []
        for ind in responses:
            if status and ind.status.lower() != status.lower():
                continue
            if campaign and (ind.campaign or "").upper() != campaign.upper():
                continue
            if min_confidence is not None and ind.decayed_confidence < min_confidence:
                continue
            if search:
                s_lower = search.lower()
                val_m = s_lower in ind.indicator_value.lower()
                desc_m = s_lower in (ind.description or "").lower()
                camp_m = s_lower in (ind.campaign or "").lower()
                if not (val_m or desc_m or camp_m):
                    continue
            filtered.append(ind)
            # Sync to store
            threat_intel_store.save_indicator(ind.model_dump())

        # Sort: decayed_confidence DESC, last_seen DESC, indicator_value ASC
        filtered.sort(key=lambda x: (-x.decayed_confidence, x.last_seen, x.indicator_value))

        total = len(filtered)
        b_limit = min(max(limit, 1), 200)
        start = max(skip, 0)
        paged = filtered[start : start + b_limit]

        return paged, total

    def list_campaigns(self, db: Session) -> list[CampaignCluster]:
        """Aggregate tracked campaigns across indicators."""
        records = list(db.scalars(select(ThreatIntelligence)).all())
        responses = [self._model_to_response(r) for r in records]

        campaign_map: dict[str, dict[str, Any]] = {}
        for ind in responses:
            if not ind.campaign:
                continue
            c_key = ind.campaign.upper()
            if c_key not in campaign_map:
                campaign_map[c_key] = {
                    "campaign_id": f"CAMP-{c_key}",
                    "name": ind.campaign,
                    "indicator_count": 0,
                    "highest_severity": "low",
                    "highest_confidence": 0.0,
                    "indicator_types": set(),
                    "first_seen": ind.first_seen or ind.created_at,
                    "last_seen": ind.last_seen or ind.created_at,
                }
            entry = campaign_map[c_key]
            entry["indicator_count"] += 1
            entry["indicator_types"].add(ind.indicator_type)
            if ind.decayed_confidence > entry["highest_confidence"]:
                entry["highest_confidence"] = ind.decayed_confidence

            sev_ranks = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            if sev_ranks.get(ind.threat_level, 0) > sev_ranks.get(entry["highest_severity"], 0):
                entry["highest_severity"] = ind.threat_level

        result: list[CampaignCluster] = []
        for c in campaign_map.values():
            result.append(
                CampaignCluster(
                    campaign_id=c["campaign_id"],
                    name=c["name"],
                    indicator_count=c["indicator_count"],
                    highest_severity=c["highest_severity"],
                    highest_confidence=round(c["highest_confidence"], 2),
                    indicator_types=sorted(list(c["indicator_types"])),
                    first_seen=str(c["first_seen"]),
                    last_seen=str(c["last_seen"]),
                )
            )

        result.sort(key=lambda x: (-x.indicator_count, x.name))
        return result

    # =========================================================================
    # Promotions (Module 3.7 Deception & Module 3.6 Cases)
    # =========================================================================

    def record_indicator_hit(
        self,
        db: Session,
        indicator_type: str,
        indicator_value: str,
    ) -> ThreatIndicatorResponse | None:
        """Record an observed adversary encounter on an indicator (resurrects retired/decaying)."""
        try:
            norm_val, _ = validate_indicator(indicator_type, indicator_value)
        except ValueError:
            return None

        with self._lock:
            record = db.scalar(
                select(ThreatIntelligence).where(
                    ThreatIntelligence.indicator_type == indicator_type,
                    ThreatIntelligence.indicator_value == norm_val,
                ).limit(1)
            )
            if not record:
                return None

            now = datetime.now(timezone.utc)
            now_str = now.isoformat()
            meta, notes = deserialize_ioc_metadata(record.description)
            status_curr = meta.get("status", "active")

            # Whitelist precedence
            if status_curr == "whitelisted":
                db.add(
                    SystemEvent(
                        event_type="WHITELISTED_IOC_OBSERVED",
                        source="threat_intelligence_service",
                        severity="info",
                        message=json.dumps({
                            "indicator_type": indicator_type,
                            "indicator_value": norm_val,
                            "notice": "Observation suppressed because entity is whitelisted",
                        }),
                        created_at=now.replace(tzinfo=None),
                    )
                )
                db.commit()
                return self._model_to_response(record)

            # Revoked cannot reactivate automatically
            if status_curr == "revoked":
                return self._model_to_response(record)

            # Resurrect / refresh active/decaying/retired
            new_hits = int(meta.get("hit_count", 1)) + 1
            meta["hit_count"] = new_hits
            meta["last_seen"] = now_str
            meta["status"] = "active"
            meta["notes"] = notes

            record.description = serialize_ioc_metadata(meta)
            db.commit()
            db.refresh(record)

            resp = self._model_to_response(record)
            threat_intel_store.save_indicator(resp.model_dump())
            return resp

    def promote_canary_hit(
        self,
        db: Session,
        source_ip: str,
        canary_id: str,
        canary_type: str,
        custom_campaign: str | None = None,
    ) -> ThreatIndicatorResponse | None:
        """Promote a valid canary tripwire hit IP to Threat Intelligence."""
        try:
            norm_ip, is_internal = validate_indicator("ip", source_ip)
        except ValueError as e:
            logger.warning("Canary IP promotion rejected due to validation failure: %s", str(e))
            return None

        # Check existing record
        existing = db.scalar(
            select(ThreatIntelligence).where(
                ThreatIntelligence.indicator_type == "ip",
                ThreatIntelligence.indicator_value == norm_ip,
            ).limit(1)
        )

        now = datetime.now(timezone.utc)
        now_str = now.isoformat()

        if existing:
            meta, notes = deserialize_ioc_metadata(existing.description)
            status_curr = meta.get("status", "active")

            # Whitelist takes absolute precedence
            if status_curr == "whitelisted":
                db.add(
                    SystemEvent(
                        event_type="WHITELISTED_IOC_OBSERVED",
                        source="deception_tripwire",
                        severity="info",
                        message=json.dumps({
                            "indicator_value": norm_ip,
                            "canary_id": canary_id,
                            "notice": "Observation suppressed because entity is whitelisted",
                        }),
                        created_at=now.replace(tzinfo=None),
                    )
                )
                db.commit()
                return self._model_to_response(existing)

            # Revoked cannot reactivate automatically
            if status_curr == "revoked":
                logger.info("Canary hit from revoked IP %s observed; revocation preserved", norm_ip)
                return self._model_to_response(existing)

            # Resurrect / refresh active/decaying/retired
            new_hits = int(meta.get("hit_count", 1)) + 1
            meta["hit_count"] = new_hits
            meta["last_seen"] = now_str
            meta["status"] = "active"

            tags = set(meta.get("tags") or [])
            tags.add("canary_hit")
            tags.add(f"canary_id:{canary_id}")
            if is_internal:
                tags.add("internal_network")
            meta["tags"] = sorted(list(tags))

            # Saturation boost
            base_c = float(meta.get("base_confidence", 0.95))
            boosted = calculate_boosted_confidence(base_c, new_hits)
            existing.confidence = boosted
            existing.threat_level = "critical"
            existing.description = serialize_ioc_metadata(meta)
            db.commit()
            db.refresh(existing)

            db.add(
                SystemEvent(
                    event_type="CANARY_IOC_PROMOTED",
                    source="deception_tripwire",
                    severity="info",
                    message=json.dumps({
                        "action": "refreshed",
                        "indicator_value": norm_ip,
                        "canary_id": canary_id,
                        "hit_count": new_hits,
                        "boosted_confidence": boosted,
                    }),
                    created_at=now.replace(tzinfo=None),
                )
            )
            db.commit()

            resp = self._model_to_response(existing)
            threat_intel_store.save_indicator(resp.model_dump())
            return resp

        # Create fresh canary IOC
        tags = ["canary_hit", f"canary_id:{canary_id}", f"canary_type:{canary_type}"]
        if is_internal:
            tags.append("internal_network")

        campaign_name = custom_campaign or "DECEPTION-TRIPWIRE"
        meta = {
            "meta_version": 1,
            "status": "active",
            "base_confidence": 0.95,
            "half_life_days": 21,
            "hit_count": 1,
            "first_seen": now_str,
            "last_seen": now_str,
            "campaign": campaign_name,
            "tags": tags,
            "notes": f"Adversary triggered canary token {canary_id} ({canary_type})",
            "provenance_ref": f"canary:{canary_id}",
        }

        desc_json = serialize_ioc_metadata(meta)
        record = ThreatIntelligence(
            indicator_type="ip",
            indicator_value=norm_ip,
            threat_level="critical",
            source="canary_tripwire",
            confidence=0.95,
            description=desc_json,
            created_at=now.replace(tzinfo=None),
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        db.add(
            SystemEvent(
                event_type="CANARY_IOC_PROMOTED",
                source="deception_tripwire",
                severity="info",
                message=json.dumps({
                    "action": "minted",
                    "id": record.id,
                    "indicator_value": norm_ip,
                    "canary_id": canary_id,
                    "canary_type": canary_type,
                    "confidence": 0.95,
                }),
                created_at=now.replace(tzinfo=None),
            )
        )
        db.commit()

        resp = self._model_to_response(record)
        threat_intel_store.save_indicator(resp.model_dump())
        return resp

    def promote_case_observable(
        self,
        db: Session,
        request: PromoteCaseObservableRequest,
        operator_username: str,
    ) -> ThreatIndicatorResponse:
        """Promote an observable from an incident case into Threat Intelligence."""
        norm_val, is_internal = validate_indicator(request.observable_type.value, request.observable_value)
        ind_type = request.observable_type.value

        existing = db.scalar(
            select(ThreatIntelligence).where(
                ThreatIntelligence.indicator_type == ind_type,
                ThreatIntelligence.indicator_value == norm_val,
            ).limit(1)
        )

        now = datetime.now(timezone.utc)
        now_str = now.isoformat()

        if existing:
            meta, notes = deserialize_ioc_metadata(existing.description)
            if meta.get("status") == "whitelisted":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Indicator '{norm_val}' is whitelisted and cannot be promoted as malicious",
                )

            tags = set(meta.get("tags") or [])
            tags.add("case_evidence")
            tags.add(f"case_id:{request.case_id}")
            for t in request.tags:
                tags.add(t)

            meta["tags"] = sorted(list(tags))
            meta["hit_count"] = int(meta.get("hit_count", 1)) + 1
            meta["last_seen"] = now_str
            meta["status"] = "active"
            if request.campaign:
                meta["campaign"] = request.campaign

            boosted = calculate_boosted_confidence(0.85, meta["hit_count"])
            existing.confidence = boosted
            existing.threat_level = request.threat_level
            existing.description = serialize_ioc_metadata(meta)
            db.commit()
            db.refresh(existing)

            db.add(
                SystemEvent(
                    event_type="CASE_IOC_PROMOTED",
                    source="threat_intelligence_service",
                    severity="info",
                    message=json.dumps({
                        "action": "refreshed",
                        "id": existing.id,
                        "case_id": request.case_id,
                        "indicator_value": norm_val,
                        "operator": operator_username,
                    }),
                    created_at=now.replace(tzinfo=None),
                )
            )
            db.commit()

            resp = self._model_to_response(existing)
            threat_intel_store.save_indicator(resp.model_dump())
            return resp

        tags = ["case_evidence", f"case_id:{request.case_id}"]
        if is_internal:
            tags.append("internal_network")
        for t in request.tags:
            tags.append(t)

        meta = {
            "meta_version": 1,
            "status": "active",
            "base_confidence": 0.85,
            "half_life_days": HALF_LIFE_MAP.get(ind_type, 14),
            "hit_count": 1,
            "first_seen": now_str,
            "last_seen": now_str,
            "campaign": request.campaign,
            "tags": sorted(list(set(tags))),
            "notes": request.notes or f"Promoted from case {request.case_id}",
            "provenance_ref": f"case:{request.case_id}",
            "promoted_by": operator_username,
        }

        desc_json = serialize_ioc_metadata(meta)
        record = ThreatIntelligence(
            indicator_type=ind_type,
            indicator_value=norm_val,
            threat_level=request.threat_level,
            source="incident_case",
            confidence=0.85,
            description=desc_json,
            created_at=now.replace(tzinfo=None),
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        db.add(
            SystemEvent(
                event_type="CASE_IOC_PROMOTED",
                source="threat_intelligence_service",
                severity="info",
                message=json.dumps({
                    "action": "minted",
                    "id": record.id,
                    "case_id": request.case_id,
                    "indicator_value": norm_val,
                    "operator": operator_username,
                }),
                created_at=now.replace(tzinfo=None),
            )
        )
        db.commit()

        resp = self._model_to_response(record)
        threat_intel_store.save_indicator(resp.model_dump())
        return resp

    # =========================================================================
    # Hardened Feed Exporters
    # =========================================================================

    def export_json_feed(
        self,
        db: Session,
        min_confidence: float = 0.65,
        indicator_type: str | None = None,
        campaign: str | None = None,
    ) -> dict[str, Any]:
        """Export active high-confidence indicators as a machine-readable JSON blocklist."""
        indicators, _ = self.list_indicators(
            db=db,
            status="active",
            indicator_type=indicator_type,
            campaign=campaign,
            min_confidence=min_confidence,
            limit=2000,
        )

        # Filter out internal/private infrastructure from public export
        exportable = [ind for ind in indicators if "internal_network" not in ind.tags]

        feed_items = []
        for ind in exportable:
            feed_items.append({
                "indicator_value": ind.indicator_value,
                "indicator_type": ind.indicator_type,
                "threat_level": ind.threat_level,
                "confidence": ind.decayed_confidence,
                "campaign": ind.campaign,
                "last_seen": ind.last_seen,
            })

        return {
            "feed_name": "HoneyShield-X Defensive Threat Intelligence Feed",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "count": len(feed_items),
            "indicators": feed_items,
        }

    def export_csv_feed(
        self,
        db: Session,
        min_confidence: float = 0.65,
        indicator_type: str | None = None,
        campaign: str | None = None,
        include_headers: bool = True,
    ) -> str:
        """Export indicators as standard Firewall External Dynamic List (EDL) CSV.

        Neutralizes formula injection and CRLF injection.
        """
        indicators, _ = self.list_indicators(
            db=db,
            status="active",
            indicator_type=indicator_type,
            campaign=campaign,
            min_confidence=min_confidence,
            limit=2000,
        )

        exportable = [ind for ind in indicators if "internal_network" not in ind.tags]

        lines: list[str] = []
        if include_headers:
            lines.append("indicator,type,threat_level,confidence,campaign,last_seen")

        formula_chars = ("=", "+", "-", "@", "\t", "\r")

        for ind in exportable:
            # Neutralize formula injection
            val = ind.indicator_value
            if any(val.startswith(c) for c in formula_chars):
                val = f"'{val}"

            t_val = ind.indicator_type
            sev = ind.threat_level
            conf = str(ind.decayed_confidence)
            camp = ind.campaign or ""
            if any(camp.startswith(c) for c in formula_chars):
                camp = f"'{camp}"
            ls = ind.last_seen

            # Sanitize control characters
            row = [
                CONTROL_CHARS_REGEX.sub("", val),
                CONTROL_CHARS_REGEX.sub("", t_val),
                CONTROL_CHARS_REGEX.sub("", sev),
                CONTROL_CHARS_REGEX.sub("", conf),
                CONTROL_CHARS_REGEX.sub("", camp),
                CONTROL_CHARS_REGEX.sub("", ls),
            ]
            lines.append(",".join(f'"{c}"' for c in row))

        return "\n".join(lines)

    def export_stix_bundle(
        self,
        db: Session,
        min_confidence: float = 0.65,
        indicator_type: str | None = None,
        campaign: str | None = None,
    ) -> dict[str, Any]:
        """Export indicators as a STIX 2.1-compliant JSON bundle (zero dependencies)."""
        indicators, _ = self.list_indicators(
            db=db,
            status="active",
            indicator_type=indicator_type,
            campaign=campaign,
            min_confidence=min_confidence,
            limit=2000,
        )

        exportable = [ind for ind in indicators if "internal_network" not in ind.tags]

        stix_objects: list[dict[str, Any]] = []
        now_stix = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

        for ind in exportable:
            ind_id = f"indicator--{uuid.uuid5(uuid.NAMESPACE_DNS, f'{ind.indicator_type}:{ind.indicator_value}')}"
            stix_pattern = ""
            if ind.indicator_type == "ip":
                stix_pattern = f"[ipv4-addr:value = '{ind.indicator_value}']"
            elif ind.indicator_type == "cidr":
                stix_pattern = f"[ipv4-addr:value ISSUBSET '{ind.indicator_value}']"
            elif ind.indicator_type == "domain":
                stix_pattern = f"[domain-name:value = '{ind.indicator_value}']"
            elif ind.indicator_type == "hash":
                stix_pattern = f"[file:hashes.'SHA-256' = '{ind.indicator_value}']"
            else:
                stix_pattern = f"[custom-observable:value = '{ind.indicator_value}']"

            obj = {
                "type": "indicator",
                "spec_version": "2.1",
                "id": ind_id,
                "created": now_stix,
                "modified": now_stix,
                "name": f"HoneyShield-X Indicator: {ind.indicator_value}",
                "description": CONTROL_CHARS_REGEX.sub("", ind.description or "Automated honeypot indicator"),
                "pattern": stix_pattern,
                "pattern_type": "stix",
                "valid_from": now_stix,
                "confidence": int(round(ind.decayed_confidence * 100)),
                "labels": ["malicious-activity", ind.threat_level],
            }
            stix_objects.append(obj)

        bundle_id = f"bundle--{uuid.uuid4()}"
        return {
            "type": "bundle",
            "id": bundle_id,
            "spec_version": "2.1",
            "objects": stix_objects,
        }


# Global Singleton Service
threat_intel_service = ThreatIntelService()
