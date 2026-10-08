import {
  Alert,
  AlertLifecycleStatus,
  Attack,
  AttackEvent,
  DashboardStats,
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let detail = `Request failed with status ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) {
        detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse<DashboardStats>(res);
}

export async function fetchAlerts(statusFilter?: string, limit: number = 100): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  params.append('limit', limit.toString());
  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
  return handleResponse<Alert[]>(res);
}

export async function fetchAlert(alertId: number): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`);
  return handleResponse<Alert>(res);
}

export async function fetchAttack(attackId: number): Promise<Attack> {
  const res = await fetch(`${API_BASE}/attacks/${attackId}`);
  return handleResponse<Attack>(res);
}

export async function fetchAttackEvents(
  attackId: number,
  skip: number = 0,
  limit: number = 50
): Promise<AttackEvent[]> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const res = await fetch(`${API_BASE}/attacks/${attackId}/events?${params.toString()}`);
  return handleResponse<AttackEvent[]>(res);
}

export async function updateAlertStatus(
  alertId: number,
  status: AlertLifecycleStatus
): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse<Alert>(res);
}

// ==========================================
// Module 3.2 Investigation Endpoints
// ==========================================

export async function fetchIpDossier(
  sourceIp: string,
  windowHours: number = 24
): Promise<import('../types').IpDossier> {
  const params = new URLSearchParams({ window_hours: windowHours.toString() });
  const res = await fetch(`${API_BASE}/investigation/ip/${encodeURIComponent(sourceIp)}?${params.toString()}`);
  return handleResponse<import('../types').IpDossier>(res);
}

export async function fetchAttackGraph(
  attackId: number
): Promise<import('../types').AttackGraphResponse> {
  const res = await fetch(`${API_BASE}/investigation/attacks/${attackId}/graph`);
  return handleResponse<import('../types').AttackGraphResponse>(res);
}

export async function fetchIpGraph(
  sourceIp: string,
  windowHours: number = 24
): Promise<import('../types').AttackGraphResponse> {
  const params = new URLSearchParams({ window_hours: windowHours.toString() });
  const res = await fetch(`${API_BASE}/investigation/ip/${encodeURIComponent(sourceIp)}/graph?${params.toString()}`);
  return handleResponse<import('../types').AttackGraphResponse>(res);
}

export async function fetchCrossAttackEvents(
  sourceIp: string,
  windowHours: number = 24,
  skip: number = 0,
  limit: number = 50
): Promise<import('../types').CrossAttackEvent[]> {
  const params = new URLSearchParams({
    window_hours: windowHours.toString(),
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const res = await fetch(`${API_BASE}/investigation/ip/${encodeURIComponent(sourceIp)}/events?${params.toString()}`);
  return handleResponse<import('../types').CrossAttackEvent[]>(res);
}

export async function fetchMitreCatalog(): Promise<import('../types').MitreCatalogResponse> {
  const res = await fetch(`${API_BASE}/investigation/mitre/catalog`);
  return handleResponse<import('../types').MitreCatalogResponse>(res);
}

// =============================================================================
// Module 3.3 API Client Functions
// =============================================================================

export async function fetchRuleCatalog(
  vector?: string,
  ruleType?: string
): Promise<import('../types').RuleCatalogResponse> {
  const params = new URLSearchParams();
  if (vector) params.append('vector', vector);
  if (ruleType) params.append('rule_type', ruleType);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/detection/rules${qs}`);
  return handleResponse<import('../types').RuleCatalogResponse>(res);
}

export async function fetchRuleDetail(
  ruleId: string
): Promise<import('../types').DetectionRuleSummary> {
  const res = await fetch(`${API_BASE}/detection/rules/${encodeURIComponent(ruleId)}`);
  return handleResponse<import('../types').DetectionRuleSummary>(res);
}

export async function fetchRuleEfficacy(
  ruleId: string,
  timeRangeHours: number = 24
): Promise<import('../types').RuleEfficacyResponse> {
  const params = new URLSearchParams({ time_range_hours: timeRangeHours.toString() });
  const res = await fetch(`${API_BASE}/detection/rules/${encodeURIComponent(ruleId)}/efficacy?${params.toString()}`);
  return handleResponse<import('../types').RuleEfficacyResponse>(res);
}

export async function replayAttack(
  attackId: number,
  req?: import('../types').ReplayRequest
): Promise<import('../types').ReplayExecutionResponse> {
  const res = await fetch(`${API_BASE}/replay/attack/${attackId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req || {}),
  });
  return handleResponse<import('../types').ReplayExecutionResponse>(res);
}

export async function replayIp(
  sourceIp: string,
  req?: import('../types').ReplayRequest
): Promise<import('../types').ReplayExecutionResponse> {
  const res = await fetch(`${API_BASE}/replay/ip/${encodeURIComponent(sourceIp)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req || {}),
  });
  return handleResponse<import('../types').ReplayExecutionResponse>(res);
}

export async function simulateCandidateRule(
  req: import('../types').SimulationRequest
): Promise<import('../types').SimulationExecutionResponse> {
  const res = await fetch(`${API_BASE}/simulation/rule-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<import('../types').SimulationExecutionResponse>(res);
}

export async function fetchAuditEvents(
  limit: number = 50,
  source?: string,
  eventType?: string
): Promise<import('../types').AuditEventsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (source) params.append('source', source);
  if (eventType) params.append('event_type', eventType);
  const res = await fetch(`${API_BASE}/audit/events?${params.toString()}`);
  return handleResponse<import('../types').AuditEventsResponse>(res);
}

// ==========================================
// Module 3.4 Incident Command API Functions
// ==========================================

export async function fetchGovernorStatus(
  operatorId: string = 'soc_operator'
): Promise<import('../types').GovernorStatusResponse> {
  const params = new URLSearchParams({ operator_id: operatorId });
  const res = await fetch(`${API_BASE}/incident-command/governor/status?${params.toString()}`);
  return handleResponse<import('../types').GovernorStatusResponse>(res);
}

export async function executeIncidentCommand(
  req: import('../types').IncidentCommandRequest,
  idempotencyKey?: string,
  operatorId: string = 'soc_operator'
): Promise<import('../types').IncidentCommandResponse> {
  const key = idempotencyKey || crypto.randomUUID();
  const res = await fetch(`${API_BASE}/incident-command/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': key,
      'X-Operator-Id': operatorId,
    },
    body: JSON.stringify(req),
  });
  return handleResponse<import('../types').IncidentCommandResponse>(res);
}

export async function previewIncidentCommand(
  req: import('../types').IncidentCommandRequest,
  operatorId: string = 'soc_operator'
): Promise<import('../types').ApprovalTokenResponse> {
  const res = await fetch(`${API_BASE}/incident-command/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': operatorId,
    },
    body: JSON.stringify(req),
  });
  return handleResponse<import('../types').ApprovalTokenResponse>(res);
}

export async function toggleGovernorLockout(
  engaged: boolean,
  justification: string,
  operatorId: string = 'soc_operator'
): Promise<import('../types').IncidentCommandResponse> {
  const key = crypto.randomUUID();
  const res = await fetch(`${API_BASE}/incident-command/governor/lockout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': key,
      'X-Operator-Id': operatorId,
    },
    body: JSON.stringify({ engaged, justification }),
  });
  return handleResponse<import('../types').IncidentCommandResponse>(res);
}

export async function fetchVirtualIncidents(
  statusFilter?: string,
  limit: number = 50
): Promise<import('../types').VirtualIncidentsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  const res = await fetch(`${API_BASE}/incident-command/incidents?${params.toString()}`);
  return handleResponse<import('../types').VirtualIncidentsResponse>(res);
}

export async function fetchAllowlistedActions(): Promise<import('../types').ActionCatalogResponse> {
  const res = await fetch(`${API_BASE}/incident-command/actions`);
  return handleResponse<import('../types').ActionCatalogResponse>(res);
}
