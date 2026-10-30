import React from 'react';
import { ShieldCheck, Lock, Eye, Zap, Flame } from 'lucide-react';
import { CircularGauge } from './CircularGauge';
import { DashboardStats } from '../../types';

interface SecurityStatusPanelProps {
  stats?: DashboardStats;
}

export const SecurityStatusPanel: React.FC<SecurityStatusPanelProps> = ({ stats }) => {
  const activeAlerts = stats?.active_alerts ?? 0;
  const criticalCount = stats?.active_alerts_by_severity?.critical ?? 0;
  const highCount = stats?.active_alerts_by_severity?.high ?? 0;

  // Compute composite posture score
  // 100 max, reduced by critical (15) and high (8) alerts
  const computedScore = Math.max(
    15,
    Math.min(100, 100 - criticalCount * 12 - highCount * 5 - (activeAlerts > 5 ? 10 : 0))
  );

  let threatLevel = 'GUARDED';
  let threatColor = 'text-cyan-400';
  let threatBorder = 'border-cyan-500/40';
  let threatBg = 'bg-cyan-950/40';
  let gaugeColor: 'cyan' | 'green' | 'amber' | 'crimson' = 'cyan';

  if (criticalCount > 2) {
    threatLevel = 'DEFCON 1 // CRITICAL';
    threatColor = 'text-rose-400';
    threatBorder = 'border-rose-500/50';
    threatBg = 'bg-rose-950/50';
    gaugeColor = 'crimson';
  } else if (criticalCount > 0 || highCount > 2) {
    threatLevel = 'DEFCON 2 // ELEVATED';
    threatColor = 'text-amber-400';
    threatBorder = 'border-amber-500/50';
    threatBg = 'bg-amber-950/50';
    gaugeColor = 'amber';
  } else if (activeAlerts > 0) {
    threatLevel = 'DEFCON 3 // GUARDED';
    threatColor = 'text-cyan-400';
    threatBorder = 'border-cyan-500/40';
    threatBg = 'bg-cyan-950/40';
    gaugeColor = 'cyan';
  } else {
    threatLevel = 'DEFCON 5 // SECURE';
    threatColor = 'text-emerald-400';
    threatBorder = 'border-emerald-500/40';
    threatBg = 'bg-emerald-950/40';
    gaugeColor = 'green';
  }

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-3.5 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>Security Status</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Autonomous Defense & Posture Index</p>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${threatBg} ${threatColor} ${threatBorder}`}>
          {threatLevel}
        </span>
      </div>

      {/* Main Posture Dial & Level Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-4 border-b border-cyan-500/10">
        <div className="relative">
          <CircularGauge
            value={computedScore}
            label="Defense Posture"
            subLabel="INDEX"
            size={100}
            strokeWidth={8}
            color={gaugeColor}
            unit="%"
          />
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center space-x-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Threat Threshold</span>
              </span>
              <span className="text-rose-400 font-bold">{criticalCount > 0 ? 'HIGH SEVERITY ACTIVE' : 'NOMINAL'}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-1.5 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(15, activeAlerts * 15))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block">Critical Probes</span>
              <span className="text-rose-400 font-bold text-sm">{criticalCount}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block">High Alert</span>
              <span className="text-amber-400 font-bold text-sm">{highCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Defensive Capabilities Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-[10px] font-mono">
        <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center space-x-2">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-slate-500 text-[9px]">Containment</div>
            <div className="text-slate-200 font-semibold">Automated</div>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center space-x-2">
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <div>
            <div className="text-slate-500 text-[9px]">Canary Grid</div>
            <div className="text-purple-300 font-semibold">100% Armed</div>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center space-x-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="text-slate-500 text-[9px]">Mitigation MTTR</div>
            <div className="text-emerald-300 font-semibold">&lt; 1.2s</div>
          </div>
        </div>
      </div>
    </div>
  );
};
