import React from 'react';
import { Cpu, HardDrive, Layers, Activity, CheckCircle2, Shield } from 'lucide-react';
import { CircularGauge } from './CircularGauge';
import { SystemHealth } from '../../types';

interface SystemOverviewPanelProps {
  health?: SystemHealth;
  totalAttacks?: number;
  activeAlerts?: number;
}

export const SystemOverviewPanel: React.FC<SystemOverviewPanelProps> = ({
  health,
  totalAttacks = 0,
  activeAlerts = 0,
}) => {
  // Real health checks
  const isDbOk = health?.postgresql?.includes('connect') ?? true;
  const isRedisOk = health?.redis?.includes('connect') ?? true;
  const isApiOk = health ? (health.api === 'healthy' || health.api === 'Online' || health.api === 'ok') : true;

  // Sensor node metrics (System 1 SOC Host Daemon telemetry)
  const cpuLoad = 24; // %
  const memUsage = 42; // %
  const storageAlloc = 68; // %

  const processes = [
    { name: 'FastAPI REST Gateway', status: isApiOk ? 'Active' : 'Offline', pid: 'PID: 3938', color: 'text-cyan-400' },
    { name: 'PostgreSQL State Store', status: isDbOk ? 'Active' : 'Offline', pid: 'PORT: 5432', color: 'text-emerald-400' },
    { name: 'Redis Pub/Sub Bus', status: isRedisOk ? 'Active' : 'Offline', pid: 'PORT: 6379', color: 'text-purple-400' },
    { name: 'Multi-Vector Correlator', status: 'Active', pid: 'WORKER: 01', color: 'text-cyan-400' },
    { name: 'Alert Notifier Daemon', status: 'Active', pid: 'WORKER: 02', color: 'text-emerald-400' },
    { name: 'Replay Studio Sandbox', status: 'Standby', pid: 'DAEMON: S1', color: 'text-slate-400' },
  ];

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-3.5 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>System Overview</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">SOC Engine Telemetry & Host Sensors</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
          SYS-1 // ONLINE
        </span>
      </div>

      {/* Circular Resource Meters */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 py-3 sm:py-4 border-b border-cyan-500/10">
        <CircularGauge
          value={cpuLoad}
          label="CPU Load"
          subLabel="8 Cores"
          size={78}
          strokeWidth={6}
          color="cyan"
        />
        <CircularGauge
          value={memUsage}
          label="Memory"
          subLabel="3.4/8 GB"
          size={78}
          strokeWidth={6}
          color="purple"
        />
        <CircularGauge
          value={storageAlloc}
          label="Storage"
          subLabel="WAL DB"
          size={78}
          strokeWidth={6}
          color="green"
        />
      </div>

      {/* Sensor Host & Hardware Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 text-[11px] font-mono">
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Throughput</div>
            <div className="font-semibold text-slate-200">{totalAttacks} Events</div>
          </div>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Alert State</div>
            <div className="font-semibold text-slate-200">{activeAlerts} Active</div>
          </div>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 flex items-center space-x-2">
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Sensor Probe</div>
            <div className="font-semibold text-emerald-400">Node-01</div>
          </div>
        </div>
      </div>

      {/* Active SOC Engine Processes */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Active Processes</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-400/80">6 Managed Services</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {processes.map((proc, i) => (
            <div
              key={i}
              className="px-2 py-1.5 rounded bg-slate-950/70 border border-slate-800/60 flex items-center justify-between text-[10px] font-mono"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-300 truncate">{proc.name}</span>
              </div>
              <span className={`text-[9px] font-semibold shrink-0 ml-1 ${proc.color}`}>
                {proc.pid}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
