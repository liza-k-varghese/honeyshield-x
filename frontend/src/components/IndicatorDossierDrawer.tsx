import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Activity,
  Tag,
  Copy,
  Check,
  Ban,
  ShieldCheck,
  TrendingDown,
  Info,
  ExternalLink,
  Flame,
} from 'lucide-react';
import {
  useThreatIndicator,
  useIndicatorContext,
  useRevokeIndicator,
  useWhitelistIndicator,
} from '../hooks/useThreatIntel';
import { useAuth } from '../context/AuthContext';

interface IndicatorDossierDrawerProps {
  indicatorId: number | null;
  onClose: () => void;
  onStageContainment?: (indicatorValue: string) => void;
}

export const IndicatorDossierDrawer: React.FC<IndicatorDossierDrawerProps> = ({
  indicatorId,
  onClose,
  onStageContainment,
}) => {
  const { hasPermission } = useAuth();
  const [copiedValue, setCopiedValue] = useState(false);
  const [revokePrompt, setRevokePrompt] = useState(false);
  const [revokeReason, setRevokeReason] = useState('Adversary abandoned or deprecated infrastructure');
  const [whitelistPrompt, setWhitelistPrompt] = useState(false);
  const [whitelistReason, setWhitelistReason] = useState('Verified authorized internal entity');

  const { data: indicator, isLoading: isIndicatorLoading } = useThreatIndicator(indicatorId);
  const { data: contextData, isLoading: isContextLoading } = useIndicatorContext(indicatorId);

  const revokeMutation = useRevokeIndicator();
  const whitelistMutation = useWhitelistIndicator();

  if (!indicatorId) return null;

  const handleCopyValue = () => {
    if (!indicator) return;
    navigator.clipboard.writeText(indicator.indicator_value);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  const handleExecuteRevoke = async () => {
    if (!indicator) return;
    try {
      await revokeMutation.mutateAsync({ id: indicator.id, reason: revokeReason });
      setRevokePrompt(false);
    } catch (err) {
      console.error('Revocation failed:', err);
    }
  };

  const handleExecuteWhitelist = async () => {
    if (!indicator) return;
    try {
      await whitelistMutation.mutateAsync({ id: indicator.id, reason: whitelistReason });
      setWhitelistPrompt(false);
    } catch (err) {
      console.error('Whitelisting failed:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'decaying':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'retired':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'revoked':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'whitelisted':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">IOC Threat Dossier</h2>
            <p className="text-[11px] text-slate-400">ID #{indicatorId} · Lifecycle Fusion Details</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isIndicatorLoading || !indicator ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
            Loading indicator telemetry...
          </div>
        ) : (
          <>
            {/* Indicator Hero Header */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  {indicator.indicator_type} Observable
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getSeverityBadge(
                      indicator.threat_level
                    )}`}
                  >
                    {indicator.threat_level.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColor(
                      indicator.status
                    )}`}
                  >
                    {indicator.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-sm text-slate-100 font-semibold break-all">
                  {indicator.indicator_value}
                </span>
                <button
                  type="button"
                  onClick={handleCopyValue}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors shrink-0"
                  title="Copy Observable"
                >
                  {copiedValue ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {indicator.campaign && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Attributed Campaign: {indicator.campaign}</span>
                </div>
              )}
            </div>

            {/* Confidence & Decay Metrics */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Confidence Scoring & Temporal Decay
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1">Effective Decay Confidence</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-slate-100 font-mono">
                      {Math.round(indicator.decayed_confidence * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      score {indicator.decayed_confidence.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        indicator.decayed_confidence >= 0.65
                          ? 'bg-rose-500'
                          : indicator.decayed_confidence >= 0.15
                          ? 'bg-amber-500'
                          : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.round(indicator.decayed_confidence * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 block mb-1">Base Confidence</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-slate-100 font-mono">
                      {Math.round(indicator.base_confidence * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-500">source: {indicator.source}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    Half-Life: {indicator.half_life_days} days
                  </span>
                </div>
              </div>

              {/* Repeat Hits Saturation */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span className="text-slate-300">Repeat Hit Count:</span>
                  <span className="font-mono font-semibold text-slate-100">{indicator.hit_count} hits</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Saturation boost: 1 - exp(-0.3*(k-1))
                </span>
              </div>
            </div>

            {/* Temporal Provenance */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Lifecycle Timestamps
              </h3>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> First Seen:
                  </span>
                  <span className="font-mono text-slate-200">{new Date(indicator.first_seen).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Last Encounter:
                  </span>
                  <span className="font-mono text-slate-200">{new Date(indicator.last_seen).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Description & Tags */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Analyst Notes & Tags
              </h3>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  {indicator.description || 'No analyst notes recorded for this observable.'}
                </p>
                {indicator.tags && indicator.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {indicator.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60 font-mono"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Non-Authoritative Advisory Analysis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Advisory Contextualization
                </h3>
                <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded font-medium">
                  Advisory Only · Non-Authoritative
                </span>
              </div>

              {isContextLoading || !contextData ? (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg text-slate-500 text-xs">
                  Generating deterministic contextual analysis...
                </div>
              ) : (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Threat Posture:</span>
                    <span className="font-semibold text-rose-300 uppercase">{contextData.threat_posture}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{contextData.narrative}</p>

                  {contextData.recommended_actions && contextData.recommended_actions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-medium text-slate-400">Recommended Actions:</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {contextData.recommended_actions.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operator Actions / RBAC Guards */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Operator Response Controls
              </h3>

              <div className="flex flex-wrap gap-2">
                {/* Stage Containment Action */}
                {onStageContainment && indicator.indicator_type === 'ip' && (
                  <button
                    type="button"
                    onClick={() => onStageContainment(indicator.indicator_value)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Stage Firewall Containment</span>
                  </button>
                )}

                {/* Revoke Action */}
                {hasPermission('threat_intel:revoke') && indicator.status !== 'revoked' && (
                  <button
                    type="button"
                    onClick={() => setRevokePrompt(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Revoke Indicator</span>
                  </button>
                )}

                {/* Whitelist Action */}
                {hasPermission('threat_intel:admin') && indicator.status !== 'whitelisted' && (
                  <button
                    type="button"
                    onClick={() => setWhitelistPrompt(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-sky-950 hover:text-sky-300 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Whitelist Observable</span>
                  </button>
                )}
              </div>

              {/* Revoke Confirmation Dialog */}
              {revokePrompt && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Confirm Indicator Revocation</span>
                  </div>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Enter reason for revocation..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setRevokePrompt(false)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteRevoke}
                      disabled={revokeMutation.isPending}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium"
                    >
                      {revokeMutation.isPending ? 'Revoking...' : 'Confirm Revoke'}
                    </button>
                  </div>
                </div>
              )}

              {/* Whitelist Confirmation Dialog */}
              {whitelistPrompt && (
                <div className="p-3 bg-sky-950/40 border border-sky-800 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Confirm Administrative Whitelist</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Whitelisting takes absolute precedence. No alerts or containment can trigger against this observable.
                  </p>
                  <input
                    type="text"
                    value={whitelistReason}
                    onChange={(e) => setWhitelistReason(e.target.value)}
                    placeholder="Enter whitelist justification..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setWhitelistPrompt(false)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteWhitelist}
                      disabled={whitelistMutation.isPending}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium"
                    >
                      {whitelistMutation.isPending ? 'Whitelisting...' : 'Confirm Whitelist'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
