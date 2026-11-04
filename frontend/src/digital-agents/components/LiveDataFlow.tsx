import React from 'react';
import {
  AgentId,
  DataPacketPayload,
  FlowNodeDefinition,
  FlowConnectionDefinition,
} from '../types';
import { AgentCharacterMap } from '../characters';
import { DataPacket } from './DataPacket';
import { AGENT_PROFILES } from '../profiles';
import {
  Shield,
  Radio,
  ArrowRight,
  Database,
  Cpu,
  BrainCircuit,
  Bell,
  CheckCircle2,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LiveDataFlowProps {
  nodes: FlowNodeDefinition[];
  connections: FlowConnectionDefinition[];
  activePackets: DataPacketPayload[];
  onSelectPacket: (packet: DataPacketPayload) => void;
  selectedPacketId?: string;
  reducedMotion?: boolean;
}

export const LiveDataFlow: React.FC<LiveDataFlowProps> = ({
  nodes,
  connections,
  activePackets,
  onSelectPacket,
  selectedPacketId,
  reducedMotion = false,
}) => {
  // Map icons for node labels
  const getNodeIcon = (nodeId: string) => {
    switch (nodeId) {
      case 'sensors':
        return Radio;
      case 'ingestion':
        return Server;
      case 'queue':
        return Layers;
      case 'persistence':
        return Database;
      case 'detection':
        return Shield;
      case 'intel':
        return BrainCircuit;
      case 'alerts':
        return Bell;
      case 'notifications':
        return Sparkles;
      default:
        return Cpu;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Territory Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">SCOUT Territory</span>
              <span className="text-[10px] text-blue-300">Sensors & Traps</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200">
            SYS 1 / 2
          </span>
        </div>

        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <span className="font-bold text-white block">NEXUS Core</span>
              <span className="text-[10px] text-cyan-300">Ingest, Queue & Outbox</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200">
            SYS 1
          </span>
        </div>

        <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">ORACLE Territory</span>
              <span className="text-[10px] text-purple-300">Threat Intelligence</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200">
            SYS 3
          </span>
        </div>

        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">SENTINEL Territory</span>
              <span className="text-[10px] text-red-300">Alerts & Governor</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-200">
            SYS 1
          </span>
        </div>
      </div>

      {/* Main Interactive Pipeline Bus */}
      <div className="relative p-6 rounded-xl bg-slate-950/90 border border-cyan-500/30 overflow-x-auto min-h-[440px]">
        {/* Subtle Cyber Grid Background */}
        <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

        <div className="relative min-w-[900px] flex flex-col justify-between h-full space-y-12">
          {/* Upper Stage: SCOUT & NEXUS Flow */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                STAGE A: SENSOR COLLECTION & PERSISTENCE PIPELINE
              </span>
              <span>Monitored Real-Time Bus</span>
            </div>

            <div className="grid grid-cols-4 gap-6 items-center">
              {nodes.slice(0, 4).map((node, idx) => {
                const IconComponent = getNodeIcon(node.id);
                const agent = AGENT_PROFILES[node.agentOwner];
                const activeOnNode = activePackets.filter(
                  (p) => p.destinationNode === node.label || p.sourceNode === node.label
                );

                return (
                  <div key={node.id} className="relative flex flex-col items-center">
                    {/* Node Card */}
                    <div className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all font-mono shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="p-1.5 rounded"
                          style={{
                            backgroundColor: `${agent.color}20`,
                            color: agent.color,
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                          {node.system}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white tracking-wide truncate">
                        {node.label}
                      </h4>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Events: <strong className="text-cyan-300">{node.eventCount}</strong></span>
                        <span className="capitalize text-emerald-400">{node.status}</span>
                      </div>
                    </div>

                    {/* Agent Courier Avatar hovering near active node */}
                    {idx === 0 && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-20 h-20">
                          {React.createElement(AgentCharacterMap.scout, {
                            state: activeOnNode.length > 0 ? 'delivering' : 'observing',
                            size: 80,
                            carryingPacket: activeOnNode.length > 0,
                            reducedMotion: reducedMotion,
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 font-bold mt-1">
                          SCOUT
                        </span>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-20 h-20">
                          {React.createElement(AgentCharacterMap.nexus, {
                            state: activeOnNode.length > 0 ? 'processing' : 'idle',
                            size: 80,
                            carryingPacket: activeOnNode.length > 0,
                            reducedMotion: reducedMotion,
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold mt-1">
                          NEXUS
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lower Stage: ORACLE & SENTINEL Flow */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-2 text-purple-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                STAGE B: THREAT INTELLIGENCE, ALERT TRIAGE & ESCALATION
              </span>
              <span>Authoritative Decision Bus</span>
            </div>

            <div className="grid grid-cols-4 gap-6 items-center">
              {nodes.slice(4, 8).map((node, idx) => {
                const IconComponent = getNodeIcon(node.id);
                const agent = AGENT_PROFILES[node.agentOwner];
                const activeOnNode = activePackets.filter(
                  (p) => p.destinationNode === node.label || p.sourceNode === node.label
                );

                return (
                  <div key={node.id} className="relative flex flex-col items-center">
                    {/* Node Card */}
                    <div className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all font-mono shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="p-1.5 rounded"
                          style={{
                            backgroundColor: `${agent.color}20`,
                            color: agent.color,
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                          {node.system}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white tracking-wide truncate">
                        {node.label}
                      </h4>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Events: <strong className="text-purple-300">{node.eventCount}</strong></span>
                        <span className="capitalize text-emerald-400">{node.status}</span>
                      </div>
                    </div>

                    {/* Agent Courier Avatar hovering near active node */}
                    {idx === 1 && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-20 h-20">
                          {React.createElement(AgentCharacterMap.oracle, {
                            state: activeOnNode.length > 0 ? 'analyzing' : 'idle',
                            size: 80,
                            carryingPacket: activeOnNode.length > 0,
                            reducedMotion: reducedMotion,
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-purple-400 font-bold mt-1">
                          ORACLE
                        </span>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-20 h-20">
                          {React.createElement(AgentCharacterMap.sentinel, {
                            state: activeOnNode.length > 0 ? 'alerting' : 'idle',
                            size: 80,
                            carryingPacket: activeOnNode.length > 0,
                            reducedMotion: reducedMotion,
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-red-400 font-bold mt-1">
                          SENTINEL
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Carried Packets Ribbon */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Active Carried Data Packets ({activePackets.length})</span>
          </span>
          <span className="text-[10px] text-slate-500">
            Click any packet to open Transfer Inspector
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {activePackets.length > 0 ? (
            activePackets.map((pkt) => (
              <DataPacket
                key={pkt.transferId}
                packet={pkt}
                onClick={onSelectPacket}
                selected={selectedPacketId === pkt.eventId}
              />
            ))
          ) : (
            <div className="text-slate-500 text-xs py-2 w-full text-center">
              All pipeline stages quiescent. No active in-flight transfers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
