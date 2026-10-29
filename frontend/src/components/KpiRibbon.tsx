import React from 'react';
import { Shield, AlertTriangle, AlertCircle, Info, Radio, Crosshair } from 'lucide-react';
import { DashboardStats } from '../types';

interface KpiRibbonProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      label: 'Total Attacks',
      value: stats?.total_attacks ?? 0,
      icon: Crosshair,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      subtext: 'Containers recorded',
    },
    {
      label: 'Critical Alerts',
      value: stats?.active_alerts_by_severity?.critical ?? 0,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      subtext: 'Requires immediate triage',
    },
    {
      label: 'High Alerts',
      value: stats?.active_alerts_by_severity?.high ?? 0,
      icon: AlertCircle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      subtext: 'Priority investigation',
    },
    {
      label: 'Medium Alerts',
      value: stats?.active_alerts_by_severity?.medium ?? 0,
      icon: Shield,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      subtext: 'Elevated anomalies',
    },
    {
      label: 'Low Alerts',
      value: stats?.active_alerts_by_severity?.low ?? 0,
      icon: Info,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtext: 'Informational events',
    },
    {
      label: 'Monitored IPs',
      value: stats?.unique_attacker_ips_24h ?? 0,
      icon: Radio,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      subtext: 'Distinct sources (24h)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 my-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-3.5 rounded-lg border bg-slate-900/80 ${card.borderColor} flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <div className={`p-1 rounded ${card.bgColor} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-white">
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-slate-800 animate-pulse rounded" />
                ) : (
                  card.value.toLocaleString()
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
