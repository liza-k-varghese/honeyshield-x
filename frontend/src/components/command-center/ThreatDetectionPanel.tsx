import React, { useState } from 'react';
import { Crosshair, AlertCircle, CheckCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { Alert, SeverityLevel } from '../../types';
import { useUpdateAlertStatus } from '../../hooks/useDashboard';

interface ThreatDetectionPanelProps {
  alerts?: Alert[];
  onSelectAlert?: (alert: Alert) => void;
  onInvestigateIp?: (ip: string) => void;
  onReplayAttack?: (attackId: number) => void;
}

export const ThreatDetectionPanel: React.FC<ThreatDetectionPanelProps> = ({
  alerts = [],
  onSelectAlert,
  onInvestigateIp,
  onReplayAttack,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const updateStatusMutation = useUpdateAlertStatus();

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'high') return alert.severity === 'high';
    if (filter === 'open') return alert.status === 'open';
    return true;
  });

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
      case 'medium':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'acknowledged':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const handleAcknowledge = (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation();
    updateStatusMutation.mutate({ alertId, status: 'acknowledged' });
  };

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cyan-500/15 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>Threat Detection</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Real-Time Correlated Detection Signatures & Triage</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 text-[10px] font-mono bg-slate-950/80 p-0.5 rounded border border-slate-800">
          {['all', 'critical', 'high', 'open'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded uppercase font-semibold transition-colors ${
                filter === f
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Threats Table / Cards List */}
      <div className="py-2 space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const ipMatch = alert.message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
            const sourceIp = ipMatch ? ipMatch[0] : null;

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert?.(alert)}
                className="p-3 rounded bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all hover:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 mt-0.5 ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="min-w-0">
                    <div className="text-slate-100 font-bold truncate flex items-center space-x-2">
                      <span>{alert.alert_type}</span>
                      <span className="text-[10px] text-slate-500 font-normal">#{alert.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {alert.message}
                    </p>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-1">
                      <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      {sourceIp && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onInvestigateIp?.(sourceIp);
                          }}
                          className="text-cyan-400 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <span>{sourceIp}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-medium ${getStatusBadge(alert.status)}`}>
                    {alert.status}
                  </span>

                  {alert.attack_id && onReplayAttack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplayAttack(alert.attack_id!);
                      }}
                      title="Replay in Studio"
                      className="p-1 rounded bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 text-slate-400 border border-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}

                  {alert.status === 'open' && (
                    <button
                      onClick={(e) => handleAcknowledge(e, alert.id)}
                      disabled={updateStatusMutation.isPending}
                      className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>Ack</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-xs font-mono text-slate-500 space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
            <p>No active threats match the current filter</p>
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Displaying {filteredAlerts.length} of {alerts.length} Correlated Alerts</span>
        <span className="text-cyan-400">Rule Engine v3.3 Active</span>
      </div>
    </div>
  );
};

