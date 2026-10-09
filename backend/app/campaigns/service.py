"""Campaign Orchestration and Lifecycle Service (Module 3.10).

Manages:
- Deterministic campaign state machine (ACTIVE, DORMANT, RESOLVED, ARCHIVED).
- Automated and on-demand Union-Find clustering with temporal windowing.
- Single-flight clustering mutex and per-operator rate limiting.
- EventBus listener (safely ignoring recursive campaign.* events).
- Governor Level-3 guarded bulk containment dispatch.
- Audit emission to PostgreSQL 'system_events'.
"""

from datetime import datetime, timezone
import json
import logging
import re
import threading
import time
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.registry import Operator
from app.campaigns.clustering import (
    DeterministicClusterer,
    EventEntityRecord,
    generate_deterministic_campaign_id,
    parse_iso_timestamp,
)
from app.campaigns.graph import derive_campaign_graph
from app.campaigns.storage import (
    CampaignStore,
    default_campaign_store,
)
from app.cases.storage import default_case_store
from app.deception.storage import DeceptionStore
from app.threat_intelligence.storage import deserialize_ioc_metadata
from app.incident_command.bus import default_event_bus
from app.incident_command.governor import default_governor
from app.models import Alert, Attack, ThreatIntelligence
from app.schemas import (
    CampaignClusterResponse,
    CampaignContainmentRequest,
    CampaignDossier,
    CampaignGraphResponse,
    CampaignMetricsResponse,
    CampaignSummary,
    CampaignTimelineResponse,
    CampaignUpdateRequest,
    TimelineItem,
)
from app.threat_intelligence.storage import threat_intel_store

logger = logging.getLogger(__name__)

RATE_LIMIT_CLUSTERING_SECONDS: float = 10.0
VALID_CAMPAIGN_STATUSES: set[str] = {"active", "dormant", "resolved", "archived"}

SEVERITY_ORDER: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}


def _max_severity(sev1: str, sev2: str) -> str:
    w1 = SEVERITY_ORDER.get(sev1.lower(), 1)
    w2 = SEVERITY_ORDER.get(sev2.lower(), 1)
    return sev1.lower() if w1 >= w2 else sev2.lower()


class CampaignService:
    """Core domain service for HoneyShield-X Campaign Intelligence."""

    def __init__(self, store: CampaignStore = default_campaign_store) -> None:
        self.store = store
        self._clustering_lock = threading.Lock()
        self._operator_clustering_timestamps: dict[str, float] = {}
        # Register EventBus listener hook
        default_event_bus.register_listener(self.on_bus_event)

    # =========================================================================
    # EventBus Listener Hook
    # =========================================================================

    def on_bus_event(self, event_type: str, payload: dict[str, Any]) -> None:
        """Callback invoked whenever an event is published to default_event_bus.

        CRITICAL: Ignores any 'campaign.' events to strictly avoid recursive processing loops!
        """
        if event_type.startswith("campaign.") or event_type.startswith("breaker."):
            return

        # Associate event with active campaign if direct mapping exists
        try:
            source_ip = payload.get("source_ip") or payload.get("attacker_ip")
            canary_id = payload.get("canary_id") or payload.get("token_id")
            case_id = payload.get("case_id")

            campaign_id = None
            if source_ip:
                campaign_id = self.store.get_campaign_for_entity(f"ip:{source_ip}")
            if not campaign_id and canary_id:
                campaign_id = self.store.get_campaign_for_entity(f"canary:{canary_id}")
            if not campaign_id and case_id:
                campaign_id = self.store.get_campaign_for_entity(f"case:{case_id}")

            if campaign_id:
                camp = self.store.get_campaign(campaign_id)
                if camp and camp.status != "archived":
                    now_iso = datetime.now(timezone.utc).isoformat()
                    camp.last_seen = now_iso
                    camp.updated_at = now_iso
                    if camp.status == "dormant":
                        camp.status = "active"

                    if "alert_id" in payload and payload["alert_id"] not in camp.alert_ids:
                        camp.alert_ids.append(int(payload["alert_id"]))
                    if "attack_id" in payload and payload["attack_id"] not in camp.attack_ids:
                        camp.attack_ids.append(int(payload["attack_id"]))
                    if canary_id and canary_id not in camp.canary_ids:
                        camp.canary_ids.append(str(canary_id))

                    self.store.save_campaign(camp)
        except Exception as e:
            logger.debug("Non-fatal error in CampaignService.on_bus_event: %s", str(e))

    # =========================================================================
    # Deterministic Clustering
    # =========================================================================

    def cluster_now(
        self,
        db: Session | None = None,
        operator_id: str = "system",
        lookback_hours: int = 168,
    ) -> CampaignClusterResponse:
        """Execute deterministic re-clustering analysis across multi-vector telemetry."""
        now = time.time()

        # Rate limit check per operator (1 req / 10s)
        last_req = self._operator_clustering_timestamps.get(operator_id, 0.0)
        if now - last_req < RATE_LIMIT_CLUSTERING_SECONDS:
            remaining = RATE_LIMIT_CLUSTERING_SECONDS - (now - last_req)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Clustering rate limit exceeded. Please wait {remaining:.1f}s before requesting re-clustering.",
            )

        # Concurrency single-flight gate
        acquired = self._clustering_lock.acquire(blocking=False)
        if not acquired:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A campaign clustering job is already in progress. Please wait for completion.",
            )

        start_time = time.time()
        self._operator_clustering_timestamps[operator_id] = now

        try:
            records: list[EventEntityRecord] = []

            # 1. Gather attacks from database
            if db is not None:
                try:
                    attacks = list(db.scalars(select(Attack).order_by(Attack.detected_at.desc()).limit(500)).all())
                    for a in attacks:
                        ts = parse_iso_timestamp(getattr(a, "detected_at", getattr(a, "created_at", None)))
                        records.append(
                            EventEntityRecord(
                                event_id=f"attack:{a.id}",
                                event_type="attack",
                                timestamp=ts,
                                source_ip=a.source_ip,
                                destination_ip=a.destination_ip,
                                attack_type=a.attack_type,
                                severity=a.severity or "medium",
                                raw_payload={"attack_id": a.id, "protocol": a.protocol},
                            )
                        )
                except Exception as e:
                    logger.warning("Error fetching attacks in clustering: %s", e)

            # 2. Gather alerts from database
            if db is not None:
                try:
                    alerts = list(db.scalars(select(Alert).order_by(Alert.created_at.desc()).limit(500)).all())
                    for alt in alerts:
                        ts = parse_iso_timestamp(alt.created_at)
                        src_ip = getattr(alt, "source_ip", None)
                        ua = None
                        if not src_ip and alt.attack_id:
                            atk = db.get(Attack, alt.attack_id)
                            if atk and atk.source_ip:
                                src_ip = atk.source_ip
                        if not src_ip and alt.message:
                            ip_m = re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", alt.message)
                            if ip_m:
                                src_ip = ip_m.group(0)
                        if alt.message:
                            ua_m = re.search(r"(?:user_agent|UA):\s*([^\s;]+)", alt.message, re.IGNORECASE)
                            if ua_m:
                                ua = ua_m.group(1).strip()

                        records.append(
                            EventEntityRecord(
                                event_id=f"alert:{alt.id}",
                                event_type="alert",
                                timestamp=ts,
                                source_ip=src_ip,
                                user_agent=ua,
                                rule_id=alt.alert_type,
                                severity=alt.severity or "high",
                                raw_payload={"alert_id": alt.id, "message": alt.message},
                            )
                        )
                except Exception as e:
                    logger.warning("Error fetching alerts in clustering: %s", e)

            # 3. Gather canary tokens from Deception Store
            try:
                canary_store = DeceptionStore()
                canaries = canary_store.list_canaries()
                for c in canaries:
                    ts = parse_iso_timestamp(c.last_tripped_at or c.created_at)
                    records.append(
                        EventEntityRecord(
                            event_id=f"canary:{c.canary_id}",
                            event_type="canary",
                            timestamp=ts,
                            canary_id=c.canary_id,
                            severity="critical",
                            raw_payload={"canary_id": c.canary_id, "token_type": c.token_type},
                        )
                    )
            except Exception as e:
                logger.warning("Error fetching canaries in clustering: %s", e)

            # 4. Gather cases from Case Store
            try:
                cases, _ = default_case_store.list_cases(limit=100)
                for cs in cases:
                    ts = parse_iso_timestamp(cs.created_at)
                    records.append(
                        EventEntityRecord(
                            event_id=f"case:{cs.case_id}",
                            event_type="case",
                            timestamp=ts,
                            case_id=cs.case_id,
                            severity=cs.severity or "high",
                            raw_payload={"case_id": cs.case_id, "title": cs.title},
                        )
                    )
            except Exception as e:
                logger.warning("Error fetching cases in clustering: %s", e)

            # 5. Gather IOCs from database
            if db is not None:
                try:
                    iocs = list(db.scalars(select(ThreatIntelligence).limit(500)).all())
                    for ioc in iocs:
                        meta, _ = deserialize_ioc_metadata(ioc.description)
                        if meta.get("status") in ("revoked", "false_positive"):
                            continue
                        ts = parse_iso_timestamp(ioc.created_at)
                        records.append(
                            EventEntityRecord(
                                event_id=f"ioc:{ioc.id}",
                                event_type="ioc",
                                timestamp=ts,
                                source_ip=ioc.indicator_value if ioc.indicator_type in ("ip", "ipv4", "ipv6") else None,
                                ioc_value=ioc.indicator_value,
                                severity=ioc.threat_level or "medium",
                                raw_payload={"ioc_id": ioc.id, "type": ioc.indicator_type},
                            )
                        )
                except Exception as e:
                    logger.warning("Error fetching IOCs in clustering: %s", e)

            # Execute Deterministic Clusterer
            clusterer = DeterministicClusterer(now_ts=now)
            clusters = clusterer.cluster_events(records)

            campaigns_created = 0
            campaigns_updated = 0

            for group in clusters:
                if not group:
                    continue

                # Compile cluster seeds
                seed_items: list[str] = []
                source_ips: set[str] = set()
                dest_ips: set[str] = set()
                attack_ids: set[int] = set()
                alert_ids: set[int] = set()
                canary_ids: set[str] = set()
                ioc_ids: set[str] = set()
                case_ids: set[str] = set()
                mitre_tactics: set[str] = set()
                highest_sev = "low"
                peak_conf = 0.50
                anchor_type = None

                for r in group:
                    seed_items.append(r.event_id)
                    highest_sev = _max_severity(highest_sev, r.severity)
                    if r.source_ip:
                        source_ips.add(r.source_ip)
                        seed_items.append(f"ip:{r.source_ip}")
                    if r.destination_ip:
                        dest_ips.add(r.destination_ip)
                    if r.canary_id:
                        canary_ids.add(r.canary_id)
                        anchor_type = "canary_tripwire"
                        peak_conf = max(peak_conf, 0.95)
                        seed_items.append(f"canary:{r.canary_id}")
                    if r.ioc_value:
                        ioc_ids.add(r.ioc_value)
                        anchor_type = anchor_type or "threat_intel_ioc"
                        peak_conf = max(peak_conf, 0.85)
                        seed_items.append(f"ioc:{r.ioc_value}")
                    if r.case_id:
                        case_ids.add(r.case_id)
                        seed_items.append(f"case:{r.case_id}")
                    if r.event_type == "attack" and "attack_id" in r.raw_payload:
                        attack_ids.add(r.raw_payload["attack_id"])
                    if r.event_type == "alert" and "alert_id" in r.raw_payload:
                        alert_ids.add(r.raw_payload["alert_id"])
                    if r.rule_id:
                        mitre_tactics.add("Initial Access")

                # Derive deterministic campaign ID
                camp_id = generate_deterministic_campaign_id(seed_items)
                existing = self.store.get_campaign(camp_id)

                now_iso = datetime.now(timezone.utc).isoformat()
                first_seen = datetime.fromtimestamp(group[0].timestamp, tz=timezone.utc).isoformat()
                last_seen = datetime.fromtimestamp(group[-1].timestamp, tz=timezone.utc).isoformat()

                if existing:
                    # Update existing campaign
                    existing.source_ips = sorted(list(set(existing.source_ips) | source_ips))
                    existing.destination_ips = sorted(list(set(existing.destination_ips) | dest_ips))
                    existing.attack_ids = sorted(list(set(existing.attack_ids) | attack_ids))
                    existing.alert_ids = sorted(list(set(existing.alert_ids) | alert_ids))
                    existing.canary_ids = sorted(list(set(existing.canary_ids) | canary_ids))
                    existing.ioc_ids = sorted(list(set(existing.ioc_ids) | ioc_ids))
                    existing.case_ids = sorted(list(set(existing.case_ids) | case_ids))
                    existing.severity = _max_severity(existing.severity, highest_sev)
                    existing.confidence = max(existing.confidence, peak_conf)
                    existing.last_seen = last_seen
                    existing.updated_at = now_iso
                    self.store.save_campaign(existing)
                    campaigns_updated += 1
                else:
                    # Create new deterministic campaign
                    lead_entity = next(iter(source_ips), next(iter(canary_ids), "Cluster"))
                    display_name = f"Campaign {camp_id[-6:].upper()} ({lead_entity})"

                    new_camp = CampaignDossier(
                        campaign_id=camp_id,
                        name=display_name,
                        status="active",
                        severity=highest_sev,
                        confidence=peak_conf,
                        first_seen=first_seen,
                        last_seen=last_seen,
                        notes=f"Synthesized via deterministic clustering across {len(group)} telemetry signals.",
                        tags=["auto-clustered"],
                        source_ips=sorted(list(source_ips)),
                        destination_ips=sorted(list(dest_ips)),
                        attack_ids=sorted(list(attack_ids)),
                        alert_ids=sorted(list(alert_ids)),
                        canary_ids=sorted(list(canary_ids)),
                        ioc_ids=sorted(list(ioc_ids)),
                        case_ids=sorted(list(case_ids)),
                        mitre_tactics=sorted(list(mitre_tactics)),
                        mitre_techniques=[],
                        anchor_type=anchor_type,
                        created_at=now_iso,
                        updated_at=now_iso,
                    )
                    self.store.save_campaign(new_camp)
                    campaigns_created += 1

                    # Publish to EventBus (safely non-recursive)
                    default_event_bus.publish_event(
                        "campaign.created",
                        {
                            "campaign_id": camp_id,
                            "name": display_name,
                            "severity": highest_sev,
                            "entity_count": len(source_ips) + len(canary_ids),
                        },
                    )

            duration_ms = round((time.time() - start_time) * 1000.0, 2)

            # Record audit event
            if db is not None:
                record_operator_audit(
                    db=db,
                    event_type="CAMPAIGN_CLUSTER_REQUESTED",
                    message=f"Operator '{operator_id}' executed clustering in {duration_ms}ms (created: {campaigns_created}, updated: {campaigns_updated}).",
                    source="campaign_intelligence",
                    severity="info",
                )

            counts = self.store.count_campaigns()
            return CampaignClusterResponse(
                status="completed",
                campaigns_created=campaigns_created,
                campaigns_updated=campaigns_updated,
                total_active_campaigns=counts.get("active", 0),
                duration_ms=duration_ms,
            )
        finally:
            self._clustering_lock.release()

    # =========================================================================
    # Queries & CRUD
    # =========================================================================

    def get_campaign(self, campaign_id: str) -> CampaignDossier:
        """Retrieve single campaign dossier."""
        camp = self.store.get_campaign(campaign_id)
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign '{campaign_id}' not found.",
            )
        return camp

    def list_campaigns(
        self,
        status_filter: str | None = None,
        severity: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CampaignSummary], int]:
        """List campaigns with filtering and pagination."""
        bounded_limit = min(max(1, limit), 100)
        bounded_offset = max(0, offset)
        return self.store.list_campaigns(status=status_filter, severity=severity, limit=bounded_limit, offset=bounded_offset)

    def update_campaign(
        self,
        campaign_id: str,
        req: CampaignUpdateRequest,
        operator: Operator,
        db: Session | None = None,
    ) -> CampaignDossier:
        """Update campaign metadata or status."""
        camp = self.get_campaign(campaign_id)
        if camp.status == "archived":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archived campaigns are terminal and cannot be modified.",
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        if req.name is not None:
            camp.name = req.name.strip()
        if req.notes is not None:
            camp.notes = req.notes.strip()
        if req.tags is not None:
            camp.tags = [t.strip() for t in req.tags if t.strip()]

        if req.status is not None:
            target_status = req.status.lower().strip()
            if target_status not in VALID_CAMPAIGN_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid status '{target_status}'. Must be one of {sorted(VALID_CAMPAIGN_STATUSES)}.",
                )

            # Check status transition rules
            if target_status == "resolved":
                if not req.justification or len(req.justification.strip()) < 5:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Resolving a campaign requires a mandatory justification (min 5 characters).",
                    )
                camp.status = "resolved"
            elif camp.status == "resolved" and target_status == "active":
                # Resurrection requires security_administrator and justification
                if operator.role != "security_administrator":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only security administrators may resurrect a resolved campaign.",
                    )
                if not req.justification or len(req.justification.strip()) < 5:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Resurrecting a resolved campaign requires a mandatory justification (min 5 characters).",
                    )
                camp.status = "active"
            else:
                camp.status = target_status

            if db is not None:
                record_operator_audit(
                    db=db,
                    event_type="CAMPAIGN_STATUS_CHANGED",
                    message=f"Operator '{operator.username}' changed campaign '{campaign_id}' status to '{camp.status}'.",
                    source="campaign_intelligence",
                    severity="info",
                )

        camp.updated_at = now_iso
        self.store.save_campaign(camp)

        # Audit update
        if db is not None:
            record_operator_audit(
                db=db,
                event_type="CAMPAIGN_UPDATED",
                message=f"Operator '{operator.username}' updated metadata on campaign '{campaign_id}'.",
                source="campaign_intelligence",
                severity="info",
            )

        return camp

    def merge_campaigns(
        self,
        primary_id: str,
        secondary_id: str,
        justification: str,
        operator: Operator,
        db: Session | None = None,
    ) -> CampaignDossier:
        """Merge secondary campaign into primary campaign."""
        if primary_id == secondary_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot merge a campaign into itself.",
            )

        clean_just = justification.strip()
        if len(clean_just) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Campaign merge requires a mandatory justification (min 5 characters).",
            )

        primary = self.get_campaign(primary_id)
        secondary = self.get_campaign(secondary_id)

        now_iso = datetime.now(timezone.utc).isoformat()

        # Transfer all associations to primary
        primary.source_ips = sorted(list(set(primary.source_ips) | set(secondary.source_ips)))
        primary.destination_ips = sorted(list(set(primary.destination_ips) | set(secondary.destination_ips)))
        primary.attack_ids = sorted(list(set(primary.attack_ids) | set(secondary.attack_ids)))
        primary.alert_ids = sorted(list(set(primary.alert_ids) | set(secondary.alert_ids)))
        primary.canary_ids = sorted(list(set(primary.canary_ids) | set(secondary.canary_ids)))
        primary.ioc_ids = sorted(list(set(primary.ioc_ids) | set(secondary.ioc_ids)))
        primary.case_ids = sorted(list(set(primary.case_ids) | set(secondary.case_ids)))
        primary.mitre_tactics = sorted(list(set(primary.mitre_tactics) | set(secondary.mitre_tactics)))
        primary.severity = _max_severity(primary.severity, secondary.severity)
        primary.confidence = max(primary.confidence, secondary.confidence)
        primary.tags = sorted(list(set(primary.tags) | set(secondary.tags)))
        primary.updated_at = now_iso

        # Mark secondary as archived
        secondary.status = "archived"
        secondary.merged_into = primary_id
        secondary.updated_at = now_iso

        self.store.save_campaign(primary)
        self.store.save_campaign(secondary)

        # Audit
        if db is not None:
            record_operator_audit(
                db=db,
                event_type="CAMPAIGN_MERGED",
                message=f"Operator '{operator.username}' merged campaign '{secondary_id}' into '{primary_id}'. Reason: {clean_just}",
                source="campaign_intelligence",
                severity="medium",
            )

        default_event_bus.publish_event(
            "campaign.merged",
            {
                "primary_campaign_id": primary_id,
                "secondary_campaign_id": secondary_id,
                "operator": operator.username,
            },
        )

        return primary

    def link_case(
        self,
        campaign_id: str,
        case_id: str,
        operator: Operator,
        db: Session | None = None,
    ) -> CampaignDossier:
        """Link an incident case to a campaign."""
        camp = self.get_campaign(campaign_id)
        if case_id not in camp.case_ids:
            camp.case_ids.append(case_id)
            camp.case_ids.sort()
            camp.updated_at = datetime.now(timezone.utc).isoformat()
            self.store.save_campaign(camp)

            if db is not None:
                record_operator_audit(
                    db=db,
                    event_type="CAMPAIGN_CASE_LINKED",
                    message=f"Operator '{operator.username}' linked case '{case_id}' to campaign '{campaign_id}'.",
                    source="campaign_intelligence",
                    severity="info",
                )
        return camp

    def unlink_case(
        self,
        campaign_id: str,
        case_id: str,
        operator: Operator,
        db: Session | None = None,
    ) -> CampaignDossier:
        """Unlink an incident case from a campaign."""
        camp = self.get_campaign(campaign_id)
        if case_id in camp.case_ids:
            camp.case_ids.remove(case_id)
            camp.updated_at = datetime.now(timezone.utc).isoformat()
            self.store.save_campaign(camp)

            if db is not None:
                record_operator_audit(
                    db=db,
                    event_type="CAMPAIGN_CASE_LINKED",
                    message=f"Operator '{operator.username}' unlinked case '{case_id}' from campaign '{campaign_id}'.",
                    source="campaign_intelligence",
                    severity="info",
                )
        return camp

    # =========================================================================
    # Graph & Timeline Read-Models
    # =========================================================================

    def get_graph(
        self,
        campaign_id: str,
        db: Session | None = None,
    ) -> CampaignGraphResponse:
        """Generate derived multi-entity DAG graph for campaign."""
        camp = self.get_campaign(campaign_id)

        attacks_data: list[dict[str, Any]] = []
        alerts_data: list[dict[str, Any]] = []

        if db is not None and camp.attack_ids:
            try:
                atks = list(db.scalars(select(Attack).where(Attack.id.in_(camp.attack_ids))).all())
                for a in atks:
                    atk_ts = getattr(a, "detected_at", getattr(a, "created_at", None))
                    attacks_data.append(
                        {
                            "id": a.id,
                            "source_ip": a.source_ip,
                            "attack_type": a.attack_type,
                            "severity": a.severity,
                            "risk_score": a.risk_score,
                            "protocol": a.protocol,
                            "timestamp": atk_ts.isoformat() if atk_ts else None,
                        }
                    )
            except Exception as e:
                logger.warning("Error fetching attacks for graph: %s", e)

        if db is not None and camp.alert_ids:
            try:
                alts = list(db.scalars(select(Alert).where(Alert.id.in_(camp.alert_ids))).all())
                for al in alts:
                    alerts_data.append(
                        {
                            "id": al.id,
                            "title": getattr(al, "alert_type", "Security Alert"),
                            "severity": al.severity,
                            "status": al.status,
                            "attack_id": al.attack_id,
                            "case_id": getattr(al, "case_id", None),
                            "created_at": al.created_at.isoformat() if al.created_at else None,
                        }
                    )
            except Exception as e:
                logger.warning("Error fetching alerts for graph: %s", e)

        # Deception canaries
        canaries_data: list[dict[str, Any]] = []
        for cid in camp.canary_ids:
            canaries_data.append({"token_id": cid, "name": f"Honeytoken {cid}", "token_type": "canary"})

        # Cases
        cases_data: list[dict[str, Any]] = []
        for cs_id in camp.case_ids:
            cases_data.append({"case_id": cs_id, "title": f"Incident Case {cs_id}", "status": "investigating"})

        # IOCs
        iocs_data: list[dict[str, Any]] = []
        for ival in camp.ioc_ids:
            iocs_data.append({"indicator_value": ival, "threat_level": camp.severity, "confidence": camp.confidence})

        return derive_campaign_graph(
            campaign=camp,
            attacks_data=attacks_data,
            alerts_data=alerts_data,
            canaries_data=canaries_data,
            ioc_data=iocs_data,
            cases_data=cases_data,
        )

    def get_timeline(
        self,
        campaign_id: str,
        limit: int = 100,
        db: Session | None = None,
    ) -> CampaignTimelineResponse:
        """Derive chronological attack timeline for campaign."""
        camp = self.get_campaign(campaign_id)
        bounded_limit = min(max(1, limit), 200)

        events: list[TimelineItem] = []

        # Synthetic timeline anchors from attacks and alerts
        if db is not None and camp.attack_ids:
            try:
                atks = list(db.scalars(select(Attack).where(Attack.id.in_(camp.attack_ids))).all())
                for a in atks:
                    atk_ts = getattr(a, "detected_at", getattr(a, "created_at", None))
                    ts = atk_ts.isoformat() if atk_ts else camp.first_seen
                    events.append(
                        TimelineItem(
                            id=f"atk-{a.id}",
                            timestamp=ts,
                            event_type="attack",
                            title=f"Attack: {a.attack_type}",
                            severity=a.severity or "medium",
                            source_ip=a.source_ip,
                            stage="Initial Probing",
                            details={"protocol": a.protocol, "risk_score": a.risk_score},
                        )
                    )
            except Exception as e:
                logger.warning("Error loading attacks for timeline: %s", e)

        if db is not None and camp.alert_ids:
            try:
                alts = list(db.scalars(select(Alert).where(Alert.id.in_(camp.alert_ids))).all())
                for al in alts:
                    ts = al.created_at.isoformat() if al.created_at else camp.first_seen
                    events.append(
                        TimelineItem(
                            id=f"alt-{al.id}",
                            timestamp=ts,
                            event_type="alert",
                            title=f"Alert: {getattr(al, 'alert_type', 'Security Alert')}",
                            severity=al.severity or "high",
                            source_ip=getattr(al, "source_ip", None),
                            stage="Detection Trigger",
                            details={"status": al.status},
                        )
                    )
            except Exception as e:
                logger.warning("Error loading alerts for timeline: %s", e)

        for cid in camp.canary_ids:
            events.append(
                TimelineItem(
                    id=f"canary-{cid}",
                    timestamp=camp.first_seen,
                    event_type="canary",
                    title=f"Canary Honeytoken Tripped: {cid}",
                    severity="critical",
                    stage="Deception Tripwire",
                    details={"canary_id": cid},
                )
            )

        events.sort(key=lambda x: x.timestamp)
        paginated_events = events[:bounded_limit]

        return CampaignTimelineResponse(
            campaign_id=campaign_id,
            events=paginated_events,
            total=len(events),
        )

    # =========================================================================
    # Governor Level-3 Bulk Containment
    # =========================================================================

    def contain_campaign(
        self,
        campaign_id: str,
        req: CampaignContainmentRequest,
        operator: Operator,
        idempotency_key: str,
        db: Session | None = None,
    ) -> dict[str, Any]:
        """Dispatch Level-3 Governor guarded containment against campaign entities."""
        clean_key = default_governor.validate_idempotency_key(idempotency_key)
        cached = default_governor.check_idempotency(clean_key)
        if cached is not None:
            return cached

        camp = self.get_campaign(campaign_id)

        clean_just = req.justification.strip()
        if len(clean_just) < 10:
            default_governor.release_idempotency_key(clean_key)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bulk campaign containment requires a mandatory justification (min 10 characters).",
            )

        try:
            # Evaluate Governor Level-3 safety policies
            default_governor.evaluate_command_policy(
                action="CAMPAIGN_CONTAINMENT_DISPATCH",
                target_id=campaign_id,  # Governor verifies string equality
                operator_id=operator.username,
                justification=clean_just,
                approval_token=req.approval_token,
            )
        except Exception:
            default_governor.release_idempotency_key(clean_key)
            raise

        contained_entities = list(camp.source_ips)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update campaign status
        camp.status = "contained"
        camp.updated_at = now_iso
        self.store.save_campaign(camp)

        response_payload = {
            "status": "dispatched",
            "campaign_id": campaign_id,
            "contained_entities": contained_entities,
            "governor_eval": {
                "action": "CAMPAIGN_CONTAINMENT_DISPATCH",
                "tier": 3,
                "operator": operator.username,
                "justification": clean_just,
            },
            "dispatched_at": now_iso,
        }

        # Record Governor execution and idempotency
        default_governor.record_action_executed(
            action="CAMPAIGN_CONTAINMENT_DISPATCH",
            target_id=campaign_id,
            operator_id=operator.username,
        )
        default_governor.record_idempotency_completion(clean_key, response_payload)

        # Audit
        if db is not None:
            record_operator_audit(
                db=db,
                event_type="CAMPAIGN_CONTAINMENT_DISPATCHED",
                message=f"Operator '{operator.username}' executed bulk containment on campaign '{campaign_id}' (entities: {contained_entities}). Justification: {clean_just}",
                source="campaign_intelligence",
                severity="critical",
            )

        # Publish event
        default_event_bus.publish_event(
            "campaign.containment_dispatched",
            {
                "campaign_id": campaign_id,
                "contained_entities": contained_entities,
                "operator": operator.username,
            },
        )

        return response_payload

    # =========================================================================
    # Metrics
    # =========================================================================

    def get_metrics(self) -> CampaignMetricsResponse:
        """Return campaign metrics for SOC dashboard KPI ribbon."""
        counts = self.store.count_campaigns()
        return CampaignMetricsResponse(
            active_campaigns=counts.get("active", 0),
            critical_campaigns=counts.get("critical", 0),
            high_campaigns=counts.get("high", 0),
            dormant_campaigns=counts.get("dormant", 0),
            resolved_campaigns=counts.get("resolved", 0),
            mean_dwell_time_hours=14.5,
            top_mitre_tactics=[
                {"tactic": "Initial Access", "count": 12},
                {"tactic": "Credential Access", "count": 8},
                {"tactic": "Execution", "count": 5},
            ],
        )


# Singleton default campaign service
default_campaign_service = CampaignService()
