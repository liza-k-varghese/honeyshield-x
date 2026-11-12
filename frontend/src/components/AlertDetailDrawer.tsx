import React, { useEffect } from 'react';
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
  onInspectRule: _onInspectRule,
  onPromoteToCase,
}) => {
  const updateMutation = useUpdateAlertStatus();

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#111C29] border-l border-[#1E2D3D] h-full flex flex-col shadow-soc-lg animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1E2D3D] bg-[#111C29] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-[#00D6C9]/10 text-[#00D6C9] border border-[#00D6C9]/30">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-[#94A6B8]">ALERT #{alert.id}</span>
                <SeverityBadge severity={severity} />
                <StatusBadge status={alert.status} />
              </div>
              <h2 className="text-base font-semibold text-[#F0F5F8] tracking-tight mt-0.5">{alert.alert_type}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Action Bar / Lifecycle Buttons */}
          <div className="p-3.5 rounded-lg bg-[#192737] border border-[#1E2D3D] flex flex-wrap items-center justify-between gap-3 shadow-soc-sm">
            <div className="text-xs text-[#94A6B8]">
              Triage Lifecycle: <span className="font-semibold text-[#F0F5F8] font-mono">{alert.status.toUpperCase()}</span>
            </div>
            <div className="flex items-center space-x-2">
              {alert.status === 'open' && (
                <button
                  onClick={() => handleStatusChange('acknowledged')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#E5B65A]/15 hover:bg-[#E5B65A]/25 text-[#E5B65A] border border-[#E5B65A]/35 transition-colors disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>
              )}
              {alert.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#48C99B]/15 hover:bg-[#48C99B]/25 text-[#48C99B] border border-[#48C99B]/35 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve</span>
                </button>
              )}
              {alert.status !== 'open' && (
                <button
                  onClick={() => handleStatusChange('open')}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#192737] hover:bg-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8] border border-[#1E2D3D] transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-open</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert Message */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#94A6B8]">Alert Summary</h3>
            <div className="p-3.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] text-sm text-[#F0F5F8] font-mono leading-relaxed">
              {alert.message}
            </div>
          </div>

          {/* Incident Metadata & Risk Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Risk Score */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D]">
              <span className="text-[11px] font-mono text-[#94A6B8] uppercase">Operational Risk</span>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-mono text-[#F0F5F8]">{riskScore.toFixed(1)}</span>
                <span className="text-xs text-[#94A6B8]">/ 100</span>
              </div>
              <div className="w-full bg-[#080D14] rounded-full h-1.5 mt-2 overflow-hidden border border-[#1E2D3D]">
                <div
                  className={`h-full rounded-full ${
                    riskScore >= 90
                      ? 'bg-[#EF6268]'
                      : riskScore >= 70
                      ? 'bg-[#E5B65A]'
                      : riskScore >= 40
                      ? 'bg-[#E5B65A]'
                      : 'bg-[#48C99B]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
                />
              </div>
            </div>

            {/* Notification Status */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#94A6B8] uppercase">Webhook Transport</span>
              <div className="my-1">
                <NotificationBadge status={alert.notification_status} />
              </div>
              <span className="text-[10px] text-[#94A6B8] font-mono truncate">
                {alert.notified_at ? new Date(alert.notified_at).toLocaleTimeString() : 'No delivery logged'}
              </span>
            </div>

            {/* Attack Container Link */}
            <div className="p-3 rounded-lg bg-[#192737] border border-[#1E2D3D] flex flex-col justify-between">
              <span className="text-[11px] font-mono text-[#94A6B8] uppercase">Attack Container</span>
              <div className="flex items-center space-x-1.5 text-sm font-mono font-medium text-[#00D6C9] my-1">
                <Hash className="w-3.5 h-3.5" />
                <span>{attackId ?? 'N/A'}</span>
              </div>
              <span className="text-[10px] text-[#94A6B8] font-mono">
                {attack?.source_ip ? `IP: ${attack.source_ip}` : 'Unknown IP'}
              </span>
            </div>
          </div>

          {/* Associated Attack Container Details */}
          {attack && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#94A6B8] flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#00D6C9]" />
                  <span>Attack Container Context</span>
                </h3>
                <span className="text-[11px] font-mono text-[#94A6B8]">
                  Detected: {new Date(attack.detected_at).toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] text-xs font-mono grid grid-cols-2 gap-2 text-[#F0F5F8]">
                <div>
                  <span className="text-[#94A6B8]">Type:</span> {attack.attack_type}
                </div>
                <div>
                  <span className="text-[#94A6B8]">Protocol:</span> {attack.protocol || 'N/A'}
                </div>
                <div>
                  <span className="text-[#94A6B8]">Source:</span> {attack.source_ip || 'None'}
                </div>
                <div>
                  <span className="text-[#94A6B8]">Target:</span> {attack.destination_ip || 'Honeypot'}
                </div>
              </div>

              {attack.source_ip && onInvestigateIp && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onInvestigateIp(attack.source_ip!);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-[#00D6C9]/15 hover:bg-[#00D6C9]/25 text-[#00D6C9] border border-[#00D6C9]/35 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
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
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/35 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
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
                    className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-[#00D6C9]/10 hover:bg-[#00D6C9]/20 text-[#00D6C9] border border-[#00D6C9]/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
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
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#94A6B8] flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00D6C9]" />
                <span>Attack Event Timeline ({events.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-[#94A6B8]">Chronological (Ascending)</span>
            </div>
            <EventTimeline events={events} isLoading={isEventsLoading || isAttackLoading} />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#1E2D3D] bg-[#111C29] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#192737] hover:bg-[#1E2D3D] text-[#F0F5F8] border border-[#1E2D3D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
