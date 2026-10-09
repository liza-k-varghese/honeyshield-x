"""Deterministic Dual-Mode Campaign Storage Layer (Module 3.10).

Zero-Migration Architecture:
- Redis primary storage backed by 'hsx:campaigns:items', 'hsx:campaigns:active_ids', and 'hsx:campaigns:entity_idx'.
- Resilient in-memory fallback using threading.RLock ensuring test execution and offline resilience.
- Bounded active campaign state (max 500 campaigns) with deterministic FIFO eviction.
- Campaign payload bounded to 64KB.
"""

from datetime import datetime, timezone
import json
import logging
import os
import threading
from typing import Any

import redis

from app.schemas import CampaignDossier, CampaignSummary

logger = logging.getLogger(__name__)

# Constants
MAX_ACTIVE_CAMPAIGNS: int = 500
MAX_CAMPAIGN_PAYLOAD_BYTES: int = 65536  # 64 KB
REDIS_KEY_ITEMS: str = "hsx:campaigns:items"
REDIS_KEY_ACTIVE: str = "hsx:campaigns:active_ids"
REDIS_KEY_ENTITY_IDX: str = "hsx:campaigns:entity_idx"

SEVERITY_WEIGHTS: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}


class CampaignStore:
    """Thread-safe dual-mode storage repository for Campaign entities."""

    def __init__(self, max_campaigns: int = MAX_ACTIVE_CAMPAIGNS) -> None:
        self.max_campaigns = max_campaigns
        self._lock = threading.RLock()
        self._memory_items: dict[str, CampaignDossier] = {}
        self._memory_active_ids: set[str] = set()
        self._memory_entity_idx: dict[str, str] = {}
        self._redis_client: redis.Redis | None = None
        self._init_redis()

    def _init_redis(self) -> None:
        """Connect to Redis if configured and reachable."""
        if os.getenv("HONEYSHIELD_TESTING") == "1":
            self._redis_client = None
            return

        host = os.getenv("HONEYSHIELD_REDIS_HOST", os.getenv("REDIS_HOST", "127.0.0.1"))
        port = int(os.getenv("HONEYSHIELD_REDIS_PORT", os.getenv("REDIS_PORT", "6379")))
        try:
            client = redis.Redis(
                host=host,
                port=port,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            client.ping()
            self._redis_client = client
            logger.info("CampaignStore successfully connected to Redis at %s:%d", host, port)
        except Exception as e:
            logger.warning("CampaignStore operating in in-memory fallback mode: %s", str(e))
            self._redis_client = None

    def _enforce_capacity(self) -> None:
        """Enforce maximum active campaigns using deterministic FIFO eviction."""
        with self._lock:
            while len(self._memory_items) >= self.max_campaigns:
                # Find evictable candidates: ARCHIVED first, then RESOLVED, then oldest created
                archived = [c for c in self._memory_items.values() if c.status == "archived"]
                if archived:
                    archived.sort(key=lambda x: x.updated_at)
                    self.delete_campaign(archived[0].campaign_id)
                    continue

                resolved = [c for c in self._memory_items.values() if c.status == "resolved"]
                if resolved:
                    resolved.sort(key=lambda x: x.updated_at)
                    self.delete_campaign(resolved[0].campaign_id)
                    continue

                # Evict oldest created item
                oldest_items = sorted(
                    self._memory_items.values(),
                    key=lambda x: x.first_seen or x.created_at,
                )
                if oldest_items:
                    self.delete_campaign(oldest_items[0].campaign_id)
                else:
                    break

    def save_campaign(self, campaign: CampaignDossier) -> CampaignDossier:
        """Atomically persist or update a CampaignDossier in Redis and Memory."""
        with self._lock:
            # Bound payload size
            raw_dict = campaign.model_dump()
            raw_json = json.dumps(raw_dict)
            if len(raw_json.encode("utf-8")) > MAX_CAMPAIGN_PAYLOAD_BYTES:
                # Deterministically prune non-critical arrays if oversized
                raw_dict["attack_ids"] = raw_dict.get("attack_ids", [])[:50]
                raw_dict["alert_ids"] = raw_dict.get("alert_ids", [])[:50]
                raw_dict["source_ips"] = raw_dict.get("source_ips", [])[:50]
                campaign = CampaignDossier(**raw_dict)
                raw_json = json.dumps(campaign.model_dump())
                if len(raw_json.encode("utf-8")) > MAX_CAMPAIGN_PAYLOAD_BYTES:
                    raise ValueError(f"Campaign dossier payload exceeds maximum {MAX_CAMPAIGN_PAYLOAD_BYTES} bytes")

            # Check capacity if adding new campaign
            if campaign.campaign_id not in self._memory_items:
                self._enforce_capacity()

            # Update memory store
            self._memory_items[campaign.campaign_id] = campaign
            if campaign.status in ("active", "dormant"):
                self._memory_active_ids.add(campaign.campaign_id)
            else:
                self._memory_active_ids.discard(campaign.campaign_id)

            # Update entity reverse indices
            for ip in campaign.source_ips:
                self._memory_entity_idx[f"ip:{ip}"] = campaign.campaign_id
            for cid in campaign.canary_ids:
                self._memory_entity_idx[f"canary:{cid}"] = campaign.campaign_id
            for ioc in campaign.ioc_ids:
                self._memory_entity_idx[f"ioc:{ioc}"] = campaign.campaign_id
            for case_id in campaign.case_ids:
                self._memory_entity_idx[f"case:{case_id}"] = campaign.campaign_id

            # Write to Redis if online
            if self._redis_client is not None:
                try:
                    pipe = self._redis_client.pipeline(transaction=True)
                    pipe.hset(REDIS_KEY_ITEMS, campaign.campaign_id, raw_json)
                    if campaign.status in ("active", "dormant"):
                        pipe.sadd(REDIS_KEY_ACTIVE, campaign.campaign_id)
                    else:
                        pipe.srem(REDIS_KEY_ACTIVE, campaign.campaign_id)

                    for ip in campaign.source_ips:
                        pipe.hset(REDIS_KEY_ENTITY_IDX, f"ip:{ip}", campaign.campaign_id)
                    for cid in campaign.canary_ids:
                        pipe.hset(REDIS_KEY_ENTITY_IDX, f"canary:{cid}", campaign.campaign_id)
                    for ioc in campaign.ioc_ids:
                        pipe.hset(REDIS_KEY_ENTITY_IDX, f"ioc:{ioc}", campaign.campaign_id)
                    for case_id in campaign.case_ids:
                        pipe.hset(REDIS_KEY_ENTITY_IDX, f"case:{case_id}", campaign.campaign_id)

                    pipe.execute()
                except Exception as e:
                    logger.warning("Redis write failed in CampaignStore: %s", str(e))

            return campaign

    def get_campaign(self, campaign_id: str) -> CampaignDossier | None:
        """Retrieve a single campaign by ID."""
        with self._lock:
            # Check Redis first if available
            if self._redis_client is not None:
                try:
                    raw_json = self._redis_client.hget(REDIS_KEY_ITEMS, campaign_id)
                    if raw_json:
                        data = json.loads(raw_json)
                        campaign = CampaignDossier(**data)
                        self._memory_items[campaign_id] = campaign
                        return campaign
                except Exception as e:
                    logger.warning("Redis read failed in CampaignStore: %s", str(e))

            # Memory fallback
            return self._memory_items.get(campaign_id)

    def list_campaigns(
        self,
        status: str | None = None,
        severity: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CampaignSummary], int]:
        """List campaigns with filtering and deterministic pagination."""
        with self._lock:
            items: list[CampaignDossier] = []

            # Populate items from Redis if available and memory empty
            if self._redis_client is not None and not self._memory_items:
                try:
                    all_raw = self._redis_client.hgetall(REDIS_KEY_ITEMS)
                    for raw_json in all_raw.values():
                        data = json.loads(raw_json)
                        camp = CampaignDossier(**data)
                        self._memory_items[camp.campaign_id] = camp
                except Exception as e:
                    logger.warning("Redis list fetch failed in CampaignStore: %s", str(e))

            items = list(self._memory_items.values())

            # Apply filters
            filtered: list[CampaignDossier] = []
            for c in items:
                if status and status.lower() != "all" and c.status.lower() != status.lower():
                    continue
                if severity and severity.lower() != "all" and c.severity.lower() != severity.lower():
                    continue
                filtered.append(c)

            # Deterministic sorting: (-severity_weight, -confidence, -entity_count, campaign_id)
            filtered.sort(
                key=lambda x: (
                    -SEVERITY_WEIGHTS.get(x.severity.lower(), 1),
                    -round(x.confidence, 3),
                    -(len(x.source_ips) + len(x.canary_ids) + len(x.case_ids)),
                    x.campaign_id,
                )
            )

            total = len(filtered)
            paginated = filtered[offset : offset + limit]

            # Convert to CampaignSummary
            summaries: list[CampaignSummary] = []
            for c in paginated:
                unique_entities = set(c.source_ips) | set(c.destination_ips) | set(c.canary_ids) | set(c.ioc_ids)
                summaries.append(
                    CampaignSummary(
                        campaign_id=c.campaign_id,
                        name=c.name,
                        status=c.status,
                        severity=c.severity,
                        confidence=round(c.confidence, 2),
                        entity_count=len(unique_entities),
                        attack_count=len(c.attack_ids),
                        alert_count=len(c.alert_ids),
                        canary_count=len(c.canary_ids),
                        ioc_count=len(c.ioc_ids),
                        case_count=len(c.case_ids),
                        mitre_tactics=c.mitre_tactics,
                        first_seen=c.first_seen,
                        last_seen=c.last_seen,
                        tags=c.tags,
                    )
                )

            return summaries, total

    def delete_campaign(self, campaign_id: str) -> bool:
        """Delete campaign from storage."""
        with self._lock:
            existed = campaign_id in self._memory_items
            camp = self._memory_items.pop(campaign_id, None)
            self._memory_active_ids.discard(campaign_id)

            if camp:
                for ip in camp.source_ips:
                    self._memory_entity_idx.pop(f"ip:{ip}", None)
                for cid in camp.canary_ids:
                    self._memory_entity_idx.pop(f"canary:{cid}", None)
                for ioc in camp.ioc_ids:
                    self._memory_entity_idx.pop(f"ioc:{ioc}", None)
                for case_id in camp.case_ids:
                    self._memory_entity_idx.pop(f"case:{case_id}", None)

            if self._redis_client is not None:
                try:
                    pipe = self._redis_client.pipeline(transaction=True)
                    pipe.hdel(REDIS_KEY_ITEMS, campaign_id)
                    pipe.srem(REDIS_KEY_ACTIVE, campaign_id)
                    if camp:
                        for ip in camp.source_ips:
                            pipe.hdel(REDIS_KEY_ENTITY_IDX, f"ip:{ip}")
                        for cid in camp.canary_ids:
                            pipe.hdel(REDIS_KEY_ENTITY_IDX, f"canary:{cid}")
                        for ioc in camp.ioc_ids:
                            pipe.hdel(REDIS_KEY_ENTITY_IDX, f"ioc:{ioc}")
                        for case_id in camp.case_ids:
                            pipe.hdel(REDIS_KEY_ENTITY_IDX, f"case:{case_id}")
                    pipe.execute()
                except Exception as e:
                    logger.warning("Redis delete failed in CampaignStore: %s", str(e))

            return existed

    def get_campaign_for_entity(self, entity_key: str) -> str | None:
        """Lookup campaign ID mapped to an entity key (e.g. 'ip:192.168.1.1')."""
        with self._lock:
            if self._redis_client is not None:
                try:
                    cid = self._redis_client.hget(REDIS_KEY_ENTITY_IDX, entity_key)
                    if cid:
                        return cid
                except Exception as e:
                    logger.warning("Redis entity lookup failed: %s", str(e))
            return self._memory_entity_idx.get(entity_key)

    def count(self) -> int:
        """Return total number of campaigns stored."""
        with self._lock:
            return len(self._memory_items)

    def count_campaigns(self) -> dict[str, int]:
        """Return campaign status and severity counts."""
        with self._lock:
            counts = {
                "active": 0,
                "dormant": 0,
                "resolved": 0,
                "archived": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "total": len(self._memory_items),
            }
            for c in self._memory_items.values():
                st = c.status.lower()
                sev = c.severity.lower()
                if st in counts:
                    counts[st] += 1
                if sev in counts:
                    counts[sev] += 1
            return counts

    def clear(self) -> None:
        """Clear all stored campaigns (for unit testing isolation)."""
        with self._lock:
            self._memory_items.clear()
            self._memory_active_ids.clear()
            self._memory_entity_idx.clear()
            if self._redis_client is not None:
                try:
                    self._redis_client.delete(REDIS_KEY_ITEMS, REDIS_KEY_ACTIVE, REDIS_KEY_ENTITY_IDX)
                except Exception:
                    pass


# Singleton default campaign store
default_campaign_store = CampaignStore()
