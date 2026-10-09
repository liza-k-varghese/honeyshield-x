import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  Send,
} from 'lucide-react';
import { CampaignDossier } from '../types';
import { useContainCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';

interface CampaignContainmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignDossier | null;
  onSuccess?: () => void;
}

export const CampaignContainmentModal: React.FC<CampaignContainmentModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}) => {
  const { operator } = useAuth();
  const containMutation = useContainCampaign();

  const [actionType, setActionType] = useState<string>('BLOCK_IP');
  const [justification, setJustification] = useState<string>('');
  const [approvalToken, setApprovalToken] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  if (!isOpen || !campaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!approvalToken.trim()) {
      setErrorMsg('Approval token is required for Governor Tier-3 containment.');
      return;
    }

    if (!justification.trim() || justification.trim().length < 10) {
      setErrorMsg('A detailed justification (at least 10 characters) is required for audit compliance.');
      return;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const res = await containMutation.mutateAsync({
        id: campaign.campaign_id,
        payload: {
          action_type: actionType,
          approval_token: approvalToken.trim(),
          justification: justification.trim(),
        },
        idempotencyKey,
      });

      setSuccessInfo(res);
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Containment dispatch failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-rose-950/40 border-b border-rose-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-300">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Governor Tier-3 Campaign Containment</h3>
              <p className="text-[11px] text-rose-300/80">Autonomous Containment Guardrail &bull; Two-Phase HITL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-mono leading-none"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Target Campaign Overview */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Campaign:</span>
              <span className="font-mono text-slate-200 font-semibold">{campaign.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Campaign ID:</span>
              <span className="font-mono text-sky-400">{campaign.campaign_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Entities in Scope:</span>
              <span className="font-mono text-slate-300">
                {campaign.source_ips.length} IPs &bull; {campaign.canary_ids.length} Canaries &bull;{' '}
                {campaign.ioc_ids.length} IOCs
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {successInfo ? (
            <div className="bg-emerald-950/70 border border-emerald-800 rounded-lg p-4 space-y-2 text-xs text-emerald-200">
              <div className="flex items-center space-x-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Campaign Containment Dispatched Successfully</span>
              </div>
              <p className="text-[11px] text-emerald-300/90">
                Governor Tier-3 token verified and consumed. Campaign status updated to <strong>contained</strong>.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Governor Warning Notice */}
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3 flex items-start space-x-2.5 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-0.5">
                  <p className="font-semibold">Governor Safety Mandate:</p>
                  <p className="text-amber-300/80">
                    Campaign containment is a Tier-3 destructive action. It requires pre-authorization via an
                    approval token, operator credentials with <code>campaign:admin</code> or{' '}
                    <code>campaign:update</code> permission, and will be blocked if emergency lockout is engaged.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-950/50 border border-rose-800/80 rounded-lg p-3 flex items-center space-x-2 text-rose-300">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Type */}
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Containment Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono text-xs"
                >
                  <option value="BLOCK_IP">BLOCK_IP — Firewall / Ingress Invalidation</option>
                  <option value="QUARANTINE_HOST">QUARANTINE_HOST — Host Isolation</option>
                  <option value="REVOKE_CREDENTIALS">REVOKE_CREDENTIALS — Token Invalidation</option>
                </select>
              </div>

              {/* Approval Token Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-300">
                    Governor Approval Token <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Single-use (15 min validity)</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={approvalToken}
                    onChange={(e) => setApprovalToken(e.target.value)}
                    placeholder="Enter approval token (e.g. tok-...)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono text-xs"
                    required
                  />
                  <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Operator Justification */}
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">
                  Audit Justification <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain operational reason for containment (recorded in SystemEvent audit log)..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-rose-500 text-xs"
                  required
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={containMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center space-x-1.5 shadow-lg shadow-rose-950/50 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{containMutation.isPending ? 'Dispatching...' : 'Dispatch Containment'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
