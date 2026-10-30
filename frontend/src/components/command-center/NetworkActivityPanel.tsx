import React from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart2, Radio, Server } from 'lucide-react';
import { NeonChart } from './NeonChart';

interface NetworkActivityPanelProps {
  totalAttacks?: number;
}

export const NetworkActivityPanel: React.FC<NetworkActivityPanelProps> = ({
  totalAttacks = 0,
}) => {
  // Dual-line network ingress & egress telemetry
  const trafficData = React.useMemo(() => {
    const timeLabels = ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'Now'];
    return timeLabels.map((label, idx) => {
      const base = Math.max(12, ((totalAttacks + idx * 7) % 65) + 20);
      const egress = Math.round(base * 0.42);
      return {
        label,
        value: base,
        secondaryValue: egress,
      };
    });
  }, [totalAttacks]);

  const protocols = [
    { name: 'SSH (22)', share: '46%', count: '1,420 pkts', color: 'bg-cyan-500' },
    { name: 'HTTP/S (80/443)', share: '32%', count: '984 pkts', color: 'bg-purple-500' },
    { name: 'Postgres (5432)', share: '14%', count: '430 pkts', color: 'bg-emerald-500' },
    { name: 'Decoy/HoneyPort', share: '8%', count: '246 pkts', color: 'bg-amber-500' },
  ];

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>Network Activity</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Ingress Packet Flows & Protocol Demultiplexing</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cyan-400">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>INTERFACE: eth0</span>
        </div>
      </div>

      {/* Real-Time Throughput Counters */}
      <div className="grid grid-cols-2 gap-3 py-3 border-b border-cyan-500/10 text-xs font-mono">
        <div className="p-2.5 rounded bg-slate-950/70 border border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Ingress Traffic</div>
              <div className="text-sm font-bold text-cyan-300">842.6 KB/s</div>
            </div>
          </div>
          <span className="text-[10px] text-cyan-400/80 font-bold">+14.2%</span>
        </div>

        <div className="p-2.5 rounded bg-slate-950/70 border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-purple-500/10 text-purple-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Egress Decoy Stream</div>
              <div className="text-sm font-bold text-purple-300">128.4 KB/s</div>
            </div>
          </div>
          <span className="text-[10px] text-purple-400/80 font-bold">Optimal</span>
        </div>
      </div>

      {/* Dual Neon Chart */}
      <div className="py-2">
        <NeonChart
          data={trafficData}
          height={115}
          color="dual"
          unit="KB/s"
        />
      </div>

      {/* Protocol Breakdown Bars */}
      <div className="mt-2 pt-2 border-t border-cyan-500/10">
        <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-400 uppercase">
          <span className="flex items-center space-x-1">
            <Server className="w-3 h-3 text-cyan-400" />
            <span>Target Port Distribution</span>
          </span>
          <span>Packets Captured</span>
        </div>

        <div className="space-y-1.5">
          {protocols.map((proto, i) => (
            <div key={i} className="text-[10px] font-mono">
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>{proto.name}</span>
                <span className="text-slate-400">{proto.count} ({proto.share})</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                <div
                  className={`${proto.color} h-1 rounded-full`}
                  style={{ width: proto.share }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

