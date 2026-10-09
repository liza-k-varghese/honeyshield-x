import {
  Alert,
  AlertLifecycleStatus,
  Attack,
  AttackEvent,
  DashboardStats,
} from '../types';

const API_BASE = '/api/v1';

export function getAuthHeaders(): Record<string, string> {
  const token = typeof sessionStorage !== 'undefined'
    ? (sessionStorage.getItem('hsx_token') || sessionStorage.getItem('hsx_auth_token'))
    : null;
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
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
      ...getAuthHeaders(),
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
      ...getAuthHeaders(),
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
      ...getAuthHeaders(),
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

export async function authLogin(credentials: {
  username: string;
  password: string;
}): Promise<import('../types').LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return handleResponse<import('../types').LoginResponse>(res);
}

export async function authLogout(): Promise<{ status: string; detail: string }> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<{ status: string; detail: string }>(res);
}

export async function authBreakGlass(req: {
  passphrase: string;
  justification: string;
}): Promise<import('../types').BreakGlassResponse> {
  const res = await fetch(`${API_BASE}/auth/break-glass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<import('../types').BreakGlassResponse>(res);
}

export async function fetchCurrentOperator(): Promise<import('../types').OperatorProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').OperatorProfile>(res);
}

// =============================================================================
// Module 3.6: Incident Case Management & Playbook Endpoints
// =============================================================================

export async function fetchCases(params?: {
  status?: string;
  severity?: string;
  handler_id?: string;
  limit?: number;
  offset?: number;
}): Promise<import('../types').CaseListResponse> {
  const qp = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    qp.append('status', params.status);
  }
  if (params?.severity && params.severity !== 'all') {
    qp.append('severity', params.severity);
  }
  if (params?.handler_id) {
    qp.append('handler_id', params.handler_id);
  }
  if (params?.limit) {
    qp.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    qp.append('offset', params.offset.toString());
  }
  const res = await fetch(`${API_BASE}/cases?${qp.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').CaseListResponse>(res);
}

export async function fetchCase(caseId: string): Promise<import('../types').IncidentCase> {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').IncidentCase>(res);
}

export async function createCase(
  payload: import('../types').CaseCreatePayload
): Promise<import('../types').IncidentCase> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').IncidentCase>(res);
}

export async function updateCase(
  caseId: string,
  payload: import('../types').CaseUpdatePayload
): Promise<import('../types').IncidentCase> {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').IncidentCase>(res);
}

export async function completeCaseTask(
  caseId: string,
  taskId: string,
  payload: import('../types').CaseTaskCompletePayload
): Promise<import('../types').IncidentCase> {
  const res = await fetch(
    `${API_BASE}/cases/${encodeURIComponent(caseId)}/tasks/${encodeURIComponent(taskId)}/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<import('../types').IncidentCase>(res);
}

export async function addCaseNote(
  caseId: string,
  message: string
): Promise<import('../types').CaseNote> {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message }),
  });
  return handleResponse<import('../types').CaseNote>(res);
}

export async function fetchCaseReport(
  caseId: string
): Promise<import('../types').PostIncidentReport> {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/report`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').PostIncidentReport>(res);
}

// ==========================================
// Module 3.7 Deception Grid Endpoints
// ==========================================

export async function fetchCanaries(
  statusFilter?: string,
  typeFilter?: string
): Promise<import('../types').CanaryListResponse> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  if (typeFilter && typeFilter !== 'all') {
    params.append('canary_type', typeFilter);
  }
  const res = await fetch(`${API_BASE}/deception/canaries?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').CanaryListResponse>(res);
}

export async function fetchCanary(
  tokenId: string
): Promise<import('../types').CanaryToken> {
  const res = await fetch(`${API_BASE}/deception/canaries/${encodeURIComponent(tokenId)}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').CanaryToken>(res);
}

export async function mintCanary(
  payload: import('../types').CanaryCreatePayload
): Promise<import('../types').CanaryToken> {
  const res = await fetch(`${API_BASE}/deception/canaries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').CanaryToken>(res);
}

export async function updateCanary(
  tokenId: string,
  payload: import('../types').CanaryUpdatePayload
): Promise<import('../types').CanaryToken> {
  const res = await fetch(`${API_BASE}/deception/canaries/${encodeURIComponent(tokenId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').CanaryToken>(res);
}

export async function revokeCanary(
  tokenId: string
): Promise<import('../types').CanaryToken> {
  const res = await fetch(`${API_BASE}/deception/canaries/${encodeURIComponent(tokenId)}/revoke`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<import('../types').CanaryToken>(res);
}

export async function fetchCanaryHits(
  tokenId: string,
  limit: number = 50
): Promise<import('../types').CanaryHitListResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  const res = await fetch(
    `${API_BASE}/deception/canaries/${encodeURIComponent(tokenId)}/hits?${params.toString()}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
  return handleResponse<import('../types').CanaryHitListResponse>(res);
}

export async function fetchCanaryContext(
  tokenId: string
): Promise<import('../types').CanaryContextResponse> {
  const res = await fetch(
    `${API_BASE}/deception/canaries/${encodeURIComponent(tokenId)}/context`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
  return handleResponse<import('../types').CanaryContextResponse>(res);
}

// =============================================================================
// Module 3.8: Threat Intelligence & IOC Fusion Engine API
// =============================================================================

export async function fetchThreatIndicators(params?: {
  status?: string;
  type?: string;
  threat_level?: string;
  campaign?: string;
  search?: string;
  min_confidence?: number;
  skip?: number;
  limit?: number;
}): Promise<import('../types').ThreatIndicatorListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.type) query.append('indicator_type', params.type);
  if (params?.threat_level) query.append('threat_level', params.threat_level);
  if (params?.campaign) query.append('campaign', params.campaign);
  if (params?.search) query.append('search', params.search);
  if (params?.min_confidence !== undefined) query.append('min_confidence', params.min_confidence.toString());
  if (params?.skip !== undefined) query.append('skip', params.skip.toString());
  if (params?.limit !== undefined) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/threat-intelligence/indicators?${query.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').ThreatIndicatorListResponse>(res);
}

export async function fetchThreatIndicator(id: number): Promise<import('../types').ThreatIndicator> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function fetchIndicatorContext(id: number): Promise<import('../types').IndicatorContextResponse> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}/context`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').IndicatorContextResponse>(res);
}

export async function createThreatIndicator(
  payload: import('../types').ThreatIndicatorCreatePayload
): Promise<import('../types').ThreatIndicator> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function updateThreatIndicator(
  id: number,
  payload: import('../types').ThreatIndicatorUpdatePayload
): Promise<import('../types').ThreatIndicator> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function revokeThreatIndicator(
  id: number,
  reason: string = 'Adversary abandoned or deprecated infrastructure'
): Promise<import('../types').ThreatIndicator> {
  const query = new URLSearchParams({ reason });
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}/revoke?${query.toString()}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function whitelistThreatIndicator(
  id: number,
  reason: string = 'Verified authorized internal entity'
): Promise<import('../types').ThreatIndicator> {
  const query = new URLSearchParams({ reason });
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}/whitelist?${query.toString()}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function promoteCaseObservable(
  payload: import('../types').PromoteCaseObservablePayload
): Promise<import('../types').ThreatIndicator> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/promote-case`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').ThreatIndicator>(res);
}

export async function fetchThreatCampaigns(): Promise<import('../types').ThreatCampaignListResponse> {
  const res = await fetch(`${API_BASE}/threat-intelligence/campaigns`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').ThreatCampaignListResponse>(res);
}

export function getThreatFeedExportUrl(format: 'json' | 'csv' | 'stix', token?: string): string {
  const base = `${API_BASE}/threat-intelligence/export/${format}`;
  if (token) {
    return `${base}?token=${encodeURIComponent(token)}`;
  }
  return base;
}

// =============================================================================
// Module 3.9: Enterprise Defensive Integration & SIEM-SOAR Webhook Gateway API
// =============================================================================

export async function fetchEndpoints(): Promise<import('../types').WebhookEndpoint[]> {
  const res = await fetch(`${API_BASE}/integrations/endpoints`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').WebhookEndpoint[]>(res);
}

export async function fetchEndpoint(id: string): Promise<import('../types').WebhookEndpoint> {
  const res = await fetch(`${API_BASE}/integrations/endpoints/${encodeURIComponent(id)}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').WebhookEndpoint>(res);
}

export async function createEndpoint(
  payload: import('../types').WebhookEndpointCreatePayload
): Promise<import('../types').WebhookEndpoint> {
  const res = await fetch(`${API_BASE}/integrations/endpoints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').WebhookEndpoint>(res);
}

export async function updateEndpoint(
  id: string,
  payload: import('../types').WebhookEndpointUpdatePayload
): Promise<import('../types').WebhookEndpoint> {
  const res = await fetch(`${API_BASE}/integrations/endpoints/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').WebhookEndpoint>(res);
}

export async function deleteEndpoint(id: string): Promise<{ deleted: boolean; endpoint_id: string }> {
  const res = await fetch(`${API_BASE}/integrations/endpoints/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ deleted: boolean; endpoint_id: string }>(res);
}

export async function testEndpoint(
  id: string,
  payload?: import('../types').TestPingPayload
): Promise<import('../types').TestPingResponse> {
  const res = await fetch(`${API_BASE}/integrations/endpoints/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload || {}),
  });
  return handleResponse<import('../types').TestPingResponse>(res);
}

export async function fetchDlq(limit: number = 50, offset: number = 0): Promise<import('../types').DlqListResponse> {
  const query = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const res = await fetch(`${API_BASE}/integrations/dlq?${query.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').DlqListResponse>(res);
}

export async function retryDlqItem(id: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/integrations/dlq/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<Record<string, any>>(res);
}

export async function deleteDlqRecord(id: string): Promise<{ deleted: boolean; delivery_id: string }> {
  const res = await fetch(`${API_BASE}/integrations/dlq/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ deleted: boolean; delivery_id: string }>(res);
}

export async function fetchIntegrationMetrics(): Promise<import('../types').IntegrationMetrics> {
  const res = await fetch(`${API_BASE}/integrations/metrics`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').IntegrationMetrics>(res);
}

// ==========================================
// Module 3.10 Campaign Intelligence Endpoints
// ==========================================

export async function fetchCampaigns(params?: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<import('../types').CampaignListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    query.append('status', params.status);
  }
  if (params?.severity && params.severity !== 'all') {
    query.append('severity', params.severity);
  }
  if (params?.limit) {
    query.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    query.append('offset', params.offset.toString());
  }
  const res = await fetch(`${API_BASE}/campaigns?${query.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').CampaignListResponse>(res);
}

export async function fetchCampaign(id: string): Promise<import('../types').CampaignDossier> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').CampaignDossier>(res);
}

export async function updateCampaign(
  id: string,
  payload: import('../types').CampaignUpdateRequest
): Promise<import('../types').CampaignDossier> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').CampaignDossier>(res);
}

export async function fetchCampaignGraph(id: string): Promise<import('../types').CampaignGraphResponse> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/graph`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').CampaignGraphResponse>(res);
}

export async function fetchCampaignTimeline(
  id: string,
  limit: number = 50
): Promise<import('../types').CampaignTimelineResponse> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/timeline?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').CampaignTimelineResponse>(res);
}

export async function fetchCampaignMetrics(): Promise<import('../types').CampaignMetrics> {
  const res = await fetch(`${API_BASE}/campaigns/metrics`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<import('../types').CampaignMetrics>(res);
}

export async function triggerCampaignClustering(
  payload?: import('../types').CampaignClusterRequest
): Promise<import('../types').CampaignClusterResponse> {
  const res = await fetch(`${API_BASE}/campaigns/cluster`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload || {}),
  });
  return handleResponse<import('../types').CampaignClusterResponse>(res);
}

export async function mergeCampaigns(
  payload: import('../types').CampaignMergeRequest
): Promise<import('../types').CampaignDossier> {
  const res = await fetch(`${API_BASE}/campaigns/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').CampaignDossier>(res);
}

export async function containCampaign(
  id: string,
  payload: import('../types').CampaignContainmentRequest,
  idempotencyKey?: string
): Promise<import('../types').CampaignContainmentResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
  if (idempotencyKey) {
    headers['X-HSX-Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/contain`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<import('../types').CampaignContainmentResponse>(res);
}

export async function linkCampaignCase(
  id: string,
  caseId: string
): Promise<{ linked: boolean; campaign_id: string; case_id: string }> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/cases/${encodeURIComponent(caseId)}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ linked: boolean; campaign_id: string; case_id: string }>(res);
}

export async function unlinkCampaignCase(
  id: string,
  caseId: string
): Promise<{ unlinked: boolean; campaign_id: string; case_id: string }> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/cases/${encodeURIComponent(caseId)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ unlinked: boolean; campaign_id: string; case_id: string }>(res);
}
