import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import { useCases } from '../hooks/useIncidentCases';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from './Badge';
import { CasePromotionModal } from './CasePromotionModal';
import { CaseDetailDossier } from './CaseDetailDossier';

interface CaseManagementViewProps {
  onInvestigateIp?: (ip: string) => void;
}

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  onInvestigateIp,
}) => {
  const { hasPermission } = useAuth();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [promotionModalOpen, setPromotionModalOpen] = useState<boolean>(false);

  const {
    data: casesResponse,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useCases({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
  });

  const cases = casesResponse?.cases || [];

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.source_ip && c.source_ip.toLowerCase().includes(q)) ||
      (c.assigned_to && c.assigned_to.toLowerCase().includes(q)) ||
      c.playbook_template.toLowerCase().includes(q)
    );
  });

  // Calculate high-level metrics
  const activeCount = cases.filter((c) => c.status === 'investigating' || c.status === 'new').length;
  const containmentCount = cases.filter((c) => c.status === 'containment_in_progress' || c.status === 'contained').length;
  const closedCount = cases.filter((c) => c.status === 'closed' || c.status === 'resolved').length;

  if (selectedCaseId) {
    return (
      <CaseDetailDossier
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
        onInvestigateIp={onInvestigateIp}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9]">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F0F5F8] font-mono tracking-tight">
              SOC Incident Case Management & Playbooks
            </h1>
            <p className="text-xs text-[#94A6B8]">
              Interactive SANS/NIST response playbooks, deterministic state machine, and Level-3 Governor execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#192737] hover:bg-[#192737]/80 border border-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8] text-xs font-mono font-medium transition-colors"
            title="Refresh cases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {hasPermission('case:create') && (
            <button
              onClick={() => setPromotionModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] text-xs font-semibold font-mono shadow-soc-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Incident Case
            </button>
          )}
        </div>
      </div>

      {/* Metric KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
          <span className="text-[11px] font-mono text-[#94A6B8] block mb-1">TOTAL CASES</span>
          <span className="text-xl font-bold font-mono text-[#F0F5F8]">{cases.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
          <span className="text-[11px] font-mono text-[#E5B65A] block mb-1">TRIAGE / INVESTIGATING</span>
          <span className="text-xl font-bold font-mono text-[#E5B65A]">{activeCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
          <span className="text-[11px] font-mono text-[#00D6C9] block mb-1">CONTAINMENT</span>
          <span className="text-xl font-bold font-mono text-[#00D6C9]">{containmentCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
          <span className="text-[11px] font-mono text-[#48C99B] block mb-1">RESOLVED / CLOSED</span>
          <span className="text-xl font-bold font-mono text-[#48C99B]">{closedCount}</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#111C29] border border-[#1E2D3D]">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A6B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case ID, title, IP, handler..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] text-[#F0F5F8] placeholder-[#94A6B8] text-xs focus:outline-none focus:border-[#00D6C9] font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9] font-mono"
          >
            <option value="all">Status: ALL</option>
            <option value="new">new</option>
            <option value="investigating">investigating</option>
            <option value="containment_in_progress">containment_in_progress</option>
            <option value="contained">contained</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9] font-mono"
          >
            <option value="all">Severity: ALL</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="border border-[#1E2D3D] rounded-xl overflow-hidden bg-[#111C29] shadow-soc-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-[#00D6C9] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#94A6B8]">Loading incident cases...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#EF6268] text-xs">
            Failed to load incident cases: {(error as Error).message}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-[#94A6B8]/50 mx-auto" />
            <p className="text-sm font-medium text-[#F0F5F8]">No incident cases found</p>
            <p className="text-xs text-[#94A6B8] max-w-sm mx-auto">
              Promote high-priority alerts from the Alert Catalog or create a new incident case to activate a response playbook.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1E2D3D] bg-[#080D14]/80 text-[#94A6B8] font-mono text-[11px] uppercase">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Title & Scope</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Playbook SOP</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Handler</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D3D]/60">
                {filteredCases.map((c) => {
                  const pct = Math.round((c.playbook_progress || 0) * 100);
                  return (
                    <tr
                      key={c.case_id}
                      onClick={() => setSelectedCaseId(c.case_id)}
                      className="hover:bg-[#192737]/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#00D6C9] whitespace-nowrap">
                        {c.case_id}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-[#F0F5F8] truncate" title={c.title}>
                          {c.title}
                        </div>
                        {c.source_ip && (
                          <div className="text-[11px] font-mono text-[#94A6B8] mt-0.5">
                            Adversary: {c.source_ip}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#192737] border border-[#1E2D3D] text-[#94A6B8] font-mono text-[11px]">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#F0F5F8] text-[11px] whitespace-nowrap">
                        {c.playbook_template}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#192737] overflow-hidden">
                            <div
                              className="h-full bg-[#48C99B] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#48C99B]">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#F0F5F8] whitespace-nowrap">
                        {c.assigned_to || <span className="text-[#94A6B8]/50 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#94A6B8] text-[11px] whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.case_id);
                          }}
                          className="flex items-center gap-1 ml-auto px-2.5 py-1 rounded bg-[#192737] border border-[#1E2D3D] hover:bg-[#00D6C9] hover:text-[#080D14] hover:border-transparent text-[#94A6B8] font-medium text-[11px] transition-colors"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion Modal */}
      <CasePromotionModal
        isOpen={promotionModalOpen}
        onClose={() => setPromotionModalOpen(false)}
        onCaseCreated={(cid) => setSelectedCaseId(cid)}
      />
    </div>
  );
};
