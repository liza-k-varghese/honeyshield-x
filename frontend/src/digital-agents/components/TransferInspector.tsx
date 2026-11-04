import React, { useEffect } from 'react';
import { DataPacketPayload } from '../types';
import { X, ArrowRight, Shield, Cpu, BrainCircuit, Bell, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { AGENT_PROFILES } from '../profiles';

interface TransferInspectorProps {
  packet: DataPacketPayload | null;
  onClose: () => void;
  onDeepLinkInvestigate?: (ip: string) => void;
}

export const TransferInspector: React.FC<TransferInspectorProps> = ({
  packet,
  onClose,
  onDeepLinkInvestigate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!packet) return null;

  const agentProfile = AGENT_PROFILES[packet.assignedAgent];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-inspector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-xl bg-[#0a1024] border border-cyan-500/40 shadow-[0_0_30px_rgba(0,229,255,0.25)] p-5 text-slate-100 font-mono space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-ping"
              style={{ backgroundColor: agentProfile.color }}
            />
            <h3 id="transfer-inspector-title" className="text-sm font-bold text-white tracking-wider">
              INTERACTIVE DATA PACKET INSPECTOR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Inspector (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transfer Progression Bar */}
        <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Transfer Route:</span>
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span>{packet.sourceNode}</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{packet.destinationNode}</span>
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${packet.progressPercent}%`,
                backgroundColor: agentProfile.color,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Status: <strong className="text-white uppercase">{packet.status}</strong></span>
            <span>Progress: <strong>{packet.progressPercent}%</strong></span>
          </div>
        </div>

        {/* Packet Specifications Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Event Identifier</span>
            <div className="font-mono text-cyan-300 truncate" title={packet.eventId}>
              {packet.eventId}
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Transfer Correlation ID</span>
            <div className="font-mono text-purple-300 truncate" title={packet.transferId}>
              {packet.transferId}
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Assigned Carrier Agent</span>
            <div className="font-bold flex items-center gap-1.5" style={{ color: agentProfile.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agentProfile.color }} />
              {agentProfile.name} ({agentProfile.designation})
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Severity & Category</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  packet.severity === 'critical'
                    ? 'bg-red-900/80 text-red-200 border border-red-700'
                    : packet.severity === 'high'
                    ? 'bg-orange-900/80 text-orange-200 border border-orange-700'
                    : 'bg-blue-900/80 text-blue-200 border border-blue-700'
                }`}
              >
                {packet.severity}
              </span>
              <span className="text-slate-300">{packet.eventType}</span>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="p-3 rounded bg-slate-950/90 border border-slate-800 space-y-2">
          <span className="text-slate-400 text-xs font-semibold uppercase flex items-center gap-1.5">
            <span>Verified Operational Context</span>
          </span>

          <div className="space-y-1 text-xs">
            {packet.metadata.sourceIp && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Attacker Source IP:</span>
                <span className="font-bold text-white flex items-center gap-2">
                  <code>{packet.metadata.sourceIp}</code>
                  {onDeepLinkInvestigate && (
                    <button
                      onClick={() => onDeepLinkInvestigate(packet.metadata.sourceIp!)}
                      className="text-cyan-400 hover:text-cyan-300 p-0.5"
                      title="Investigate IP in SOC Console"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </div>
            )}

            {packet.metadata.attackId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Attack Session ID:</span>
                <span className="font-bold text-white">#{packet.metadata.attackId}</span>
              </div>
            )}

            {packet.metadata.ruleName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Matched Detection Rule:</span>
                <span className="text-cyan-300">{packet.metadata.ruleName}</span>
              </div>
            )}

            {packet.metadata.indicatorValue && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Threat Intel Indicator:</span>
                <span className="text-purple-300">{packet.metadata.indicatorValue}</span>
              </div>
            )}

            {packet.metadata.alertTitle && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SOC Alert Subject:</span>
                <span className="text-red-300 truncate max-w-xs">{packet.metadata.alertTitle}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-500">
              <span>Timestamp:</span>
              <span>{new Date(packet.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
          {packet.metadata.sourceIp && onDeepLinkInvestigate && (
            <button
              onClick={() => {
                onDeepLinkInvestigate(packet.metadata.sourceIp!);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Deep-Dive IP</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
