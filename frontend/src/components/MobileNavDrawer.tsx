import React from 'react';
import {
  X,
  Shield,
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

  const navItems = [
    {
      id: 'overview' as SidebarNavId,
      label: 'Overview',
      desc: 'SOC Command Centre',
      icon: LayoutDashboard,
      system: 'SYS 1',
    },
    {
      id: 'analytics' as SidebarNavId,
      label: 'Analytics',
      desc: 'KPI Ribbon & Attack Stats',
      icon: BarChart3,
      system: 'SYS 1',
    },
    {
      id: 'detection' as SidebarNavId,
      label: 'Attack Detection',
      desc: 'Rule Catalog & Replay',
      icon: Crosshair,
      system: 'SYS 1',
    },
    {
      id: 'network' as SidebarNavId,
      label: 'Network',
      desc: 'Live Command & SSE Stream',
      icon: Radio,
      system: 'SYS 1',
    },
    {
      id: 'honeypots' as SidebarNavId,
      label: 'Honeypots',
      desc: 'Deception Grid & Canaries',
      icon: Target,
      system: 'SYS 2',
    },
    {
      id: 'intel' as SidebarNavId,
      label: 'Threat Intelligence',
      desc: 'IOC Fusion & Feeds',
      icon: Globe,
      system: 'SYS 3',
    },
    {
      id: 'ai' as SidebarNavId,
      label: 'AI Analysis',
      desc: 'Campaigns & Threat Hunting',
      icon: BrainCircuit,
      system: 'SYS 3',
    },
    {
      id: 'alerts' as SidebarNavId,
      label: 'Alerts',
      desc: 'Incident Triage & Prioritization',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : undefined,
      system: 'SYS 1',
    },
    {
      id: 'forensics' as SidebarNavId,
      label: 'Forensics',
      desc: 'Attacker IP Dossier Deep-Dive',
      icon: Search,
      system: 'SYS 1',
    },
    {
      id: 'systems' as SidebarNavId,
      label: 'Systems',
      desc: 'SIEM-SOAR Integrations & DLQ',
      icon: Server,
      system: 'SYS 1',
    },
    {
      id: 'config' as SidebarNavId,
      label: 'Configuration',
      desc: 'Operator Audit Trail & Rules',
      icon: Sliders,
      system: 'SYS 1',
    },
  ];

  const handleItemClick = (id: SidebarNavId) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-sm bg-[#060913] border-r border-cyan-500/25 shadow-2xl flex flex-col justify-between h-full z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-cyan-500/20 bg-[#0a1020]/90 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <Shield className="w-5 h-5 drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
            </div>
            <div>
              <div className="text-sm font-extrabold font-mono text-white tracking-wider flex items-center">
                <span>HoneyShield</span>
                <span className="text-cyan-400 ml-1">X</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 block -mt-0.5">
                MOBILE SOC CONSOLE
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
            System Modules (11)
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full min-h-[46px] p-2.5 rounded-lg flex items-center justify-between transition-all font-mono text-xs ${
                  isActive
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 shadow-nexus-cyan font-bold'
                    : 'text-slate-300 hover:bg-slate-900/60 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`p-1.5 rounded ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="truncate font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate font-normal">
                      {item.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50">
                      {item.badge}
                    </span>
                  )}
                  <span
                    className={`text-[8px] px-1 py-0.5 rounded font-mono ${
                      item.system === 'SYS 1'
                        ? 'bg-slate-900 text-slate-500'
                        : item.system === 'SYS 2'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                    }`}
                  >
                    {item.system}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer: Operator & Session */}
        <div className="p-3 border-t border-cyan-500/20 bg-[#0a1020]/90 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-semibold text-slate-200">
                  {operator?.username || 'Not logged in'}
                </div>
                <div className="text-[10px] text-cyan-400 uppercase">
                  {operator?.role || 'Viewer'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {onOpenLogin && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="px-2 py-1 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-[10px] font-semibold min-h-[36px]"
                >
                  Switch
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 text-center">
            SYS 1 FROZEN &bull; BASELINE v1.0.0-system1-mvp
          </div>
        </div>
      </div>
    </div>
  );
};

