import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GovernorStatusRibbon } from '../GovernorStatusRibbon';
import { LiveCommandCenterView } from '../LiveCommandCenterView';
import { CommandExecutionModal } from '../CommandExecutionModal';
import * as client from '../../api/client';
import { VirtualIncidentItem, GovernorStatusResponse } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  fetchGovernorStatus: vi.fn(),
  fetchVirtualIncidents: vi.fn(),
  fetchAllowlistedActions: vi.fn(),
  executeIncidentCommand: vi.fn(),
  previewIncidentCommand: vi.fn(),
  toggleGovernorLockout: vi.fn(),
}));

const mockGovernorStatus: GovernorStatusResponse = {
  lockout_engaged: false,
  operator_id: 'soc_operator',
  operator_actions_last_minute: 3,
  operator_rate_limit_max: 10,
  active_cooldowns_count: 1,
  circuit_breaker: {
    state: 'CLOSED',
    consecutive_failures: 0,
    failure_threshold: 3,
    cooldown_remaining_seconds: 0,
    total_successes: 15,
    total_failures: 0,
    tripped_count: 0,
  },
  allowlisted_actions: ['ALERT_ACKNOWLEDGE', 'ALERT_RESOLVE', 'NOTIFICATION_DISPATCH'],
};

const mockIncidents: VirtualIncidentItem[] = [
  {
    incident_id: 'INC-101',
    alert_id: 101,
    attack_id: 12,
    source_ip: '198.51.100.44',
    attack_type: 'Brute Force SSH',
    severity: 'critical',
    status: 'open',
    risk_score: 88.5,
    notification_status: 'pending',
    event_count: 5,
    created_at: new Date().toISOString(),
  },
  {
    incident_id: 'INC-102',
    alert_id: 102,
    attack_id: 13,
    source_ip: '203.0.113.88',
    attack_type: 'SQL Injection Probe',
    severity: 'high',
    status: 'acknowledged',
    risk_score: 65.0,
    notification_status: 'delivered',
    event_count: 2,
    created_at: new Date().toISOString(),
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Module 3.4 Live Incident Command & Governance Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (client.fetchGovernorStatus as any).mockResolvedValue(mockGovernorStatus);
    (client.fetchVirtualIncidents as any).mockResolvedValue({
      total_incidents: 2,
      incidents: mockIncidents,
    });
  });

  it('renders GovernorStatusRibbon with stream state, rate limit, and breaker metrics', async () => {
    render(<GovernorStatusRibbon streamStatus="connected" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('STREAM ACTIVE (SSE)')).toBeDefined();
      expect(screen.getByText(/Rate Limit/)).toBeDefined();
      expect(screen.getByText('3 / 10')).toBeDefined();
      expect(screen.getByText(/BREAKER: CLOSED/)).toBeDefined();
      expect(screen.getByText('ENGAGE LOCKOUT')).toBeDefined();
    });
  });

  it('renders LiveCommandCenterView with virtual incidents table and action buttons', async () => {
    render(<LiveCommandCenterView />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('INC-101')).toBeDefined();
      expect(screen.getByText('INC-102')).toBeDefined();
    });

    expect(screen.getByText('198.51.100.44')).toBeDefined();
    expect(screen.getByText('Brute Force SSH')).toBeDefined();
    expect(screen.getByText('Virtual Incident Stream (2)')).toBeDefined();
  });

  it('filters virtual incidents by search query in LiveCommandCenterView', async () => {
    render(<LiveCommandCenterView />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('INC-101')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Filter IP, ID, or Type...');
    fireEvent.change(searchInput, { target: { value: 'SQL' } });

    expect(screen.queryByText('INC-101')).toBeNull();
    expect(screen.getByText('INC-102')).toBeDefined();
  });

  it('renders CommandExecutionModal and validates justification requirement for Level 2/3 actions', async () => {
    const onClose = vi.fn();
    render(
      <CommandExecutionModal
        incident={mockIncidents[0]}
        defaultAction="ALERT_RESOLVE"
        onClose={onClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Live Incident Command Execution')).toBeDefined();
    expect(screen.getByText('INC-101')).toBeDefined();
    expect(screen.getByText(/Operator Justification/)).toBeDefined();

    // Click execute without justification triggers validation error
    const executeBtn = screen.getByText('Execute Governed Action');
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Action requires a justification of at least 5 characters.')
      ).toBeDefined();
    });
  });

  it('renders CommandExecutionModal and checks permission for GOVERNOR_LOCKOUT_ENGAGE', () => {
    const onClose = vi.fn();
    render(
      <CommandExecutionModal
        incident={mockIncidents[0]}
        defaultAction="GOVERNOR_LOCKOUT_ENGAGE"
        onClose={onClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Live Incident Command Execution')).toBeDefined();
    expect(screen.getByText('INC-101')).toBeDefined();
    expect(screen.getByText('Execute Governed Action')).toBeDefined();
  });
});
