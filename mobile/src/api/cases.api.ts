/**
 * HoneyShield X — Incident Cases & SOAR Governor API Module
 * Aligned with FastAPI Module 3.4 (Incident Command) & Module 3.6 (Cases).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { IncidentCase, IncidentCommandResponse } from '../types';

export const casesApi = {
  async getCases(status?: string): Promise<IncidentCase[]> {
    const response = await apiClient.get(API_ENDPOINTS.CASES.LIST, {
      params: { status: status ? status.toLowerCase() : undefined },
    });
    const list = response.data?.cases || (Array.isArray(response.data) ? response.data : []);
    return list.map((c: any) => ({
      ...c,
      id: c.case_id || c.id,
      assigned_analyst: c.lead_handler || 'Unassigned',
      playbook_tasks: (c.playbook_tasks || []).map((t: any) => ({
        ...t,
        id: t.task_id || t.id,
        completed: t.status === 'completed',
      })),
    }));
  },

  async getCaseDetail(id: string): Promise<IncidentCase> {
    const response = await apiClient.get(API_ENDPOINTS.CASES.DETAIL(id));
    const c = response.data;
    return {
      ...c,
      id: c.case_id || c.id,
      assigned_analyst: c.lead_handler || 'Unassigned',
      playbook_tasks: (c.playbook_tasks || []).map((t: any) => ({
        ...t,
        id: t.task_id || t.id,
        completed: t.status === 'completed',
      })),
    };
  },

  async completePlaybookTask(caseId: string, taskId: string): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.CASES.TASK_COMPLETE(caseId, taskId));
    return response.data;
  },

  async executeGovernorAction(
    actionName: string,
    targetId: number = 0,
    justification?: string
  ): Promise<IncidentCommandResponse> {
    // Map containment request to backend allowlisted command
    let mappedAction = 'CONTAINMENT_STAGING_REQUEST';
    if (actionName.includes('block') || actionName.includes('ip')) {
      mappedAction = 'SOAR_BLOCK_DISPATCH';
    } else if (actionName.includes('quarantine') || actionName.includes('isolate')) {
      mappedAction = 'CONTAINMENT_STAGING_REQUEST';
    } else if (actionName.includes('escalate')) {
      mappedAction = 'ALERT_ESCALATE';
    } else if (actionName.includes('ack')) {
      mappedAction = 'ALERT_ACKNOWLEDGE';
    }

    const response = await apiClient.post<IncidentCommandResponse>(
      API_ENDPOINTS.INCIDENT_COMMAND.EXECUTE,
      {
        action: mappedAction,
        target_id: typeof targetId === 'number' ? targetId : 1,
        justification: justification || 'Authorized operator containment request',
      }
    );
    return response.data;
  },

  async getGovernorStatus(): Promise<any> {
    const response = await apiClient.get(API_ENDPOINTS.INCIDENT_COMMAND.GOVERNOR_STATUS);
    return response.data;
  },
};
