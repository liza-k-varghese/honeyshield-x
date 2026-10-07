import React from 'react';
import { ShieldAlert, Activity, Database, Server, RefreshCw } from 'lucide-react';
import { SystemHealth } from '../types';

interface HeaderProps {
  health?: SystemHealth;
  isFetching?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ health, isFetching }) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">HoneyShield-X</h1>
              <span className="text-[11px] font-mono uppercase bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700">
                SOC Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Honeypot & Intrusion Defense Platform</p>
          </div>
        </div>

        {/* System Health Indicators & Refresh Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* API Health */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-mono">API:</span>
            <span className="text-emerald-400 font-semibold">{health?.api || 'Online'}</span>
          </div>

          {/* PostgreSQL */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-xs">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 font-mono">DB:</span>
            <span className={health?.postgresql.includes('connect') ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {health?.postgresql.includes('connect') ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* Redis */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 font-mono">Redis:</span>
            <span className={health?.redis.includes('connect') ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {health?.redis.includes('connect') ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* Polling Activity Pulse */}
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-950/50 text-[11px] font-mono text-slate-400 border border-slate-800">
            <RefreshCw className={`w-3 h-3 text-sky-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>5s poll</span>
          </div>
        </div>
      </div>
    </header>
  );
};
