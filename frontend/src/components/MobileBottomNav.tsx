import React from 'react';
import { LayoutDashboard, Bell, Radio, Server, Menu } from 'lucide-react';
import { SidebarNavId } from './Sidebar';

interface MobileBottomNavProps {
  activeId: SidebarNavId;
  onSelect: (id: SidebarNavId) => void;
  onOpenDrawer: () => void;
  alertCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeId,
  onSelect,
  onOpenDrawer,
  alertCount = 0,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050814]/95 border-t border-cyan-500/20 backdrop-blur-lg z-40 select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-14 items-center max-w-lg mx-auto px-1">
        {/* Overview */}
        <button
          onClick={() => onSelect('overview')}
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors relative min-h-[44px] ${
            activeId === 'overview'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Command Overview"
        >
          <LayoutDashboard className="w-5 h-5 drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" />
          <span className="text-[10px] font-mono mt-0.5 tracking-tight">Overview</span>
          {activeId === 'overview' && (
            <span className="absolute top-0 w-8 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#00f0ff]" />
          )}
        </button>

        {/* Alerts */}
        <button
          onClick={() => onSelect('alerts')}
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors relative min-h-[44px] ${
            activeId === 'alerts'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Alerts Feed"
        >
          <div className="relative">
            <Bell className="w-5 h-5 drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {alertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono mt-0.5 tracking-tight">Alerts</span>
          {activeId === 'alerts' && (
            <span className="absolute top-0 w-8 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#00f0ff]" />
          )}
        </button>

        {/* Network / Command */}
        <button
          onClick={() => onSelect('network')}
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors relative min-h-[44px] ${
            activeId === 'network'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Network Live Command"
        >
          <Radio className="w-5 h-5 drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" />
          <span className="text-[10px] font-mono mt-0.5 tracking-tight">Network</span>
          {activeId === 'network' && (
            <span className="absolute top-0 w-8 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#00f0ff]" />
          )}
        </button>

        {/* Systems / Integrations */}
        <button
          onClick={() => onSelect('systems')}
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors relative min-h-[44px] ${
            activeId === 'systems'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Systems Integrations"
        >
          <Server className="w-5 h-5 drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" />
          <span className="text-[10px] font-mono mt-0.5 tracking-tight">Systems</span>
          {activeId === 'systems' && (
            <span className="absolute top-0 w-8 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#00f0ff]" />
          )}
        </button>

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center h-full w-full py-1 text-slate-400 hover:text-cyan-300 transition-colors relative min-h-[44px]"
          title="Open Full Modules Menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-mono mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};

