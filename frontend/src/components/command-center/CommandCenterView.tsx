import React from 'react';
import { SystemOverviewPanel } from './SystemOverviewPanel';
import { GlobalThreatMapPanel } from './GlobalThreatMapPanel';
import { SecurityStatusPanel } from './SecurityStatusPanel';
import { AttackActivityPanel } from './AttackActivityPanel';
import { ThreatDetectionPanel } from './ThreatDetectionPanel';
import { NetworkActivityPanel } from './NetworkActivityPanel';
import { SystemHealthPanel } from './SystemHealthPanel';
import { DashboardStats, Alert, Attack } from '../../types';

interface CommandCenterViewProps {
  stats?: DashboardStats;
  alerts?: Alert[];
  attacks?: Attack[];
  onSelectAlert?: (alert: Alert) => void;
  onInvestigateIp?: (ip: string) => void;
  onReplayAttack?: (attackId: number) => void;
  onSelectAttack?: (attackId: number) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  stats,
  alerts = [],
  attacks = [],
  onSelectAlert,
  onInvestigateIp,
  onReplayAttack,
  onSelectAttack,
}) => {
  return (
    <div className="space-y-5 pb-8">
      {/* Top Grid: System Overview & Global Threat Network Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 flex flex-col">
          <SystemOverviewPanel
            health={stats?.system_health}
            totalAttacks={stats?.total_attacks ?? attacks.length}
            activeAlerts={stats?.active_alerts ?? alerts.length}
          />
        </div>
        <div className="lg:col-span-7 flex flex-col">
          <GlobalThreatMapPanel
            alerts={alerts}
            attacks={attacks}
            onInvestigateIp={onInvestigateIp}
          />
        </div>
      </div>

      {/* Middle Grid: Security Status, Attack Activity, Threat Detection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="flex flex-col">
          <SecurityStatusPanel stats={stats} />
        </div>
        <div className="flex flex-col">
          <AttackActivityPanel
            attacks={attacks}
            onInvestigateIp={onInvestigateIp}
            onSelectAttack={onSelectAttack}
          />
        </div>
        <div className="flex flex-col md:col-span-2 lg:col-span-1">
          <ThreatDetectionPanel
            alerts={alerts}
            onSelectAlert={onSelectAlert}
            onInvestigateIp={onInvestigateIp}
            onReplayAttack={onReplayAttack}
          />
        </div>
      </div>

      {/* Bottom Grid: Network Activity & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 flex flex-col">
          <NetworkActivityPanel totalAttacks={stats?.total_attacks ?? attacks.length} />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <SystemHealthPanel health={stats?.system_health} />
        </div>
      </div>
    </div>
  );
};
