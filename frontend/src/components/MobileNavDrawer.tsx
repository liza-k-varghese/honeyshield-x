import React from 'react';
import {
  X,
  Shield,
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
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { SidebarNavId } from './Sidebar';
import { useAuth } from '../context/AuthContext';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeId: SidebarNavId;
  onSelect: (id: SidebarNavId) => void;
  alertCount?: number;
  onOpenLogin?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeId,
  onSelect,
  alertCount = 0,
  onOpenLogin,
}) => {
  const { operator, logout } = useAuth();

  if (!isOpen) return null;

  const primaryItems = [
    {
      id: 'overview' as SidebarNavId,
      label: 'Security Overview',
      desc: 'Operations at a glance',
      icon: LayoutDashboard,
    },
    {
      id: 'alerts' as SidebarNavId,
      label: 'Threats & Alerts',
      desc: 'Incident triage & prioritization',
      icon: ShieldAlert,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      id: 'honeypots' as SidebarNavId,
      label: 'Honeypots',
      desc: 'Active deception grid',
      icon: Target,
    },
    {
      id: 'intel' as SidebarNavId,
      label: 'Threat Intelligence',
      desc: 'STIX/TAXII indicator fusion',
      icon: Globe,
    },
    {
      id: 'forensics' as SidebarNavId,
      label: 'Investigations',
      desc: 'Forensics & IP search',
      icon: Search,
    },
    {
      id: 'universe' as SidebarNavId,
      label: 'Digital Universe',
      desc: 'Interactive 4-agent defense',
      icon: Sparkles,
      highlight: true,
    },
  ];

  const secondaryItems = [
    {
      id: 'network' as SidebarNavId,
      label: 'Incident Command',
      desc: 'Live war room & containment',
      icon: Radio,
    },
    {
      id: 'detection' as SidebarNavId,
      label: 'Detection Rules',
      desc: 'Rule catalog & replay',
      icon: Crosshair,
    },
    {
      id: 'ai' as SidebarNavId,
      label: 'Campaigns & AI',
      desc: 'Campaign tracking & hunting',
      icon: BrainCircuit,
    },
    {
      id: 'systems' as SidebarNavId,
      label: 'Integrations',
      desc: 'SIEM & SOAR connectors',
      icon: Server,
    },
    {
      id: 'config' as SidebarNavId,
      label: 'Settings & Audit',
      desc: 'Configuration & audit logs',
      icon: Sliders,
    },
  ];

  const handleItemClick = (id: SidebarNavId) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex select-none">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-xs bg-[#0B1020] border-r border-slate-800 shadow-2xl flex flex-col justify-between h-full z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0E1526] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold font-sans text-white tracking-wider">
                MOBILE SOC CONSOLE
              </div>
              <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                System Modules (11)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Operations Group */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1">
              Operations
            </div>
            <div className="space-y-1 mt-1">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-cyan-400'
                            : item.highlight
                            ? 'text-cyan-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{item.label}</span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    {item.badge !== undefined ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold shrink-0">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Defense & Config Group */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1">
              Defense & Config
            </div>
            <div className="space-y-1 mt-1">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{item.label}</span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer: Operator info */}
        <div className="p-3 border-t border-slate-800 bg-[#0E1526]">
          {operator ? (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">
                  {operator.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-white font-medium block truncate">
                    {operator.username}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono capitalize block truncate">
                    {operator.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenLogin) onOpenLogin();
                onClose();
              }}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Sign In to SOC</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
