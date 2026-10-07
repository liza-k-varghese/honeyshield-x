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
