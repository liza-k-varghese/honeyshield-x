/**
 * HoneyShield X — Operator Audit Trail API Module
 * Aligned with FastAPI Module 3.3 (Audit Events).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { AuditEventItem } from '../types';

export const auditApi = {
  async getAuditLogs(source?: string, limit: number = 50): Promise<AuditEventItem[]> {
    const response = await apiClient.get(API_ENDPOINTS.AUDIT.EVENTS, {
      params: { source, limit },
    });
    const list = response.data?.events || (Array.isArray(response.data) ? response.data : []);
    return list.map((ev: any) => ({
      ...ev,
      operator: ev.details?.operator_id || ev.source || 'system',
      role: ev.details?.role || 'SYSTEM',
      action: ev.event_type || 'SYSTEM_EVENT',
      target: ev.details?.target || ev.details?.target_id?.toString() || '',
      justification: ev.message || '',
      timestamp: ev.created_at,
      success: ev.severity !== 'error' && ev.severity !== 'critical',
      ip_address: ev.details?.client_ip || '127.0.0.1',
    }));
  },
};
