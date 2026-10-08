import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, Clock, X, ArrowRight } from 'lucide-react';
import { useExecuteIncidentCommand } from '../hooks/useIncidentCommand';
import { previewIncidentCommand } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IncidentCommandAction, VirtualIncidentItem } from '../types';

interface CommandExecutionModalProps {
  incident: VirtualIncidentItem;
  defaultAction?: IncidentCommandAction;
  onClose: () => void;
  operatorId?: string;
}

const ACTION_PERMISSIONS: Record<IncidentCommandAction, string> = {
  ALERT_ACKNOWLEDGE: 'command:ack',
  ALERT_RESOLVE: 'command:resolve',
  ALERT_ESCALATE: 'command:escalate',
  NOTIFICATION_DISPATCH: 'command:dispatch',
  NOTIFICATION_SUPPRESS: 'command:suppress',
  CONTAINMENT_STAGING_REQUEST: 'command:contain',
};

export const CommandExecutionModal: React.FC<CommandExecutionModalProps> = ({
  incident,
  defaultAction = 'ALERT_ACKNOWLEDGE',
  onClose,
  operatorId,
}) => {
  const { operator, hasPermission } = useAuth();
  const effectiveOperatorId = operatorId || operator?.username || 'soc_operator';

  const [selectedAction, setSelectedAction] = useState<IncidentCommandAction>(defaultAction);
  const [justification, setJustification] = useState('');
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executeMutation = useExecuteIncidentCommand();

  const requiredPermission = ACTION_PERMISSIONS[selectedAction];
  const isPermitted = hasPermission(requiredPermission);

  const isLevel3 = selectedAction === 'NOTIFICATION_DISPATCH' || selectedAction === 'CONTAINMENT_STAGING_REQUEST';
  const requiresJustification = selectedAction !== 'ALERT_ACKNOWLEDGE' && selectedAction !== 'NOTIFICATION_SUPPRESS';

  const handlePreview = async () => {
    if (!isPermitted) {
      setErrorMessage(`Unauthorized: Pre-flight approval requires '${requiredPermission}' permission.`);
      return;
    }
    setIsPreviewing(true);
    setErrorMessage(null);
    try {
      const res = await previewIncidentCommand(
        {
          action: selectedAction,
          target_id: incident.alert_id,
          justification: justification.trim() || undefined,
        },
        effectiveOperatorId
      );
      setApprovalToken(res.approval_token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pre-flight Governor evaluation failed.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPermitted) {
      setErrorMessage(`Unauthorized: Role '${operator?.role}' lacks '${requiredPermission}' permission.`);
      return;
    }

    if (requiresJustification && (!justification.trim() || justification.trim().length < 5)) {
      setErrorMessage('Action requires a justification of at least 5 characters.');
      return;
    }

    try {
      await executeMutation.mutateAsync({
        req: {
          action: selectedAction,
          target_id: incident.alert_id,
          justification: justification.trim() || undefined,
          approval_token: approvalToken || undefined,
        },
        idempotencyKey: crypto.randomUUID(),
        operatorId: effectiveOperatorId,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Command execution failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111726] border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">Live Incident Command Execution</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Entity Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-cyan-400 font-medium">{incident.incident_id}</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
              Status: {incident.status}
            </span>
          </div>
          <div className="text-slate-300 font-medium">{incident.attack_type}</div>
          <div className="text-slate-400 font-mono text-[11px]">
            Attacker IP: {incident.source_ip} | Risk Score: {incident.risk_score.toFixed(1)}/100
          </div>
        </div>

        {/* Action Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">Select Defensive Action:</label>
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value as IncidentCommandAction);
              setApprovalToken(null);
              setErrorMessage(null);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALERT_ACKNOWLEDGE">ALERT_ACKNOWLEDGE (Tier 1 - Low Blast)</option>
            <option value="ALERT_RESOLVE">ALERT_RESOLVE (Tier 2 - State Mutation)</option>
            <option value="ALERT_ESCALATE">ALERT_ESCALATE (Tier 2 - Severity Boost)</option>
            <option value="NOTIFICATION_DISPATCH">NOTIFICATION_DISPATCH (Tier 3 - Outbound Webhook)</option>
            <option value="NOTIFICATION_SUPPRESS">NOTIFICATION_SUPPRESS (Tier 1 - Low Blast)</option>
            <option value="CONTAINMENT_STAGING_REQUEST">CONTAINMENT_STAGING_REQUEST (Tier 3 - Staged Blocklist)</option>
          </select>
        </div>

        {/* Role Permission Feedback */}
        {!isPermitted && (
          <div className="p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Role restriction: <strong>{operator?.role || 'viewer'}</strong> lacks <code>{requiredPermission}</code> to execute this command.
            </span>
          </div>
        )}

        {/* Justification Field */}
        {requiresJustification && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Operator Justification <span className="text-rose-400">*</span>:
            </label>
            <textarea
              required
              minLength={5}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide explicit operational rationale for this action..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 h-20"
            />
          </div>
        )}

        {/* Pre-flight Token Status for Level 3 Actions */}
        {isLevel3 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Human-in-the-Loop Token:</span>
              {approvalToken ? (
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved (60s TTL)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing || !isPermitted}
                  className="px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/40 text-[11px] font-medium transition"
                >
                  {isPreviewing ? 'Evaluating...' : 'Request Pre-Flight Approval'}
                </button>
              )}
            </div>
            {approvalToken && (
              <div className="text-[10px] font-mono text-slate-500 truncate">
                Token: {approvalToken}
              </div>
            )}
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={executeMutation.isPending || !isPermitted || (isLevel3 && !approvalToken)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
          >
            {executeMutation.isPending ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>Execute Governed Action</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
