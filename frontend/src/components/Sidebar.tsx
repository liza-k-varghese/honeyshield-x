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

  // Primary Operations Navigation
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

  // Secondary Defense & Management Group
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
      className={`hidden lg:flex bg-[#111C29] border-r border-[#1E2D3D] flex-col justify-between transition-all duration-200 z-20 shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div className="p-3.5 border-b border-[#1E2D3D] flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9] shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-wider text-[#F0F5F8] font-sans truncate block">
                  HONEYSHIELD X
                </span>
                <span className="text-[10px] text-[#94A6B8] font-mono block -mt-0.5 truncate">
                  Enterprise SOC
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto p-1.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9]">
              <Shield className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
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

        {/* Navigation Content Area */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Primary Operations Group */}
          <div className="px-2 space-y-1">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A6B8] uppercase tracking-wider font-mono">
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
                      ? 'bg-[#192737] text-[#F0F5F8] font-semibold border-l-2 border-[#00D6C9] shadow-sm'
                      : 'text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#00D6C9]'
                          : 'text-[#94A6B8] group-hover:text-[#F0F5F8]'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {!collapsed && item.badge !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#EF6268]/20 text-[#EF6268] border border-[#EF6268]/40 font-bold shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Defense & Management Group */}
          <div className="px-2 pt-3 mt-2 border-t border-[#1E2D3D]/60 space-y-1">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A6B8] uppercase tracking-wider font-mono">
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
                      ? 'bg-[#192737] text-[#F0F5F8] font-semibold border-l-2 border-[#00D6C9] shadow-sm'
                      : 'text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#00D6C9]'
                          : 'text-[#94A6B8] group-hover:text-[#F0F5F8]'
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
          <div className="p-3 border-t border-[#1E2D3D] text-[11px] text-[#94A6B8] font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#48C99B]" />
              <span className="font-semibold text-[#F0F5F8]">HONEYSHIELD X</span>
            </span>
            <span className="text-[#5A6E82] text-[10px]">v1.0.0-rc5</span>
          </div>
        ) : (
          <div className="p-3 border-t border-[#1E2D3D] flex justify-center">
            <span className="w-2 h-2 rounded-full bg-[#48C99B]" title="System Operational" />
          </div>
        )}
      </div>
    </aside>
  );
};
