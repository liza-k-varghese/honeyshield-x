import React, { useState } from 'react';
import {
  FolderPlus,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ListPlus,
} from 'lucide-react';
import { useCreateCase } from '../hooks/useIncidentCases';
import { useAuth } from '../context/AuthContext';
import { SeverityLevel } from '../types';

interface CasePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated?: (caseId: string) => void;
  initialAlertIds?: number[];
  initialSourceIp?: string;
  initialSeverity?: SeverityLevel;
  initialTargetId?: number;
}

export const CasePromotionModal: React.FC<CasePromotionModalProps> = ({
  isOpen,
  onClose,
  onCaseCreated,
  initialAlertIds = [],
  initialSourceIp = '',
  initialSeverity = 'high',
  initialTargetId,
}) => {
  const { operator } = useAuth();
  const createMutation = useCreateCase();

  const [title, setTitle] = useState<string>(
    initialSourceIp ? `Adversary Intrusion from ${initialSourceIp}` : ''
  );
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityLevel>(initialSeverity);
  const [sourceIp, setSourceIp] = useState<string>(initialSourceIp);
  const [targetId, setTargetId] = useState<string>(initialTargetId ? String(initialTargetId) : '');
  const [alertIdsStr, setAlertIdsStr] = useState<string>(initialAlertIds.join(', '));
  const [playbookTemplate, setPlaybookTemplate] = useState<string>('GENERIC_INCIDENT_SOP');
  const [assignedTo, setAssignedTo] = useState<string>(operator?.username || 'analyst_sarah');
  const [initialNote, setInitialNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 200) {
      setFormError('Title must be between 3 and 200 characters.');
      return;
    }

    const parsedAlertIds = alertIdsStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const parsedTargetId = targetId.trim() ? parseInt(targetId.trim(), 10) : undefined;

    try {
      const created = await createMutation.mutateAsync({
        title: cleanTitle,
        description: description.trim() || undefined,
        severity,
        source_ip: sourceIp.trim() || undefined,
        target_id: !isNaN(Number(parsedTargetId)) ? parsedTargetId : undefined,
        initial_alert_ids: parsedAlertIds,
        playbook_template: playbookTemplate,
        assigned_to: assignedTo.trim() || undefined,
        initial_note: initialNote.trim() || undefined,
      });

      onClose();
      if (onCaseCreated) {
        onCaseCreated(created.case_id);
      }
    } catch (err) {
      setFormError((err as Error).message || 'Failed to create incident case');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {initialAlertIds.length > 0 ? 'Promote Alerts to Incident Case' : 'Create New Incident Case'}
              </h2>
              <p className="text-xs text-slate-400">
                Bind alerts and IOCs to an interactive SANS/NIST response playbook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Incident Case Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Multi-Vector Credential Assault on SSH Decoy"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Incident Scope & Narrative</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of threat activity, affected decoys, and tactical scope..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs resize-none"
            />
          </div>

          {/* Row 1: Severity & Playbook */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Severity Band</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Playbook SOP Template</label>
              <select
                value={playbookTemplate}
                onChange={(e) => setPlaybookTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              >
                <option value="SSH_BRUTE_FORCE_SOP">SSH_BRUTE_FORCE_SOP (NIST SP 800-61)</option>
                <option value="WEB_EXPLOIT_SOP">WEB_EXPLOIT_SOP (OWASP Web Defense)</option>
                <option value="PORT_SCAN_RECON_SOP">PORT_SCAN_RECON_SOP (Reconnaissance Defense)</option>
                <option value="GENERIC_INCIDENT_SOP">GENERIC_INCIDENT_SOP (SANS 6-Step Core)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Source IP & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Source IP</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                placeholder="e.g. 198.51.100.44"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assigned SOC Handler</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Username (e.g. analyst_sarah)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Row 3: Alert IDs & Target ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Bound Alert IDs (comma-separated)</label>
              <input
                type="text"
                value={alertIdsStr}
                onChange={(e) => setAlertIdsStr(e.target.value)}
                placeholder="e.g. 101, 102, 105"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Attack / Entity ID</label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="e.g. 42"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Initial Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Initial Triage Journal Entry</label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="Initial forensic observations or containment urgency..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Case...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Promote / Create Case</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
