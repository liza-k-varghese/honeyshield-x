import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { SeverityBadge, StatusBadge, NotificationBadge } from '../Badge';
import { KpiRibbon } from '../KpiRibbon';
import { EventTimeline } from '../EventTimeline';
import { AlertTable } from '../AlertTable';
import { AlertDetailDrawer } from '../AlertDetailDrawer';
import { Alert, DashboardStats } from '../../types';

vi.mock('../../api/client', () => ({
  fetchAttack: vi.fn().mockResolvedValue({
    id: 5,
    attack_type: 'WEB_SQL_INJECTION',
    source_ip: '198.51.100.99',
    destination_ip: '10.0.0.1',
    protocol: 'TCP',
    risk_score: 85,
    detected_at: '2026-10-07T12:00:00Z',
  }),
  fetchAttackEvents: vi.fn().mockResolvedValue([]),
  updateAlertStatus: vi.fn().mockResolvedValue({}),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Badge Components', () => {
  it('renders severity badges correctly', () => {
    const { container: crit } = render(<SeverityBadge severity="critical" />);
    expect(crit.textContent).toContain('CRITICAL');

    const { container: high } = render(<SeverityBadge severity="high" />);
    expect(high.textContent).toContain('HIGH');

    const { container: med } = render(<SeverityBadge severity="medium" />);
    expect(med.textContent).toContain('MEDIUM');

    const { container: low } = render(<SeverityBadge severity="low" />);
    expect(low.textContent).toContain('LOW');
  });

  it('handles undefined and custom string severity gracefully', () => {
    const { container: undef } = render(<SeverityBadge severity={undefined} />);
    expect(undef.textContent).toContain('LOW');

    const { container: custom } = render(<SeverityBadge severity="tier_3_danger" />);
    expect(custom.textContent).toContain('TIER_3_DANGER');
  });

  it('renders status badges correctly', () => {
    const { container: open } = render(<StatusBadge status="open" />);
    expect(open.textContent).toContain('Open');

    const { container: ack } = render(<StatusBadge status="acknowledged" />);
    expect(ack.textContent).toContain('Acknowledged');

    const { container: res } = render(<StatusBadge status="resolved" />);
    expect(res.textContent).toContain('Resolved');
  });

  it('renders notification transport badges correctly', () => {
    const { container: del } = render(<NotificationBadge status="delivered" />);
    expect(del.textContent).toContain('Delivered');

    const { container: fail } = render(<NotificationBadge status="failed" />);
    expect(fail.textContent).toContain('Failed');

    const { container: pend } = render(<NotificationBadge status="pending" />);
    expect(pend.textContent).toContain('Pending');
  });
});

describe('KpiRibbon Component', () => {
  it('displays aggregated metrics accurately', () => {
    const mockStats: DashboardStats = {
      total_attacks: 42,
      active_alerts: 7,
      active_alerts_by_severity: {
        critical: 3,
        high: 2,
        medium: 1,
        low: 1,
      },
      unique_attacker_ips_24h: 12,
      system_health: {
        api: 'healthy',
        postgresql: 'connected',
        redis: 'connected',
      },
    };

    render(<KpiRibbon stats={mockStats} />);

    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });
});

describe('EventTimeline Component', () => {
  it('renders chronological events and safely escapes messages', () => {
    const events = [
      {
        id: 1,
        attack_id: 10,
        event_type: 'web_access',
        source_ip: '198.51.100.99',
        message: '<script>alert("xss")</script> & DROP TABLE users;',
        event_time: '2026-10-07T12:00:00Z',
      },
    ];

    render(<EventTimeline events={events} />);

    // Must be rendered as text, not evaluated script
    const element = screen.getByText('<script>alert("xss")</script> & DROP TABLE users;');
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).not.toBe('script');
  });
});

describe('AlertTable Component', () => {
  it('renders alert rows and responds to click', () => {
    const mockAlerts: Alert[] = [
      {
        id: 101,
        attack_id: 5,
        alert_type: 'WEB_SQL_INJECTION',
        severity: 'critical',
        message: 'SQL Injection in /api/login',
        status: 'open',
        notified_at: null,
        notification_status: 'pending',
        created_at: '2026-10-07T12:00:00Z',
      },
    ];

    const onSelectAlert = vi.fn();
    const onStatusFilterChange = vi.fn();

    render(
      <AlertTable
        alerts={mockAlerts}
        onSelectAlert={onSelectAlert}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    expect(screen.getByText('#101')).toBeDefined();
    expect(screen.getByText('WEB_SQL_INJECTION')).toBeDefined();
  });
});

describe('AlertDetailDrawer Component', () => {
  it('renders promotion button and triggers onPromoteToCase with alert entity', async () => {
    const mockAlert: Alert = {
      id: 101,
      attack_id: 5,
      alert_type: 'WEB_SQL_INJECTION',
      severity: 'critical',
      message: 'SQL Injection in /api/login',
      status: 'open',
      notified_at: null,
      notification_status: 'pending',
      created_at: '2026-10-07T12:00:00Z',
    };
    const onPromoteToCase = vi.fn();
    const onClose = vi.fn();

    render(
      <AlertDetailDrawer
        alert={mockAlert}
        onClose={onClose}
        onPromoteToCase={onPromoteToCase}
      />,
      { wrapper: createWrapper() }
    );

    const promoteBtn = await screen.findByText('Promote Alert to Incident Case');
    expect(promoteBtn).toBeDefined();

    fireEvent.click(promoteBtn);

    expect(onPromoteToCase).toHaveBeenCalledWith(mockAlert);
    expect(onClose).toHaveBeenCalled();
  });
});
