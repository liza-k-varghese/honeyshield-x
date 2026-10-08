import React from 'react';
import { X, CheckCircle2, AlertOctagon, RotateCcw, Shield, ExternalLink, Calendar, Hash, Search, FolderPlus } from 'lucide-react';
import { Alert, AlertLifecycleStatus } from '../types';
import { useAttackDetail, useAttackEvents, useUpdateAlertStatus } from '../hooks/useDashboard';
import { NotificationBadge, SeverityBadge, StatusBadge } from './Badge';
import { EventTimeline } from './EventTimeline';

interface AlertDetailDrawerProps {
  alert: Alert | null;
  onClose: () => void;
  onInvestigateIp?: (sourceIp: string) => void;
  onReplayAttack?: (attackId: number) => void;
  onInspectRule?: (ruleId: string) => void;
  onPromoteToCase?: (alert: Alert) => void;
}

export const AlertDetailDrawer: React.FC<AlertDetailDrawerProps> = ({
  alert,
  onClose,
  onInvestigateIp,
  onReplayAttack,
  onInspectRule,
}) => {
  const updateMutation = useUpdateAlertStatus();

  const attackId = alert?.attack_id ?? null;
  const { data: attack, isLoading: isAttackLoading } = useAttackDetail(attackId);
  const { data: events = [], isLoading: isEventsLoading } = useAttackEvents(attackId);

  if (!alert) return null;

  const handleStatusChange = (newStatus: AlertLifecycleStatus) => {
    updateMutation.mutate({
      alertId: alert.id,
      status: newStatus,
    });
  };

  const riskScore = attack?.risk_score ?? 0;
  const severity = alert.severity;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400">ALERT #{alert.id}</span>
                <SeverityBadge severity={severity} />
                <StatusBadge status={alert.status} />
              </div>
              <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">{alert.alert_type}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Action Bar / Lifecycle Buttons */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Triage Lifecycle: <span className="font-semibold text-white">{alert.status.toUpperCase()}</span>
            </div>
            <div className="flex items-center space-x-2">
              {alert.status === 'open' && (
                <button
                  onClick={() => handleStatusChange('acknowledged')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>
              )}
              {alert.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve</span>
                </button>
              )}
              {alert.status !== 'open' && (
                <button
                  onClick={() => handleStatusChange('open')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-open</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert Message */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Alert Summary</h3>
            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-sm text-slate-200">
              {alert.message}
            </div>
          </div>

          {/* Incident Metadata & Risk Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Risk Score */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Operational Risk</span>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-mono text-white">{riskScore.toFixed(1)}</span>
                <span className="text-xs text-slate-400">/ 100</span>
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

            {/* Notification Status */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Webhook Transport</span>
              <div className="my-1">
                <NotificationBadge status={alert.notification_status} />
              </div>
              <span className="text-[10px] text-slate-500 truncate">
                {alert.notified_at ? new Date(alert.notified_at).toLocaleTimeString() : 'No delivery logged'}
              </span>
            </div>

            {/* Attack Container Link */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Attack Container</span>
              <div className="flex items-center space-x-1.5 text-sm font-mono font-medium text-sky-400 my-1">
                <Hash className="w-3.5 h-3.5" />
                <span>{attackId ?? 'N/A'}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {attack?.source_ip ? `IP: ${attack.source_ip}` : 'Unknown IP'}
              </span>
            </div>
          </div>

          {/* Associated Attack Container Details */}
          {attack && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Attack Container Context</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Detected: {new Date(attack.detected_at).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Type:</span> {attack.attack_type}
                </div>
                <div>
                  <span className="text-slate-500">Protocol:</span> {attack.protocol || 'N/A'}
                </div>
                <div>
                  <span className="text-slate-500">Source:</span> {attack.source_ip || 'None'}
                </div>
                <div>
                  <span className="text-slate-500">Target:</span> {attack.destination_ip || 'Honeypot'}
                </div>
              </div>

              {attack.source_ip && onInvestigateIp && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onInvestigateIp(attack.source_ip!);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Investigate Attacker Entity ({attack.source_ip})</span>
                  </button>
                </div>
              )}

              {attack.id && onReplayAttack && (
                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      onReplayAttack(attack.id);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Attack #{attack.id} Telemetry</span>
                  </button>
                </div>
              )}

              {onPromoteToCase && (
                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      onPromoteToCase(alert);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Promote Alert to Incident Case</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chronological Event Timeline */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Attack Event Timeline ({events.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Chronological (Ascending)</span>
            </div>
            <EventTimeline events={events} isLoading={isEventsLoading || isAttackLoading} />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
