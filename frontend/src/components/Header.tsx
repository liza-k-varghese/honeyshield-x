import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SystemHealth, Alert } from '../types';
import { useAuth } from '../context/AuthContext';

export type TopNavView =
  | 'overview'
  | 'landing'
  | 'universe'
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
  onSearchSubmit?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  isFetching = false,
  activeView = 'overview',
  onViewChange,
  onOpenLogin,
  alerts = [],
  onOpenMobileDrawer,
  onSearchSubmit,
}) => {
  const { operator, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter((a) => a.status === 'open');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Page title mapping based on activeView
  const getPageTitle = (view: string) => {
    switch (view) {
      case 'overview':
        return { title: 'Security Overview', category: 'Operations' };
      case 'universe':
        return { title: 'Digital Agent Universe', category: 'Spatial SOC' };
      case 'alerts':
        return { title: 'Threats & Alerts', category: 'Operations' };
      case 'deception':
        return { title: 'Honeypots & Deception Grid', category: 'Defense' };
      case 'intel':
        return { title: 'Threat Intelligence', category: 'Intelligence' };
      case 'investigation':
        return { title: 'Forensic Investigations', category: 'Analysis' };
      case 'command':
        return { title: 'Incident Command', category: 'Response' };
      case 'cases':
        return { title: 'Case Management', category: 'Operations' };
      case 'campaigns':
      case 'hunts':
        return { title: 'AI Threat Hunting & Campaigns', category: 'Intelligence' };
      case 'integrations':
        return { title: 'Defensive Integrations & SIEM', category: 'Configuration' };
      case 'rules':
        return { title: 'Detection Rules & Replay', category: 'Configuration' };
      case 'analytics':
      case 'dashboard':
        return { title: 'Analytics & Reporting', category: 'Metrics' };
      default:
        return { title: 'HoneyShield X Console', category: 'Operations' };
    }
  };

  const pageInfo = getPageTitle(activeView);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery.trim());
      } else if (onViewChange) {
        onViewChange('investigation');
      }
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'security_administrator':
      case 'admin':
        return 'Admin';
      case 'incident_responder':
      case 'responder':
        return 'Responder';
      case 'threat_analyst':
      case 'analyst':
        return 'Analyst';
      case 'readonly_observer':
      case 'viewer':
        return 'Viewer';
      default:
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Operator';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'security_administrator':
      case 'admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'incident_responder':
      case 'responder':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'threat_analyst':
      case 'analyst':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'viewer':
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="bg-[#0B1020]/95 border-b border-slate-800/80 px-3 sm:px-6 py-2.5 backdrop-blur-md sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Mobile Drawer Trigger + Breadcrumb / Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileDrawer && (
            <button
              onClick={onOpenMobileDrawer}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumb Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-block text-xs font-mono text-slate-500 shrink-0">
              {pageInfo.category} /
            </span>
            <h2 className="text-sm font-semibold text-white tracking-tight truncate font-sans">
              {pageInfo.title}
            </h2>
            {isFetching && (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 hidden sm:inline-block" />
            )}
          </div>
        </div>

        {/* Center: Search Bar (Global Quick-Investigate) */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="w-full relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search IP address, IOC hash, or event..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </form>
        </div>

        {/* Right: Status Pill, Notifications & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* System Health Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                (health?.offline_services ?? 0) > 0 || health?.api === 'down' || health?.postgresql === 'down'
                  ? 'bg-rose-500'
                  : (health?.degraded_services ?? 0) > 0 || health?.api === 'degraded'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-slate-300 text-[11px]">
              {(health?.offline_services ?? 0) > 0 || health?.api === 'down' || health?.postgresql === 'down'
                ? 'System Critical'
                : (health?.degraded_services ?? 0) > 0 || health?.api === 'degraded'
                ? 'System Degraded'
                : 'System Online'}
            </span>
          </div>

          {/* Notifications Trigger */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center font-mono animate-pulse">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-3 z-50 text-xs font-sans">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="font-semibold text-white">Security Alerts</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {unreadAlerts.length} requiring triage
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unreadAlerts.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Zero open alerts</span>
                    </div>
                  ) : (
                    unreadAlerts.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (onViewChange) onViewChange('alerts');
                        }}
                        className="p-2 rounded bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                            a.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {a.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {a.notified_at ? new Date(a.notified_at).toLocaleTimeString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-slate-200 mt-1 truncate font-medium">
                          {a.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {unreadAlerts.length > 0 && (
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      if (onViewChange) onViewChange('alerts');
                    }}
                    className="w-full mt-2.5 pt-2 border-t border-slate-800 text-center text-cyan-400 hover:text-cyan-300 font-medium text-[11px] block transition-colors"
                  >
                    View all in Alerts Console →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Profile / Menu */}
          <div className="relative" ref={userMenuRef}>
            {operator ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold font-mono text-[10px]">
                    {operator.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-medium hidden sm:inline-block">
                    {operator.username}
                  </span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border hidden md:inline-block ${getRoleColor(operator.role)}`}>
                    {getRoleLabel(operator.role)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono px-1"
                >
                  Switch
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* User Dropdown */}
            {showUserMenu && operator && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 z-50 text-xs font-sans">
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                  <p className="font-semibold text-white">{operator.username}</p>
                  <p className="text-[10px] text-slate-400 font-mono capitalize">{operator.role}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-2 py-1.5 text-red-400 hover:bg-slate-800 rounded flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
