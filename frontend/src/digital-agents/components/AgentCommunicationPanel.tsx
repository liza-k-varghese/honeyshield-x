import React, { useState } from 'react';
import { AgentHandoffRecord, AgentId } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { ArrowRight, CheckCircle2, Clock, MessageSquare, Filter } from 'lucide-react';

interface AgentCommunicationPanelProps {
  handoffs: AgentHandoffRecord[];
  onSelectHandoff?: (handoff: AgentHandoffRecord) => void;
}

export type HandoffPathFilter = 'all' | 'scout_nexus' | 'nexus_oracle' | 'oracle_sentinel' | 'nexus_sentinel';

export const AgentCommunicationPanel: React.FC<AgentCommunicationPanelProps> = ({
  handoffs,
  onSelectHandoff,
}) => {
  const [pathFilter, setPathFilter] = useState<HandoffPathFilter>('all');
  const [filterAgent, setFilterAgent] = useState<AgentId | 'all'>('all');

  const filteredHandoffs = handoffs.filter((h) => {
    // 1. Path filter
    if (pathFilter === 'scout_nexus') {
      const match = (h.fromAgent === 'scout' && h.toAgent === 'nexus') || (h.fromAgent === 'nexus' && h.toAgent === 'scout');
      if (!match) return false;
    } else if (pathFilter === 'nexus_oracle') {
      const match = (h.fromAgent === 'nexus' && h.toAgent === 'oracle') || (h.fromAgent === 'oracle' && h.toAgent === 'nexus');
      if (!match) return false;
    } else if (pathFilter === 'oracle_sentinel') {
      const match = (h.fromAgent === 'oracle' && h.toAgent === 'sentinel') || (h.fromAgent === 'sentinel' && h.toAgent === 'oracle');
      if (!match) return false;
    } else if (pathFilter === 'nexus_sentinel') {
      const match = (h.fromAgent === 'nexus' && h.toAgent === 'sentinel') || (h.fromAgent === 'sentinel' && h.toAgent === 'nexus');
      if (!match) return false;
    }

    // 2. Individual agent filter
    if (filterAgent !== 'all') {
      return h.fromAgent === filterAgent || h.toAgent === filterAgent;
    }

    return true;
  });

  return (
    <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 font-mono text-slate-100">
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
              <span>AGENT-TO-AGENT INTER-PROCESS COMMUNICATION</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                VERIFIED HANDOFFS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Verified Task Handoffs, Telemetry Delivery & Escalation Exchanges (Zero Fake Chatter)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[10px] uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => {
              setPathFilter('all');
              setFilterAgent('all');
            }}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              pathFilter === 'all' && filterAgent === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {(['scout', 'nexus', 'oracle', 'sentinel'] as AgentId[]).map((agentId) => {
            const p = AGENT_PROFILES[agentId];
            return (
              <button
                key={agentId}
                onClick={() => {
                  setPathFilter('all');
                  setFilterAgent(agentId);
                }}
                className={`px-2 py-0.5 rounded text-[11px] uppercase transition-colors ${
                  filterAgent === agentId
                    ? 'font-bold text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: filterAgent === agentId ? `${p.color}40` : undefined,
                  border: filterAgent === agentId ? `1px solid ${p.color}` : undefined,
                }}
              >
                {p.name}
              </button>
            );
          })}

          <div className="w-[1px] h-3.5 bg-slate-700 mx-1 hidden sm:block" />

          {/* Path Dropdown */}
          <select
            aria-label="Filter by verified path"
            value={pathFilter}
            onChange={(e) => {
              setFilterAgent('all');
              setPathFilter(e.target.value as HandoffPathFilter);
            }}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Handoff Paths</option>
            <option value="scout_nexus">Path: SCOUT ↔ NEXUS</option>
            <option value="nexus_oracle">Path: NEXUS ↔ ORACLE</option>
            <option value="oracle_sentinel">Path: ORACLE ↔ SENTINEL</option>
            <option value="nexus_sentinel">Path: NEXUS ↔ SENTINEL</option>
          </select>
        </div>
      </div>

      {/* Handoff Stream Feed */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredHandoffs.length > 0 ? (
          filteredHandoffs.map((h) => {
            const fromProfile = AGENT_PROFILES[h.fromAgent];
            const toProfile = AGENT_PROFILES[h.toAgent];

            return (
              <div
                key={h.id}
                onClick={() => onSelectHandoff?.(h)}
                className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all text-xs space-y-2 cursor-pointer shadow-sm"
              >
                {/* Agent Exchange Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* From Agent */}
                    <span
                      className="font-bold flex items-center gap-1.5"
                      style={{ color: fromProfile.color }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: fromProfile.color }}
                      />
                      {fromProfile.name}
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                    {/* To Agent */}
                    <span
                      className="font-bold flex items-center gap-1.5"
                      style={{ color: toProfile.color }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: toProfile.color }}
                      />
                      {toProfile.name}
                    </span>

                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                      {h.taskType}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {h.status === 'confirmed' ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-bold uppercase">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      {h.timestamp.includes('T') ? new Date(h.timestamp).toLocaleTimeString() : h.timestamp}
                    </span>
                  </div>
                </div>

                {/* Contextual Message */}
                <p className="text-slate-200 text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/50">
                  &ldquo;{h.contextMessage}&rdquo;
                </p>

                {/* Metadata & Transfer Summary */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Event ID: <strong className="text-white">#{h.packetSummary?.eventId?.slice(0, 8) || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Transfer ID: <strong className="text-cyan-300">#{h.transferId.slice(0, 8)}</strong></span>
                  </div>
                  <span className="text-purple-300 uppercase font-bold text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60">
                    Severity: {h.packetSummary?.severity || 'MEDIUM'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-slate-500 text-xs py-8 text-center bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            No agent handoffs match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
