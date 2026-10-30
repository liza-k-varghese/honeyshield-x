/**
 * HoneyShield X — System 1: SOC Command & Alerts API Module
 * Strictly integrates with real FastAPI endpoints in dashboard, attacks, and alerts routers.
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  DashboardStats,
  AttackSummary,
  AttackDetail,
  AlertItem,
  AlertStatus,
} from '../types';

export const socApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>(API_ENDPOINTS.SOC.DASHBOARD_STATS);
    const data = response.data;
    
    // Calculate synthetic or weighted risk score from active alerts
    const crit = data.active_alerts_by_severity?.critical || 0;
    const high = data.active_alerts_by_severity?.high || 0;
    const med = data.active_alerts_by_severity?.medium || 0;
    const computedRisk = Math.min(100, Math.round(crit * 25 + high * 12 + med * 5));

    return {
      ...data,
      risk_index: computedRisk,
    };
  },

  async getAttacks(limit: number = 50, skip: number = 0): Promise<AttackSummary[]> {
    const response = await apiClient.get<AttackSummary[]>(API_ENDPOINTS.SOC.ATTACKS, {
      params: { limit, skip },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getAttackDetail(attackId: number | string): Promise<AttackDetail> {
    const [attackRes, eventsRes] = await Promise.all([
      apiClient.get<AttackSummary>(API_ENDPOINTS.SOC.ATTACK_DETAIL(attackId)),
      apiClient.get(API_ENDPOINTS.SOC.ATTACK_EVENTS(attackId)).catch(() => ({ data: [] })),
    ]);

    const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];
    return {
      ...attackRes.data,
      events,
      events_count: events.length,
    };
  },

  async getAlerts(status?: string, severity?: string): Promise<AlertItem[]> {
    const response = await apiClient.get<AlertItem[]>(API_ENDPOINTS.ALERTS.LIST, {
      params: {
        status: status ? status.toLowerCase() : undefined,
        severity: severity ? severity.toLowerCase() : undefined,
      },
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        ...item,
        title: item.alert_type || 'Security Alert',
        description: item.message || '',
        risk_score: item.severity === 'critical' ? 95 : item.severity === 'high' ? 80 : 50,
      }));
    }
    return [];
  },

  async getAlertDetail(alertId: number | string): Promise<AlertItem> {
    const response = await apiClient.get<AlertItem>(API_ENDPOINTS.ALERTS.DETAIL(alertId));
    const item = response.data;
    return {
      ...item,
      title: item.alert_type || `Alert #${item.id}`,
      description: item.message || '',
      risk_score: item.severity === 'critical' ? 95 : item.severity === 'high' ? 80 : 50,
    };
  },

  async updateAlertStatus(alertId: number | string, newStatus: AlertStatus | string): Promise<AlertItem> {
    const response = await apiClient.patch<AlertItem>(API_ENDPOINTS.ALERTS.UPDATE_STATUS(alertId), {
      status: newStatus.toLowerCase(),
    });
    return response.data;
  },

  async evaluateAlert(attackId: number | string): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.ALERTS.EVALUATE(attackId));
    return response.data;
  },
};
