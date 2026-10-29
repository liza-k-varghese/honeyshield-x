import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { RuleCatalogView } from '../RuleCatalogView';
import { RuleDetailDrawer } from '../RuleDetailDrawer';
import { ReplayStudioView } from '../ReplayStudioView';
import { SimulationSandboxView } from '../SimulationSandboxView';
import { AuditTrailView } from '../AuditTrailView';
import * as hooks from '../../hooks/useDetectionRules';
import {
  DetectionRuleSummary,
  RuleCatalogResponse,
  RuleEfficacyResponse,
  AuditEventsResponse,
} from '../../types';

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

const mockRules: DetectionRuleSummary[] = [
  {
    rule_id: 'AUTH_BRUTE_FORCE',
    name: 'Authentication Brute Force',
    vector: 'auth',
    description: 'Repeated authentication failures across services',
    severity: 'high',
    base_risk_score: 8.0,
    rule_type: 'threshold',
    target_event_types: ['telnet_login_failed', 'ftp_login_failed'],
    window_minutes: 10,
    threshold_count: 5,
    match_tokens: [],
    regex_patterns: [],
    is_active: true,
    is_immutable: true,
  },
  {
    rule_id: 'WEB_SQL_INJECTION',
    name: 'Web SQL Injection',
    vector: 'web',
    description: 'SQL injection syntax payloads',
    severity: 'critical',
    base_risk_score: 9.5,
    rule_type: 'signature',
    target_event_types: ['web_access'],
    window_minutes: 15,
    threshold_count: 1,
    match_tokens: ['union select', "' or 1=1"],
    regex_patterns: ['(?i)\\bunion\\s+select\\b'],
    is_active: true,
    is_immutable: true,
  },
];

describe('Module 3.3 Frontend Components', () => {
  it('renders RuleCatalogView with active rules and vector categories', () => {
    vi.spyOn(hooks, 'useDetectionRules').mockReturnValue({
      data: { total_rules: 2, rules: mockRules } as RuleCatalogResponse,
      isLoading: false,
      error: null,
    } as any);

    const onSelect = vi.fn();
    const onSimulate = vi.fn();

    render(
      <RuleCatalogView onSelectRule={onSelect} onOpenSimulation={onSimulate} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Authentication Brute Force')).toBeDefined();
    expect(screen.getByText('Web SQL Injection')).toBeDefined();
    expect(screen.getAllByText('FROZEN').length).toBe(2);

    // Clicking inspect rule triggers onSelect
    const inspectButtons = screen.getAllByText('Inspect Criteria');
    fireEvent.click(inspectButtons[0]);
    expect(onSelect).toHaveBeenCalledWith('AUTH_BRUTE_FORCE');
  });

  it('renders RuleDetailDrawer with criteria, match tokens, and efficacy tab', () => {
    vi.spyOn(hooks, 'useRuleDetail').mockReturnValue({
      data: mockRules[1],
      isLoading: false,
    } as any);

    vi.spyOn(hooks, 'useRuleEfficacy').mockReturnValue({
      data: {
        rule_id: 'WEB_SQL_INJECTION',
        rule_name: 'Web SQL Injection',
        time_range_hours: 24,
        total_triggers: 15,
        unique_attackers: 3,
        correlated_multi_vector_triggers: 12,
        isolated_triggers: 3,
        correlated_rate_pct: 80.0,
        avg_associated_risk_score: 9.5,
        last_triggered_at: '2026-10-07T12:00:00Z',
        false_positive_indicator: 5.0,
        false_positive_indicator_note: 'Heuristic indicator derived from available telemetry.',
        top_attacking_ips: [{ source_ip: '198.51.100.25', trigger_count: 10 }],
      } as RuleEfficacyResponse,
      isLoading: false,
    } as any);

    const onClose = vi.fn();
    render(<RuleDetailDrawer ruleId="WEB_SQL_INJECTION" onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    // Check specification tab
    expect(screen.getByText('Web SQL Injection')).toBeDefined();
    expect(screen.getByText('union select')).toBeDefined();

    // Switch to Efficacy Tab
    const efficacyTab = screen.getByText('Empirical Efficacy Telemetry');
    fireEvent.click(efficacyTab);
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('80.0%')).toBeDefined();
    expect(screen.getByText('198.51.100.25')).toBeDefined();
  });

  it('renders ReplayStudioView with configuration controls and timeline', () => {
    vi.spyOn(hooks, 'useReplayAttack').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    vi.spyOn(hooks, 'useReplayIp').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    render(
      <ReplayStudioView initialTarget="1" initialScope="attack" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Deterministic Historical Event Replay Studio')).toBeDefined();
    expect(screen.getByText('ZERO DB MUTATION • ZERO NOTIFICATIONS')).toBeDefined();
    expect(screen.getByText('Execute Replay')).toBeDefined();
  });

  it('renders SimulationSandboxView with prominent dry-run indicator banner', () => {
    vi.spyOn(hooks, 'useSimulateRule').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    render(<SimulationSandboxView initialTarget="198.51.100.25" initialScope="ip" />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/Pure In-Memory Dry-Run Sandbox • Zero Production Modifications/i)
    ).toBeDefined();
    expect(screen.getByText('Run Dry-Run Simulation')).toBeDefined();
  });

  it('renders AuditTrailView with chronological operator actions and safe text escaping', () => {
    vi.spyOn(hooks, 'useAuditEvents').mockReturnValue({
      data: {
        total_events: 1,
        events: [
          {
            id: 101,
            event_type: 'operator_replay_executed',
            source: 'operator_replay_studio',
            severity: 'info',
            message: 'Replay completed for <script>alert("xss")</script> safely',
            created_at: '2026-10-07T14:30:00Z',
          },
        ],
      } as AuditEventsResponse,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<AuditTrailView />, { wrapper: createWrapper() });

    expect(screen.getByText('operator_replay_executed')).toBeDefined();
    expect(screen.getByText('operator_replay_studio')).toBeDefined();
    // Confirms message rendered as plain string, not executed HTML
    expect(
      screen.getByText('Replay completed for <script>alert("xss")</script> safely')
    ).toBeDefined();
  });
});
