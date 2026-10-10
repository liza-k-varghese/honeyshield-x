import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, X, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { HuntDossier } from '../types';
import { usePromoteHuntToRule, usePromoteHuntToCase } from '../hooks/useThreatHunting';

interface HuntPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hunt: HuntDossier;
  promotionType: 'rule' | 'case';
}

export const HuntPromotionModal: React.FC<HuntPromotionModalProps> = ({
  isOpen,
  onClose,
  hunt,
  promotionType,
}) => {
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  const promoteRuleMutation = usePromoteHuntToRule();
  const promoteCaseMutation = usePromoteHuntToCase();

  const isSubmitting = promoteRuleMutation.isPending || promoteCaseMutation.isPending;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justification.trim().length < 10) {
      setError('Justification must be at least 10 characters.');
      return;
    }
    setError(null);

    try {
      if (promotionType === 'rule') {
        await promoteRuleMutation.mutateAsync({
          huntId: hunt.hunt_id,
          justification: justification.trim(),
        });
      } else {
        await promoteCaseMutation.mutateAsync({
          huntId: hunt.hunt_id,
          justification: justification.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Promotion failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                promotionType === 'rule'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {promotionType === 'rule' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {promotionType === 'rule'
                  ? 'Promote Findings to Detection Rule'
                  : 'Escalate to Incident Case'}
              </h3>
              <p className="text-xs text-slate-400">
                Hunt: <span className="font-mono text-slate-300">{hunt.hunt_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Originating Hypothesis:</span>
              <span className="font-medium text-slate-200">{hunt.title}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Evidence Records:</span>
              <span className="font-mono text-sky-400">{hunt.evidence.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Assigned Severity:</span>
              <span className="capitalize font-medium text-amber-400">{hunt.severity}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/40 text-sky-300 text-xs space-y-1">
            <p className="font-semibold text-sky-200">
              {promotionType === 'rule'
                ? 'Governor Tier-2 Declarative Rule Contract'
                : 'Governor Tier-2 Incident Escalation Contract'}
            </p>
            <p className="text-slate-400">
              {promotionType === 'rule'
                ? 'Promoted rules are registered as INACTIVE/DRAFT in Module 3.3. They must be validated via deterministic replay before production activation.'
                : 'Escalates confirmed malicious activity to Module 3.6 Incident Case with ADVANCED_THREAT_HUNT_DISCOVERY playbook and binds matched telemetry.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Mandatory Operational Justification</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {justification.length} / 10 min chars
              </span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="State the operational security rationale for this promotion dispatch..."
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || justification.trim().length < 10}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white flex items-center space-x-2 transition-colors ${
                promotionType === 'rule'
                  ? 'bg-amber-600 hover:bg-amber-500 disabled:opacity-50'
                  : 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Governor Policy...</span>
                </>
              ) : (
                <>
                  <span>
                    {promotionType === 'rule' ? 'Dispatch Rule Promotion' : 'Dispatch Case Escalation'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
