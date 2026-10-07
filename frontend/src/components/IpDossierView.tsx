import React, { useState, useEffect } from 'react';
import {
  IpDossier,
  AttackGraphResponse,
  CrossAttackEvent,
  SeverityLevel,
  Alert
} from '../types';
import {
  fetchIpDossier,
  fetchIpGraph,
  fetchCrossAttackEvents,
  updateAlertStatus
} from '../api/client';
import { SeverityBadge, StatusBadge } from './Badge';
import { AttackChainGraph } from './AttackChainGraph';
import { MitreMatrixView } from './MitreMatrixView';
import { CrossAttackTimeline } from './CrossAttackTimeline';
import {
  ShieldAlert,
  Search,
  Clock,
  Copy,
  Check,
  Activity,
  Network,
  AlertOctagon,
  CheckCircle2,
  RotateCcw,
  Layers,
  Sparkles,
  Server,
  Zap,
  Globe
} from 'lucide-react';

interface IpDossierViewProps {
  sourceIp: string;
  onSelectAlert?: (alert: Alert) => void;
}

export const IpDossierView: React.FC<IpDossierViewProps> = ({ sourceIp, onSelectAlert }) => {
  const [windowHours, setWindowHours] = useState<number>(24);
  const [activeTab, setActiveTab] = useState<'graph' | 'matrix' | 'timeline' | 'alerts'>('graph');
  const [copied, setCopied] = useState(false);

  const [dossier, setDossier] = useState<IpDossier | null>(null);
  const [graph, setGraph] = useState<AttackGraphResponse | null>(null);
  const [events, setEvents] = useState<CrossAttackEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all investigation data for sourceIp
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchIpDossier(sourceIp, windowHours),
      fetchIpGraph(sourceIp, windowHours),
      fetchCrossAttackEvents(sourceIp, windowHours, 0, 100),
    ])
      .then(([dossierData, graphData, eventsData]) => {
        if (!isMounted) return;
        setDossier(dossierData);
        setGraph(graphData);
        setEvents(eventsData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load investigation data');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceIp, windowHours]);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(sourceIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAlertStatusChange = async (alertId: number, newStatus: 'open' | 'acknowledged' | 'resolved') => {
    try {
      await updateAlertStatus(alertId, newStatus);
      // Refresh dossier alerts
      const updatedDossier = await fetchIpDossier(sourceIp, windowHours);
      setDossier(updatedDossier);
    } catch (err) {
      console.error('Failed to update alert status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-lg">
        <Activity className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
        <p className="text-sm font-mono text-slate-300">
          Compiling Attacker Entity Dossier & Graph for {sourceIp}...
        </p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-500/40 rounded-lg text-slate-200 space-y-2">
        <div className="flex items-center space-x-2 text-red-400 font-semibold">
          <AlertOctagon className="w-5 h-5" />
          <span>Investigation Error</span>
        </div>
        <p className="text-sm font-mono text-slate-300">{error || 'Could not retrieve dossier.'}</p>
      </div>
    );
  }

  const riskScore = dossier.highest_risk_score;

  return (
    <div className="space-y-5">
      {/* Entity Dossier Header Card */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* IP and Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold font-mono tracking-tight text-white">{sourceIp}</h2>
                <button
                  onClick={handleCopyIp}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Copy IP"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  Attacker Entity
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 font-mono">
                <span>First Seen: {dossier.first_seen ? new Date(dossier.first_seen).toLocaleString() : 'N/A'}</span>
                <span>•</span>
                <span>Last Seen: {dossier.last_seen ? new Date(dossier.last_seen).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <span className="text-xs font-mono text-slate-400">Time Window:</span>
            <select
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={6}>Past 6 Hours</option>
              <option value={12}>Past 12 Hours</option>
              <option value={24}>Past 24 Hours</option>
              <option value={72}>Past 72 Hours</option>
              <option value={168}>Past 7 Days (168h)</option>
            </select>
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Operational Risk */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Operational Risk</span>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{riskScore.toFixed(1)}</span>
              <span className="text-xs text-slate-400">/ 100</span>
              <SeverityBadge severity={dossier.highest_severity} />
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  riskScore >= 90
                    ? 'bg-red-500'
                    : riskScore >= 70
                    ? 'bg-orange-500'
                    : riskScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
              />
            </div>
          </div>

          {/* Attacks Count */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Attacks Associated</span>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{dossier.total_attacks}</span>
              <span className="text-xs text-slate-400">containers</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 truncate block mt-1">
              {dossier.attack_types.join(', ') || 'None'}
            </span>
          </div>

          {/* Events Count */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Total Security Events</span>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{dossier.total_events}</span>
              <span className="text-xs text-slate-400">telemetry events</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 block mt-1">
              Window: {windowHours}h
            </span>
          </div>

          {/* Active Alerts */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Active Alerts</span>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className={`text-2xl font-bold font-mono ${dossier.active_alerts_count > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {dossier.active_alerts_count}
              </span>
              <span className="text-xs text-slate-400">open/acked</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 block mt-1">
              {dossier.alerts.length} total logged
            </span>
          </div>
        </div>

        {/* Intelligence & Multi-Vector Provenance Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Module 2.3 Threat Intelligence */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-sky-400 font-semibold flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Threat Intelligence</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                dossier.threat_intelligence.found
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {dossier.threat_intelligence.found ? 'MATCH FOUND' : 'CLEAN'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {dossier.threat_intelligence.description || 'No external threat intelligence match.'}
            </p>
            <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-900">
              <span>Feed: {dossier.threat_intelligence.source || 'Internal'}</span>
              <span>Conf: {dossier.threat_intelligence.confidence ? `${(dossier.threat_intelligence.confidence * 100).toFixed(0)}%` : 'N/A'}</span>
            </div>
          </div>

          {/* Module 2.8 Behavioral Correlation */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-purple-400 font-semibold flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Behavioral Pattern</span>
              </span>
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                {dossier.correlation.detected_pattern}
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-0.5">
              <div>Velocity: <span className="font-mono text-sky-300">{dossier.correlation.attack_velocity_events_per_minute.toFixed(1)}</span> ev/min</div>
              <div>Honeypots: <span className="font-mono text-slate-400">{dossier.correlation.honeypots_targeted.join(', ') || 'N/A'}</span></div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-900 truncate">
              Ports: {dossier.correlation.distinct_target_ports.join(', ') || 'None'}
            </div>
          </div>

          {/* Module 2.9 Multi-Vector Detection */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-semibold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Vector Rules</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                dossier.multi_vector.multi_vector_attack_detected
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}>
                {dossier.multi_vector.rules_triggered.length} Triggered
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              {dossier.multi_vector.rules_triggered.length === 0 ? (
                <span className="text-slate-500 text-xs">No multi-vector escalation observed.</span>
              ) : (
                dossier.multi_vector.rules_triggered.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-300 truncate max-w-[150px]">{rule.rule_name}</span>
                    <span className="text-slate-400">conf {(rule.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-900">
              Evaluated {dossier.multi_vector.rules_evaluated} rules ({dossier.multi_vector.window_minutes}m window)
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Sub-View Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'graph'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Attack-Chain Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'matrix'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>MITRE ATT&CK Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'timeline'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cross-Attack Timeline ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'alerts'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Attacker Alerts ({dossier.alerts.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'graph' && graph && (
          <AttackChainGraph graph={graph} />
        )}

        {activeTab === 'matrix' && (
          <MitreMatrixView events={events} graph={graph || undefined} />
        )}

        {activeTab === 'timeline' && (
          <CrossAttackTimeline events={events} />
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {dossier.alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm border border-slate-800 rounded-lg bg-slate-950/40">
                No active or historical alerts recorded for this IP.
              </div>
            ) : (
              dossier.alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <SeverityBadge severity={al.severity} />
                      <StatusBadge status={al.status} />
                      <span className="text-xs font-semibold text-white">{al.alert_type}</span>
                    </div>
                    <p className="text-xs text-slate-300">{al.message}</p>
                    <span className="text-[10px] font-mono text-slate-500">
                      Created: {new Date(al.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Lifecycle Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {al.status === 'open' && (
                      <button
                        onClick={() => handleAlertStatusChange(al.id, 'acknowledged')}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {al.status !== 'resolved' && (
                      <button
                        onClick={() => handleAlertStatusChange(al.id, 'resolved')}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {al.status !== 'open' && (
                      <button
                        onClick={() => handleAlertStatusChange(al.id, 'open')}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      >
                        Re-open
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
