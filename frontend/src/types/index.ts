export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertLifecycleStatus = 'open' | 'acknowledged' | 'resolved';
export type NotificationDeliveryStatus = 'pending' | 'in_flight' | 'delivered' | 'failed';

export interface Attack {
  id: number;
  attack_type: string;
  source_ip: string | null;
  destination_ip: string | null;
  protocol: string | null;
  severity: SeverityLevel;
  risk_score: number;
  status: string;
  detected_at: string;
}

export interface AttackEvent {
  id: number;
  attack_id: number;
  event_type: string;
  source_ip: string | null;
  message: string | null;
  event_time: string;
}

export interface Alert {
  id: number;
  attack_id: number | null;
  alert_type: string;
  severity: SeverityLevel;
  message: string;
  status: AlertLifecycleStatus;
  notified_at: string | null;
  notification_status: NotificationDeliveryStatus;
  created_at: string;
}

export interface AlertSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SystemHealth {
  api: string;
  postgresql: string;
  redis: string;
}

export interface DashboardStats {
  total_attacks: number;
  active_alerts: number;
  active_alerts_by_severity: AlertSeverityCounts;
  unique_attacker_ips_24h: number;
  system_health: SystemHealth;
}

// ==========================================
// Module 3.2 Investigation Types
// ==========================================

export interface MitreTechniqueMapping {
  tactic_id: string;
  tactic_name: string;
  technique_id: string;
  technique_name: string;
  confidence: number;
  stage_order: number;
  source: string;
  evidence_ids: number[];
}

export interface MitreCatalogEntry {
  rule_or_event_id: string;
  mapping_type: string;
  tactic_id: string;
  tactic_name: string;
  technique_id: string;
  technique_name: string;
  confidence: number;
  description: string;
}

export interface MitreCatalogResponse {
  catalog: MitreCatalogEntry[];
  total_entries: number;
}

export interface GraphNode {
  id: string;
  type: 'entity' | 'tactic_stage' | 'alert' | string;
  label: string;
  stage: string;
  tactic_id?: string | null;
  technique_id?: string | null;
  technique_name?: string | null;
  severity: SeverityLevel | string;
  risk_score?: number | null;
  event_count: number;
  evidence_ids: number[];
  first_seen?: string | null;
  last_seen?: string | null;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  transition_type: 'chronological' | 'escalation' | 'impact' | string;
}

export interface GraphSummary {
  stages_observed: number;
  total_events: number;
  highest_severity: string;
  has_execution: boolean;
  risk_score: number;
}

export interface AttackGraphResponse {
  entity_id: string;
  entity_type: 'attack' | 'source_ip' | string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: GraphSummary;
}

export interface CrossAttackEvent {
  id: number;
  attack_id: number;
  event_type: string;
  source_ip: string | null;
  message: string | null;
  event_time: string;
  mitre?: MitreTechniqueMapping | null;
}

export interface ThreatIntelligenceData {
  found: boolean;
  indicator_type: string;
  indicator_value: string;
  threat_level: string | null;
  source: string | null;
  confidence: number | null;
  description: string | null;
}

export interface CorrelationData {
  source_ip: string;
  events_analyzed: number;
  attack_containers_found: number;
  time_window_hours: number;
  honeypots_targeted: string[];
  distinct_target_ports: number[];
  attack_velocity_events_per_minute: number;
  detected_pattern: string;
  scan_types_observed: string[];
  correlated_at: string;
}

export interface MultiVectorRuleTrigger {
  rule_name: string;
  severity: string;
  confidence: number;
  description: string;
  evidence_summary: Record<string, any>;
}

export interface MultiVectorData {
  source_ip: string;
  window_minutes: number;
  events_analyzed: number;
  rules_evaluated: number;
  rules_triggered: MultiVectorRuleTrigger[];
  multi_vector_attack_detected: boolean;
  highest_severity: string | null;
  evaluated_at: string;
}

export interface IpDossier {
  source_ip: string;
  first_seen: string | null;
  last_seen: string | null;
  total_attacks: number;
  total_events: number;
  attack_ids: number[];
  attack_types: string[];
  highest_severity: SeverityLevel;
  highest_risk_score: number;
  threat_intelligence: ThreatIntelligenceData;
  correlation: CorrelationData;
  multi_vector: MultiVectorData;
  active_alerts_count: number;
  alerts: Alert[];
}

// =============================================================================
// Module 3.3: Detection Rule Management, Replay & Simulation Types
// =============================================================================

export interface DetectionRuleSummary {
  rule_id: string;
  name: string;
  vector: 'auth' | 'web' | 'network' | string;
  description: string;
  severity: SeverityLevel;
  base_risk_score: number;
  rule_type: 'threshold' | 'signature' | string;
  target_event_types: string[];
  window_minutes: number;
  threshold_count: number;
  match_tokens: string[];
  regex_patterns: string[];
  is_active: boolean;
  is_immutable: boolean;
}

export interface RuleCatalogResponse {
  total_rules: number;
  rules: DetectionRuleSummary[];
}

export interface TopAttackerStat {
  source_ip: string;
  trigger_count: number;
}

export interface RuleEfficacyResponse {
  rule_id: string;
  rule_name: string;
  time_range_hours: number;
  total_triggers: number;
  unique_attackers: number;
  correlated_multi_vector_triggers: number;
  isolated_triggers: number;
  correlated_rate_pct: number;
  avg_associated_risk_score: number;
  last_triggered_at: string | null;
  false_positive_indicator: number | null;
  false_positive_indicator_note: string;
  top_attacking_ips: TopAttackerStat[];
}

export interface ReplayRequest {
  window_minutes?: number;
  max_events?: number;
  record_audit?: boolean;
  start_time?: string;
  end_time?: string;
}

export interface ReplayTimelineEvent {
  event_id: number;
  event_time: string;
  event_type: string;
  source_ip: string;
  payload_preview: string;
  cumulative_rules_triggered: string[];
}

export interface ReplayDetectionSummary {
  detected: boolean;
  is_multi_vector: boolean;
  vectors_detected: string[];
  rules_triggered: string[];
  suggested_risk_score: number;
  severity: string;
}

export interface DetectionDiff {
  match_status: 'identical' | 'expanded_coverage' | 'reduced_coverage' | 'drift_detected' | string;
  historical_rules_triggered: string[];
  replayed_rules_triggered: string[];
  new_rules_triggered: string[];
  suppressed_rules: string[];
  risk_score_delta: number;
  severity_changed: boolean;
}

export interface ReplayExecutionResponse {
  replay_id: string;
  scope: 'attack' | 'ip';
  target_identifier: string;
  total_events_evaluated: number;
  execution_duration_ms: number;
  deterministic_pass: boolean;
  match_status: string;
  baseline_detection: ReplayDetectionSummary | null;
  replayed_detection: ReplayDetectionSummary;
  detection_diff: DetectionDiff;
  event_timeline: ReplayTimelineEvent[];
}

export interface CandidateRuleSpec {
  rule_id: string;
  name: string;
  vector: string;
  rule_type: string;
  target_event_types: string[];
  window_minutes: number;
  threshold_count: number;
  severity: string;
  base_risk_score: number;
  match_tokens: string[];
  regex_patterns: string[];
}

export interface SimulationRequest {
  target_scope: 'attack' | 'ip';
  target_identifier: string;
  window_minutes?: number;
  candidate_rule: CandidateRuleSpec;
}

export interface SimulationExecutionResponse {
  simulation_id: string;
  target_scope: string;
  target_identifier: string;
  events_evaluated: number;
  execution_duration_ms: number;
  candidate_rule_triggered: boolean;
  candidate_evidence_count: number;
  baseline_rules_triggered: string[];
  simulation_rules_triggered: string[];
  new_detections_count: number;
  comparison_summary: string;
  matched_payload_samples: string[];
}

export interface AuditEventItem {
  id: number;
  event_type: string;
  source: string;
  severity: string;
  message: string;
  created_at: string;
}

export interface AuditEventsResponse {
  total_events: number;
  events: AuditEventItem[];
}

// ==========================================
// Module 3.4 Incident Command Types
// ==========================================

export type IncidentCommandAction =
  | 'ALERT_ACKNOWLEDGE'
  | 'ALERT_RESOLVE'
  | 'ALERT_ESCALATE'
  | 'NOTIFICATION_DISPATCH'
  | 'NOTIFICATION_SUPPRESS'
  | 'CONTAINMENT_STAGING_REQUEST'
  | 'GOVERNOR_LOCKOUT_ENGAGE'
  | 'GOVERNOR_LOCKOUT_RELEASE';

export interface IncidentCommandRequest {
  action: IncidentCommandAction | string;
  target_id: number;
  justification?: string;
  approval_token?: string;
}

export interface IncidentCommandResponse {
  command_id: string;
  success: boolean;
  action: string;
  target_id: number;
  new_status?: string | null;
  message: string;
  governor_status: string;
  audit_event_id?: number | null;
  execution_duration_ms: number;
}

export interface ApprovalTokenResponse {
  approval_token: string;
  action: string;
  target_id: number;
  operator_id?: string;
  expires_in_seconds: number;
  expires_at: string;
}

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | string;
  consecutive_failures: number;
  failure_threshold: number;
  cooldown_remaining_seconds: number;
  total_successes: number;
  total_failures: number;
  tripped_count: number;
}

export interface GovernorStatusResponse {
  lockout_engaged: boolean;
  operator_id: string;
  operator_actions_last_minute: number;
  operator_rate_limit_max: number;
  active_cooldowns_count: number;
  circuit_breaker: CircuitBreakerStatus;
  allowlisted_actions: string[];
}

export interface VirtualIncidentItem {
  incident_id: string;
  alert_id: number;
  attack_id: number | null;
  source_ip: string;
  attack_type: string;
  severity: string;
  status: AlertLifecycleStatus | string;
  risk_score: number;
  notification_status: string;
  event_count: number;
  created_at: string;
}

export interface VirtualIncidentsResponse {
  total_incidents: number;
  incidents: VirtualIncidentItem[];
}

export interface AllowlistedActionItem {
  action: string;
  blast_tier: number;
  requires_justification: boolean;
  cooldown_seconds: number;
  description: string;
}

export interface ActionCatalogResponse {
  total_actions: number;
  actions: AllowlistedActionItem[];
}

// =============================================================================
// Module 3.5: Operator Authentication & RBAC Types
// =============================================================================

export type OperatorRole = 'viewer' | 'analyst' | 'incident_responder' | 'security_administrator';

export interface OperatorProfile {
  username: string;
  role: OperatorRole;
  email: string;
  permissions: string[];
  is_active: boolean;
  full_name?: string;
  is_break_glass?: boolean;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: number;
  operator: OperatorProfile;
}

export interface BreakGlassResponse {
  token: string;
  token_type: string;
  expires_in: number;
  operator: OperatorProfile;
  warning: string;
}

// =============================================================================
// Module 3.6: Incident Case Management & Playbooks Types
// =============================================================================

export type CaseStatus =
  | 'new'
  | 'investigating'
  | 'containment_in_progress'
  | 'contained'
  | 'resolved'
  | 'closed';

export type PlaybookTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface PlaybookTask {
  task_id: string;
  step_number: number;
  phase: string;
  title: string;
  description: string;
  governor_action: string | null;
  is_mandatory: boolean;
  status: PlaybookTaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  command_execution_id: string | null;
  notes: string | null;
}

export interface CaseNote {
  note_id: string;
  operator_id: string;
  role: string;
  message: string;
  created_at: string;
}

export interface IncidentCase {
  case_id: string;
  title: string;
  description: string | null;
  severity: SeverityLevel;
  status: CaseStatus;
  assigned_to: string | null;
  source_ip: string | null;
  target_id: number | null;
  alert_ids: number[];
  playbook_template: string;
  tasks: PlaybookTask[];
  notes: CaseNote[];
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  playbook_progress: number;
  advisory_summary: string | null;
}

export interface CaseCreatePayload {
  title: string;
  description?: string | null;
  severity?: SeverityLevel;
  source_ip?: string | null;
  target_id?: number | null;
  initial_alert_ids?: number[];
  playbook_template?: string;
  assigned_to?: string | null;
  initial_note?: string | null;
}

export interface CaseUpdatePayload {
  title?: string;
  severity?: SeverityLevel;
  status?: CaseStatus;
  assigned_to?: string | null;
}

export interface CaseTaskCompletePayload {
  notes?: string | null;
  command_execution_id?: string | null;
  status?: 'completed' | 'skipped';
}

export interface CaseListResponse {
  cases: IncidentCase[];
  total: number;
}

export interface PostIncidentReport {
  case_id: string;
  title: string;
  severity: SeverityLevel;
  status: CaseStatus;
  executive_summary: string;
  incident_timeline: Array<{
    timestamp: string;
    phase: string;
    actor: string;
    event: string;
    type: string;
  }>;
  playbook_adherence: string;
  remediation_actions: string[];
  root_cause_analysis: string;
  assigned_operator: string | null;
  signoff_operator: string;
  generated_at: string;
}

// =============================================================================
// Module 3.7: Active Deception Grid & Canary Honeytoken Orchestrator Types
// =============================================================================

export type CanaryType =
  | 'AWS_API_KEY'
  | 'DATABASE_CREDENTIAL'
  | 'SERVICE_API_TOKEN'
  | 'WEB_TRIPWIRE_ENDPOINT'
  | 'CANARY_FILE_BEACON';

export type CanaryStatus = 'active' | 'revoked';

export interface CanaryToken {
  token_id: string;
  name: string;
  canary_type: CanaryType;
  status: CanaryStatus;
  created_at: string;
  created_by: string;
  environment: string;
  placement_hint?: string | null;
  decoy_payload: Record<string, any>;
  hit_count: number;
  last_tripped_at?: string | null;
}

export interface CanaryHitEvent {
  hit_id: string;
  token_id: string;
  source_ip: string;
  user_agent: string;
  method: string;
  headers: Record<string, string>;
  payload_sample: string;
  alert_id?: number | null;
  case_id?: string | null;
  timestamp: string;
}

export interface CanaryCreatePayload {
  name: string;
  canary_type: CanaryType;
  environment: string;
  placement_hint?: string | null;
}

export interface CanaryUpdatePayload {
  name?: string | null;
  placement_hint?: string | null;
  status?: CanaryStatus | null;
}

export interface CanaryListResponse {
  canaries: CanaryToken[];
  total: number;
}

export interface CanaryHitListResponse {
  hits: CanaryHitEvent[];
  total: number;
}

export interface CanaryContextResponse {
  token_id: string;
  canary_name: string;
  canary_type: string;
  environment: string;
  placement_hint?: string | null;
  status: string;
  created_by: string;
  created_at: string;
  total_hits: number;
  recent_hits: CanaryHitEvent[];
  advisory_summary: string;
  associated_alert_ids: number[];
  associated_case_ids: string[];
}

// =============================================================================
// Module 3.8: Threat Intelligence & IOC Fusion Types
// =============================================================================

export type IndicatorType = 'ip' | 'cidr' | 'domain' | 'hash' | 'user_agent' | 'canary_token';
export type IndicatorStatus = 'active' | 'decaying' | 'retired' | 'revoked' | 'whitelisted';

export interface ThreatIndicator {
  id: number;
  indicator_type: IndicatorType;
  indicator_value: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  base_confidence: number;
  decayed_confidence: number;
  status: IndicatorStatus;
  half_life_days: number;
  hit_count: number;
  first_seen: string;
  last_seen: string;
  campaign?: string | null;
  tags: string[];
  description?: string | null;
  created_at: string;
}

export interface ThreatIndicatorCreatePayload {
  indicator_type: IndicatorType;
  indicator_value: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
  confidence: number;
  half_life_days: number;
  campaign?: string | null;
  tags: string[];
  description?: string | null;
}

export interface ThreatIndicatorUpdatePayload {
  threat_level?: string | null;
  campaign?: string | null;
  tags?: string[] | null;
  description?: string | null;
  half_life_days?: number | null;
  status?: IndicatorStatus | null;
}

export interface ThreatIndicatorListResponse {
  indicators: ThreatIndicator[];
  total: number;
  page: number;
  page_size: number;
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
}

export interface ThreatCampaignListResponse {
  campaigns: CampaignCluster[];
  total: number;
}

export interface PromoteCaseObservablePayload {
  case_id: string;
  observable_type: IndicatorType;
  observable_value: string;
  threat_level: string;
  campaign?: string | null;
  tags: string[];
  notes?: string | null;
}

export interface DefensiveFeedResponse {
  feed_name: string;
  generated_at: string;
  count: number;
  indicators: Array<{
    indicator_value: string;
    indicator_type: string;
    threat_level: string;
    confidence: number;
    campaign?: string | null;
    last_seen: string;
  }>;
}

export interface IndicatorContextResponse {
  advisory: boolean;
  authoritative: boolean;
  generated_at: string;
  indicator_value: string;
  indicator_type: string;
  threat_posture: string;
  narrative: string;
  tags_annotated: string[];
  recommended_actions: string[];
}

// =============================================================================
// Module 3.9: Enterprise Defensive Integration & SIEM-SOAR Webhook Gateway Types
// =============================================================================

export type WebhookFormat = 'honeyshield_json' | 'cef' | 'leef' | 'syslog_json';

export interface WebhookEndpoint {
  id: string;
  name: string;
  target_url: string;
  description: string | null;
  enabled: boolean;
  events: string[];
  format: WebhookFormat;
  custom_headers: Record<string, string>;
  secret: string;
  created_at: string;
  updated_at: string;
  circuit_state: 'closed' | 'open' | 'half_open';
  consecutive_failures: number;
  total_sent: number;
  total_failed: number;
  last_delivery_at: string | null;
  last_status_code: number | null;
}

export interface WebhookEndpointCreatePayload {
  name: string;
  target_url: string;
  description?: string | null;
  enabled?: boolean;
  events?: string[];
  format?: WebhookFormat;
  custom_headers?: Record<string, string>;
}

export interface WebhookEndpointUpdatePayload {
  name?: string | null;
  target_url?: string | null;
  description?: string | null;
  enabled?: boolean | null;
  events?: string[] | null;
  format?: WebhookFormat | null;
  custom_headers?: Record<string, string> | null;
}

export interface DlqRecord {
  delivery_id: string;
  endpoint_id: string;
  endpoint_name: string;
  target_url: string;
  event_type: string;
  payload: Record<string, any>;
  attempts: number;
  last_error: string;
  status_code: number | null;
  created_at: string;
}

export interface DlqListResponse {
  items: DlqRecord[];
  total: number;
}

export interface IntegrationMetrics {
  total_endpoints: number;
  active_endpoints: number;
  total_dispatched: number;
  total_delivered: number;
  total_failed: number;
  dlq_count: number;
  average_latency_ms: number;
  circuits_open: number;
}

export interface TestPingPayload {
  event_type?: string;
  sample_data?: Record<string, any> | null;
}

export interface TestPingResponse {
  delivery_id: string;
  status: 'success' | 'failed';
  status_code: number | null;
  latency_ms: number;
  response_preview: string | null;
  error: string | null;
}

// ==========================================
// Module 3.10 Campaign Intelligence Types
// ==========================================

export type CampaignStatus = 'active' | 'dormant' | 'resolved' | 'archived' | 'contained';

export interface CampaignSummary {
  campaign_id: string;
  name: string;
  status: CampaignStatus;
  severity: SeverityLevel;
  confidence: number;
  entity_count: number;
  attack_count: number;
  alert_count: number;
  canary_count: number;
  ioc_count: number;
  case_count: number;
  mitre_tactics: string[];
  first_seen: string;
  last_seen: string;
  tags: string[];
  source_ips?: string[];
  anchor_type?: string;
}

export interface CampaignListResponse {
  campaigns: CampaignSummary[];
  total: number;
  limit: number;
  offset: number;
  items?: CampaignSummary[];
}

export interface CampaignDossier {
  campaign_id: string;
  name: string;
  status: CampaignStatus;
  severity: SeverityLevel;
  confidence: number;
  first_seen: string;
  last_seen: string;
  source_ips: string[];
  destination_ips: string[];
  user_agents: string[];
  cves: string[];
  attack_ids: number[];
  alert_ids: number[];
  canary_ids: string[];
  ioc_ids: string[];
  case_ids: string[];
  mitre_tactics: string[];
  mitre_techniques: string[];
  notes?: string | null;
  tags: string[];
  merged_into?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignGraphNode {
  id: string;
  label: string;
  node_type: string;
  stage?: string | null;
  severity?: SeverityLevel | null;
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  metadata?: Record<string, any>;
}

export interface CampaignGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  edge_type: string;
  metadata?: Record<string, any>;
}

export interface CampaignGraphSummary {
  total_nodes: number;
  total_edges: number;
  stages_observed: number;
  highest_severity: string;
  has_canary: boolean;
  has_ioc: boolean;
  has_cases: boolean;
}

export interface TruncationMeta {
  is_truncated: boolean;
  total_nodes_discovered: number;
  rendered_nodes: number;
  pruned_nodes_count: number;
  pruned_by_type: Record<string, number>;
}

export interface CampaignGraphResponse {
  campaign_id: string;
  nodes: CampaignGraphNode[];
  edges: CampaignGraphEdge[];
  summary: CampaignGraphSummary;
  truncation: TruncationMeta;
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  event_type: string;
  title: string;
  severity: string;
  source_ip?: string | null;
  stage?: string | null;
  details?: Record<string, any>;
}

export interface CampaignTimelineResponse {
  campaign_id: string;
  events: TimelineItem[];
  total: number;
}

export interface CampaignMetrics {
  active_campaigns: number;
  critical_campaigns: number;
  high_campaigns: number;
  dormant_campaigns: number;
  resolved_campaigns: number;
  mean_dwell_time_hours: number;
  top_mitre_tactics: Array<{ tactic: string; count: number }>;
}

export interface CampaignClusterRequest {
  lookback_hours?: number;
}

export interface CampaignClusterResponse {
  status: string;
  campaigns_created: number;
  campaigns_updated: number;
  total_active_campaigns: number;
  duration_ms: number;
}

export interface CampaignUpdateRequest {
  name?: string;
  status?: string;
  notes?: string;
  tags?: string[];
  justification?: string;
}

export interface CampaignMergeRequest {
  primary_campaign_id: string;
  secondary_campaign_id: string;
  justification: string;
}

export interface CampaignContainmentRequest {
  approval_token: string;
  justification: string;
  action_type?: string;
  containment_type?: string;
  parameters?: Record<string, any>;
}

export interface CampaignContainmentResponse {
  status: string;
  campaign_id: string;
  contained_entities: string[];
  governor_eval: Record<string, any>;
  dispatched_at: string;
}

// ==========================================
// Module 3.11 Threat Hunting Types
// ==========================================

export type HuntStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'concluded' | 'archived';
export type HuntVerdict = 'malicious_confirmed' | 'benign_activity' | 'inconclusive';

export interface HuntQuerySpec {
  time_range_start?: string | null;
  time_range_end?: string | null;
  source_ips?: string[];
  destination_ips?: string[];
  attack_types?: string[];
  severities?: string[];
  alert_statuses?: string[];
  payload_substring?: string | null;
  ioc_values?: string[];
  canary_ids?: string[];
  campaign_ids?: string[];
  regex_pattern?: string | null;
  limit?: number;
}

export interface HuntEvidenceRecord {
  evidence_id: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  summary: string;
  source_ip?: string | null;
  destination_ip?: string | null;
  technique?: string | null;
  attributes: Record<string, any>;
}

export interface HuntNote {
  note_id: string;
  operator_id: string;
  role: string;
  message: string;
  created_at: string;
}

export interface HuntDossier {
  hunt_id: string;
  title: string;
  description: string;
  status: HuntStatus;
  severity: SeverityLevel;
  mitre_tactics: string[];
  mitre_techniques: string[];
  query_spec: HuntQuerySpec;
  evidence: HuntEvidenceRecord[];
  forensic_notes: HuntNote[];
  conclusion_summary?: string | null;
  verdict?: HuntVerdict | null;
  promoted_rule_ids: string[];
  promoted_case_ids: string[];
  execution_count: number;
  last_executed_at?: string | null;
  is_automated_suggestion?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HuntSummary {
  hunt_id: string;
  title: string;
  status: HuntStatus;
  severity: SeverityLevel;
  mitre_tactics: string[];
  evidence_count: number;
  verdict?: HuntVerdict | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_executed_at?: string | null;
  is_automated_suggestion?: boolean;
}

export interface ListHuntResponse {
  hunts: HuntSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface HuntMetrics {
  total_hunts: number;
  active_hunts: number;
  concluded_hunts: number;
  archived_hunts: number;
  malicious_confirmed: number;
  benign_activity: number;
  inconclusive: number;
  promoted_rules_count: number;
  promoted_cases_count: number;
}

export interface HuntCreatePayload {
  title: string;
  description: string;
  severity?: SeverityLevel;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  query_spec?: HuntQuerySpec;
}

export interface HuntUpdatePayload {
  title?: string;
  description?: string;
  severity?: SeverityLevel;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  query_spec?: HuntQuerySpec;
  conclusion_summary?: string;
  verdict?: HuntVerdict;
  note?: string;
}

export interface HuntExecutionResponse {
  hunt_id: string;
  status: HuntStatus;
  matched_count: number;
  duration_ms: number;
  evidence: HuntEvidenceRecord[];
  execution_count: number;
  executed_at: string;
}

export interface HuntPromotionPayload {
  justification: string;
  approval_token?: string;
}

export interface HuntPromotionResponse {
  hunt_id: string;
  promotion_type: 'rule' | 'case';
  target_id: string;
  message: string;
  promoted_at: string;
}
