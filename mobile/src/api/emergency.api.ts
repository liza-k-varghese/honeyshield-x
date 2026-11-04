/**
 * Governor Level-3 Emergency Console API Client (Phase 4).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  EmergencyExecuteRequest,
  EmergencyExecuteResponse,
  EmergencyStatusResponse,
} from '../types';

export const emergencyApi = {
  /**
   * Execute Governor Level-3 emergency countermeasure with mandatory step-up and justification.
   */
  async execute(
    payload: EmergencyExecuteRequest,
    idempotencyKey?: string
  ): Promise<EmergencyExecuteResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const { data } = await apiClient.post<EmergencyExecuteResponse>(
      API_ENDPOINTS.EMERGENCY.EXECUTE,
      payload,
      { headers }
    );
    return data;
  },

  /**
   * Query live emergency posture, contained hosts, blocked IPs, and audit ledger.
   */
  async getStatus(): Promise<EmergencyStatusResponse> {
    const { data } = await apiClient.get<EmergencyStatusResponse>(
      API_ENDPOINTS.EMERGENCY.STATUS
    );
    return data;
  },
};

