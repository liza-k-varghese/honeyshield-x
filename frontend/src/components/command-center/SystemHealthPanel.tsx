import React from 'react';
import { Database, Server, Activity, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { CircularGauge } from './CircularGauge';
import { SystemHealth } from '../../types';

interface SystemHealthPanelProps {
  health?: SystemHealth;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ health }) => {
  const isPostgresOk = health?.postgresql?.includes('connect') ?? true;
  const isRedisOk = health?.redis?.includes('connect') ?? true;
  const isApiOk = health ? (health.api === 'healthy' || health.api === 'Online' || health.api === 'ok') : true;
  const isSensorsOk = true;

  const services = [
    {
      name: 'PostgreSQL DB',
      sub: 'Cluster v17',
      status: isPostgresOk,
      value: isPostgresOk ? 99 : 0,
      color: (isPostgresOk ? 'cyan' : 'crimson') as 'cyan' | 'crimson',
      icon: Database,
      details: 'Port 5432 // honeyshield',
    },
    {
      name: 'Redis Cache',
      sub: 'Event Broker',
      status: isRedisOk,
      value: isRedisOk ? 100 : 0,
      color: (isRedisOk ? 'purple' : 'crimson') as 'purple' | 'crimson',
      icon: Server,
      details: 'Port 6379 // In-Memory',
    },
    {
      name: 'FastAPI Core',
      sub: 'SOC API v1',
      status: isApiOk,
      value: isApiOk ? 100 : 0,
      color: (isApiOk ? 'green' : 'crimson') as 'green' | 'crimson',
      icon: Activity,
      details: 'Uvicorn // Port 8000',
    },
    {
      name: 'SOC Sensors',
      sub: 'Deception Probes',
      status: isSensorsOk,
      value: isSensorsOk ? 98 : 0,
      color: (isSensorsOk ? 'amber' : 'crimson') as 'amber' | 'crimson',
      icon: ShieldCheck,
      details: 'Canary Grid Active',
    },
  ];

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-3.5 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>System Health</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Infrastructure Nodes & Persistence Fabric</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
          ALL NODES HEALTHY
        </span>
      </div>

      {/* 4 Circular Health Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-3 sm:py-4 border-b border-cyan-500/10">
        {services.map((svc, i) => (
          <div key={i} className="flex flex-col items-center">
            <CircularGauge
              value={svc.value}
              label={svc.name}
              subLabel={svc.sub}
              size={76}
              strokeWidth={6}
              color={svc.color}
              unit="%"
            />
          </div>
        ))}
      </div>

      {/* Diagnostics Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-[10px] font-mono">
        {services.map((svc, i) => {
          const Icon = svc.icon;
          return (
            <div
              key={i}
              className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-slate-200 font-bold truncate">{svc.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{svc.details}</div>
                </div>
              </div>
              {svc.status ? (
                <div className="flex items-center space-x-1 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">ONLINE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-rose-400 shrink-0">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">OFFLINE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
