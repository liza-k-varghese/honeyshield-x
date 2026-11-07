import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Target,
  Globe,
  Search,
  Sparkles,
  Radio,
  Crosshair,
  BrainCircuit,
  Server,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
} from 'lucide-react';

export type SidebarNavId =
  | 'overview'
  | 'landing'
  | 'universe'
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

  // Primary Operations Navigation (Mandated Core Views)
  const primaryNavItems = [
    {
      id: 'overview' as SidebarNavId,
      label: 'Overview',
      subtitle: 'Executive SOC',
      icon: LayoutDashboard,
    },
    {
      id: 'alerts' as SidebarNavId,
      label: 'Alerts',
      subtitle: 'Threats & Triage',
      icon: ShieldAlert,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      id: 'honeypots' as SidebarNavId,
      label: 'Honeypots',
      subtitle: 'Deception Sensors',
      icon: Target,
    },
    {
      id: 'intel' as SidebarNavId,
      label: 'Threat Intelligence',
      subtitle: 'STIX 2.1 & IOCs',
      icon: Globe,
    },
    {
      id: 'forensics' as SidebarNavId,
      label: 'Forensics',
      subtitle: 'Investigations',
      icon: Search,
    },
    {
      id: 'universe' as SidebarNavId,
      label: 'Digital Universe',
      subtitle: 'Spatial Stage',
      icon: Sparkles,
      highlight: true,
    },
  ];

  // Secondary Contextual Tools & Administration
  const secondaryNavItems = [
    {
      id: 'network' as SidebarNavId,
      label: 'Network',
      subtitle: 'Incident Command',
      icon: Radio,
    },
    {
      id: 'detection' as SidebarNavId,
      label: 'Attack Detection',
      subtitle: 'Rules & Catalog',
      icon: Crosshair,
    },
    {
      id: 'ai' as SidebarNavId,
      label: 'AI Analysis',
      subtitle: 'Campaigns & AI',
      icon: BrainCircuit,
    },
    {
      id: 'analytics' as SidebarNavId,
      label: 'Analytics',
      subtitle: 'Reporting',
      icon: BarChart3,
    },
    {
      id: 'systems' as SidebarNavId,
      label: 'Systems',
      subtitle: 'Integrations',
      icon: Server,
    },
    {
      id: 'config' as SidebarNavId,
      label: 'Configuration',
      subtitle: 'Settings & Audit',
      icon: Sliders,
    },
  ];

  return (
    <aside
      className={`hidden lg:flex bg-[#0B1020]/95 border-r border-slate-800/80 backdrop-blur-md flex-col justify-between transition-all duration-200 z-20 shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-wider text-white font-sans truncate block">
                  HONEYSHIELD X
                </span>
                <span className="text-[10px] text-slate-400 font-mono block -mt-0.5 truncate">
                  Unified SOC
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Primary Operations Group */}
        <div className="p-2 space-y-1">
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Operations
            </div>
          )}

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg transition-colors text-xs font-medium group relative ${
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? item.highlight ? 'text-cyan-400' : 'text-cyan-400'
                        : item.highlight ? 'text-cyan-400/80 group-hover:text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Defense & Management Group */}
        <div className="p-2 pt-3 border-t border-slate-800/60 space-y-1">
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Defense & Config
            </div>
          )}

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg transition-colors text-xs font-medium group relative ${
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-cyan-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / System Status indicator */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>HONEYSHIELD X</span>
          </span>
          <span className="text-slate-400 text-[10px]">v1.0.0-rc5</span>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-800/80 flex justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="System Operational" />
        </div>
      )}
    </aside>
  );
};
