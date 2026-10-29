import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Clock,
  User,
  AlertTriangle,
  Play,
  FileText,
  Send,
  Sparkles,
  Search,
  Check,
  SkipForward,
} from 'lucide-react';
import {
  useAddCaseNote,
  useCase,
  useCompleteCaseTask,
  useUpdateCase,
} from '../hooks/useIncidentCases';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from './Badge';
import { PostIncidentReportModal } from './PostIncidentReportModal';
import { CommandExecutionModal } from './CommandExecutionModal';
import { CaseStatus, IncidentCommandAction, PlaybookTask, VirtualIncidentItem } from '../types';

interface CaseDetailDossierProps {
  caseId: string;
  onBack: () => void;
  onInvestigateIp?: (ip: string) => void;
}

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ['investigating', 'closed'],
  investigating: ['containment_in_progress', 'contained', 'resolved', 'closed'],
  containment_in_progress: ['contained', 'investigating', 'closed'],
  contained: ['resolved', 'investigating', 'closed'],
  resolved: ['closed', 'investigating'],
  closed: ['investigating'],
};

export const CaseDetailDossier: React.FC<CaseDetailDossierProps> = ({
  caseId,
  onBack,
  onInvestigateIp,
}) => {
  const { operator, hasPermission } = useAuth();
  const { data: incidentCase, isLoading, error } = useCase(caseId);

  const updateCaseMutation = useUpdateCase();
  const completeTaskMutation = useCompleteCaseTask();
  const addNoteMutation = useAddCaseNote();

  const [activeTab, setActiveTab] = useState<'playbook' | 'journal' | 'context'>('playbook');
  const [newNote, setNewNote] = useState<string>('');
  const [pirModalOpen, setPirModalOpen] = useState<boolean>(false);
  const [governorModalOpen, setGovernorModalOpen] = useState<boolean>(false);
  const [activeGovernorAction, setActiveGovernorAction] = useState<IncidentCommandAction>('CONTAINMENT_STAGING_REQUEST');

  // Task note modal or inline input state
  const [selectedTaskForNotes, setSelectedTaskForNotes] = useState<PlaybookTask | null>(null);
  const [taskVerificationNote, setTaskVerificationNote] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading incident dossier {caseId}...</p>
      </div>
    );
  }

  if (error || !incidentCase) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Case Not Found or Error Loading</p>
            <p className="text-xs text-rose-300/80 mt-1">{(error as Error)?.message || 'Failed to fetch case dossier.'}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
        </button>
      </div>
    );
  }

  const handleStatusChange = async (targetStatus: CaseStatus) => {
    try {
      await updateCaseMutation.mutateAsync({
        caseId: incidentCase.case_id,
        payload: { status: targetStatus },
      });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCompleteTask = async (task: PlaybookTask, status: 'completed' | 'skipped' = 'completed') => {
    try {
      await completeTaskMutation.mutateAsync({
        caseId: incidentCase.case_id,
        taskId: task.task_id,
        payload: {
          status,
          notes: taskVerificationNote.trim() || undefined,
        },
      });
      setSelectedTaskForNotes(null);
      setTaskVerificationNote('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        caseId: incidentCase.case_id,
        message: newNote.trim(),
      });
      setNewNote('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const openGovernorExecution = (action: string) => {
    let govAction: IncidentCommandAction = 'CONTAINMENT_STAGING_REQUEST';
    if (action === 'ALERT_ACKNOWLEDGE' || action === 'ALERT_RESOLVE' || action === 'ALERT_ESCALATE' || action === 'NOTIFICATION_DISPATCH' || action === 'NOTIFICATION_SUPPRESS' || action === 'CONTAINMENT_STAGING_REQUEST') {
      govAction = action as IncidentCommandAction;
    }
    setActiveGovernorAction(govAction);
    setGovernorModalOpen(true);
  };

  // Synthesize virtual incident for Governor execution modal
  const virtualIncidentForGovernor: VirtualIncidentItem = {
    incident_id: incidentCase.case_id,
    alert_id: incidentCase.alert_ids[0] || (incidentCase.target_id || 1),
    attack_id: incidentCase.target_id || null,
    source_ip: incidentCase.source_ip || '198.51.100.44',
    attack_type: incidentCase.playbook_template,
    severity: incidentCase.severity,
    status: incidentCase.status === 'resolved' || incidentCase.status === 'closed' ? 'resolved' : 'open',
    risk_score: incidentCase.severity === 'critical' ? 95 : incidentCase.severity === 'high' ? 80 : 50,
    notification_status: 'delivered',
    event_count: incidentCase.alert_ids.length || 1,
    created_at: incidentCase.created_at,
  };

  const nextAllowedStatuses = STATUS_TRANSITIONS[incidentCase.status] || [];
  const progressPct = Math.round((incidentCase.playbook_progress || 0) * 100);

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to case list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold">
                {incidentCase.case_id}
              </span>
              <h1 className="text-base font-bold text-slate-100 truncate max-w-md" title={incidentCase.title}>
                {incidentCase.title}
              </h1>
              <SeverityBadge severity={incidentCase.severity} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Created by <strong className="text-slate-300 font-mono">{incidentCase.created_by}</strong></span>
              <span>•</span>
              <span>Assigned: <strong className="text-slate-300 font-mono">{incidentCase.assigned_to || 'Unassigned'}</strong></span>
              <span>•</span>
              <span>{new Date(incidentCase.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* State Machine Action Controls */}
        <div className="flex items-center gap-2">
          {hasPermission('case:view') && (
            <button
              onClick={() => setPirModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              PIR Report
            </button>
          )}

          {hasPermission('case:update') && nextAllowedStatuses.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 px-2">Transition:</span>
              {nextAllowedStatuses.map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={updateCaseMutation.isPending}
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors"
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advisory Contextualization Summary Card */}
      {incidentCase.advisory_summary && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 tracking-wide">ADVISORY THREAT CONTEXTUALIZATION</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  Deterministic Synthesis Core
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">{incidentCase.advisory_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left side Playbook / Journal, Right side Telemetry Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Playbook & Journal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('playbook')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'playbook'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Playbook Runbook ({incidentCase.tasks.length} tasks)
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'journal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Forensic Journal ({incidentCase.notes.length})
              </button>
            </div>

            {/* Playbook Progress Bar */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">SOP Progress:</span>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="font-mono font-bold text-emerald-400 text-[11px]">{progressPct}%</span>
            </div>
          </div>

          {/* TAB 1: Playbook Runbook */}
          {activeTab === 'playbook' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-mono">TEMPLATE: {incidentCase.playbook_template}</span>
                <span>NIST SP 800-61 / SANS 6-Step Standard</span>
              </div>

              {incidentCase.tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const isSkipped = task.status === 'skipped';
                const isSelected = selectedTaskForNotes?.task_id === task.task_id;

                return (
                  <div
                    key={task.task_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                        : isSkipped
                        ? 'bg-slate-900/20 border-slate-800/40 opacity-70'
                        : 'bg-slate-900 border-slate-700/80 text-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 p-1 rounded-full border ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isSkipped
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-400">
                              Step {task.step_number}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                              {task.phase}
                            </span>
                            <h3 className={`text-xs font-semibold ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                              {task.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-normal">{task.description}</p>
                          {task.notes && (
                            <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 font-mono mt-1">
                              <strong>Verification Note:</strong> {task.notes}
                            </div>
                          )}
                          {task.completed_by && (
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Verified by <span className="text-slate-300">{task.completed_by}</span> at{' '}
                              {task.completed_at ? new Date(task.completed_at).toLocaleString() : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons on task */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.governor_action && !isCompleted && hasPermission('case:respond') && (
                          <button
                            onClick={() => openGovernorExecution(task.governor_action!)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            {task.governor_action.replace(/_/g, ' ')}
                          </button>
                        )}

                        {!isCompleted && hasPermission('case:respond') && (
                          <>
                            {isSelected ? (
                              <button
                                onClick={() => setSelectedTaskForNotes(null)}
                                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:text-white"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedTaskForNotes(task)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Complete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Verification Notes Prompt */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs">
                        <label className="block text-slate-300 font-medium text-[11px]">
                          Verification Notes & Forensic Evidence for Task Completion
                        </label>
                        <textarea
                          rows={2}
                          value={taskVerificationNote}
                          onChange={(e) => setTaskVerificationNote(e.target.value)}
                          placeholder="e.g. Verified IP drop rule engaged; zero connection attempts in last 10 minutes."
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCompleteTask(task, 'skipped')}
                            disabled={completeTaskMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <SkipForward className="w-3 h-3" /> Skip
                          </button>
                          <button
                            onClick={() => handleCompleteTask(task, 'completed')}
                            disabled={completeTaskMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Check className="w-3 h-3" /> Confirm & Mark Completed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Forensic Journal */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              {hasPermission('case:update') && (
                <form onSubmit={handleAddNote} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <label className="block text-xs font-semibold text-slate-200">
                    Add Forensic Journal Note
                  </label>
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log forensic findings, adversary attribution, or tactical changes..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-400">
                      Posting as <strong className="text-slate-300">{operator?.username}</strong> ({operator?.role})
                    </span>
                    <button
                      type="submit"
                      disabled={addNoteMutation.isPending || !newNote.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Add Journal Note
                    </button>
                  </div>
                </form>
              )}

              {/* Notes Timeline */}
              <div className="space-y-3">
                {incidentCase.notes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl">
                    No forensic journal entries recorded yet.
                  </div>
                ) : (
                  incidentCase.notes.map((n) => (
                    <div
                      key={n.note_id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <strong className="text-slate-200 font-mono">{n.operator_id}</strong>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {n.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 span): Linked Telemetry Dossier & Governance */}
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] font-mono border-b border-slate-800 pb-2">
              Incident Metadata
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-slate-400 text-[11px] block">Lifecycle Status:</span>
                <span className="font-mono font-bold text-slate-200 uppercase">{incidentCase.status}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Primary Adversary IP:</span>
                {incidentCase.source_ip ? (
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="font-mono text-indigo-300 font-semibold">{incidentCase.source_ip}</span>
                    {onInvestigateIp && (
                      <button
                        onClick={() => onInvestigateIp(incidentCase.source_ip!)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                      >
                        <Search className="w-3 h-3" /> Investigate
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">None specified</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Target Attack ID:</span>
                <span className="font-mono text-slate-300">{incidentCase.target_id ?? 'None'}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Bound Alerts ({incidentCase.alert_ids.length}):</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {incidentCase.alert_ids.length > 0 ? (
                    incidentCase.alert_ids.map((aid) => (
                      <span
                        key={aid}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-300 text-[11px]"
                      >
                        #{aid}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No direct alert bindings</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Ledger Notice */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold font-mono text-slate-300 uppercase">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Governance & Audit Ledger
            </div>
            <p className="leading-relaxed">
              Every case state transition, task completion, and journal entry is cryptographically bound to your operator session and recorded to the immutable PostgreSQL <code className="text-slate-300">system_events</code> ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Post-Incident Review Modal */}
      <PostIncidentReportModal
        caseId={incidentCase.case_id}
        isOpen={pirModalOpen}
        onClose={() => setPirModalOpen(false)}
      />

      {/* Command Execution Modal for Playbook Level-3 Actions */}
      {governorModalOpen && (
        <CommandExecutionModal
          incident={virtualIncidentForGovernor}
          defaultAction={activeGovernorAction}
          onClose={() => setGovernorModalOpen(false)}
          operatorId={operator?.username}
        />
      )}
    </div>
  );
};
