import React, { useState } from 'react';
import {
  ShieldAlert,
  Shield,
  Plus,
  RefreshCw,
  Search,
  Download,
  Flame,
  Globe,
  Hash,
  Cpu,
  Radio,
  FileCode,
  Tag,
  Clock,
  Activity,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useThreatIndicators, useThreatCampaigns } from '../hooks/useThreatIntel';
import { useAuth } from '../context/AuthContext';
import { IndicatorMintModal } from './IndicatorMintModal';
import { FeedExportModal } from './FeedExportModal';
import { IndicatorDossierDrawer } from './IndicatorDossierDrawer';
import { ThreatIndicator, IndicatorType, IndicatorStatus } from '../types';

interface ThreatIntelViewProps {
  onInvestigateIp?: (ip: string) => void;
  onStageContainment?: (ip: string, alertId?: number) => void;
}

export const ThreatIntelView: React.FC<ThreatIntelViewProps> = ({
  onInvestigateIp,
  onStageContainment,
}) => {
  const { hasPermission } = useAuth();

  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [threatLevelFilter, setThreatLevelFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mintModalOpen, setMintModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  const {
    data: indicatorsResponse,
    isLoading: isIndicatorsLoading,
    isFetching,
    refetch,
  } = useThreatIndicators({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    threat_level: threatLevelFilter !== 'all' ? threatLevelFilter : undefined,
    campaign: campaignFilter !== 'all' ? campaignFilter : undefined,
    search: searchQuery.trim() || undefined,
    limit: 100,
  });

  const { data: campaignsResponse } = useThreatCampaigns();

  const indicators = indicatorsResponse?.indicators || [];
  const campaigns = campaignsResponse?.campaigns || [];

  // KPI Calculations
  const totalCount = indicatorsResponse?.total ?? indicators.length;
  const activeCount = indicators.filter((i) => i.status === 'active').length;
  const decayingCount = indicators.filter((i) => i.status === 'decaying').length;
  const retiredCount = indicators.filter((i) => i.status === 'retired').length;

  const getStatusColor = (status: IndicatorStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'decaying':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'retired':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'revoked':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'whitelisted':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Threat Intelligence & IOC Fusion</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
              Intelligence Core
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic indicator lifecycle management, mathematical exponential decay, and automated defensive export feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {hasPermission('threat_intel:export') && (
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Feeds</span>
            </button>
          )}

          {hasPermission('threat_intel:create') && (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mint Indicator</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Tracked IOCs</span>
          <div className="text-xl font-bold text-slate-100 font-mono mt-0.5">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Global catalog</span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{activeCount}</div>
          <span className="text-[10px] text-slate-500">Conf &ge; 65%</span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Decaying
          </span>
          <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{decayingCount}</div>
          <span className="text-[10px] text-slate-500">15% &le; Conf &lt; 65%</span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Retired
          </span>
          <div className="text-xl font-bold text-slate-400 font-mono mt-0.5">{retiredCount}</div>
          <span className="text-[10px] text-slate-500">Conf &lt; 15%</span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> Campaigns
          </span>
          <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">{campaigns.length}</div>
          <span className="text-[10px] text-slate-500">Attributed clusters</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search observable value, campaign, or description..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-200 text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="decaying">Decaying</option>
            <option value="retired">Retired</option>
            <option value="revoked">Revoked</option>
            <option value="whitelisted">Whitelisted</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-200 text-xs focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="ip">IPv4 / IPv6</option>
            <option value="cidr">CIDR Subnet</option>
            <option value="domain">Domain</option>
            <option value="hash">File Hash</option>
            <option value="user_agent">User Agent</option>
            <option value="canary_token">Canary Token</option>
          </select>
        </div>

        {/* Threat Level Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Severity:</span>
          <select
            value={threatLevelFilter}
            onChange={(e) => setThreatLevelFilter(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-200 text-xs focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Campaign Filter */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Campaign:</span>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-200 text-xs focus:outline-none max-w-[150px]"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.campaign_id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Indicators Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Observable</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decayed Confidence</th>
                <th className="py-3 px-4">Hits</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Last Encounter</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isIndicatorsLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Loading threat intelligence inventory...
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No threat indicators match the current filters.
                  </td>
                </tr>
              ) : (
                indicators.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => setSelectedIndicatorId(ind.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Observable Value */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-200 font-medium">
                        {ind.indicator_value}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-slate-400 uppercase">
                        {ind.indicator_type}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getSeverityBadge(
                          ind.threat_level
                        )}`}
                      >
                        {ind.threat_level}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getStatusColor(
                          ind.status
                        )}`}
                      >
                        {ind.status}
                      </span>
                    </td>

                    {/* Decayed Confidence Meter */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200 w-10 text-right">
                          {Math.round(ind.decayed_confidence * 100)}%
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ind.decayed_confidence >= 0.65
                                ? 'bg-rose-500'
                                : ind.decayed_confidence >= 0.15
                                ? 'bg-amber-500'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${Math.round(ind.decayed_confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Hits */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300 font-semibold">{ind.hit_count}</span>
                    </td>

                    {/* Campaign */}
                    <td className="py-3 px-4">
                      {ind.campaign ? (
                        <span className="text-rose-400 font-medium text-[11px] truncate max-w-[120px] block">
                          {ind.campaign}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(ind.last_seen).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndicatorId(ind.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="View Dossier"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <IndicatorMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        onIndicatorCreated={(ind) => setSelectedIndicatorId(ind.id)}
      />

      <FeedExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      {selectedIndicatorId && (
        <IndicatorDossierDrawer
          indicatorId={selectedIndicatorId}
          onClose={() => setSelectedIndicatorId(null)}
          onStageContainment={onStageContainment}
        />
      )}
    </div>
  );
};
