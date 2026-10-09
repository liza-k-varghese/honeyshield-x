"""Campaign Intelligence Core Package for HoneyShield-X (Module 3.10).

Fuses attacks, alerts, canary tripwires, threat intel IOCs, cases, and outbound
telemetry into deterministic cross-module attack campaigns and a multi-entity DAG graph.
"""

from app.campaigns.clustering import DeterministicClusterer
from app.campaigns.graph import derive_campaign_graph
from app.campaigns.service import CampaignService, default_campaign_service
from app.campaigns.storage import CampaignStore, default_campaign_store

__all__ = [
    "DeterministicClusterer",
    "derive_campaign_graph",
    "CampaignService",
    "default_campaign_service",
    "CampaignStore",
    "default_campaign_store",
]
