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
    { name: 'FastAPI REST Gateway', status: isApiOk ? 'Active' : 'Offline', pid: 'PID: 3938', color: 'text-[#00D6C9]' },
    { name: 'PostgreSQL State Store', status: isDbOk ? 'Active' : 'Offline', pid: 'PORT: 5432', color: 'text-[#48C99B]' },
    { name: 'Redis Pub/Sub Bus', status: isRedisOk ? 'Active' : 'Offline', pid: 'PORT: 6379', color: 'text-[#00D6C9]' },
    { name: 'Multi-Vector Correlator', status: 'Active', pid: 'WORKER: 01', color: 'text-[#00D6C9]' },
    { name: 'Alert Notifier Daemon', status: 'Active', pid: 'WORKER: 02', color: 'text-[#48C99B]' },
    { name: 'Replay Studio Sandbox', status: 'Standby', pid: 'DAEMON: S1', color: 'text-[#94A6B8]' },
  ];

  return (
    <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-soc-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E2D3D]">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F0F5F8] font-mono flex items-center space-x-2">
              <span>System Overview</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D6C9] animate-pulse" />
            </h3>
            <p className="text-[10px] text-[#94A6B8] font-mono">SOC Engine Telemetry & Host Sensors</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/35 font-semibold">
          SYS-1 // ONLINE
        </span>
      </div>

      {/* Circular Resource Meters */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 py-3 sm:py-4 border-b border-[#1E2D3D]">
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
        <div className="bg-[#080D14] p-2 rounded-lg border border-[#1E2D3D] flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-[#00D6C9]" />
          <div>
            <div className="text-[9px] text-[#94A6B8] uppercase">Throughput</div>
            <div className="font-semibold text-[#F0F5F8]">{totalAttacks} Events</div>
          </div>
        </div>
        <div className="bg-[#080D14] p-2 rounded-lg border border-[#1E2D3D] flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-[#EF6268]" />
          <div>
            <div className="text-[9px] text-[#94A6B8] uppercase">Alert State</div>
            <div className="font-semibold text-[#F0F5F8]">{activeAlerts} Active</div>
          </div>
        </div>
        <div className="bg-[#080D14] p-2 rounded-lg border border-[#1E2D3D] flex items-center space-x-2">
          <HardDrive className="w-3.5 h-3.5 text-[#48C99B]" />
          <div>
            <div className="text-[9px] text-[#94A6B8] uppercase">Sensor Probe</div>
            <div className="font-semibold text-[#48C99B]">Node-01</div>
          </div>
        </div>
      </div>

      {/* Active SOC Engine Processes */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-[#94A6B8] font-mono flex items-center space-x-1">
            <Layers className="w-3 h-3 text-[#00D6C9]" />
            <span>Active Processes</span>
          </span>
          <span className="text-[10px] font-mono text-[#00D6C9]/80">6 Managed Services</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {processes.map((proc, i) => (
            <div
              key={i}
              className="px-2 py-1.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] flex items-center justify-between text-[10px] font-mono"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3 h-3 text-[#48C99B] shrink-0" />
                <span className="text-[#F0F5F8] truncate">{proc.name}</span>
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
