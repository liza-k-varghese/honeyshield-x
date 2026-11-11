import React, { useState } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  Key,
  Database,
  FileCode,
  Globe,
  FileText,
  ArrowRight,
  Radio,
  Flame,
} from 'lucide-react';
import { useCanaries } from '../hooks/useDeception';
import { useAuth } from '../context/AuthContext';
import { CanaryMintModal } from './CanaryMintModal';
import { CanaryDetailDossier } from './CanaryDetailDossier';
import { CanaryType } from '../types';

interface DeceptionGridViewProps {
  onInvestigateIp?: (ip: string) => void;
  onStageContainment?: (ip: string, alertId?: number) => void;
}

export const DeceptionGridView: React.FC<DeceptionGridViewProps> = ({
  onInvestigateIp,
  onStageContainment,
}) => {
  const { hasPermission } = useAuth();

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mintModalOpen, setMintModalOpen] = useState<boolean>(false);

  const {
    data: canariesResponse,
    isLoading,
    isFetching,
    refetch,
  } = useCanaries(
    statusFilter !== 'all' ? statusFilter : undefined,
    typeFilter !== 'all' ? typeFilter : undefined
  );

  const canaries = canariesResponse?.canaries || [];

  const filteredCanaries = canaries.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.token_id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.canary_type.toLowerCase().includes(q) ||
      (c.placement_hint && c.placement_hint.toLowerCase().includes(q)) ||
      c.environment.toLowerCase().includes(q)
    );
  });

  // Calculate metrics
  const totalTokens = canaries.length;
  const activeTokens = canaries.filter((c) => c.status === 'active').length;
  const trippedTokens = canaries.filter((c) => c.hit_count > 0).length;
  const totalHits = canaries.reduce((sum, c) => sum + c.hit_count, 0);

  const getTypeIcon = (type: CanaryType) => {
    switch (type) {
      case 'AWS_API_KEY':
        return <Key className="w-3.5 h-3.5 text-amber-400" />;
      case 'DATABASE_CREDENTIAL':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SERVICE_API_TOKEN':
        return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
      case 'WEB_TRIPWIRE_ENDPOINT':
        return <Globe className="w-3.5 h-3.5 text-indigo-400" />;
      case 'CANARY_FILE_BEACON':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (selectedTokenId) {
    return (
      <CanaryDetailDossier
        tokenId={selectedTokenId}
        onBack={() => setSelectedTokenId(null)}
        onInvestigateIp={onInvestigateIp}
        onStageContainment={onStageContainment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9]">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F0F5F8] font-mono tracking-tight">
              Active Deception Grid & Canary Honeytoken Orchestrator
            </h1>
            <p className="text-xs text-[#94A6B8]">
              High-confidence tripwires, inert decoy credentials, and hardened adversary encounter listeners
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#192737] hover:bg-[#192737]/80 border border-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8] text-xs font-mono font-medium transition-colors"
            title="Refresh honeytokens"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {hasPermission('deception:create') && (
            <button
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] text-xs font-semibold font-mono shadow-soc-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mint Canary Token</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm space-y-1">
          <div className="text-[11px] font-medium font-mono text-[#94A6B8] uppercase tracking-wider">
            Total Deception Assets
          </div>
          <div className="text-2xl font-bold font-mono text-[#F0F5F8]">{totalTokens}</div>
          <div className="text-[11px] font-mono text-[#94A6B8]/60">Decoys registered across all tiers</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm space-y-1">
          <div className="text-[11px] font-medium font-mono text-[#48C99B] uppercase tracking-wider">
            Active Tripwires
          </div>
          <div className="text-2xl font-bold font-mono text-[#48C99B]">{activeTokens}</div>
          <div className="text-[11px] font-mono text-[#48C99B]/70">Armed & listening for breaches</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm space-y-1">
          <div className="text-[11px] font-medium font-mono text-[#EF6268] uppercase tracking-wider">
            Tripped Honeytokens
          </div>
          <div className={`text-2xl font-bold font-mono ${trippedTokens > 0 ? 'text-[#EF6268] animate-pulse' : 'text-[#94A6B8]'}`}>
            {trippedTokens}
          </div>
          <div className="text-[11px] font-mono text-[#94A6B8]/60">Tokens touched by adversaries</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm space-y-1">
          <div className="text-[11px] font-medium font-mono text-[#E5B65A] uppercase tracking-wider">
            Adversary Encounters
          </div>
          <div className={`text-2xl font-bold font-mono ${totalHits > 0 ? 'text-[#E5B65A]' : 'text-[#94A6B8]'}`}>
            {totalHits}
          </div>
          <div className="text-[11px] font-mono text-[#94A6B8]/60">Total trap hits recorded</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111C29] border border-[#1E2D3D] text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#94A6B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search honeytokens by name, placement, or ID..."
              className="w-full bg-[#080D14] border border-[#1E2D3D] rounded-lg pl-9 pr-3 py-1.5 text-[#F0F5F8] placeholder-[#94A6B8] outline-none focus:border-[#00D6C9] font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080D14] border border-[#1E2D3D] rounded-lg px-2.5 py-1.5 text-[#F0F5F8] outline-none focus:border-[#00D6C9] text-xs font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#080D14] border border-[#1E2D3D] rounded-lg px-2.5 py-1.5 text-[#F0F5F8] outline-none focus:border-[#00D6C9] text-xs font-mono"
          >
            <option value="all">All Asset Types</option>
            <option value="AWS_API_KEY">AWS IAM Decoys</option>
            <option value="DATABASE_CREDENTIAL">Database Decoys</option>
            <option value="SERVICE_API_TOKEN">Service API Decoys</option>
            <option value="WEB_TRIPWIRE_ENDPOINT">Web Endpoints</option>
            <option value="CANARY_FILE_BEACON">File Beacons</option>
          </select>
        </div>
      </div>

      {/* Main Canaries Grid / Table */}
      <div className="rounded-xl border border-[#1E2D3D] bg-[#111C29] overflow-hidden shadow-soc-sm">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="animate-spin w-6 h-6 border-2 border-[#00D6C9] border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-[#94A6B8]">Loading deception grid assets...</p>
          </div>
        ) : filteredCanaries.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Shield className="w-10 h-10 text-[#94A6B8]/50 mx-auto" />
            <h3 className="text-sm font-semibold text-[#F0F5F8]">No Canary Honeytokens Found</h3>
            <p className="text-xs text-[#94A6B8] max-w-sm mx-auto">
              No honeytokens match the current filters. Mint a new canary token to deploy active intrusion tripwires.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080D14]/80 text-[#94A6B8] uppercase font-mono text-[10px] border-b border-[#1E2D3D]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Token & Name</th>
                  <th className="py-3 px-4">Asset Type</th>
                  <th className="py-3 px-4">Environment</th>
                  <th className="py-3 px-4">Placement Location</th>
                  <th className="py-3 px-4">Breaches</th>
                  <th className="py-3 px-4">Last Tripped</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D3D]/60">
                {filteredCanaries.map((canary) => {
                  const isTripped = canary.hit_count > 0;
                  const isRevoked = canary.status === 'revoked';

                  return (
                    <tr
                      key={canary.token_id}
                      onClick={() => setSelectedTokenId(canary.token_id)}
                      className="hover:bg-[#192737]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isRevoked
                              ? 'bg-[#192737] text-[#94A6B8] border-[#1E2D3D]'
                              : isTripped
                              ? 'bg-[#EF6268]/15 text-[#EF6268] border-[#EF6268]/40 animate-pulse'
                              : 'bg-[#48C99B]/15 text-[#48C99B] border-[#48C99B]/40'
                          }`}
                        >
                          {isRevoked ? 'REVOKED' : isTripped ? 'TRIPPED' : 'ARMED'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#F0F5F8]">{canary.name}</div>
                        <div className="font-mono text-[11px] text-[#94A6B8]">{canary.token_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#F0F5F8]">
                          {getTypeIcon(canary.canary_type)}
                          <span>{canary.canary_type}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 capitalize text-[#F0F5F8] font-medium">
                        {canary.environment}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#94A6B8] max-w-[200px] truncate" title={canary.placement_hint || ''}>
                        {canary.placement_hint || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-mono font-bold">
                          {isTripped && <Flame className="w-3.5 h-3.5 text-[#EF6268] shrink-0" />}
                          <span className={isTripped ? 'text-[#EF6268]' : 'text-[#94A6B8]'}>
                            {canary.hit_count}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#94A6B8] whitespace-nowrap">
                        {canary.last_tripped_at
                          ? new Date(canary.last_tripped_at).toLocaleDateString()
                          : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[#00D6C9] hover:text-[#00D6C9]/80 font-medium text-xs font-mono">
                          <span>Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mint Modal */}
      <CanaryMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        onCanaryMinted={() => refetch()}
      />
    </div>
  );
};
