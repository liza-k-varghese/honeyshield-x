import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  RefreshCw,
  Play,
  CheckCircle2,
} from 'lucide-react';
import {
  useCampaigns,
  useCampaignMetrics,
  useTriggerClustering,
} from '../hooks/useCampaigns';
import { CampaignDossier, CampaignStatus, SeverityLevel } from '../types';
import { CampaignDossierDrawer } from './CampaignDossierDrawer';
import { CampaignContainmentModal } from './CampaignContainmentModal';

interface CampaignsViewProps {
  onInvestigateIp?: (ip: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ onInvestigateIp }) => {

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Campaign State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [containmentTarget, setContainmentTarget] = useState<CampaignDossier | null>(null);
  const [clusteringMessage, setClusteringMessage] = useState<string | null>(null);

  const {
    data: campaignsData,
    isLoading,
    isFetching,
    refetch,
  } = useCampaigns({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    limit: 100,
  });

  const { data: metricsData } = useCampaignMetrics();
  const triggerClusteringMutation = useTriggerClustering();

  const handleTriggerClustering = async () => {
    setClusteringMessage(null);
    try {
      const res = await triggerClusteringMutation.mutateAsync({ lookback_hours: 168 });
      setClusteringMessage(
        `Clustering complete: ${res.campaigns_created} created, ${res.campaigns_updated} updated (${res.duration_ms}ms).`
      );
      setTimeout(() => setClusteringMessage(null), 6000);
    } catch (err: any) {
      setClusteringMessage(`Clustering error: ${err.message}`);
      setTimeout(() => setClusteringMessage(null), 8000);
    }
  };

  // Filter campaigns client-side by search query
  const filteredCampaigns = useMemo(() => {
    const list = campaignsData?.items || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.campaign_id.toLowerCase().includes(q) ||
        c.mitre_tactics.some((t) => t.toLowerCase().includes(q)) ||
        (c.source_ips && c.source_ips.some((ip) => ip.toLowerCase().includes(q)))
      );
    });
  }, [campaignsData, searchQuery]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'contained':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/60';
      case 'dormant':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'resolved':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
      case 'archived':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      case 'high':
        return 'bg-orange-950/70 text-orange-300 border-orange-800/60';
      case 'medium':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'low':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Cross-Module Attack Campaign Intelligence Core
            </h2>
            <span className="text-[11px] font-mono uppercase bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
              Module 3.10
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Deterministic multi-vector clustering across attacks, alerts, canary honeytokens, threat intelligence
            IOCs, and incident cases. Explainable DAG correlation graphs and Governor Tier-3 containment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleTriggerClustering}
            disabled={triggerClusteringMutation.isPending}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{triggerClusteringMutation.isPending ? 'Clustering...' : 'Trigger Re-Clustering'}</span>
          </button>
        </div>
      </div>

      {/* Clustering Notification Banner */}
      {clusteringMessage && (
        <div className="bg-sky-950/60 border border-sky-800/80 rounded-lg p-3 text-xs text-sky-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{clusteringMessage}</span>
          </div>
          <button
            onClick={() => setClusteringMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-mono"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-500 text-xs block">Active Campaigns</span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {metricsData?.active_campaigns ?? 0}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-500 text-xs block">Critical Severity</span>
          <span className="text-xl font-bold font-mono text-rose-400">
            {metricsData?.critical_campaigns ?? 0}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-500 text-xs block">High Severity</span>
          <span className="text-xl font-bold font-mono text-orange-400">
            {metricsData?.high_campaigns ?? 0}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-500 text-xs block">Dormant Campaigns</span>
          <span className="text-xl font-bold font-mono text-amber-400">
            {metricsData?.dormant_campaigns ?? 0}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-500 text-xs block">Mean Dwell Time</span>
          <span className="text-xl font-bold font-mono text-sky-400">
            {metricsData?.mean_dwell_time_hours ?? 0}h
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by name, ID, attacker IP, or MITRE tactic..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="contained">Contained</option>
              <option value="dormant">Dormant</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 text-[11px]">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Inventory Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Campaign Name & ID</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Entities in Scope</th>
                <th className="py-3 px-3">MITRE Tactics</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading attack campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching attack campaigns discovered.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => (
                  <tr
                    key={c.campaign_id}
                    onClick={() => setSelectedCampaignId(c.campaign_id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                          {c.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{c.campaign_id}</div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                          c.severity
                        )}`}
                      >
                        {c.severity}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.round(c.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-300">
                          {Math.round(c.confidence * 100)}%
                        </span>
                      </div>
                    </td>

                    {/* Entities in Scope */}
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-300">
                      <span>{(c.source_ips || []).length} IPs &bull; </span>
                      <span>{c.canary_count} Canaries &bull; </span>
                      <span>{c.ioc_count} IOCs</span>
                    </td>

                    {/* MITRE Tactics */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.mitre_tactics.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300"
                          >
                            {t}
                          </span>
                        ))}
                        {c.mitre_tactics.length > 2 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            +{c.mitre_tactics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(c.last_seen).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedCampaignId(c.campaign_id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                        >
                          Dossier
                        </button>
                        <button
                          onClick={() => {
                            // Synthesize a dossier representation for modal target
                            setContainmentTarget({
                              campaign_id: c.campaign_id,
                              name: c.name,
                              status: c.status,
                              severity: c.severity,
                              confidence: c.confidence,
                              first_seen: c.first_seen,
                              last_seen: c.last_seen,
                              source_ips: c.source_ips || [],
                              destination_ips: [],
                              user_agents: [],
                              cves: [],
                              attack_ids: [],
                              alert_ids: [],
                              canary_ids: [],
                              ioc_ids: [],
                              case_ids: [],
                              mitre_tactics: c.mitre_tactics,
                              mitre_techniques: [],
                              tags: [],
                              created_at: c.first_seen,
                              updated_at: c.last_seen,
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
                        >
                          Contain
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Dossier Drawer */}
      <CampaignDossierDrawer
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        onInvestigateIp={onInvestigateIp}
        onStageContainment={(camp) => {
          setSelectedCampaignId(null);
          setContainmentTarget(camp);
        }}
      />

      {/* Governor Containment Modal */}
      <CampaignContainmentModal
        isOpen={!!containmentTarget}
        onClose={() => setContainmentTarget(null)}
        campaign={containmentTarget}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
