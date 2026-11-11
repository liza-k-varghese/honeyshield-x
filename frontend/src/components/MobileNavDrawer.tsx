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
      desc: 'Active deception grid sensors',
      icon: Target,
    },
    {
      id: 'intel' as SidebarNavId,
      label: 'Threat Intelligence',
      desc: 'STIX 2.1 & IOC adversary profiling',
      icon: Globe,
    },
    {
      id: 'forensics' as SidebarNavId,
      label: 'Forensic Investigations',
      desc: 'Attacker entity deep dive',
      icon: Search,
    },
    {
      id: 'universe' as SidebarNavId,
      label: 'Digital Agent Universe',
      desc: 'Spatial SOC & real-time telemetry',
      icon: Sparkles,
      highlight: true,
    },
  ];

  const secondaryItems = [
    {
      id: 'network' as SidebarNavId,
      label: 'Network Command',
      desc: 'Incident response orchestrator',
      icon: Radio,
    },
    {
      id: 'detection' as SidebarNavId,
      label: 'Attack Detection',
      desc: 'Detection rules & replay studio',
      icon: Crosshair,
    },
    {
      id: 'ai' as SidebarNavId,
      label: 'AI Analysis',
      desc: 'Campaign clusters & threat hunting',
      icon: BrainCircuit,
    },
    {
      id: 'systems' as SidebarNavId,
      label: 'Defensive Integrations',
      desc: 'SIEM-SOAR webhook gateways',
      icon: Server,
    },
    {
      id: 'config' as SidebarNavId,
      label: 'Configuration & Audit',
      desc: 'Platform governance & audit trail',
      icon: Sliders,
    },
  ];

  const handleItemClick = (id: SidebarNavId) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-80 max-w-[85vw] bg-[#111C29] border-r border-[#1E2D3D] shadow-soc-lg flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1E2D3D] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 text-[#00D6C9]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wider text-[#F0F5F8] block">
                MOBILE SOC CONSOLE
              </span>
              <span className="text-[10px] text-[#94A6B8] font-mono block -mt-0.5">
                System Modules (11)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Operations Group */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#94A6B8] px-2 py-1">
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
                        ? 'bg-[#192737] text-[#F0F5F8] font-semibold border-l-2 border-[#00D6C9]'
                        : 'text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#00D6C9]' : 'text-[#94A6B8]'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{item.label}</span>
                        <span className="text-[10px] text-[#94A6B8] truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    {item.badge !== undefined ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#EF6268]/20 text-[#EF6268] border border-[#EF6268]/40 font-bold shrink-0">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#5A6E82] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Defense & Config Group */}
          <div className="pt-2 border-t border-[#1E2D3D]/60">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#94A6B8] px-2 py-1">
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
                        ? 'bg-[#192737] text-[#F0F5F8] font-semibold border-l-2 border-[#00D6C9]'
                        : 'text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#00D6C9]' : 'text-[#94A6B8]'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{item.label}</span>
                        <span className="text-[10px] text-[#94A6B8] truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#5A6E82] shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer: Operator info */}
        <div className="p-3 border-t border-[#1E2D3D] bg-[#080D14]">
          {operator ? (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/30 flex items-center justify-center font-bold text-[10px]">
                  {operator.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-[#F0F5F8] font-medium block truncate">
                    {operator.username}
                  </span>
                  <span className="text-[10px] text-[#94A6B8] font-mono capitalize block truncate">
                    {operator.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-[#94A6B8] hover:text-[#EF6268] hover:bg-[#192737] transition-colors"
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
              className="w-full py-2 bg-[#00D6C9] hover:bg-[#00BFB3] text-[#080D14] rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
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
