import React from 'react';
import { FlowNodeDefinition } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import {
  X,
  Radio,
  Server,
  Layers,
  Database,
  Shield,
  BrainCircuit,
  Bell,
  Sparkles,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface NodeInspectorModalProps {
  node: FlowNodeDefinition | null;
  onClose: () => void;
  onFilterPackets?: (nodeId: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  onClose,
  onFilterPackets,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const agentProfile = AGENT_PROFILES[node.agentOwner];
  const AgentAvatar = AgentCharacterMap[node.agentOwner];

  const getNodeIcon = (nodeId: string) => {
    switch (nodeId) {
      case 'sensors':
      case 'sensor-cowrie':
      case 'sensor-trap':
      case 'sensor-dionaea':
      case 'sensor-opencanary':
      case 'sensor-suricata':
      case 'sensor-zeek':
        return Radio;
      case 'ingestion':
      case 'validation':
        return Server;
      case 'queue':
      case 'workers':
        return Layers;
      case 'persistence':
        return Database;
      case 'detection':
        return Shield;
      case 'intel':
      case 'ioc-match':
      case 'enrichment':
      case 'risk-score':
        return BrainCircuit;
      case 'alerts':
      case 'triage':
        return Bell;
      case 'notifications':
      case 'governor':
        return Sparkles;
      default:
        return Cpu;
    }
  };

  const Icon = getNodeIcon(node.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>OPERATIONAL (ACTIVE)</span>
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>OFFLINE / DISCONNECTED</span>
          </span>
        );
      case 'unconfigured':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>NOT CONFIGURED</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span>DEGRADED / WARNING</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>IDLE / STANDBY</span>
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-inspector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#080d1e] border border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.25)] flex flex-col font-mono text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: `${agentProfile.color}15`,
                borderColor: `${agentProfile.color}40`,
                color: agentProfile.color,
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="node-inspector-title" className="text-sm font-bold text-white tracking-wider">
                  {node.label}
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
                  {node.system}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Node Identifier: {node.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Node Inspector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-slate-950/60 max-h-[70vh] overflow-y-auto">
          {/* Status Ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                Operational Status
              </span>
              <div>{getStatusBadge(node.status)}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                Responsible Agent
              </span>
              <div className="flex items-center gap-2 justify-end mt-0.5">
                <span className="text-xs font-bold" style={{ color: agentProfile.color }}>
                  {agentProfile.name}
                </span>
                <div className="w-6 h-6">
                  {React.createElement(AgentAvatar, { state: 'idle', size: 24 })}
                </div>
              </div>
            </div>
          </div>

          {/* Key Operational Attributes */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Component / Sensor Type
              </span>
              <span className="font-bold text-white truncate block">
                {node.sensorType || 'Core System Service'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Heartbeat Health
              </span>
              <span className="font-bold text-slate-200">
                {node.heartbeat || (node.status === 'active' ? 'Active (< 15s)' : 'None')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Pipeline Destination
              </span>
              <span className="font-bold text-cyan-300 truncate block">
                {node.pipelineDestination || 'Central Processing Core'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Total Processed Events
              </span>
              <span className="font-bold text-purple-300 text-sm">
                {node.eventCount} events
              </span>
            </div>
          </div>

          {/* Genuine Operational Reality Note */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Activity className="w-4 h-4" />
              <span>HONEYSHIELD X ARCHITECTURAL VERIFICATION</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {node.status === 'unconfigured' ? (
                <>
                  <strong className="text-amber-400">UNCONFIGURED COMPONENT:</strong> This daemon or
                  sensor integration is not currently provisioned in this environment. HoneyShield X
                  displays its authentic state to avoid manufacturing false telemetry.
                </>
              ) : node.status === 'offline' ? (
                <>
                  <strong className="text-red-400">OFFLINE COMPONENT:</strong> The network listener
                  is configured but currently unresponsive or not bound to an active port.
                </>
              ) : (
                <>
                  <strong className="text-emerald-400">AUTHENTIC ACTIVE NODE:</strong> Genuine
                  telemetry from this node flows into the HoneyShield X event bus. Couriers carry
                  verified payloads with monotonic PostgreSQL outbox cursors.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onFilterPackets?.(node.id);
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-900 text-xs font-bold transition-colors"
          >
            Filter Node In-Flight Transfers
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
