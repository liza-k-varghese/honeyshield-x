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
