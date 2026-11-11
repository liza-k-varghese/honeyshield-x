import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Download,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useThreatIndicators, useThreatCampaigns } from '../hooks/useThreatIntel';
import { useAuth } from '../context/AuthContext';
import { IndicatorMintModal } from './IndicatorMintModal';
import { FeedExportModal } from './FeedExportModal';
import { IndicatorDossierDrawer } from './IndicatorDossierDrawer';
import { IndicatorStatus } from '../types';

interface ThreatIntelViewProps {
  onInvestigateIp?: (ip: string) => void;
  onStageContainment?: (ip: string, alertId?: number) => void;
}

export const ThreatIntelView: React.FC<ThreatIntelViewProps> = ({
  onInvestigateIp: _onInvestigateIp,
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
        return 'bg-[#48C99B]/15 text-[#48C99B] border-[#48C99B]/40';
      case 'decaying':
        return 'bg-[#E5B65A]/15 text-[#E5B65A] border-[#E5B65A]/40';
      case 'retired':
        return 'bg-[#192737] text-[#94A6B8] border-[#1E2D3D]';
      case 'revoked':
        return 'bg-[#EF6268]/15 text-[#EF6268] border-[#EF6268]/40';
      case 'whitelisted':
        return 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40';
      default:
        return 'bg-[#192737] text-[#94A6B8] border-[#1E2D3D]';
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-[#EF6268]/15 text-[#EF6268] border-[#EF6268]/40';
      case 'high':
        return 'bg-[#E5B65A]/15 text-[#E5B65A] border-[#E5B65A]/40';
      case 'medium':
        return 'bg-[#E5B65A]/10 text-[#E5B65A] border-[#E5B65A]/30';
      case 'low':
        return 'bg-[#48C99B]/15 text-[#48C99B] border-[#48C99B]/40';
      default:
        return 'bg-[#192737] text-[#94A6B8] border-[#1E2D3D]';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[#F0F5F8] font-mono tracking-tight">Threat Intelligence & IOC Fusion</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold font-mono bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/35 rounded-full">
              Intelligence Core
            </span>
          </div>
          <p className="text-xs text-[#94A6B8] mt-1">
            Deterministic indicator lifecycle management, mathematical exponential decay, and automated defensive export feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] rounded-lg border border-[#1E2D3D] transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {hasPermission('threat_intel:export') && (
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#192737] hover:bg-[#192737]/80 text-[#F0F5F8] text-xs font-medium font-mono rounded-lg border border-[#1E2D3D] transition-colors shadow-soc-sm"
            >
              <Download className="w-4 h-4 text-[#00D6C9]" />
              <span>Export Feeds</span>
            </button>
          )}

          {hasPermission('threat_intel:create') && (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] text-xs font-semibold font-mono rounded-lg shadow-soc-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mint Indicator</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <span className="text-[11px] text-[#94A6B8] font-mono font-medium">Tracked IOCs</span>
          <div className="text-xl font-bold text-[#F0F5F8] font-mono mt-0.5">{totalCount}</div>
          <span className="text-[10px] text-[#94A6B8]/60 font-mono">Global catalog</span>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <span className="text-[11px] text-[#48C99B] font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#48C99B]"></span> Active
          </span>
          <div className="text-xl font-bold text-[#48C99B] font-mono mt-0.5">{activeCount}</div>
          <span className="text-[10px] text-[#94A6B8]/60 font-mono">Conf &ge; 65%</span>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <span className="text-[11px] text-[#E5B65A] font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B65A]"></span> Decaying
          </span>
          <div className="text-xl font-bold text-[#E5B65A] font-mono mt-0.5">{decayingCount}</div>
          <span className="text-[10px] text-[#94A6B8]/60 font-mono">15% &le; Conf &lt; 65%</span>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <span className="text-[11px] text-[#94A6B8] font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#94A6B8]"></span> Retired
          </span>
          <div className="text-xl font-bold text-[#94A6B8] font-mono mt-0.5">{retiredCount}</div>
          <span className="text-[10px] text-[#94A6B8]/60 font-mono">Conf &lt; 15%</span>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <span className="text-[11px] text-[#EF6268] font-mono font-medium flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#EF6268]" /> Campaigns
          </span>
          <div className="text-xl font-bold text-[#EF6268] font-mono mt-0.5">{campaigns.length}</div>
          <span className="text-[10px] text-[#94A6B8]/60 font-mono">Attributed clusters</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#111C29] border border-[#1E2D3D] rounded-xl flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#94A6B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search observable value, campaign, or description..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#080D14] border border-[#1E2D3D] rounded-lg text-xs text-[#F0F5F8] placeholder-[#94A6B8] focus:outline-none focus:border-[#00D6C9] font-mono"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-[#94A6B8] font-mono">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-[#080D14] border border-[#1E2D3D] rounded-md text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9]"
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
        <div className="flex items-center gap-1.5 text-xs text-[#94A6B8] font-mono">
          <span>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1 bg-[#080D14] border border-[#1E2D3D] rounded-md text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9]"
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
        <div className="flex items-center gap-1.5 text-xs text-[#94A6B8] font-mono">
          <span>Severity:</span>
          <select
            value={threatLevelFilter}
            onChange={(e) => setThreatLevelFilter(e.target.value)}
            className="px-2 py-1 bg-[#080D14] border border-[#1E2D3D] rounded-md text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9]"
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
          <div className="flex items-center gap-1.5 text-xs text-[#94A6B8] font-mono">
            <span>Campaign:</span>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-2 py-1 bg-[#080D14] border border-[#1E2D3D] rounded-md text-[#F0F5F8] text-xs focus:outline-none focus:border-[#00D6C9] max-w-[150px]"
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
      <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-soc-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E2D3D] bg-[#080D14]/80 text-[11px] font-semibold text-[#94A6B8] uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Observable</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decayed Confidence</th>
                <th className="py-3 px-4">Hits</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D3D]/60 text-xs">
              {isIndicatorsLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#94A6B8]">
                    Loading threat intelligence inventory...
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#94A6B8]">
                    No threat indicators match the current filters.
                  </td>
                </tr>
              ) : (
                indicators.map((ind) => (
                  <tr
                    key={ind.id}
                    onClick={() => setSelectedIndicatorId(ind.id)}
                    className="hover:bg-[#192737]/50 cursor-pointer transition-colors"
                  >
                    {/* Observable Value */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#F0F5F8] font-medium">
                        {ind.indicator_value}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-[#94A6B8] uppercase">
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
                        <span className="font-mono text-[#F0F5F8] w-10 text-right">
                          {Math.round(ind.decayed_confidence * 100)}%
                        </span>
                        <div className="w-16 bg-[#192737] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ind.decayed_confidence >= 0.65
                                ? 'bg-[#EF6268]'
                                : ind.decayed_confidence >= 0.15
                                ? 'bg-[#E5B65A]'
                                : 'bg-[#94A6B8]'
                            }`}
                            style={{ width: `${Math.round(ind.decayed_confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Hits */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#F0F5F8] font-semibold">{ind.hit_count}</span>
                    </td>

                    {/* Campaign */}
                    <td className="py-3 px-4">
                      {ind.campaign ? (
                        <span className="text-[#00D6C9] font-medium text-[11px] truncate max-w-[120px] block font-mono">
                          {ind.campaign}
                        </span>
                      ) : (
                        <span className="text-[#94A6B8]/50 font-mono">—</span>
                      )}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3 px-4 text-[#94A6B8] text-[11px] font-mono">
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
                        className="p-1 text-[#94A6B8] hover:text-[#00D6C9] hover:bg-[#192737] rounded transition-colors"
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
