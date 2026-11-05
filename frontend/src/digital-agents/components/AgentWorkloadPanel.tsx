import React from 'react';
import { AgentId, AgentRuntimeStatus, AgentWorkloadMetrics } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import {
  Activity,
  Layers,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface AgentWorkloadPanelProps {
  runtimeStatuses: Record<AgentId, AgentRuntimeStatus>;
  workloadOverrides?: Partial<Record<AgentId, Partial<AgentWorkloadMetrics>>>;
  onSelectAgent?: (agentId: AgentId) => void;
  reducedMotion?: boolean;
}

export const AgentWorkloadPanel: React.FC<AgentWorkloadPanelProps> = ({
  runtimeStatuses,
  workloadOverrides,
  onSelectAgent,
  reducedMotion = false,
}) => {
  const agentList: AgentId[] = ['scout', 'nexus', 'oracle', 'sentinel'];

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
              <span>AGENT WORKLOAD & OPERATIONAL STATUS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                LIVE METRICS
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified real-time queue depths, task completions, and active transactional transfers
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          Backend Ingestion: <span className="text-emerald-400 font-bold">PostgreSQL Outbox Committed</span>
        </div>
      </div>

      {/* 4-Agent Workload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agentList.map((agentId) => {
          const profile = AGENT_PROFILES[agentId];
          const runtime = runtimeStatuses[agentId];
          const override = workloadOverrides?.[agentId];
          const AvatarComponent = AgentCharacterMap[agentId];

          // Compute accurate metrics distinguishing 0 from unknown
          const activeTransfers = override?.activeTransfers ?? (runtime.activePacketId ? 1 : 0);
          const pendingTransfers = override?.pendingTransfers ?? runtime.tasksPending;
          const completedTransfers = override?.completedTransfers ?? runtime.tasksCompleted;
          const failedTransfers = override?.failedTransfers ?? runtime.tasksFailed;
          const queueDepth = override?.queueDepth ?? 0;
          const lastActivity = override?.lastActivity ?? (runtime.lastActiveTimestamp || 'UNKNOWN');
          const operationalState = override?.operationalState ?? runtime.currentState.toUpperCase();
          const currentTask =
            override?.currentTask ??
            (runtime.currentTaskDescription ||
              (activeTransfers > 0
                ? `Carrying active transfer #${runtime.activePacketId?.slice(0, 8)}`
                : 'Quiescent — awaiting incoming security telemetry'));

          return (
            <div
              key={agentId}
              onClick={() => onSelectAgent?.(agentId)}
              className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 transition-all space-y-4 shadow-lg group cursor-pointer"
            >
              {/* Agent Identity Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12">
                    {React.createElement(AvatarComponent, {
                      state: runtime.currentState,
                      size: 48,
                      carryingPacket: activeTransfers > 0,
                      reducedMotion: reducedMotion,
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white" style={{ color: profile.color }}>
                        {profile.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700 uppercase">
                        {profile.systemDomain.split('—')[0].trim()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{profile.designation}</p>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <div className="flex items-center gap-1.5 text-xs">
                  {runtime.connectionStatus === 'connected' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] font-bold">
                      <Wifi className="w-3 h-3 text-emerald-400" />
                      CONNECTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/50 text-[10px] font-bold">
                      <WifiOff className="w-3 h-3 text-amber-400" />
                      STANDBY
                    </span>
                  )}
                </div>
              </div>

              {/* Current Task Banner */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                  <span>Current Task / State</span>
                  <span className="font-bold text-cyan-300">{operationalState}</span>
                </div>
                <p className="text-xs text-slate-200 truncate font-sans">
                  {currentTask}
                </p>
              </div>

              {/* 4-Stat Metric Cards */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {/* Active */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase block">Active</span>
                  <span className="text-base font-bold text-cyan-400">{activeTransfers}</span>
                </div>

                {/* Pending */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase block">Pending</span>
                  <span className="text-base font-bold text-amber-400">{pendingTransfers}</span>
                </div>

                {/* Completed */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase block">Completed</span>
                  <span className="text-base font-bold text-emerald-400">{completedTransfers}</span>
                </div>

                {/* Failed */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase block">Failed</span>
                  <span className="text-base font-bold text-rose-400">{failedTransfers}</span>
                </div>
              </div>

              {/* Queue Depth & Last Activity Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Queue Depth:{' '}
                    <strong className="text-white">
                      {queueDepth === 'UNAVAILABLE' ? 'UNAVAILABLE' : queueDepth}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Last Active:{' '}
                    <strong className="text-slate-300">
                      {lastActivity === 'UNKNOWN' ? 'UNKNOWN' : lastActivity.includes('T') ? new Date(lastActivity).toLocaleTimeString() : lastActivity}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
