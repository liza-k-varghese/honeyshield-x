import React from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  Clock,
  Shield,
  Printer,
  AlertTriangle,
  User,
  ArrowRight,
} from 'lucide-react';
import { useCaseReport } from '../hooks/useIncidentCases';
import { SeverityBadge } from './Badge';

interface PostIncidentReportModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PostIncidentReportModal: React.FC<PostIncidentReportModalProps> = ({
  caseId,
  isOpen,
  onClose,
}) => {
  const { data: report, isLoading, error } = useCaseReport(caseId, isOpen);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Post-Incident Review (PIR) Report</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {caseId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic executive incident closure and governance audit dossier
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Export
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Synthesizing deterministic PIR report...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Failed to generate PIR Report</p>
                <p className="text-xs text-rose-300/80 mt-1">{(error as Error).message}</p>
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Meta Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-950/40 border border-slate-800">
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">INCIDENT TITLE</span>
                  <span className="font-medium text-slate-100 block truncate" title={report.title}>
                    {report.title}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">SEVERITY / STATUS</span>
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={report.severity} />
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {report.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">SIGNOFF OPERATOR</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-200">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{report.signoff_operator}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">PLAYBOOK ADHERENCE</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{report.playbook_adherence}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Executive Summary
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 text-slate-200 leading-relaxed font-sans text-sm">
                  {report.executive_summary}
                </div>
              </div>

              {/* Section 2: Root Cause Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Root Cause Analysis
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 text-slate-200 leading-relaxed font-sans text-sm">
                  {report.root_cause_analysis}
                </div>
              </div>

              {/* Section 3: Remediation & Defensive Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  Executed Remediation & Containment Actions
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 space-y-2">
                  {report.remediation_actions && report.remediation_actions.length > 0 ? (
                    report.remediation_actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No formal remediation actions recorded.</p>
                  )}
                </div>
              </div>

              {/* Section 4: Incident Timeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Chronological Incident Timeline & Audit Milestones
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 bg-slate-950/30">
                  {report.incident_timeline && report.incident_timeline.length > 0 ? (
                    report.incident_timeline.map((evt, idx) => (
                      <div key={idx} className="p-3 text-xs flex items-center justify-between gap-4 hover:bg-slate-800/30">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {evt.phase}
                          </span>
                          <span className="text-slate-200">{evt.event}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-slate-400">by {evt.actor}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No chronological milestones recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Audit Notice */}
              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Deterministic PIR generated at {new Date(report.generated_at).toUTCString()}</span>
                <span>HoneyShield-X Clean-Room Defense Core</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
