import React, { useState } from 'react';
import {
  X,
  Target,
  Play,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Archive,
  Clock,
  User,
  Activity,
  Layers,
  MessageSquare,
  AlertTriangle,
  Send,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  useArchiveHunt,
  useExecuteHunt,
  useHuntDossier,
  useUpdateHunt,
} from '../hooks/useThreatHunting';
import { HuntDossier, HuntVerdict } from '../types';
import { useAuth } from '../context/AuthContext';

interface HuntDossierDrawerProps {
  huntId: string | null;
  onClose: () => void;
  onPromoteRule: (hunt: HuntDossier) => void;
  onPromoteCase: (hunt: HuntDossier) => void;
  onInvestigateIp?: (ip: string) => void;
}

export const HuntDossierDrawer: React.FC<HuntDossierDrawerProps> = ({
  huntId,
  onClose,
  onPromoteRule,
  onPromoteCase,
  onInvestigateIp,
}) => {
  const [activeTab, setActiveTab] = useState<'hypothesis' | 'query' | 'evidence' | 'journal' | 'verdict'>('hypothesis');
  const [newNote, setNewNote] = useState('');
  const [verdictInput, setVerdictInput] = useState<HuntVerdict>('malicious_confirmed');
  const [conclusionSummary, setConclusionSummary] = useState('');
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { operator } = useAuth();
  const { data: hunt, isLoading, error } = useHuntDossier(huntId);

  const executeMutation = useExecuteHunt();
  const updateMutation = useUpdateHunt();
  const archiveMutation = useArchiveHunt();

  if (!huntId) return null;

  const handleExecute = async () => {
    setActionError(null);
    try {
      await executeMutation.mutateAsync(huntId);
      setActiveTab('evidence');
    } catch (err: any) {
      setActionError(err.message || 'Execution failed.');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        huntId,
        payload: { note: newNote.trim() },
      });
      setNewNote('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to append note.');
    }
  };

  const handleConcludeVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conclusionSummary.trim().length < 10) {
      setActionError('Conclusion summary must be at least 10 characters.');
      return;
    }
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        huntId,
        payload: {
          verdict: verdictInput,
          conclusion_summary: conclusionSummary.trim(),
        },
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to record verdict.');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to move this hunt to terminal read-only archive?')) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync(huntId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to archive hunt.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'running':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'completed':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'concluded':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'archived':
        return 'bg-slate-900 text-slate-500 border-slate-800';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
              {huntId}
            </span>
            {hunt && (
              <>
                <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${getStatusBadge(hunt.status)}`}>
                  {hunt.status}
                </span>
                <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadge(hunt.severity)}`}>
                  {hunt.severity}
                </span>
              </>
            )}
          </div>
          <h2 className="text-base font-bold text-white truncate">
            {isLoading ? 'Loading Dossier...' : hunt?.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {actionError && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex items-center px-6 border-b border-slate-800 text-xs font-medium space-x-2 bg-slate-950/40">
        <button
          onClick={() => setActiveTab('hypothesis')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'hypothesis'
              ? 'border-sky-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Hypothesis</span>
        </button>
        <button
          onClick={() => setActiveTab('query')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'query'
              ? 'border-sky-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Query & Execution</span>
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'evidence'
              ? 'border-sky-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Evidence ({hunt?.evidence.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'journal'
              ? 'border-sky-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Forensic Journal ({hunt?.forensic_notes.length ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('verdict')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'verdict'
              ? 'border-sky-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Verdict & Signoff</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading hunt dossier from store...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            Failed to load hunt: {(error as any).message}
          </div>
        )}

        {hunt && (
          <>
            {/* TAB: HYPOTHESIS */}
            {activeTab === 'hypothesis' && (
              <div className="space-y-6 text-xs">
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Threat Narrative
                  </h4>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{hunt.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-500">Author</span>
                    <p className="font-medium text-slate-200 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{hunt.created_by}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-500">Created At</span>
                    <p className="font-medium text-slate-200 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(hunt.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-500">Executions</span>
                    <p className="font-medium text-sky-400 font-mono text-sm">{hunt.execution_count}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-500">Verdict</span>
                    <p className="font-medium text-purple-400 capitalize">
                      {hunt.verdict?.replace('_', ' ') || 'Pending'}
                    </p>
                  </div>
                </div>

                {hunt.mitre_tactics.length > 0 && (
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Targeted MITRE ATT&CK Tactics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {hunt.mitre_tactics.map((tac) => (
                        <span
                          key={tac}
                          className="px-2.5 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300 font-medium text-[11px]"
                        >
                          {tac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: QUERY & EXECUTION */}
            {activeTab === 'query' && (
              <div className="space-y-6 text-xs">
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Retrospective Query Specification
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">Max 30 days window / 200 records</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500">Time Range:</span>
                      <p className="text-slate-300">
                        {hunt.query_spec.time_range_start
                          ? `${hunt.query_spec.time_range_start.slice(0, 10)} -> ${hunt.query_spec.time_range_end?.slice(0, 10) || 'now'}`
                          : 'Default 7-day retrospective window'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500">Target IP Subnets:</span>
                      <p className="text-slate-300">
                        {hunt.query_spec.source_ips?.length
                          ? hunt.query_spec.source_ips.join(', ')
                          : 'None (Global Scan)'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500">Payload Substring:</span>
                      <p className="text-slate-300">{hunt.query_spec.payload_substring || 'None'}</p>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500">Regex Pattern (AST Safe):</span>
                      <p className="text-slate-300">{hunt.query_spec.regex_pattern || 'None'}</p>
                    </div>
                  </div>
                </div>

                {/* Execution Button Ribbon */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-sky-950/20 border border-sky-800/40">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sky-200">Execute Retrospective Scan</p>
                    <p className="text-slate-400">
                      Dispatches single-flight query over attacks, alerts, telemetry, and tripwires.
                    </p>
                  </div>
                  <button
                    onClick={handleExecute}
                    disabled={executeMutation.isPending || hunt.status === 'archived'}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center space-x-2 transition-colors"
                  >
                    {executeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning Telemetry...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Run Threat Scan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: EVIDENCE */}
            {activeTab === 'evidence' && (
              <div className="space-y-4 text-xs">
                {hunt.evidence.length === 0 ? (
                  <div className="py-16 text-center bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-400 font-medium">No Evidence Records Collated Yet</p>
                    <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                      Execute the retrospective scan from the Query tab to search historical security telemetry.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-slate-400">
                      <span>Showing {hunt.evidence.length} matched records (capped at 200)</span>
                      <span className="font-mono text-[11px]">Sorted: timestamp DESC</span>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {hunt.evidence.map((ev) => {
                        const isExpanded = expandedEvidenceId === ev.evidence_id;
                        return (
                          <div
                            key={ev.evidence_id}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 font-mono text-[11px]">
                                <span className="text-slate-500">{ev.evidence_id}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 uppercase">
                                  {ev.entity_type}
                                </span>
                                {ev.source_ip && (
                                  <button
                                    onClick={() => onInvestigateIp?.(ev.source_ip!)}
                                    className="text-amber-400 hover:underline flex items-center space-x-0.5"
                                  >
                                    <span>{ev.source_ip}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px]">
                                {new Date(ev.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-slate-200">{ev.summary}</p>

                            {/* Attributes toggle */}
                            {Object.keys(ev.attributes).length > 0 && (
                              <div>
                                <button
                                  onClick={() =>
                                    setExpandedEvidenceId(isExpanded ? null : ev.evidence_id)
                                  }
                                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isExpanded ? 'Hide Sanitized Attributes' : 'Inspect Attributes'}</span>
                                </button>
                                {isExpanded && (
                                  <pre className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                                    {JSON.stringify(ev.attributes, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: FORENSIC JOURNAL */}
            {activeTab === 'journal' && (
              <div className="space-y-4 text-xs">
                {/* Note composer */}
                <form onSubmit={handleAddNote} className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Collaborative Forensic Entry
                  </label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log investigative notes, IOC attributions, or forensic observations..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending || !newNote.trim()}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post Note</span>
                    </button>
                  </div>
                </form>

                {/* Journal entries */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {hunt.forensic_notes.length === 0 ? (
                    <p className="text-slate-500 py-8 text-center">No forensic journal entries recorded yet.</p>
                  ) : (
                    hunt.forensic_notes.map((note) => (
                      <div key={note.note_id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-300">
                            {note.operator_id} ({note.role})
                          </span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{note.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: VERDICT & SIGNOFF */}
            {activeTab === 'verdict' && (
              <div className="space-y-6 text-xs">
                <form onSubmit={handleConcludeVerdict} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Conclude Threat Hunt & Finalize Verdict
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Determination Verdict</label>
                    <select
                      value={verdictInput}
                      onChange={(e) => setVerdictInput(e.target.value as HuntVerdict)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="malicious_confirmed">Malicious Activity Confirmed</option>
                      <option value="benign_activity">Benign Activity / False Positive</option>
                      <option value="inconclusive">Inconclusive / Insufficient Evidence</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Conclusion Summary * (min 10 chars)</label>
                    <textarea
                      value={conclusionSummary}
                      onChange={(e) => setConclusionSummary(e.target.value)}
                      placeholder="Summarize the analytical findings and basis for this determination..."
                      rows={3}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending || conclusionSummary.trim().length < 10}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center space-x-1.5"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Sign Off & Conclude Hunt</span>
                    </button>
                  </div>
                </form>

                {/* Promotions ribbon */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Closed-Loop Platform Promotions
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => onPromoteRule(hunt)}
                      disabled={hunt.status !== 'completed' && hunt.status !== 'concluded'}
                      className="px-3.5 py-2 rounded-lg bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 font-medium text-xs flex items-center space-x-2 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Promote to Detection Rule (M3.3)</span>
                    </button>

                    <button
                      onClick={() => onPromoteCase(hunt)}
                      disabled={
                        (hunt.status !== 'completed' && hunt.status !== 'concluded') ||
                        hunt.verdict !== 'malicious_confirmed'
                      }
                      className="px-3.5 py-2 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 font-medium text-xs flex items-center space-x-2 disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Escalate to Incident Case (M3.6)</span>
                    </button>
                  </div>
                </div>

                {/* Admin Archive */}
                {operator?.role === 'security_administrator' && hunt.status === 'concluded' && (
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-300">Terminal Dossier Archiving</p>
                      <p className="text-slate-500">Move this concluded hunt to read-only archive (hunt:admin required).</p>
                    </div>
                    <button
                      onClick={handleArchive}
                      disabled={archiveMutation.isPending}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center space-x-1.5"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive Hunt</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
