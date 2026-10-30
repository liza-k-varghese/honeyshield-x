import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CircularGauge } from '../command-center/CircularGauge';
import { NeonChart } from '../command-center/NeonChart';
import { SystemOverviewPanel } from '../command-center/SystemOverviewPanel';
import { GlobalThreatMapPanel } from '../command-center/GlobalThreatMapPanel';
import { SecurityStatusPanel } from '../command-center/SecurityStatusPanel';
import { AttackActivityPanel } from '../command-center/AttackActivityPanel';
import { ThreatDetectionPanel } from '../command-center/ThreatDetectionPanel';
import { NetworkActivityPanel } from '../command-center/NetworkActivityPanel';
import { SystemHealthPanel } from '../command-center/SystemHealthPanel';
import { BottomStatusBar } from '../command-center/BottomStatusBar';
import { Sidebar } from '../Sidebar';
import { MobileBottomNav } from '../MobileBottomNav';
import { MobileNavDrawer } from '../MobileNavDrawer';
import { AuthProvider } from '../../context/AuthContext';
import { Alert, Attack, DashboardStats } from '../../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/client', () => ({
  updateAlertStatus: vi.fn().mockResolvedValue({}),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockStats: DashboardStats = {
  total_attacks: 42,
  active_alerts: 4,
  active_alerts_by_severity: {
    critical: 1,
    high: 2,
    medium: 1,
    low: 0,
  },
  unique_attacker_ips_24h: 3,
  system_health: {
    api: 'Online',
    postgresql: 'connected',
    redis: 'connected',
  },
};

const mockAlerts: Alert[] = [
  {
    id: 101,
    attack_id: 12,
    alert_type: 'SSH Brute Force',
    severity: 'critical',
    message: 'High frequency SSH auth failures from 198.51.100.23',
    status: 'open',
    created_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 102,
    attack_id: 13,
    alert_type: 'SQL Injection',
    severity: 'high',
    message: 'SQL payload in HTTP GET from 203.0.113.15',
    status: 'acknowledged',
    created_at: '2026-10-30T10:05:00Z',
  },
];

const mockAttacks: Attack[] = [
  {
    id: 12,
    attack_type: 'SSH Brute Force',
    source_ip: '198.51.100.23',
    destination_ip: '10.0.0.1',
    protocol: 'TCP',
    severity: 'critical',
    risk_score: 9.2,
    status: 'detected',
    detected_at: '2026-10-30T10:00:00Z',
  },
];

describe('NEXUS SOC Command Centre Components', () => {
  it('renders CircularGauge with correct percentage and labels', () => {
    render(
      <CircularGauge
        value={78}
        label="Test Metric"
        subLabel="SUB"
        color="cyan"
        unit="%"
      />
    );
    expect(screen.getByText('78')).toBeDefined();
    expect(screen.getByText('Test Metric')).toBeDefined();
    expect(screen.getByText('SUB')).toBeDefined();
  });

  it('renders NeonChart with time points and units', () => {
    const data = [
      { label: '00:00', value: 10, secondaryValue: 4 },
      { label: '04:00', value: 25, secondaryValue: 8 },
    ];
    render(<NeonChart data={data} height={100} color="dual" unit="evt/s" />);
    expect(screen.getByText('00:00')).toBeDefined();
    expect(screen.getByText('04:00')).toBeDefined();
    expect(screen.getByText('Primary (evt/s)')).toBeDefined();
  });

  it('renders SystemOverviewPanel with host resource meters and processes', () => {
    render(
      <SystemOverviewPanel
        health={mockStats.system_health}
        totalAttacks={mockStats.total_attacks}
        activeAlerts={mockStats.active_alerts}
      />
    );
    expect(screen.getByText('System Overview')).toBeDefined();
    expect(screen.getByText('CPU Load')).toBeDefined();
    expect(screen.getByText('Memory')).toBeDefined();
    expect(screen.getByText('Storage')).toBeDefined();
    expect(screen.getByText('FastAPI REST Gateway')).toBeDefined();
  });

  it('renders GlobalThreatMapPanel with world map and attacker nodes', () => {
    const onInvestigate = vi.fn();
    render(
      <GlobalThreatMapPanel
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={onInvestigate}
      />
    );
    expect(screen.getByText('Global Threat Network')).toBeDefined();
    expect(screen.getByText('HONEYSHIELD-X CORE')).toBeDefined();
  });

  it('renders SecurityStatusPanel with posture index and DEFCON level', () => {
    render(<SecurityStatusPanel stats={mockStats} />);
    expect(screen.getByText('Security Status')).toBeDefined();
    expect(screen.getByText('Defense Posture')).toBeDefined();
    expect(screen.getByText(/DEFCON/)).toBeDefined();
  });

  it('renders AttackActivityPanel with incident stream', () => {
    render(<AttackActivityPanel attacks={mockAttacks} />);
    expect(screen.getByText('Attack Activity')).toBeDefined();
    expect(screen.getByText('SSH Brute Force')).toBeDefined();
    expect(screen.getByText('198.51.100.23')).toBeDefined();
  });

  it('renders ThreatDetectionPanel and handles alert filtering', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ThreatDetectionPanel alerts={mockAlerts} />
      </Wrapper>
    );
    expect(screen.getByText('Threat Detection')).toBeDefined();
    expect(screen.getByText('SSH Brute Force')).toBeDefined();
    expect(screen.getByText('SQL Injection')).toBeDefined();

    // Click critical filter pill
    const critBtn = screen.getByRole('button', { name: /critical/i });
    fireEvent.click(critBtn);
    expect(screen.getByText('SSH Brute Force')).toBeDefined();
  });

  it('renders NetworkActivityPanel with dual ingress/egress throughput', () => {
    render(<NetworkActivityPanel totalAttacks={mockStats.total_attacks} />);
    expect(screen.getByText('Network Activity')).toBeDefined();
    expect(screen.getByText('Ingress Traffic')).toBeDefined();
    expect(screen.getByText('Egress Decoy Stream')).toBeDefined();
    expect(screen.getByText(/SSH \(22\)/)).toBeDefined();
  });

  it('renders SystemHealthPanel with DB, Redis, API, and Sensors', () => {
    render(<SystemHealthPanel health={mockStats.system_health} />);
    expect(screen.getByText('System Health')).toBeDefined();
    expect(screen.getAllByText('PostgreSQL DB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Redis Cache').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('FastAPI Core').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SOC Sensors').length).toBeGreaterThanOrEqual(1);
  });

  it('renders BottomStatusBar with uptime, latency, and frozen baseline', () => {
    render(<BottomStatusBar />);
    expect(screen.getByText('HONEYSHIELD X')).toBeDefined();
    expect(screen.getByText('SYS-1 OPERATIONAL')).toBeDefined();
    expect(screen.getByText(/BASELINE: v1.0.0-system1-mvp/)).toBeDefined();
    expect(screen.getByText('99.98%')).toBeDefined();
  });

  it('renders Sidebar with all 11 required navigation items', () => {
    const onSelect = vi.fn();
    render(<Sidebar activeId="overview" onSelect={onSelect} alertCount={5} />);

    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Analytics')).toBeDefined();
    expect(screen.getByText('Attack Detection')).toBeDefined();
    expect(screen.getByText('Network')).toBeDefined();
    expect(screen.getByText('Honeypots')).toBeDefined();
    expect(screen.getByText('Threat Intelligence')).toBeDefined();
    expect(screen.getByText('AI Analysis')).toBeDefined();
    expect(screen.getByText('Alerts')).toBeDefined();
    expect(screen.getByText('Forensics')).toBeDefined();
    expect(screen.getByText('Systems')).toBeDefined();
    expect(screen.getByText('Configuration')).toBeDefined();

    // Click an item
    fireEvent.click(screen.getByText('Honeypots'));
    expect(onSelect).toHaveBeenCalledWith('honeypots');
  });

  it('renders MobileBottomNav and handles navigation and menu toggle', () => {
    const onSelect = vi.fn();
    const onOpenDrawer = vi.fn();
    render(
      <MobileBottomNav
        activeId="overview"
        onSelect={onSelect}
        onOpenDrawer={onOpenDrawer}
        alertCount={3}
      />
    );

    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Alerts')).toBeDefined();
    expect(screen.getByText('Network')).toBeDefined();
    expect(screen.getByText('Systems')).toBeDefined();
    expect(screen.getByText('Menu')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();

    // Click Alerts
    fireEvent.click(screen.getByText('Alerts'));
    expect(onSelect).toHaveBeenCalledWith('alerts');

    // Click Menu
    fireEvent.click(screen.getByText('Menu'));
    expect(onOpenDrawer).toHaveBeenCalled();
  });

  it('renders MobileNavDrawer with all 11 modules and operator controls', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <AuthProvider>
        <MobileNavDrawer
          isOpen={true}
          onClose={onClose}
          activeId="overview"
          onSelect={onSelect}
          alertCount={4}
        />
      </AuthProvider>
    );

    expect(screen.getByText('MOBILE SOC CONSOLE')).toBeDefined();
    expect(screen.getByText('System Modules (11)')).toBeDefined();
    expect(screen.getAllByText('Threat Intelligence').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Honeypots').length).toBeGreaterThanOrEqual(1);

    // Click a module item
    fireEvent.click(screen.getAllByText('Honeypots')[0]);
    expect(onSelect).toHaveBeenCalledWith('honeypots');
    expect(onClose).toHaveBeenCalled();
  });
});
