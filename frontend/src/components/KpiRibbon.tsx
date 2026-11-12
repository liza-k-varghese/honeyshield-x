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
      color: 'text-[#00D6C9]',
      bgColor: 'bg-[#00D6C9]/10',
      borderColor: 'border-[#1E2D3D] hover:border-[#00D6C9]/40',
      subtext: 'Containers recorded',
    },
    {
      label: 'Critical Alerts',
      value: stats?.active_alerts_by_severity?.critical ?? 0,
      icon: AlertTriangle,
      color: 'text-[#EF6268]',
      bgColor: 'bg-[#EF6268]/15',
      borderColor: 'border-[#1E2D3D] hover:border-[#EF6268]/40',
      subtext: 'Requires immediate triage',
    },
    {
      label: 'High Alerts',
      value: stats?.active_alerts_by_severity?.high ?? 0,
      icon: AlertCircle,
      color: 'text-[#E5B65A]',
      bgColor: 'bg-[#E5B65A]/15',
      borderColor: 'border-[#1E2D3D] hover:border-[#E5B65A]/40',
      subtext: 'Priority investigation',
    },
    {
      label: 'Medium Alerts',
      value: stats?.active_alerts_by_severity?.medium ?? 0,
      icon: Shield,
      color: 'text-[#E5B65A]',
      bgColor: 'bg-[#E5B65A]/10',
      borderColor: 'border-[#1E2D3D] hover:border-[#E5B65A]/30',
      subtext: 'Elevated anomalies',
    },
    {
      label: 'Low Alerts',
      value: stats?.active_alerts_by_severity?.low ?? 0,
      icon: Info,
      color: 'text-[#48C99B]',
      bgColor: 'bg-[#48C99B]/15',
      borderColor: 'border-[#1E2D3D] hover:border-[#48C99B]/40',
      subtext: 'Informational events',
    },
    {
      label: 'Monitored IPs',
      value: stats?.unique_attacker_ips_24h ?? 0,
      icon: Radio,
      color: 'text-[#A78BFA]',
      bgColor: 'bg-[#8B5CF6]/15',
      borderColor: 'border-[#1E2D3D] hover:border-[#8B5CF6]/40',
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
            className={`p-3.5 rounded-xl border bg-[#111C29] ${card.borderColor} flex flex-col justify-between shadow-soc-sm transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#94A6B8]">{card.label}</span>
              <div className={`p-1 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-[#F0F5F8]">
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-[#192737] animate-pulse rounded" />
                ) : (
                  card.value.toLocaleString()
                )}
              </div>
              <p className="text-[11px] text-[#94A6B8] truncate mt-0.5">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
