/**
 * HoneyShield X Mobile — Authoritative TypeScript Type Definitions
 * Exactly aligned with FastAPI Pydantic v2 schemas and backend database models.
 */

// ==========================================
// 1. Authentication & RBAC (Module 3.5)
// ==========================================

export type OperatorRole = 'viewer' | 'analyst' | 'incident_responder' | 'security_administrator';

export interface OperatorProfile {
  username: string;
  role: OperatorRole;
  email: string;
  permissions: string[];
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  operator: OperatorProfile;
  expires_in?: number;
}

export interface BreakGlassRequest {
  username: string;
  password: string;
  justification: string;
}

// ==========================================
// 2. System 1: SOC Command, Telemetry & Alerts
// ==========================================

export interface AlertSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SystemHealthSummary {
  api: string;
  postgresql: string;
  redis: string;
}

export interface DashboardStats {
  total_attacks: number;
  active_alerts: number;
  active_alerts_by_severity: AlertSeverityCounts;
  unique_attacker_ips_24h: number;
  system_health: SystemHealthSummary;
  // Computed / Optional UI Helpers
  risk_index?: number;
}

export interface AttackSummary {
  id: number;
  attack_type: string;
  source_ip?: string | null;
  destination_ip?: string | null;
  protocol?: string | null;
  severity: string;
  risk_score: number;
  status: string;
  detected_at: string;
  mitre_tactics?: string[];
  country_code?: string;
}

export interface AttackDetail extends AttackSummary {
  events?: AttackEvent[];
  events_count?: number;
}

export interface AttackEvent {
  id: number;
  attack_id: number;
  event_type: string;
  payload?: string;
  timestamp: string;
  risk_score: number;
  metadata?: Record<string, any>;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'investigating' | 'closed';

export interface AlertItem {
  id: number;
  attack_id?: number | null;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  status: string;
  created_at: string;
  // Computed display fallbacks
  title?: string;
  description?: string;
  source_ip?: string;
  risk_score?: number;
  vector?: string;
  mitre_technique?: string;
}

// ==========================================
// 3. System 2: Attack Lab & Active Deception (Module 3.7)
// ==========================================

export type CanaryType = 'http' | 'dns' | 'mysql' | 'aws_keys' | 'ssh_key';

export interface CanaryToken {
  canary_id: string;
  name: string;
  canary_type: string;
  status: 'active' | 'revoked';
  environment: string;
  token_value: string;
  interaction_count: number;
  created_at: string;
  last_triggered_at?: string | null;
  revoked_at?: string | null;
  description?: string | null;
  // UI alias
  id?: string;
}

export interface CanaryListResponse {
  canaries: CanaryToken[];
  total: number;
}

export interface CanaryHit {
  hit_id: string;
  canary_id: string;
  canary_type: string;
  source_ip: string;
  user_agent?: string | null;
  request_method: string;
  headers_captured: Record<string, string>;
  payload_preview?: string | null;
  alert_id?: number | null;
  case_id?: string | null;
  timestamp: number | string; // float epoch or ISO
  // UI aliases
  id?: string;
  token_name?: string;
  location?: string;
  severity?: string;
}

export interface CanaryHitListResponse {
  hits: CanaryHit[];
  total: number;
}

export interface DecoyHost {
  id: string;
  name: string;
  ip_address: string;
  emulated_service: string;
  status: 'active' | 'offline' | 'compromised';
  interactions_count: number;
}

// ==========================================
// 4. System 3: Threat Intelligence & Analysis (Module 3.8 & 3.10)
// ==========================================

export interface ThreatIndicator {
  id: number;
  indicator_type: string;
  indicator_value: string;
  threat_level: string;
  source?: string | null;
  base_confidence: number;
  decayed_confidence: number;
  status: string;
  half_life_days: number;
  hit_count: number;
  first_seen: string;
  last_seen: string;
  campaign?: string | null;
  tags: string[];
  description?: string | null;
  created_at: string;
  // UI aliases
  value?: string;
  confidence?: number;
  threat_type?: string;
}

export interface ThreatIndicatorListResponse {
  indicators: ThreatIndicator[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface CampaignCluster {
  campaign_id: string;
  name: string;
  indicator_count: number;
  highest_severity: string;
  highest_confidence: number;
  indicator_types: string[];
  first_seen: string;
  last_seen: string;
  // UI aliases
  id?: string;
  adversary?: string;
  threat_level?: string;
  associated_ips?: string[];
  mitre_tactics?: string[];
  status?: string;
}

export interface CampaignListResponse {
  campaigns: CampaignCluster[];
  total: number;
}

export interface HuntSummary {
  hunt_id: string;
  title: string;
  description: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  status: 'draft' | 'running' | 'completed' | 'concluded' | 'archived';
  severity: string;
  created_by: string;
  created_at: string;
  last_executed_at?: string | null;
  findings_count: number;
  // UI alias
  id?: string;
  mitre_technique?: string;
}

export interface ListHuntResponse {
  hunts: HuntSummary[];
  total: number;
  limit: number;
  offset: number;
}

// ==========================================
// 5. Incident Command & Case Management (Module 3.4 & 3.6)
// ==========================================

export interface CasePlaybookTask {
  task_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to?: string;
  completed_at?: string;
  // UI aliases
  id?: string;
  completed?: boolean;
}

export interface IncidentCase {
  case_id: string;
  title: string;
  description: string;
  severity: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  lead_handler?: string;
  playbook_tasks: CasePlaybookTask[];
  created_at: string;
  updated_at: string;
  // UI aliases
  id?: string;
  assigned_analyst?: string;
  related_alerts?: number[];
}

export interface CaseListResponse {
  cases: IncidentCase[];
  total: number;
}

export interface IncidentCommandRequest {
  action: string;
  target_id: number;
  justification?: string | null;
  approval_token?: string | null;
}

export interface IncidentCommandResponse {
  command_id: string;
  success: boolean;
  action: string;
  target_id: number;
  status: string;
  message: string;
  executed_at: string;
  operator_id: string;
}

// ==========================================
// 6. Host Service Control
// ==========================================

export type ManagedServiceName = 'postgresql' | 'redis' | 'honeyshield-backend' | 'honeyshield-frontend' | 'suricata';
export type ServiceActionType = 'status' | 'start' | 'stop' | 'restart';

export interface ManagedServiceInfo {
  name: ManagedServiceName;
  display_name: string;
  status: 'running' | 'stopped' | 'degraded';
  uptime_seconds: number;
  memory_mb: number;
  port?: number | null;
}

export interface ServiceControlRequest {
  service: ManagedServiceName;
  action: ServiceActionType;
  justification: string;
}

// ==========================================
// 7. Audit Trail (Module 3.3)
// ==========================================

export interface AuditEventItem {
  id: number;
  event_type: string;
  source: string;
  severity: string;
  message: string;
  details?: Record<string, any> | null;
  created_at: string;
  // UI aliases
  operator?: string;
  role?: string;
  action?: string;
  target?: string;
  timestamp?: string;
  justification?: string;
  success?: boolean;
  ip_address?: string;
}

export interface AuditEventsResponse {
  events: AuditEventItem[];
  total: number;
}
