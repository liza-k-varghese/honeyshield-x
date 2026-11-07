import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecurityOverview } from '../components/SecurityOverview';
import { Alert, Attack, DashboardStats } from '../types';

const mockStats: DashboardStats = {
  total_attacks: 42,
  active_alerts: 5,
  critical_alerts: 2,
  unique_attackers: 14,
  honeypot_types: 4,
  attack_types: 3,
  system_health: {
    api: 'healthy',
    postgresql: 'healthy',
    redis: 'healthy',
    total_services: 3,
    healthy_services: 3,
    degraded_services: 0,
    offline_services: 0,
  },
  unique_attacker_ips_24h: 14,
  events_processed_24h: 12450,
};

const mockAlerts: Alert[] = [
  {
    id: 101,
    attack_id: 1,
    alert_type: 'Brute Force Attack',
    severity: 'critical',
    message: 'SSH Brute Force detected from 198.51.100.44 on port 2222',
    status: 'open',
    created_at: new Date().toISOString(),
  },
  {
    id: 102,
    attack_id: 2,
    alert_type: 'SQL Injection Probe',
    severity: 'high',
    message: 'Exploit payload detected from 203.0.113.88 on /api/v1/login',
    status: 'open',
    created_at: new Date().toISOString(),
  },
  {
    id: 103,
    attack_id: 3,
    alert_type: 'Port Scan',
    severity: 'low',
    message: 'SYN sweep across telemetry ports',
    status: 'resolved',
    created_at: new Date().toISOString(),
  },
];

const mockAttacks: Attack[] = [
  {
    id: 1,
    attack_type: 'SSH Brute Force',
    source_ip: '198.51.100.44',
    destination_ip: '10.0.0.1',
    protocol: 'SSH',
    severity: 'critical',
    risk_score: 95,
    status: 'active',
    detected_at: new Date().toISOString(),
  },
  {
    id: 2,
    attack_type: 'HTTP Probe',
    source_ip: '203.0.113.88',
    destination_ip: '10.0.0.2',
    protocol: 'HTTP',
    severity: 'high',
    risk_score: 78,
    status: 'active',
    detected_at: new Date().toISOString(),
  },
];

describe('SecurityOverview Component (Milestone 20 Redesign)', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it('renders page introduction and SOC status pill', () => {
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
      />
    );

    expect(screen.getByText('Security Overview')).toBeDefined();
    expect(screen.getByText('SOC LIVE')).toBeDefined();
    expect(screen.getByText('3/3 SYSTEMS OPERATIONAL')).toBeDefined();
  });

  it('renders 4 essential security metric cards with accurate data', () => {
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
      />
    );

    // Card 1: Critical Alerts
    expect(screen.getByText('Critical Alerts')).toBeDefined();
    const countElements = screen.getAllByText('2');
    expect(countElements.length).toBeGreaterThan(0);

    // Card 2: Monitored Threats
    expect(screen.getByText('Monitored Threats')).toBeDefined();
    const threatCounts = screen.getAllByText('42');
    expect(threatCounts.length).toBeGreaterThan(0);

    // Card 3: Deception Sensors
    expect(screen.getByText('Deception Sensors')).toBeDefined();
    expect(screen.getByText('4 / 4')).toBeDefined();

    // Card 4: Events Processed
    expect(screen.getByText('Events Processed (24h)')).toBeDefined();
  });

  it('renders priority alerts table and handles deep-link investigation', () => {
    const handleInvestigate = vi.fn();
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={handleInvestigate}
        onNavigateView={vi.fn()}
      />
    );

    expect(screen.getByText('Priority Alerts')).toBeDefined();
    expect(screen.getByText(/SSH Brute Force detected/i)).toBeDefined();
    expect(screen.getByText(/Exploit payload detected/i)).toBeDefined();

    // Click investigate button for the first alert
    const investigateButtons = screen.getAllByRole('button', { name: /investigate/i });
    expect(investigateButtons.length).toBeGreaterThan(0);
    fireEvent.click(investigateButtons[0]);

    expect(handleInvestigate).toHaveBeenCalledWith('198.51.100.44');
  });

  it('renders 3 primary security system cards and supports navigation', () => {
    const handleNavigate = vi.fn();
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={handleNavigate}
      />
    );

    expect(screen.getByText('Security Systems Overview')).toBeDefined();
    expect(screen.getByText('Security Operations')).toBeDefined();
    expect(screen.getByText('Deception & Honeypots')).toBeDefined();
    expect(screen.getByText('Threat Intelligence')).toBeDefined();

    // Find and click the system links
    const socLink = screen.getByRole('button', { name: /view alerts/i });
    fireEvent.click(socLink);
    expect(handleNavigate).toHaveBeenCalledWith('alerts');

    const deceptionLink = screen.getByRole('button', { name: /manage honeypots/i });
    fireEvent.click(deceptionLink);
    expect(handleNavigate).toHaveBeenCalledWith('deception');

    const intelLink = screen.getByRole('button', { name: /explore threat intel/i });
    fireEvent.click(intelLink);
    expect(handleNavigate).toHaveBeenCalledWith('intel');
  });

  it('renders Digital Agent Universe entry banner with agent badges and navigation', () => {
    const handleNavigate = vi.fn();
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={handleNavigate}
      />
    );

    expect(screen.getByText('Explore the Digital Universe')).toBeDefined();
    expect(screen.getByText(/Follow security events through HoneyShield X with four digital agents/i)).toBeDefined();
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByText('NEXUS')).toBeDefined();
    expect(screen.getByText('ORACLE')).toBeDefined();
    expect(screen.getByText('SENTINEL')).toBeDefined();

    const openUniverseBtn = screen.getByRole('button', { name: /open universe/i });
    fireEvent.click(openUniverseBtn);
    expect(handleNavigate).toHaveBeenCalledWith('universe');
  });

  it('renders empty state when there are no priority alerts', () => {
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={[]}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
      />
    );

    expect(screen.getByText('All systems nominal')).toBeDefined();
    expect(screen.getByText(/no open high-priority alerts/i)).toBeDefined();
  });

  it('supports activity feed filtering', () => {
    render(
      <SecurityOverview
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
      />
    );

    expect(screen.getByText('Live Activity')).toBeDefined();
    const criticalFilterBtn = screen.getByRole('button', { name: /critical/i });
    fireEvent.click(criticalFilterBtn);
    // Should filter attacks
    const ipElements = screen.getAllByText('198.51.100.44');
    expect(ipElements.length).toBeGreaterThan(0);
  });

  describe('Milestone 20.1 Data Integrity & Truthful Metrics Tests', () => {
    it('renders truthful sensor health with active canary tokens and unconfigured daemons', () => {
      const statsWithCanary: DashboardStats = {
        ...mockStats,
        sensor_health: {
          status: 'active_with_unconfigured',
          active_canary_tokens: 1,
          configured_external_sensors: 0,
          unconfigured_external_sensors: 5,
          total_sensors: 6,
          configured_sensors: 1,
          healthy_sensors: 1,
          unconfigured_sensors: 5,
        },
      };

      render(
        <SecurityOverview
          stats={statsWithCanary}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('Canary Active (5 Unconfigured)')).toBeDefined();
      expect(screen.getByText(/daemons unconfigured/i)).toBeDefined();
    });

    it('renders truthful sensor health when all sensors are configured and healthy', () => {
      const statsHealthy: DashboardStats = {
        ...mockStats,
        sensor_health: {
          status: 'healthy',
          active_canary_tokens: 2,
          configured_external_sensors: 3,
          unconfigured_external_sensors: 0,
          total_sensors: 5,
          configured_sensors: 5,
          healthy_sensors: 5,
          unconfigured_sensors: 0,
        },
      };

      render(
        <SecurityOverview
          stats={statsHealthy}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('All Sensors Healthy')).toBeDefined();
      expect(screen.getAllByText('5 / 5').length).toBeGreaterThan(0);
    });

    it('renders degraded sensor condition truthfully when a sensor fails', () => {
      const statsDegraded: DashboardStats = {
        ...mockStats,
        sensor_health: {
          status: 'degraded',
          active_canary_tokens: 1,
          configured_external_sensors: 3,
          unconfigured_external_sensors: 0,
          total_sensors: 4,
          configured_sensors: 4,
          healthy_sensors: 3,
          unconfigured_sensors: 0,
        },
      };

      render(
        <SecurityOverview
          stats={statsDegraded}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('3 / 4')).toBeDefined();
      expect(screen.getByText(/1 sensor\(s\) require attention/i)).toBeDefined();
    });

    it('renders empty sensor inventory with 0 traps gracefully', () => {
      const statsZero: DashboardStats = {
        ...mockStats,
        sensor_health: {
          status: 'unconfigured',
          active_canary_tokens: 0,
          configured_external_sensors: 0,
          unconfigured_external_sensors: 0,
          total_sensors: 0,
          configured_sensors: 0,
          healthy_sensors: 0,
          unconfigured_sensors: 0,
        },
      };

      render(
        <SecurityOverview
          stats={statsZero}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('0 Traps')).toBeDefined();
      expect(screen.getByText(/no honeypots configured/i)).toBeDefined();
    });

    it('renders sensor health unavailable when telemetry is unreachable or errored', () => {
      render(
        <SecurityOverview
          stats={undefined}
          isStatsError={true}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('Sensor Health — Unavailable')).toBeDefined();
      expect(screen.getByText(/telemetry service unreachable/i)).toBeDefined();
    });

    it('renders honest session stream event metric when 24h persistent count is absent', () => {
      const statsWithout24h: DashboardStats = {
        ...mockStats,
        events_processed_24h: undefined,
      };

      render(
        <SecurityOverview
          stats={statsWithout24h}
          alerts={mockAlerts}
          attacks={mockAttacks}
          streamMetrics={{
            totalReceived: 884,
            totalDeduplicated: 12,
            totalReplayed: 0,
            activeTransfers: 1,
            queuedTransfers: 0,
            batchedCount: 5,
            lastCursor: 884,
          }}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('Events Received (Session)')).toBeDefined();
      expect(screen.getByText('884')).toBeDefined();
      expect(screen.getByText('live WebSocket session stream')).toBeDefined();
    });

    it('renders honest priority alerts error state and never falsely claims all systems nominal on failure', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={[]}
          attacks={mockAttacks}
          isAlertsError={true}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('Priority Alerts Telemetry Unreachable')).toBeDefined();
      expect(screen.getByText('Alerts Error')).toBeDefined();
      expect(screen.queryByText('All systems nominal')).toBeNull();
    });
  });

  describe('Milestone 20.2 Premium Minimal UI & FTUX Tests', () => {
    it('renders first-time user guide (FTUX) with 4 core capability pillars', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
          showGuideByDefault={true}
        />
      );

      expect(screen.getByText(/Welcome to HoneyShield X/i)).toBeDefined();
      expect(screen.getByText('Quick start guide • Reopen anytime via Platform Guide button')).toBeDefined();
      expect(screen.getByRole('button', { name: /dismiss guide/i })).toBeDefined();
    });

    it('supports dismissing and reopening the platform guide', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
          showGuideByDefault={true}
        />
      );

      // Dismiss the guide
      const dismissBtn = screen.getByRole('button', { name: /dismiss guide/i });
      fireEvent.click(dismissBtn);

      // Verify guide is gone
      expect(screen.queryByText(/Quick start guide • Reopen anytime via Platform Guide button/i)).toBeNull();

      // Platform Guide button appears
      const platformGuideBtn = screen.getByRole('button', { name: /platform guide/i });
      expect(platformGuideBtn).toBeDefined();

      // Reopen guide
      fireEvent.click(platformGuideBtn);
      expect(screen.getByText(/Quick start guide • Reopen anytime via Platform Guide button/i)).toBeDefined();
    });

    it('renders empty activity state when no attack telemetry is present', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={[]}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('No security activity recorded yet.')).toBeDefined();
      expect(screen.getByText(/monitored telemetry will appear here/i)).toBeDefined();
    });

    it('renders Detect, Deceive, and Understand capability pillars in the Three Security Systems', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText('Detect')).toBeDefined();
      expect(screen.getByText('Deceive')).toBeDefined();
      expect(screen.getByText('Understand')).toBeDefined();
      expect(screen.getByText('Security Systems Overview')).toBeDefined();
    });
  });

  describe('Milestone 20.3 Final Product Experience & Verification', () => {
    it('renders concise, professional definitions for the Three Security Systems', () => {
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={vi.fn()}
        />
      );

      expect(screen.getByText(/Detection, alerts and investigations/i)).toBeDefined();
      expect(screen.getByText(/Traps, sensors and captured suspicious activity/i)).toBeDefined();
      expect(screen.getByText(/Indicators, enrichment and correlation/i)).toBeDefined();
    });

    it('renders the final Digital Universe entry point with exact text and button', () => {
      const handleNavigate = vi.fn();
      render(
        <SecurityOverview
          stats={mockStats}
          alerts={mockAlerts}
          attacks={mockAttacks}
          onInvestigateIp={vi.fn()}
          onNavigateView={handleNavigate}
        />
      );

      expect(screen.getByText('Explore the Digital Universe')).toBeDefined();
      expect(screen.getByText('Follow security events through HoneyShield X with four digital agents.')).toBeDefined();
      const openBtn = screen.getByRole('button', { name: /open universe/i });
      expect(openBtn).toBeDefined();
      fireEvent.click(openBtn);
      expect(handleNavigate).toHaveBeenCalledWith('universe');
    });
  });
});
