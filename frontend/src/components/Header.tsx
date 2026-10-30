import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Database,
  Server,
  RefreshCw,
  User,
  LogOut,
  Bell,
  LayoutDashboard,
  BarChart3,
  Radio,
  Sliders,
  Layers,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { SystemHealth, Alert } from '../types';
import { useAuth } from '../context/AuthContext';

export type TopNavView =
  | 'overview'
  | 'dashboard'
  | 'command'
  | 'cases'
  | 'deception'
  | 'intel'
  | 'integrations'
  | 'campaigns'
  | 'hunts'
  | 'investigation'
  | 'rules'
  | 'analytics'
  | 'systems'
  | 'network'
  | 'config';

interface HeaderProps {
  health?: SystemHealth;
  isFetching?: boolean;
  activeView?: string;
  onViewChange?: (view: any) => void;
  onOpenLogin?: () => void;
  alerts?: Alert[];
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  isFetching,
  activeView = 'overview',
  onViewChange,
  onOpenLogin,
  alerts = [],
  onOpenMobileDrawer,
}) => {
  const { operator, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadAlerts = alerts.filter((a) => a.status === 'open');

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

  const isNavActive = (key: string) => {
    if (key === 'dashboard' && (activeView === 'overview' || activeView === 'dashboard')) return true;
    if (key === 'analytics' && activeView === 'analytics') return true;
    if (key === 'systems' && (activeView === 'systems' || activeView === 'integrations')) return true;
    if (key === 'network' && (activeView === 'network' || activeView === 'command')) return true;
    if (key === 'config' && (activeView === 'config' || activeView === 'rules')) return true;
    return false;
  };

  return (
    <header className="bg-[#050814]/95 border-b border-cyan-500/20 px-3 sm:px-6 py-2.5 backdrop-blur-md sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Hamburger */}
        <div className="flex items-center gap-2 sm:gap-5">
          {/* Mobile Drawer Hamburger (lg:hidden) */}
          {onOpenMobileDrawer && (
            <button
              onClick={onOpenMobileDrawer}
              className="lg:hidden p-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-400 hover:text-white min-h-[42px] min-w-[42px] flex items-center justify-center transition-colors"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* HoneyShield X Branding */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => onViewChange?.('overview')}
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-nexus-cyan group-hover:border-cyan-400 transition-colors">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_6px_rgba(0,240,255,0.7)]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-white font-mono flex items-center">
                  <span>HoneyShield</span>
                  <span className="text-cyan-400 ml-1">X</span>
                </h1>
                <span className="text-[8px] sm:text-[9px] font-mono uppercase bg-cyan-950/80 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-700/60">
                  NEXUS SOC
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-400 font-mono">SOC COMMAND CENTRE // SYS-1 OPERATIONAL</p>
            </div>
          </div>

          {/* Top Navigation Links (hidden on mobile, visible on md+) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-cyan-500/20 text-xs font-mono">
            <button
              onClick={() => onViewChange?.('overview')}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isNavActive('dashboard')
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onViewChange?.('analytics')}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isNavActive('analytics')
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => onViewChange?.('systems')}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isNavActive('systems')
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Systems</span>
            </button>

            <button
              onClick={() => onViewChange?.('network')}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isNavActive('network')
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Network</span>
            </button>

            <button
              onClick={() => onViewChange?.('config')}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-colors ${
                isNavActive('config')
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configuration</span>
            </button>
          </nav>
        </div>

        {/* Right Side: Notifications, Infrastructure Health & Operator Profile */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Notifications Button & Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-slate-950 border border-cyan-500/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors relative min-h-[42px] min-w-[42px] flex items-center justify-center"
              title="Threat Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-lg bg-[#0a1020]/95 border border-cyan-500/40 shadow-nexus-cyan p-3 z-50 text-xs font-mono backdrop-blur-md">
                <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Notifications</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-semibold">
                    {unreadAlerts.length} Unresolved
                  </span>
                </div>

                <div className="py-2 space-y-1.5 max-h-56 overflow-y-auto">
                  {unreadAlerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowNotifications(false);
                        onViewChange?.('alerts');
                      }}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate">{alert.alert_type}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{alert.message}</p>
                    </div>
                  ))}
                  {unreadAlerts.length === 0 && (
                    <div className="py-4 text-center text-slate-500 text-[11px] flex items-center justify-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>All threat notifications triaged</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onViewChange?.('alerts');
                  }}
                  className="w-full mt-2 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 text-[10px] font-bold text-center transition-colors"
                >
                  Open Full Alerts Console &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Infrastructure Health Indicators */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
            {/* API Health */}
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400 text-[10px]">API:</span>
              <span className="text-emerald-400 font-bold text-[10px]">{health?.api === 'healthy' ? 'Online' : (health?.api || 'Online')}</span>
            </div>

            {/* PostgreSQL */}
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
              <Database className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-400 text-[10px]">DB:</span>
              <span className={health?.postgresql ? (health.postgresql.includes('connect') ? 'text-emerald-400 font-semibold text-[10px]' : 'text-rose-400 font-semibold text-[10px]') : 'text-emerald-400 font-semibold text-[10px]'}>
                {health?.postgresql ? (health.postgresql.includes('connect') ? 'Connected' : 'Offline') : 'Connected'}
              </span>
            </div>

            {/* Redis */}
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
              <Server className="w-3 h-3 text-purple-400" />
              <span className="text-slate-400 text-[10px]">Redis:</span>
              <span className={health?.redis ? (health.redis.includes('connect') ? 'text-emerald-400 font-semibold text-[10px]' : 'text-amber-400 font-semibold text-[10px]') : 'text-emerald-400 font-semibold text-[10px]'}>
                {health?.redis ? (health.redis.includes('connect') ? 'Connected' : 'Offline') : 'Connected'}
              </span>
            </div>

            {/* 5s Poll Pulse */}
            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-950 text-[10px] text-slate-400 border border-slate-800/80">
              <RefreshCw className={`w-3 h-3 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
              <span>5s</span>
            </div>
          </div>

          {/* Authenticated Operator Ribbon */}
          <div
            onClick={() => {
              if (window.innerWidth < 640 && onOpenMobileDrawer) {
                onOpenMobileDrawer();
              }
            }}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/20 text-xs font-mono shrink-0 cursor-pointer sm:cursor-default"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-semibold text-slate-200">{operator?.username || 'Not logged in'}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold ${getRoleBadgeColor(operator?.role)}`}>
              {formatRoleName(operator?.role)}
            </span>
            <button
              onClick={onOpenLogin}
              title="Switch operator account or engage emergency break-glass"
              className="hidden sm:inline text-[10px] text-cyan-400 hover:text-cyan-300 ml-0.5 px-1.5 py-0.2 rounded bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/40 transition-colors"
            >
              Switch
            </button>
            <button
              onClick={() => logout()}
              title="Sign out of current session"
              className="hidden sm:inline text-slate-400 hover:text-rose-400 p-0.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
