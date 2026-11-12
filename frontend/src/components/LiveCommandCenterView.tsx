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
          <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-soc-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A6B8] font-medium font-mono">Status:</span>
              {(['all', 'open', 'acknowledged', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize font-mono transition-colors ${
                    statusFilter === st
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/40'
                      : 'bg-[#192737] text-[#94A6B8] hover:text-[#F0F5F8] border border-[#1E2D3D]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A6B8] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter IP, ID, or Type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#080D14] border border-[#1E2D3D] rounded-lg pl-8 pr-3 py-1 text-xs text-[#F0F5F8] placeholder-[#94A6B8] focus:outline-none focus:border-[#00D6C9] font-mono w-48"
                />
              </div>

              <button
                onClick={() => refetch()}
                className="p-1.5 rounded-lg bg-[#192737] hover:bg-[#192737]/80 text-[#94A6B8] hover:text-[#F0F5F8] border border-[#1E2D3D] transition-colors"
                title="Refresh Incidents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#00D6C9]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Virtual Incidents Table */}
          <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-soc-sm">
            <div className="p-3 border-b border-[#1E2D3D] flex items-center justify-between bg-[#080D14]/80">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00D6C9]" />
                <h3 className="text-xs font-semibold text-[#F0F5F8] font-mono">
                  Virtual Incident Stream ({filteredIncidents.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#94A6B8] font-mono">
                Auto-synced via SSE telemetry
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#94A6B8]">
                <Activity className="w-5 h-5 animate-spin text-[#00D6C9] mx-auto mb-2" />
                Loading Incident Stream...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#94A6B8] font-mono">
                No incidents match the active filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080D14]/60 text-[#94A6B8] font-mono font-medium border-b border-[#1E2D3D] text-[11px]">
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
                  <tbody className="divide-y divide-[#1E2D3D]/60">
                    {filteredIncidents.map((inc) => (
                      <tr
                        key={inc.incident_id}
                        className="hover:bg-[#192737]/50 transition-colors cursor-pointer"
                        onClick={() => handleOpenCommand(inc, 'ALERT_ACKNOWLEDGE')}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-[#00D6C9]">
                          <div className="flex items-center gap-1.5">
                            <span>{inc.incident_id}</span>
                            {onReplayAttack && inc.attack_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplayAttack(inc.attack_id!);
                                }}
                                className="text-[#94A6B8] hover:text-[#E5B65A] transition-colors"
                                title={`Replay Attack #${inc.attack_id} in Rule Console`}
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[#F0F5F8]">{inc.source_ip}</span>
                            {onInvestigateIp && inc.source_ip !== 'unknown' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInvestigateIp(inc.source_ip);
                                }}
                                className="text-[#94A6B8] hover:text-[#00D6C9] transition-colors"
                                title="Investigate IP Dossier"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#F0F5F8] font-medium truncate max-w-[180px]">
                          {inc.attack_type}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                inc.severity === 'critical'
                                  ? 'bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/40'
                                  : inc.severity === 'high'
                                  ? 'bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/40'
                                  : 'bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]'
                              }`}
                            >
                              {inc.severity}
                            </span>
                            <span className="font-mono text-[11px] text-[#94A6B8]">
                              {inc.risk_score.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                              inc.status === 'open'
                                ? 'bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/40'
                                : inc.status === 'acknowledged'
                                ? 'bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/40'
                                : 'bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/40'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span
                            className={
                              inc.notification_status === 'delivered'
                                ? 'text-[#48C99B]'
                                : inc.notification_status === 'failed'
                                ? 'text-[#EF6268]'
                                : 'text-[#94A6B8]'
                            }
                          >
                            {inc.notification_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 font-mono">
                            {inc.status === 'open' && (
                              <button
                                onClick={(e) => handleQuickAcknowledge(inc, e)}
                                disabled={!hasPermission('command:ack')}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                  hasPermission('command:ack')
                                    ? 'bg-[#192737] hover:bg-[#00D6C9] hover:text-[#080D14] text-[#00D6C9] border-[#1E2D3D]'
                                    : 'bg-[#111C29] text-[#94A6B8]/40 border-[#1E2D3D] cursor-not-allowed'
                                }`}
                                title={hasPermission('command:ack') ? 'Quick Acknowledge' : 'Requires Analyst or higher'}
                              >
                                Ack
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenCommand(inc, 'ALERT_RESOLVE')}
                              className="px-2 py-1 rounded-md bg-[#192737] hover:bg-[#192737]/80 text-[#F0F5F8] text-[11px] font-medium border border-[#1E2D3D] transition-colors"
                              title="Resolve Incident"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleOpenCommand(inc, 'NOTIFICATION_DISPATCH')}
                              className="px-2 py-1 rounded-md bg-[#00D6C9]/15 hover:bg-[#00D6C9]/25 text-[#00D6C9] text-[11px] font-medium border border-[#00D6C9]/40 transition-colors"
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
          <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl p-3 space-y-3 shadow-soc-sm">
            <div className="flex items-center justify-between border-b border-[#1E2D3D] pb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00D6C9]" />
                <h4 className="text-xs font-semibold text-[#F0F5F8] font-mono">Live SSE Feed</h4>
              </div>
              <span className="text-[10px] text-[#94A6B8] font-mono">
                {streamEvents.length} events
              </span>
            </div>

            {streamEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A6B8] font-mono">
                Listening for stream telemetry...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {streamEvents.slice(0, 15).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded-lg bg-[#080D14] border border-[#1E2D3D] space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#00D6C9] font-medium">{ev.type}</span>
                      <span className="text-[9px] text-[#94A6B8] font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[#94A6B8] font-mono truncate text-[10px]">
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
