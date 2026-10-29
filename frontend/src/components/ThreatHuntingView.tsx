import React, { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { useHuntMetrics, useHunts } from '../hooks/useThreatHunting';
import { HuntDossier, HuntSummary } from '../types';
import { HuntDossierDrawer } from './HuntDossierDrawer';
import { HuntHypothesisModal } from './HuntHypothesisModal';
import { HuntPromotionModal } from './HuntPromotionModal';

interface ThreatHuntingViewProps {
  onInvestigateIp?: (ip: string) => void;
}

export const ThreatHuntingView: React.FC<ThreatHuntingViewProps> = ({
  onInvestigateIp,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHuntId, setSelectedHuntId] = useState<string | null>(null);
  const [isHypothesisModalOpen, setIsHypothesisModalOpen] = useState(false);
  const [promotionTarget, setPromotionTarget] = useState<{
    hunt: HuntDossier;
    type: 'rule' | 'case';
  } | null>(null);

  const { data: metrics, isLoading: isMetricsLoading } = useHuntMetrics();
  const { data: huntData, isLoading: isHuntsLoading, error: huntsError } = useHunts({
    status: statusFilter,
    severity: severityFilter,
  });

  const hunts = huntData?.hunts || [];

  const filteredHunts = hunts.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.hunt_id.toLowerCase().includes(q) ||
      h.title.toLowerCase().includes(q) ||
      h.created_by.toLowerCase().includes(q)
    );
  });

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
    <div className="space-y-6">
      {/* KPI Header Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-sky-400" />
            <span>Total Hunts</span>
          </span>
          <p className="text-2xl font-bold font-mono text-white">
            {isMetricsLoading ? '--' : metrics?.total_hunts ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Active Hunts</span>
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {isMetricsLoading ? '--' : metrics?.active_hunts ?? 0}
            <span className="text-xs text-slate-500 font-normal ml-1">/ 200</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Confirmed Threats</span>
          </span>
          <p className="text-2xl font-bold font-mono text-rose-400">
            {isMetricsLoading ? '--' : metrics?.malicious_confirmed ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Promoted Rules (M3.3)</span>
          </span>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {isMetricsLoading ? '--' : metrics?.promoted_rules_count ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
            <FileCheck className="w-4 h-4 text-purple-400" />
            <span>Incident Cases (M3.6)</span>
          </span>
          <p className="text-2xl font-bold font-mono text-purple-400">
            {isMetricsLoading ? '--' : metrics?.promoted_cases_count ?? 0}
          </p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hypotheses, IDs..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52 font-mono"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="concluded">Concluded</option>
            <option value="archived">Archived</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsHypothesisModalOpen(true)}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Adversary Hypothesis</span>
        </button>
      </div>

      {/* Hunt Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isHuntsLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading threat hunts inventory...</div>
        ) : huntsError ? (
          <div className="py-20 text-center text-xs text-rose-400">
            Failed to load threat hunts: {(huntsError as any).message}
          </div>
        ) : filteredHunts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Target className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No Threat Hunts Discovered</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Initialize a new structured adversary hypothesis to execute retrospective telemetry scans against historical attacks, alerts, and canary hits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Hunt Identifier</th>
                  <th className="px-4 py-3">Hypothesis Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">MITRE Tactics</th>
                  <th className="px-4 py-3 text-right">Evidence</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredHunts.map((hunt: HuntSummary) => (
                  <tr
                    key={hunt.hunt_id}
                    onClick={() => setSelectedHuntId(hunt.hunt_id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 font-mono text-sky-400 font-medium">
                      <div className="flex items-center space-x-1.5">
                        {hunt.is_automated_suggestion && (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{hunt.hunt_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-200 max-w-xs truncate">
                      {hunt.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase border ${getStatusBadge(hunt.status)}`}>
                        {hunt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase border ${getSeverityBadge(hunt.severity)}`}>
                        {hunt.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {hunt.mitre_tactics.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                        {hunt.mitre_tactics.length > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{hunt.mitre_tactics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                      {hunt.evidence_count}
                    </td>
                    <td className="px-4 py-3.5">
                      {hunt.verdict ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono capitalize bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {hunt.verdict.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {hunt.created_by}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHuntId(hunt.hunt_id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white transition-colors text-[11px] font-medium inline-flex items-center space-x-1"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hunt Dossier Drawer */}
      <HuntDossierDrawer
        huntId={selectedHuntId}
        onClose={() => setSelectedHuntId(null)}
        onPromoteRule={(h) => setPromotionTarget({ hunt: h, type: 'rule' })}
        onPromoteCase={(h) => setPromotionTarget({ hunt: h, type: 'case' })}
        onInvestigateIp={onInvestigateIp}
      />

      {/* Hypothesis Creation Modal */}
      <HuntHypothesisModal
        isOpen={isHypothesisModalOpen}
        onClose={() => setIsHypothesisModalOpen(false)}
        onCreated={(h) => setSelectedHuntId(h.hunt_id)}
      />

      {/* Promotion Modal */}
      {promotionTarget && (
        <HuntPromotionModal
          isOpen={!!promotionTarget}
          onClose={() => setPromotionTarget(null)}
          hunt={promotionTarget.hunt}
          promotionType={promotionTarget.type}
        />
      )}
    </div>
  );
};
