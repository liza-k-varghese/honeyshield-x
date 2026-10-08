import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  ExternalLink,
  Terminal,
  Search,
  Play,
} from 'lucide-react';
import { GovernorStatusRibbon } from './GovernorStatusRibbon';
import { CommandExecutionModal } from './CommandExecutionModal';
import { useIncidentStream } from '../hooks/useIncidentStream';
import { useVirtualIncidents, useExecuteIncidentCommand } from '../hooks/useIncidentCommand';
import { VirtualIncidentItem, IncidentCommandAction } from '../types';
import { useAuth } from '../context/AuthContext';

interface LiveCommandCenterViewProps {
  onInvestigateIp?: (ip: string) => void;
  onReplayAttack?: (attackId: number) => void;
}

export const LiveCommandCenterView: React.FC<LiveCommandCenterViewProps> = ({
  onInvestigateIp,
  onReplayAttack,
}) => {
  const { operator, hasPermission } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<VirtualIncidentItem | null>(null);
  const [defaultAction, setDefaultAction] = useState<IncidentCommandAction>('ALERT_ACKNOWLEDGE');

  const { status: streamStatus, events: streamEvents } = useIncidentStream();
  const { data: virtualData, isLoading, refetch, isFetching } = useVirtualIncidents(statusFilter);
  const executeMutation = useExecuteIncidentCommand();

  const incidents = virtualData?.incidents || [];

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.incident_id.toLowerCase().includes(q) ||
      inc.source_ip.toLowerCase().includes(q) ||
      inc.attack_type.toLowerCase().includes(q) ||
      inc.severity.toLowerCase().includes(q)
    );
  });

  const handleQuickAcknowledge = async (inc: VirtualIncidentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPermission('command:ack')) {
      alert(`Access Denied: Role '${operator?.role}' cannot acknowledge alerts.`);
      return;
    }
    try {
      await executeMutation.mutateAsync({
        req: {
          action: 'ALERT_ACKNOWLEDGE',
          target_id: inc.alert_id,
        },
        idempotencyKey: crypto.randomUUID(),
        operatorId: operator?.username || 'soc_operator',
      });
    } catch (err: any) {
      alert(`Error acknowledging alert: ${err.message}`);
    }
  };

  const handleOpenCommand = (inc: VirtualIncidentItem, action: IncidentCommandAction) => {
    setSelectedIncident(inc);
    setDefaultAction(action);
  };

  return (
    <div className="space-y-4">
      {/* 1. Governor & Live Stream Status Ribbon */}
      <GovernorStatusRibbon streamStatus={streamStatus} />

      {/* 2. Workspace Layout: Main Incidents Feed + Live Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Incident Command Center (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls Bar */}
          <div className="bg-[#111726] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              {(['all', 'open', 'acknowledged', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition ${
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter IP, ID, or Type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
                />
              </div>

              <button
                onClick={() => refetch()}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
                title="Refresh Incidents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Virtual Incidents Table */}
          <div className="bg-[#111726] border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Virtual Incident Stream ({filteredIncidents.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Auto-synced via SSE telemetry
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Activity className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-2" />
                Loading Incident Stream...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                No incidents match the active filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Incident ID</th>
                      <th className="py-2.5 px-3">Attacker IP</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Severity / Risk</th>
                      <th className="py-2.5 px-3">Lifecycle</th>
                      <th className="py-2.5 px-3">Notification</th>
                      <th className="py-2.5 px-3 text-right">Governed Command</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredIncidents.map((inc) => (
                      <tr
                        key={inc.incident_id}
                        className="hover:bg-slate-800/30 transition cursor-pointer"
                        onClick={() => handleOpenCommand(inc, 'ALERT_ACKNOWLEDGE')}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-cyan-400">
                          <div className="flex items-center gap-1.5">
                            <span>{inc.incident_id}</span>
                            {onReplayAttack && inc.attack_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplayAttack(inc.attack_id!);
                                }}
                                className="text-slate-500 hover:text-amber-400 transition"
                                title={`Replay Attack #${inc.attack_id} in Rule Console`}
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-200">{inc.source_ip}</span>
                            {onInvestigateIp && inc.source_ip !== 'unknown' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInvestigateIp(inc.source_ip);
                                }}
                                className="text-slate-500 hover:text-cyan-400 transition"
                                title="Investigate IP Dossier"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-medium truncate max-w-[180px]">
                          {inc.attack_type}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                inc.severity === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : inc.severity === 'high'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {inc.severity}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {inc.risk_score.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                              inc.status === 'open'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : inc.status === 'acknowledged'
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span
                            className={
                              inc.notification_status === 'delivered'
                                ? 'text-emerald-400'
                                : inc.notification_status === 'failed'
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }
                          >
                            {inc.notification_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {inc.status === 'open' && (
                              <button
                                onClick={(e) => handleQuickAcknowledge(inc, e)}
                                disabled={!hasPermission('command:ack')}
                                className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                                  hasPermission('command:ack')
                                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                                title={hasPermission('command:ack') ? 'Quick Acknowledge' : 'Requires Analyst or higher'}
                              >
                                Ack
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenCommand(inc, 'ALERT_RESOLVE')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
                              title="Resolve Incident"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleOpenCommand(inc, 'NOTIFICATION_DISPATCH')}
                              className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-[11px] font-medium border border-cyan-500/40 transition"
                              title="Command Center Menu"
                            >
                              Commands...
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Live SSE Telemetry Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-[#111726] border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200">Live SSE Feed</h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {streamEvents.length} events
              </span>
            </div>

            {streamEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                Listening for stream telemetry...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {streamEvents.slice(0, 15).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 font-medium">{ev.type}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono truncate text-[10px]">
                      {JSON.stringify(ev.payload)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Command Execution Modal */}
      {selectedIncident && (
        <CommandExecutionModal
          incident={selectedIncident}
          defaultAction={defaultAction}
          onClose={() => setSelectedIncident(null)}
          operatorId={operator?.username || 'soc_operator'}
        />
      )}
    </div>
  );
};
