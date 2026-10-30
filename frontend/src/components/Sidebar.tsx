import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Crosshair,
  Radio,
  Target,
  Globe,
  BrainCircuit,
  Bell,
  Search,
  Server,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

export type SidebarNavId =
  | 'overview'
  | 'analytics'
  | 'detection'
  | 'network'
  | 'honeypots'
  | 'intel'
  | 'ai'
  | 'alerts'
  | 'forensics'
  | 'systems'
  | 'config';

interface SidebarProps {
  activeId: SidebarNavId;
  onSelect: (id: SidebarNavId) => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeId,
  onSelect,
  alertCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      id: 'overview' as SidebarNavId,
      label: 'Overview',
      icon: LayoutDashboard,
      system: 'SYS 1',
    },
    {
      id: 'analytics' as SidebarNavId,
      label: 'Analytics',
      icon: BarChart3,
      system: 'SYS 1',
    },
    {
      id: 'detection' as SidebarNavId,
      label: 'Attack Detection',
      icon: Crosshair,
      system: 'SYS 1',
    },
    {
      id: 'network' as SidebarNavId,
      label: 'Network',
      icon: Radio,
      system: 'SYS 1',
    },
    {
      id: 'honeypots' as SidebarNavId,
      label: 'Honeypots',
      icon: Target,
      system: 'SYS 2',
    },
    {
      id: 'intel' as SidebarNavId,
      label: 'Threat Intelligence',
      icon: Globe,
      system: 'SYS 3',
    },
    {
      id: 'ai' as SidebarNavId,
      label: 'AI Analysis',
      icon: BrainCircuit,
      system: 'SYS 3',
    },
    {
      id: 'alerts' as SidebarNavId,
      label: 'Alerts',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : undefined,
      system: 'SYS 1',
    },
    {
      id: 'forensics' as SidebarNavId,
      label: 'Forensics',
      icon: Search,
      system: 'SYS 1',
    },
    {
      id: 'systems' as SidebarNavId,
      label: 'Systems',
      icon: Server,
      system: 'SYS 1',
    },
    {
      id: 'config' as SidebarNavId,
      label: 'Configuration',
      icon: Sliders,
      system: 'SYS 1',
    },
  ];

  return (
    <aside
      className={`hidden lg:flex bg-[#050814]/95 border-r border-cyan-500/15 backdrop-blur-md flex-col justify-between transition-all duration-300 z-20 shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div>
        {/* Top Header / Branding minimal */}
        <div className="p-3 border-b border-cyan-500/15 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold font-mono tracking-wider text-white">
                  HONEYSHIELD
                </span>
                <span className="text-[10px] block font-mono text-cyan-400 -mt-0.5">
                  COMMAND CORE
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto p-1 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg transition-all text-xs font-mono group relative ${
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(0,240,255,0.6)]'
                        : 'text-slate-400 group-hover:text-cyan-300'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate tracking-wide">{item.label}</span>
                  )}
                </div>

                {!collapsed && (
                  <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {item.badge}
                      </span>
                    )}
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                        item.system === 'SYS 1'
                          ? 'bg-slate-900 text-slate-500'
                          : item.system === 'SYS 2'
                          ? 'bg-emerald-950/60 text-emerald-400/80 border border-emerald-800/40'
                          : 'bg-purple-950/60 text-purple-400/80 border border-purple-800/40'
                      }`}
                    >
                      {item.system}
                    </span>
                  </div>
                )}

                {/* Collapsed Badge Dot */}
                {collapsed && item.badge !== undefined && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer System Status */}
      <div className="p-3 border-t border-cyan-500/15 text-[10px] font-mono">
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>DEFENSE ENGINE</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="text-[9px] text-slate-400">
              3 Systems Federated
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

