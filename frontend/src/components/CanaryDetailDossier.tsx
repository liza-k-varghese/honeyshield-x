import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Copy,
  Check,
  Ban,
  Flame,
  Radio,
  FileCode,
} from 'lucide-react';
import { useCanary, useCanaryContext, useCanaryHits, useRevokeCanary } from '../hooks/useDeception';
import { useAuth } from '../context/AuthContext';

interface CanaryDetailDossierProps {
  tokenId: string;
  onBack: () => void;
  onInvestigateIp?: (ip: string) => void;
  onStageContainment?: (ip: string, alertId?: number) => void;
}

export const CanaryDetailDossier: React.FC<CanaryDetailDossierProps> = ({
  tokenId,
  onBack,
  onInvestigateIp,
  onStageContainment,
}) => {
  const { hasPermission } = useAuth();
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);

  const { data: canary, isLoading: isCanaryLoading } = useCanary(tokenId);
  const { data: contextData } = useCanaryContext(tokenId);
  const { data: hitsData, isLoading: isHitsLoading } = useCanaryHits(tokenId, 50);
  const revokeMutation = useRevokeCanary();

  const hits = hitsData?.hits || [];

  const handleCopyPayload = () => {
    if (!canary) return;
    navigator.clipboard.writeText(JSON.stringify(canary.decoy_payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleRevoke = async () => {
    try {
      await revokeMutation.mutateAsync(tokenId);
      setRevokeConfirm(false);
    } catch (err) {
      console.error('Revocation failed:', err);
    }
  };

  if (isCanaryLoading || !canary) {
    return (
      <div className="p-8 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-400">Loading canary dossier...</p>
      </div>
    );
  }

  const isTripped = canary.hit_count > 0;
  const isRevoked = canary.status === 'revoked';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Deception Grid"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100">{canary.name}</h1>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                  isRevoked
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : isTripped
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                }`}
              >
                {isRevoked ? 'REVOKED' : isTripped ? 'TRIPPED' : 'ARMED'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">Token ID: {canary.token_id}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isRevoked && hasPermission('deception:admin') && (
            revokeConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-rose-300">Confirm revoke?</span>
                <button
                  onClick={handleRevoke}
                  disabled={revokeMutation.isPending}
                  className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Yes, Revoke
                </button>
                <button
                  onClick={() => setRevokeConfirm(false)}
                  className="px-2.5 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRevokeConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 text-rose-300 text-xs font-medium transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Revoke Canary</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Radio className="w-4 h-4" />
            <span>High-Confidence Tripwire Telemetry</span>
          </div>
          <span className="text-[11px] text-slate-400">Presumptive Compromise Signal</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {contextData?.advisory_summary ||
            `Canary honeytoken '${canary.name}' is armed in ${canary.environment}. All interactions trigger immediate threat logging.`}
        </p>
      </div>

      {/* Grid: Metadata & Decoy Payload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metadata Card */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Canary Properties</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Asset Class</span>
              <span className="font-mono text-emerald-300 font-semibold">{canary.canary_type}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Environment</span>
              <span className="text-slate-200 capitalize">{canary.environment}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Deployment Location</span>
              <span className="font-mono text-slate-300 truncate max-w-[180px]">{canary.placement_hint || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Total Encounters</span>
              <span className={`font-bold font-mono ${isTripped ? 'text-rose-400' : 'text-slate-300'}`}>
                {canary.hit_count} hits
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Created By</span>
              <span className="text-slate-300 font-medium">{canary.created_by}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Last Tripped</span>
              <span className="text-slate-300 font-mono">
                {canary.last_tripped_at ? new Date(canary.last_tripped_at).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Inert Decoy Payload Viewer */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inert Decoy Payload Contract
              </h3>
            </div>
            <button
              onClick={handleCopyPayload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
            >
              {copiedPayload ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex-1">
            <pre className="h-44 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(canary.decoy_payload, null, 2)}
            </pre>
          </div>

          <p className="text-[11px] text-slate-500">
            Note: Inert payload contains cryptographic traps and synthetic credentials. Never executes or authenticates to real infrastructure.
          </p>
        </div>
      </div>

      {/* Adversary Hit Telemetry Log Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Tripwire Breaches & Adversary Encounters ({hits.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Real-time Honeytoken Telemetry Feed</span>
        </div>

        {isHitsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading hit telemetry...</div>
        ) : hits.length === 0 ? (
          <div className="py-12 text-center space-y-2 bg-slate-950/40 rounded-lg border border-slate-800/80">
            <Shield className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Adversary Encounters Recorded</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              This honeytoken has not yet been tripped. When an adversary touches this decoy, forensic headers and source IP will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Adversary Source IP</th>
                  <th className="py-2.5 px-3">HTTP Method</th>
                  <th className="py-2.5 px-3">User Agent</th>
                  <th className="py-2.5 px-3">Alert & Case Link</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {hits.map((hit) => (
                  <tr key={hit.hit_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(hit.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-rose-400 whitespace-nowrap">
                      {hit.source_ip}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                        {hit.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate" title={hit.user_agent}>
                      {hit.user_agent || 'Unknown'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {hit.case_id ? (
                        <span className="text-indigo-400 hover:underline">{hit.case_id}</span>
                      ) : hit.alert_id ? (
                        <span className="text-amber-400">Alert #{hit.alert_id}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                      {onInvestigateIp && (
                        <button
                          onClick={() => onInvestigateIp(hit.source_ip)}
                          className="px-2 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-[11px] transition-colors"
                        >
                          Investigate IP
                        </button>
                      )}
                      {onStageContainment && (
                        <button
                          onClick={() => onStageContainment(hit.source_ip, hit.alert_id || undefined)}
                          className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold transition-colors"
                        >
                          Stage Containment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
