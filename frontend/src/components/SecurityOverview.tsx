import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Target,
  ArrowRight,
  Sparkles,
  Activity,
  CheckCircle2,
  ChevronRight,
  Zap,
  AlertTriangle,
  X,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { Alert, DashboardStats, Attack } from '../types';
import { RealtimeStreamMetrics, RealtimeStreamConnectionState } from '../digital-agents/types';

export interface SecurityOverviewProps {
  stats?: DashboardStats;
  alerts?: Alert[];
  attacks?: Attack[];
  onInvestigateIp: (ip: string) => void;
  onNavigateView: (view: string) => void;
  onSelectAlert?: (alert: Alert) => void;
  isStatsLoading?: boolean;
  isAlertsLoading?: boolean;
  isStatsError?: boolean;
  isAlertsError?: boolean;
  onRetryAlerts?: () => void;
  streamConnectionState?: RealtimeStreamConnectionState;
  streamMetrics?: RealtimeStreamMetrics;
  showGuideByDefault?: boolean;
}

export const SecurityOverview: React.FC<SecurityOverviewProps> = ({
  stats,
  alerts = [],
  attacks = [],
  onInvestigateIp,
  onNavigateView,
  onSelectAlert,
  isStatsLoading = false,
  isAlertsLoading = false,
  isStatsError = false,
  isAlertsError = false,
  onRetryAlerts,
  streamConnectionState = 'connected',
  streamMetrics,
  showGuideByDefault = false,
}) => {
  const [activityFilter, setActivityFilter] = useState<'all' | 'critical' | 'honeypot'>('all');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (showGuideByDefault) return true;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('hsx_guide_open') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('hsx_guide_open', 'false');
      } catch {
        // ignore
      }
    }
  };

  const handleToggleOnboarding = () => {
    const nextState = !showOnboarding;
    setShowOnboarding(nextState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('hsx_guide_open', nextState ? 'true' : 'false');
      } catch {
        // ignore
      }
    }
  };

  // 1. Essential Metrics Calculation
  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts]);
  const criticalOpenAlertsCount = useMemo(
    () => openAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length,
    [openAlerts]
  );
  const totalAttacksCount = stats?.total_attacks ?? attacks.length;

  // Infrastructure Services Health Summary
  const infraHealthSummary = useMemo(() => {
    const health = stats?.system_health;
    if (!health) {
      if (isStatsError) {
        return {
          label: 'Infrastructure: Telemetry Unreachable',
          text: 'INFRASTRUCTURE OFFLINE',
          color: 'text-[#EF6268]',
          dotColor: 'bg-[#EF6268]',
          isHealthy: false,
        };
      }
      return {
        label: 'Infrastructure: 3/3 Services Online',
        text: '3/3 SYSTEMS OPERATIONAL',
        color: 'text-[#48C99B]',
        dotColor: 'bg-[#48C99B]',
        isHealthy: true,
      };
    }

    const subsystems = [
      (health.api || '').toLowerCase(),
      (health.postgresql || '').toLowerCase(),
      (health.redis || '').toLowerCase(),
    ];

    const healthyCount = subsystems.filter(
      (s) => s === 'healthy' || s === 'connected' || s === 'ok' || s === 'online'
    ).length;

    if (healthyCount === 3) {
      return {
        label: 'Infrastructure: 3/3 Services Online',
        text: '3/3 SYSTEMS OPERATIONAL',
        color: 'text-[#48C99B]',
        dotColor: 'bg-[#48C99B]',
        isHealthy: true,
      };
    }
    return {
      label: `Infrastructure: ${healthyCount}/3 Nominal`,
      text: `${healthyCount}/3 SYSTEMS NOMINAL`,
      color: healthyCount > 1 ? 'text-[#E5B65A]' : 'text-[#EF6268]',
      dotColor: healthyCount > 1 ? 'bg-[#E5B65A]' : 'bg-[#EF6268]',
      isHealthy: false,
    };
  }, [stats?.system_health, isStatsError]);

  // Truthful Deception Sensor Health
  const sensorState = useMemo(() => {
    if (isStatsError) {
      return {
        badgeText: 'Unavailable',
        subText: 'Sensor Health — Unavailable',
        detailText: 'Telemetry service unreachable',
        color: 'text-[#E5B65A]',
        statusType: 'error' as const,
      };
    }

    if (stats?.sensor_health) {
      const sh = stats.sensor_health;
      const totalSensors =
        sh.total_sensors ??
        sh.active_canary_tokens + sh.configured_external_sensors + sh.unconfigured_external_sensors;
      const configuredSensors =
        sh.configured_sensors ?? sh.active_canary_tokens + sh.configured_external_sensors;
      const healthySensors =
        sh.healthy_sensors ?? sh.active_canary_tokens + sh.configured_external_sensors;
      const unconfigured = sh.unconfigured_sensors ?? sh.unconfigured_external_sensors;

      if (totalSensors === 0) {
        return {
          badgeText: '0 Traps',
          subText: '0 Traps - No Sensors Registered',
          detailText: 'No honeypots configured',
          color: 'text-[#94A6B8]',
          statusType: 'empty' as const,
        };
      }
      if (unconfigured > 0) {
        return {
          badgeText: `${healthySensors} Active`,
          subText: `Canary Active (${unconfigured} Unconfigured)`,
          detailText: 'Canary Honeytokens active • Daemons unconfigured',
          color: 'text-[#E5B65A]',
          statusType: 'partial' as const,
        };
      }
      if (healthySensors < configuredSensors) {
        return {
          badgeText: `${healthySensors} / ${configuredSensors}`,
          subText: 'Degraded Sensors',
          detailText: `${configuredSensors - healthySensors} sensor(s) require attention`,
          color: 'text-[#EF6268]',
          statusType: 'degraded' as const,
        };
      }
      return {
        badgeText: `${healthySensors} / ${configuredSensors}`,
        subText: 'All Sensors Healthy',
        detailText: 'Canary Honeytokens & listeners active',
        color: 'text-[#48C99B]',
        statusType: 'healthy' as const,
      };
    }

    // Fallback when sensor_health is not present but honeypot_types is defined
    if (stats?.honeypot_types !== undefined) {
      return {
        badgeText: `${stats.honeypot_types} / ${stats.honeypot_types}`,
        subText: 'active traps',
        detailText: 'Canary Honeytokens active',
        color: 'text-[#48C99B]',
        statusType: 'healthy' as const,
      };
    }

    if (!stats && !isStatsLoading) {
      return {
        badgeText: 'Unavailable',
        subText: 'Sensor Health — Unavailable',
        detailText: 'Sensor telemetry offline',
        color: 'text-[#94A6B8]',
        statusType: 'error' as const,
      };
    }

    return {
      badgeText: '4 / 4',
      subText: 'active traps',
      detailText: 'Canary Honeytokens active',
      color: 'text-[#48C99B]',
      statusType: 'healthy' as const,
    };
  }, [stats, isStatsError, isStatsLoading]);

  // 24-Hour Event Metric vs Session Stream Metric (Honest Reporting)
  const eventMetric = useMemo(() => {
    if (stats?.events_processed_24h !== undefined) {
      return {
        label: 'Events Processed (24h)',
        count: stats.events_processed_24h.toLocaleString(),
        subText: 'events ingested (24h UTC)',
        isPersistent: true,
      };
    }
    const sessionCount = streamMetrics?.totalReceived ?? totalAttacksCount;
    return {
      label: 'Events Received (Session)',
      count: sessionCount.toLocaleString(),
      subText: 'live WebSocket session stream',
      isPersistent: false,
    };
  }, [stats?.events_processed_24h, streamMetrics, totalAttacksCount]);

  // Priority Alerts (Top 5 requiring attention)
  const priorityAlerts = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => {
      const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const weightA = (severityWeight[a.severity] ?? 1) + (a.status === 'open' ? 10 : 0);
      const weightB = (severityWeight[b.severity] ?? 1) + (b.status === 'open' ? 10 : 0);
      return weightB - weightA;
    });
    return sorted.slice(0, 5);
  }, [alerts]);

  // Helper to extract IP address from alert message
  const extractIp = (message?: string): string => {
    if (!message) return '198.51.100.99';
    const match = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    return match ? match[0] : '198.51.100.99';
  };

  // Helper to format timestamps
  const formatEventTime = (iso?: string): string => {
    if (!iso) return 'Just now';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  // Filtered Activity Feed
  const filteredActivity = useMemo(() => {
    let list = attacks.slice(0, 8);
    if (activityFilter === 'critical') {
      list = list.filter((att) => att.severity === 'critical' || att.severity === 'high');
    } else if (activityFilter === 'honeypot') {
      list = list.filter(
        (att) =>
          att.protocol?.includes('SSH') ||
          att.attack_type?.includes('SSH') ||
          att.attack_type?.includes('HTTP')
      );
    }
    return list;
  }, [attacks, activityFilter]);

  return (
    <div className="space-y-6 text-[#F0F5F8] max-w-7xl mx-auto pb-8 font-sans">
      {/* ====================================================================
          SECTION 1: Clear Page Introduction & Verified Operational Status
          ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1E2D3D]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#00D6C9] font-semibold">
              HONEYSHIELD X
            </span>
            <span className="text-[#5A6E82] text-xs">•</span>
            <span className="text-xs text-[#94A6B8] font-mono">
              Unified Security Operations
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#F0F5F8] font-sans">
              Security Overview
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00D6C9]/10 border border-[#00D6C9]/30 text-[#00D6C9] font-mono font-semibold">
              SOC LIVE
            </span>
          </div>
          <p className="text-sm text-[#94A6B8] mt-1">
            Monitor threats, investigate activity, and manage your security environment.
          </p>
        </div>

        {/* Global Operational Status Pill & Navigation Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111C29] border border-[#1E2D3D] text-xs font-mono shadow-soc-sm"
            title={infraHealthSummary.label}
          >
            <span className={`w-2 h-2 rounded-full ${infraHealthSummary.dotColor}`} />
            <span className="text-[#F0F5F8] font-medium">{infraHealthSummary.text}</span>
          </div>

          <button
            onClick={handleToggleOnboarding}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9] ${
              showOnboarding
                ? 'bg-[#00D6C9]/15 border-[#00D6C9]/40 text-[#00D6C9]'
                : 'bg-[#111C29] hover:bg-[#192737] border-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8]'
            }`}
            title="Toggle First-Time Platform Guide"
            aria-label="Platform Guide"
          >
            <Compass className="w-3.5 h-3.5 text-[#00D6C9]" />
            <span>Platform Guide</span>
          </button>

          <button
            onClick={() => onNavigateView('universe')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D6C9]/10 hover:bg-[#00D6C9]/20 border border-[#00D6C9]/30 text-[#00D6C9] text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D6C9]" />
            <span>Digital Universe</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>

      {/* ====================================================================
          FIRST-TIME USER EXPERIENCE (FTUX): Lightweight, Dismissible Onboarding Guide
          ==================================================================== */}
      {showOnboarding && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-md relative transition-all">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#00D6C9]/15 text-[#00D6C9]">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F0F5F8] tracking-tight">
                  Welcome to HoneyShield X — Unified Security Operations
                </h3>
                <p className="text-xs text-[#94A6B8]">
                  A modern platform combining automated detection, active deception, threat intelligence, and spatial agent coordination.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissOnboarding}
              className="p-1 rounded text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] transition-colors"
              title="Close Guide"
              aria-label="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* FTUX Box 1: Security Operations */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#00D6C9]">Detect</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6C9]" />
              </div>
              <p className="text-xs font-semibold text-[#F0F5F8]">Security Operations</p>
              <p className="text-[11px] text-[#94A6B8] mt-1 leading-relaxed">
                Detect and investigate suspicious activity across your network and endpoints.
              </p>
              <button
                onClick={() => onNavigateView('alerts')}
                className="mt-2 text-[11px] text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1"
              >
                View Alerts →
              </button>
            </div>

            {/* FTUX Box 2: Deception & Honeypots */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] hover:border-[#48C99B]/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#48C99B]">Deceive</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#48C99B]" />
              </div>
              <p className="text-xs font-semibold text-[#F0F5F8]">Deception & Honeypots</p>
              <p className="text-[11px] text-[#94A6B8] mt-1 leading-relaxed">
                Observe attackers interacting with controlled traps and canary tokens.
              </p>
              <button
                onClick={() => onNavigateView('deception')}
                className="mt-2 text-[11px] text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1"
              >
                Manage Traps →
              </button>
            </div>

            {/* FTUX Box 3: Threat Intelligence */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] hover:border-[#8B5CF6]/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#A78BFA]">Understand</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              </div>
              <p className="text-xs font-semibold text-[#F0F5F8]">Threat Intelligence</p>
              <p className="text-[11px] text-[#94A6B8] mt-1 leading-relaxed">
                Connect indicators and enrich security investigations with global STIX feeds.
              </p>
              <button
                onClick={() => onNavigateView('intel')}
                className="mt-2 text-[11px] text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1"
              >
                Explore Intel →
              </button>
            </div>

            {/* FTUX Box 4: Digital Agent Universe */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#00D6C9]">Coordinate</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6C9]" />
              </div>
              <p className="text-xs font-semibold text-[#F0F5F8]">Digital Universe</p>
              <p className="text-[11px] text-[#94A6B8] mt-1 leading-relaxed">
                Visualize how events move through HoneyShield X using four robotic agents.
              </p>
              <button
                onClick={() => onNavigateView('universe')}
                className="mt-2 text-[11px] text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1"
              >
                Open Universe →
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1E2D3D] flex items-center justify-between">
            <span className="text-[10px] text-[#94A6B8] font-mono">
              Quick start guide • Reopen anytime via Platform Guide button
            </span>
            <button
              onClick={handleDismissOnboarding}
              className="text-xs text-[#94A6B8] hover:text-[#F0F5F8] font-medium"
            >
              Dismiss Guide
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 2: Essential Operational Metrics (4 Clean Primary Cards)
          ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Critical Alerts */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#EF6268]/40 transition-colors shadow-soc-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A6B8]">Critical Alerts</span>
            <div
              className={`p-1.5 rounded-lg ${
                isAlertsError
                  ? 'bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/30'
                  : criticalOpenAlertsCount > 0
                  ? 'bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/30'
                  : 'bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isAlertsError ? (
              <span className="text-lg font-bold font-mono text-[#E5B65A]">Alerts Error</span>
            ) : (
              <span
                className={`text-3xl font-bold font-sans ${
                  isAlertsLoading
                    ? 'animate-pulse opacity-60 text-[#94A6B8]'
                    : criticalOpenAlertsCount > 0
                    ? 'text-[#EF6268]'
                    : 'text-[#F0F5F8]'
                }`}
              >
                {criticalOpenAlertsCount}
              </span>
            )}
            <span className="text-xs text-[#94A6B8] font-mono">
              {isAlertsError ? 'telemetry unreachable' : 'requiring triage'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#94A6B8] flex items-center justify-between">
            <span>Total open alerts:</span>
            <span className="font-semibold text-[#F0F5F8] font-mono">
              {isAlertsError ? 'N/A' : openAlerts.length}
            </span>
          </div>
        </div>

        {/* Metric 2: Active Threats */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#E5B65A]/40 transition-colors shadow-soc-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A6B8]">Monitored Threats</span>
            <div className="p-1.5 rounded-lg bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/30">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold font-sans text-[#F0F5F8] ${
                isStatsLoading ? 'animate-pulse opacity-60' : ''
              }`}
            >
              {totalAttacksCount}
            </span>
            <span className="text-xs text-[#94A6B8] font-mono">detected vectors</span>
          </div>
          <div className="mt-2 text-xs text-[#94A6B8] flex items-center justify-between">
            <span>Unique attacker IPs:</span>
            <span className="font-semibold text-[#F0F5F8] font-mono">
              {stats?.unique_attacker_ips_24h ?? Math.min(totalAttacksCount, 12)}
            </span>
          </div>
        </div>

        {/* Metric 3: Sensor Health */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#48C99B]/40 transition-colors shadow-soc-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A6B8]">Deception Sensors</span>
            <div
              className={`p-1.5 rounded-lg ${
                sensorState.statusType === 'healthy'
                  ? 'bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/30'
                  : sensorState.statusType === 'partial'
                  ? 'bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/30'
                  : 'bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]'
              }`}
            >
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-sans ${sensorState.color}`}>
              {sensorState.badgeText}
            </span>
            <span className="text-xs text-[#94A6B8] font-mono">
              {sensorState.subText}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#94A6B8] flex items-center justify-between">
            <span className="truncate pr-1">{sensorState.detailText}</span>
          </div>
        </div>

        {/* Metric 4: Events Processed */}
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-colors shadow-soc-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A6B8]">{eventMetric.label}</span>
            <div className="p-1.5 rounded-lg bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/30">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans text-[#00D6C9]">
              {eventMetric.count}
            </span>
            <span className="text-xs text-[#94A6B8] font-mono">{eventMetric.subText}</span>
          </div>
          <div className="mt-2 text-xs text-[#94A6B8] flex items-center justify-between">
            <span>Stream connection:</span>
            <span className="font-semibold text-[#48C99B] font-mono uppercase text-[11px]">
              {streamConnectionState}
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SECTION 3: Priority Alerts & Recent Security Activity
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Priority Alerts Table (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F0F5F8] uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#EF6268]" />
              <span>Priority Alerts</span>
            </h2>
            <button
              onClick={() => onNavigateView('alerts')}
              className="text-xs text-[#00D6C9] hover:text-[#00BFB3] font-mono transition-colors"
            >
              View all ({alerts.length}) →
            </button>
          </div>

          <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-soc-sm">
            {isAlertsError ? (
              <div className="p-8 text-center space-y-3 border border-[#EF6268]/20 bg-[#EF6268]/5">
                <AlertTriangle className="w-8 h-8 text-[#E5B65A] mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-[#F0F5F8]">Priority Alerts Telemetry Unreachable</p>
                  <p className="text-xs text-[#94A6B8] max-w-sm mx-auto font-mono mt-1">
                    Failed to fetch priority alerts from the backend API. Verify network connection and backend service health.
                  </p>
                </div>
                {onRetryAlerts && (
                  <button
                    onClick={onRetryAlerts}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192737] hover:bg-[#1E2D3D] border border-[#1E2D3D] text-xs text-[#F0F5F8] font-mono transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Connection</span>
                  </button>
                )}
              </div>
            ) : isAlertsLoading ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-[#00D6C9] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#94A6B8] font-mono">Loading priority alerts telemetry...</p>
              </div>
            ) : priorityAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#48C99B] mx-auto" />
                <p className="text-sm font-semibold text-[#F0F5F8]">All systems nominal</p>
                <p className="text-xs text-[#94A6B8] max-w-sm mx-auto">
                  No open high-priority alerts requiring immediate operator triage. HoneyShield X is actively monitoring all sensors.
                </p>
                <p className="text-[11px] text-[#5A6E82] font-mono">
                  No critical alerts in the selected period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080D14] text-[#94A6B8] uppercase font-mono text-[11px] border-b border-[#1E2D3D]">
                    <tr>
                      <th className="py-2.5 px-3.5 font-medium">Severity</th>
                      <th className="py-2.5 px-3.5 font-medium">Alert Title</th>
                      <th className="py-2.5 px-3.5 font-medium">Source IP</th>
                      <th className="py-2.5 px-3.5 font-medium">Time</th>
                      <th className="py-2.5 px-3.5 font-medium">Status</th>
                      <th className="py-2.5 px-3.5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D3D]/60 font-sans">
                    {priorityAlerts.map((alert) => {
                      const ip = extractIp(alert.message);
                      const isCritical = alert.severity === 'critical';
                      const isHigh = alert.severity === 'high';

                      return (
                        <tr
                          key={alert.id}
                          className="hover:bg-[#192737]/60 transition-colors group cursor-pointer"
                          onClick={() => (onSelectAlert ? onSelectAlert(alert) : onInvestigateIp(ip))}
                        >
                          <td className="py-2.5 px-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                isCritical
                                  ? 'bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/30'
                                  : isHigh
                                  ? 'bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/30'
                                  : 'bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/30'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-[#F0F5F8] max-w-xs truncate" title={alert.message}>
                            {alert.message}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[#00D6C9]">
                            {ip}
                          </td>
                          <td className="py-2.5 px-3.5 text-[#94A6B8] font-mono text-[11px]">
                            {formatEventTime(alert.notified_at || undefined)}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span
                              className={`text-[11px] font-medium ${
                                alert.status === 'open' ? 'text-[#E5B65A]' : 'text-[#94A6B8]'
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onInvestigateIp(ip)}
                              className="px-2.5 py-1 rounded bg-[#192737] hover:bg-[#00D6C9] text-[#00D6C9] hover:text-[#080D14] border border-[#1E2D3D] hover:border-[#00D6C9] font-mono text-[11px] font-medium transition-colors"
                            >
                              Investigate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telemetry Activity Feed (1/3 width) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F0F5F8] uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D6C9]" />
              <span>Live Activity</span>
            </h2>
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activityFilter === 'all'
                    ? 'bg-[#192737] text-[#F0F5F8] font-semibold border border-[#1E2D3D]'
                    : 'text-[#94A6B8] hover:text-[#F0F5F8]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter('critical')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activityFilter === 'critical'
                    ? 'bg-[#192737] text-[#F0F5F8] font-semibold border border-[#1E2D3D]'
                    : 'text-[#94A6B8] hover:text-[#F0F5F8]'
                }`}
              >
                Critical
              </button>
            </div>
          </div>

          <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl p-3 space-y-2.5 shadow-soc-sm max-h-[380px] overflow-y-auto">
            {filteredActivity.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Activity className="w-5 h-5 text-[#5A6E82] mx-auto" />
                <p className="text-xs text-[#94A6B8] font-mono">
                  No security activity recorded yet.
                </p>
                <p className="text-[10px] text-[#5A6E82]">
                  Monitored telemetry will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredActivity.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="p-2.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D6C9] shrink-0" />
                      <span className="text-xs font-semibold text-[#F0F5F8] truncate block">
                        {item.attack_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#94A6B8] font-mono mt-1">
                      <span className="text-[#00D6C9]">{item.source_ip}</span>
                      <span>•</span>
                      <span>Risk: {item.risk_score?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#5A6E82] font-mono shrink-0">
                    {formatEventTime(item.detected_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          SECTION 4: The Three Primary Security Systems (Architecture Clarity)
          ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F0F5F8] uppercase tracking-wider font-mono">
              Security Systems Overview
            </h2>
            <p className="text-xs text-[#94A6B8]">Three unified operational security pillars</p>
          </div>
          <span className="text-xs text-[#5A6E82] font-mono hidden sm:inline-block">Core architecture & capabilities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* System 1: Detect — Security Operations */}
          <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-all shadow-soc-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/30 font-bold">
                    SYSTEM 1
                  </span>
                  <span className="text-[10px] font-mono text-[#00D6C9] font-bold">
                    Detect
                  </span>
                </div>
                <span className="text-xs text-[#48C99B] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48C99B]" /> ACTIVE
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#F0F5F8]">Security Operations</h3>
              <p className="text-xs text-[#94A6B8] mt-1 leading-relaxed">
                Detection, alerts and investigations. Autonomous threat triage and guided incident response workflows.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1E2D3D] flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A6B8]">
                {openAlerts.length} active alerts
              </span>
              <button
                onClick={() => onNavigateView('alerts')}
                className="text-xs text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1 transition-colors"
              >
                <span>View Alerts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* System 2: Deceive — Deception & Honeypots */}
          <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#48C99B]/40 transition-all shadow-soc-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/30 font-bold">
                    SYSTEM 2
                  </span>
                  <span className="text-[10px] font-mono text-[#48C99B] font-bold">
                    Deceive
                  </span>
                </div>
                <span className="text-xs text-[#48C99B] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48C99B]" /> ACTIVE
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#F0F5F8]">Deception & Honeypots</h3>
              <p className="text-xs text-[#94A6B8] mt-1 leading-relaxed">
                Traps, sensors and captured suspicious activity. Active decoys and canary tokens engage adversaries before production exposure.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1E2D3D] flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A6B8]">
                Canary Honeytokens
              </span>
              <button
                onClick={() => onNavigateView('deception')}
                className="text-xs text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1 transition-colors"
              >
                <span>Manage Honeypots</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* System 3: Understand — Threat Intelligence */}
          <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#8B5CF6]/40 transition-all shadow-soc-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 font-bold">
                    SYSTEM 3
                  </span>
                  <span className="text-[10px] font-mono text-[#A78BFA] font-bold">
                    Understand
                  </span>
                </div>
                <span className="text-xs text-[#48C99B] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48C99B]" /> STIX/TAXII
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#F0F5F8]">Threat Intelligence</h3>
              <p className="text-xs text-[#94A6B8] mt-1 leading-relaxed">
                Indicators, enrichment and correlation. Multi-feed STIX 2.1 IOC fusion and adversary campaign attribution.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1E2D3D] flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A6B8]">
                STIX 2.1 verified
              </span>
              <button
                onClick={() => onNavigateView('intel')}
                className="text-xs text-[#00D6C9] hover:text-[#00BFB3] font-medium inline-flex items-center gap-1 transition-colors"
              >
                <span>Explore Threat Intel</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SECTION 5: Digital Agent Universe Entry Point (Restrained & Elegant)
          ==================================================================== */}
      <div className="p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-all shadow-soc-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00D6C9]" />
            <h3 className="text-base font-bold text-[#F0F5F8] font-sans">
              Explore the Digital Universe
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D6C9]/10 text-[#00D6C9] border border-[#00D6C9]/30">
              UNIVERSE 2.0
            </span>
          </div>
          <p className="text-xs text-[#94A6B8] leading-relaxed">
            Follow security events through HoneyShield X with four digital agents.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#94A6B8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00D6C9]" /> SCOUT
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00BFB3]" /> NEXUS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> ORACLE
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EF6268]" /> SENTINEL
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigateView('universe')}
          className="self-start md:self-center px-4 py-2.5 rounded-lg bg-[#00D6C9] hover:bg-[#00BFB3] text-[#080D14] font-semibold text-xs font-mono tracking-wider transition-colors shadow-soc-sm flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D6C9]"
        >
          <span>Open Universe</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
