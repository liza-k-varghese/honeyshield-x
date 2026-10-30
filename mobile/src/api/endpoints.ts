/**
 * HoneyShield X — Authoritative Backend API Endpoints Registry
 * Strictly aligned with FastAPI routers and OpenAPI contracts.
 */

export const API_ENDPOINTS = {
  // Authentication & Session (Module 3.5)
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    BREAK_GLASS: '/auth/break-glass',
    REGISTER_DEVICE: '/mobile/device/register',
    UNREGISTER_DEVICE: '/mobile/device/unregister',
    PREFERENCES: '/mobile/preferences',
  },

  // SOC Dashboard & Telemetry (System 1 - Module 3.1 & 3.2)
  SOC: {
    DASHBOARD_STATS: '/dashboard/stats',
    ATTACKS: '/attacks',
    ATTACK_DETAIL: (id: number | string) => `/attacks/${id}`,
    ATTACK_EVENTS: (id: number | string) => `/attacks/${id}/events`,
    DETECTION_RULES: '/detection/rules',
    MULTI_VECTOR_ANALYZE: (id: number | string) => `/detection/multi-vector/analyze/${id}`,
  },

  // Alert Management (System 1)
  ALERTS: {
    LIST: '/alerts',
    DETAIL: (id: number | string) => `/alerts/${id}`,
    UPDATE_STATUS: (id: number | string) => `/alerts/${id}/status`,
    EVALUATE: (attackId: number | string) => `/alerts/evaluate/${attackId}`,
  },

  // System 2: Attack Lab & Active Deception (Module 3.7)
  DECEPTION: {
    CANARIES: '/deception/canaries',
    CANARY_DETAIL: (id: string) => `/deception/canaries/${id}`,
    MINT_CANARY: '/deception/canaries',
    REVOKE_CANARY: (id: string) => `/deception/canaries/${id}`,
    HITS: '/deception/hits',
    CANARY_HITS: (id: string) => `/deception/canaries/${id}/hits`,
    CANARY_CONTEXT: (id: string) => `/deception/canaries/${id}/context`,
  },

  // System 3: Threat Intelligence & Analysis (Module 3.8 & 3.10)
  INTEL: {
    INDICATORS: '/threat-intelligence/indicators',
    LOOKUP: '/threat-intelligence/lookup',
    CAMPAIGNS: '/campaigns',
    CAMPAIGN_DETAIL: (id: string) => `/campaigns/${id}`,
    CAMPAIGN_GRAPH: (id: string) => `/campaigns/${id}/graph`,
    HUNTS: '/hunts',
    HUNT_DETAIL: (id: string) => `/hunts/${id}`,
    HUNT_EXECUTE: (id: string) => `/hunts/${id}/execute`,
    HUNT_METRICS: '/hunts/metrics/summary',
  },

  // Incident Command & Case Management (Module 3.4 & 3.6)
  CASES: {
    LIST: '/cases',
    CREATE: '/cases',
    DETAIL: (id: string) => `/cases/${id}`,
    UPDATE: (id: string) => `/cases/${id}`,
    TASK_COMPLETE: (caseId: string, taskId: string) => `/cases/${caseId}/tasks/${taskId}/complete`,
    REPORT: (caseId: string) => `/cases/${caseId}/report`,
  },

  // SOAR Governance & Containment
  INCIDENT_COMMAND: {
    ACTIONS: '/incident-command/actions',
    EXECUTE: '/incident-command/execute',
    PREVIEW: '/incident-command/preview',
    GOVERNOR_STATUS: '/incident-command/governor/status',
    LOCKOUT: '/incident-command/governor/lockout',
  },

  // Host Service Supervision (Supervised RPC Gateway)
  SERVICES: {
    STATUS: '/system/services/status',
    CONTROL: '/system/services/control',
  },

  // Operator Audit Trail (Module 3.3)
  AUDIT: {
    EVENTS: '/audit/events',
  },
};
