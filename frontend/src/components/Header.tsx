import React from 'react';
import { ShieldAlert, Activity, Database, Server, RefreshCw, User, LogOut, Key } from 'lucide-react';
import { SystemHealth } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  health?: SystemHealth;
  isFetching?: boolean;
  activeView?: 'dashboard' | 'investigation' | 'rules' | 'command' | 'cases' | 'deception' | 'intel' | 'integrations' | 'campaigns';
  onViewChange?: (view: 'dashboard' | 'investigation' | 'rules' | 'command' | 'cases' | 'deception' | 'intel' | 'integrations' | 'campaigns') => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  isFetching,
  activeView = 'dashboard',
  onViewChange,
  onOpenLogin,
}) => {
  const { operator, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'viewer':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'analyst':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'incident_responder':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      case 'security_administrator':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatRoleName = (role?: string) => {
    switch (role) {
      case 'viewer':
        return 'Viewer';
      case 'analyst':
        return 'Analyst';
      case 'incident_responder':
        return 'Responder';
      case 'security_administrator':
        return 'Sec Admin';
      default:
        return role || 'Anonymous';
    }
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Workspace Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => onViewChange?.('dashboard')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SOC Overview
            </button>
            <button
              onClick={() => onViewChange?.('command')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'command'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-cyan-400/80 hover:text-cyan-300'
              }`}
            >
              Live Command
            </button>
            <button
              onClick={() => onViewChange?.('cases')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'cases'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-indigo-400/80 hover:text-indigo-300'
              }`}
            >
              Incident Cases
            </button>
            <button
              onClick={() => onViewChange?.('deception')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'deception'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              Deception Grid
            </button>
            <button
              onClick={() => onViewChange?.('intel')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'intel'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Threat Intel
            </button>
            <button
              onClick={() => onViewChange?.('investigation')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'investigation'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entity Investigation
            </button>
            <button
              onClick={() => onViewChange?.('rules')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'rules'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Detection & Replay
            </button>
            <button
              onClick={() => onViewChange?.('integrations')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'integrations'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-purple-400/80 hover:text-purple-300'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => onViewChange?.('campaigns')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeView === 'campaigns'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-blue-400/80 hover:text-blue-300'
              }`}
            >
              Campaigns
            </button>
          </div>
        </div>

        {/* Operator Ribbon & System Health Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Authenticated Operator Ribbon */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">{operator?.username || 'Not logged in'}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${getRoleBadgeColor(operator?.role)}`}>
              {formatRoleName(operator?.role)}
            </span>
            <button
              onClick={onOpenLogin}
              title="Switch operator account or engage emergency break-glass"
              className="text-[11px] text-sky-400 hover:text-sky-300 ml-1 px-1.5 py-0.5 rounded bg-sky-950/40 border border-sky-800/50 hover:bg-sky-900/40 transition-colors"
            >
              Switch
            </button>
            <button
              onClick={() => logout()}
              title="Sign out of current session"
              className="text-slate-400 hover:text-rose-400 p-0.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

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
            <span className={health?.postgresql?.includes('connect') ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {health?.postgresql?.includes('connect') ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* Redis */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 font-mono">Redis:</span>
            <span className={health?.redis?.includes('connect') ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {health?.redis?.includes('connect') ? 'Connected' : 'Offline'}
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
