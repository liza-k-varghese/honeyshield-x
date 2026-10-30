/**
 * HoneyShield X — System 3: Threat Intelligence & Analysis API Module
 * Aligned with FastAPI Module 3.8 (Threat Intel) & Module 3.10 (Hunts).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ThreatIndicator, CampaignCluster, HuntSummary } from '../types';

export const intelApi = {
  async getIndicators(search?: string, threatType?: string): Promise<ThreatIndicator[]> {
    const response = await apiClient.get(API_ENDPOINTS.INTEL.INDICATORS, {
      params: { search, indicator_type: threatType },
    });
    const list = response.data?.indicators || (Array.isArray(response.data) ? response.data : []);
    return list.map((item: any) => ({
      ...item,
      value: item.indicator_value || item.value,
      confidence: Math.round((item.decayed_confidence || item.base_confidence || 0.8) * 100),
      threat_type: item.threat_level || item.threat_type || 'Malicious Indicator',
    }));
  },

  async lookupIndicator(value: string): Promise<ThreatIndicator> {
    const response = await apiClient.get(API_ENDPOINTS.INTEL.LOOKUP, {
      params: {
        indicator_value: value,
        indicator_type: value.includes('.') && !value.includes('/') ? 'ip' : 'domain',
      },
    });

    const res = response.data;
    return {
      id: 1,
      indicator_type: res.indicator_type || 'ip',
      indicator_value: res.indicator_value || value,
      threat_level: res.reputation_score > 70 ? 'CRITICAL' : 'HIGH',
      base_confidence: 0.9,
      decayed_confidence: 0.85,
      status: 'active',
      half_life_days: 14,
      hit_count: 1,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      tags: res.tags || ['threat_intel'],
      created_at: new Date().toISOString(),
      value: res.indicator_value || value,
      confidence: res.reputation_score || 85,
      threat_type: 'Adversary Infrastructure',
    };
  },

  async getCampaigns(): Promise<CampaignCluster[]> {
    const response = await apiClient.get(API_ENDPOINTS.INTEL.CAMPAIGNS);
    const list = response.data?.campaigns || (Array.isArray(response.data) ? response.data : []);
    return list.map((c: any) => ({
      ...c,
      id: c.campaign_id || c.id,
      adversary: c.name || 'Adversary Cluster',
      threat_level: c.highest_severity ? c.highest_severity.toUpperCase() : 'HIGH',
      mitre_tactics: c.indicator_types || ['Command and Control', 'Initial Access'],
    }));
  },

  async getHunts(): Promise<HuntSummary[]> {
    const response = await apiClient.get(API_ENDPOINTS.INTEL.HUNTS);
    const list = response.data?.hunts || (Array.isArray(response.data) ? response.data : []);
    return list.map((h: any) => ({
      ...h,
      id: h.hunt_id || h.id,
      mitre_technique: h.mitre_techniques?.[0] || 'T1021',
      findings_count: h.findings_count || 0,
    }));
  },

  async getHuntHypotheses(): Promise<HuntSummary[]> {
    return this.getHunts();
  },

  async executeHunt(huntId: string): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.INTEL.HUNT_EXECUTE(huntId));
    return response.data;
  },
};
