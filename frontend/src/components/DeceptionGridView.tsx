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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              Active Deception Grid & Canary Honeytoken Orchestrator
            </h1>
            <p className="text-xs text-slate-400">
              High-confidence tripwires, inert decoy credentials, and hardened adversary encounter listeners
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Refresh honeytokens"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {hasPermission('deception:create') && (
            <button
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mint Canary Token</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total Deception Assets
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalTokens}</div>
          <div className="text-[11px] text-slate-500">Decoys registered across all tiers</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Active Tripwires
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{activeTokens}</div>
          <div className="text-[11px] text-emerald-500/70">Armed & listening for breaches</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Tripped Honeytokens
          </div>
          <div className={`text-2xl font-bold font-mono ${trippedTokens > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
            {trippedTokens}
          </div>
          <div className="text-[11px] text-slate-500">Tokens touched by adversaries</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Adversary Encounters
          </div>
          <div className={`text-2xl font-bold font-mono ${totalHits > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {totalHits}
          </div>
          <div className="text-[11px] text-slate-500">Total trap hits recorded</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search honeytokens by name, placement, or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none focus:border-emerald-500 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none focus:border-emerald-500 text-xs"
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
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-slate-400">Loading deception grid assets...</p>
          </div>
        ) : filteredCanaries.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Shield className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Canary Honeytokens Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No honeytokens match the current filters. Mint a new canary token to deploy active intrusion tripwires.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
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
              <tbody className="divide-y divide-slate-800">
                {filteredCanaries.map((canary) => {
                  const isTripped = canary.hit_count > 0;
                  const isRevoked = canary.status === 'revoked';

                  return (
                    <tr
                      key={canary.token_id}
                      onClick={() => setSelectedTokenId(canary.token_id)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isRevoked
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : isTripped
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                          }`}
                        >
                          {isRevoked ? 'REVOKED' : isTripped ? 'TRIPPED' : 'ARMED'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{canary.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{canary.token_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          {getTypeIcon(canary.canary_type)}
                          <span>{canary.canary_type}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 capitalize text-slate-300 font-medium">
                        {canary.environment}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 max-w-[200px] truncate" title={canary.placement_hint || ''}>
                        {canary.placement_hint || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-mono font-bold">
                          {isTripped && <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          <span className={isTripped ? 'text-rose-400' : 'text-slate-400'}>
                            {canary.hit_count}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {canary.last_tripped_at
                          ? new Date(canary.last_tripped_at).toLocaleDateString()
                          : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-xs">
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
