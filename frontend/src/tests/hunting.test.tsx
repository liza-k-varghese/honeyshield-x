import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThreatHuntingView } from '../components/ThreatHuntingView';
import { HuntDossierDrawer } from '../components/HuntDossierDrawer';
import { HuntHypothesisModal } from '../components/HuntHypothesisModal';
import { HuntPromotionModal } from '../components/HuntPromotionModal';
import * as huntHooks from '../hooks/useThreatHunting';
import { HuntDossier, HuntMetrics, HuntSummary } from '../types';

// Mock Auth Context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    operator: {
      username: 'analyst_bob',
      role: 'analyst',
      permissions: ['hunt:view', 'hunt:create', 'hunt:update', 'hunt:execute', 'hunt:promote'],
    },
    hasPermission: () => true,
    logout: vi.fn(),
    sessionExpired: false,
  }),
}));

const mockMetrics: HuntMetrics = {
  total_hunts: 12,
  active_hunts: 8,
  concluded_hunts: 3,
  archived_hunts: 1,
  malicious_confirmed: 2,
  benign_activity: 1,
  inconclusive: 0,
  promoted_rules_count: 2,
  promoted_cases_count: 1,
};

const mockSummary: HuntSummary = {
  hunt_id: 'hunt-abcdef123456',
  title: 'Lateral Movement and PowerShell Beaconing Sweep',
  status: 'completed',
  severity: 'high',
  mitre_tactics: ['Execution', 'Lateral Movement'],
  evidence_count: 4,
  verdict: 'malicious_confirmed',
  created_by: 'analyst_bob',
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T01:00:00Z',
  last_executed_at: '2026-10-10T00:30:00Z',
  is_automated_suggestion: false,
};

const mockDossier: HuntDossier = {
  hunt_id: 'hunt-abcdef123456',
  title: 'Lateral Movement and PowerShell Beaconing Sweep',
  description: 'Adversary leveraged compromised credentials to execute remote PowerShell probes',
  status: 'completed',
  severity: 'high',
  mitre_tactics: ['Execution', 'Lateral Movement'],
  mitre_techniques: ['T1059.001'],
  query_spec: {
    source_ips: ['198.51.100.42'],
    payload_substring: 'powershell.exe',
  },
  evidence: [
    {
      evidence_id: 'ev-010203040506',
      entity_type: 'attack_event',
      entity_id: '42',
      timestamp: '2026-10-10T00:15:00Z',
      summary: 'PowerShell execution on internal decoy honeypot',
      source_ip: '198.51.100.42',
      technique: 'Execution',
      attributes: { command: 'powershell -nop -w hidden' },
    },
  ],
  forensic_notes: [
    {
      note_id: 'note-11223344',
      operator_id: 'analyst_bob',
      role: 'analyst',
      message: 'Verified malicious beaconing signature matching Threat Group 42',
      created_at: '2026-10-10T00:20:00Z',
    },
  ],
  conclusion_summary: 'Confirmed active exploitation and credential abuse.',
  verdict: 'malicious_confirmed',
  promoted_rule_ids: [],
  promoted_case_ids: [],
  execution_count: 1,
  last_executed_at: '2026-10-10T00:30:00Z',
  is_automated_suggestion: false,
  created_by: 'analyst_bob',
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T01:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Module 3.11 Threat Hunting Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ThreatHuntingView KPI ribbon and inventory table', async () => {
    vi.spyOn(huntHooks, 'useHuntMetrics').mockReturnValue({
      data: mockMetrics,
      isLoading: false,
    } as any);

    vi.spyOn(huntHooks, 'useHunts').mockReturnValue({
      data: { hunts: [mockSummary], total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
    } as any);

    renderWithClient(<ThreatHuntingView />);

    expect(screen.getByText('Total Hunts')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('Active Hunts')).toBeDefined();
    expect(screen.getByText('Confirmed Threats')).toBeDefined();
    expect(screen.getByText('Promoted Rules (M3.3)')).toBeDefined();

    // Table item
    expect(screen.getByText('hunt-abcdef123456')).toBeDefined();
    expect(screen.getByText('Lateral Movement and PowerShell Beaconing Sweep')).toBeDefined();
    expect(screen.getByText('Inspect')).toBeDefined();
  });

  it('opens and submits HuntHypothesisModal', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue(mockDossier);
    vi.spyOn(huntHooks, 'useCreateHunt').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as any);

    const onCreated = vi.fn();
    const onClose = vi.fn();

    renderWithClient(
      <HuntHypothesisModal isOpen={true} onClose={onClose} onCreated={onCreated} />
    );

    expect(screen.getByText('Author Adversary Threat Hypothesis')).toBeDefined();

    const titleInput = screen.getByPlaceholderText(/Unauthenticated LFI/i);
    const descInput = screen.getByPlaceholderText(/Detail the assumed adversary/i);

    fireEvent.change(titleInput, { target: { value: 'New Test Threat Hunt Hypothesis' } });
    fireEvent.change(descInput, { target: { value: 'Detailed description of attack hypothesis' } });

    const submitBtn = screen.getByRole('button', { name: /Create Hypothesis Draft/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders HuntDossierDrawer tabs and evidence list', async () => {
    vi.spyOn(huntHooks, 'useHuntDossier').mockReturnValue({
      data: mockDossier,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(huntHooks, 'useExecuteHunt').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(huntHooks, 'useUpdateHunt').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(huntHooks, 'useArchiveHunt').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithClient(
      <HuntDossierDrawer
        huntId="hunt-abcdef123456"
        onClose={vi.fn()}
        onPromoteRule={vi.fn()}
        onPromoteCase={vi.fn()}
      />
    );

    expect(screen.getByText('hunt-abcdef123456')).toBeDefined();
    expect(screen.getByText(/Adversary leveraged compromised credentials/i)).toBeDefined();

    // Switch to Evidence Tab
    const evidenceTab = screen.getByRole('button', { name: /Evidence/i });
    fireEvent.click(evidenceTab);

    expect(screen.getByText('PowerShell execution on internal decoy honeypot')).toBeDefined();
    expect(screen.getByText('Inspect Attributes')).toBeDefined();
  });

  it('submits rule promotion from HuntPromotionModal', async () => {
    const promoteRuleMock = vi.fn().mockResolvedValue({
      hunt_id: 'hunt-abcdef123456',
      promotion_type: 'rule',
      target_id: 'DET-HUNT-12345678',
      message: 'Rule created',
      promoted_at: '2026-10-10T02:00:00Z',
    });

    vi.spyOn(huntHooks, 'usePromoteHuntToRule').mockReturnValue({
      mutateAsync: promoteRuleMock,
      isPending: false,
    } as any);

    vi.spyOn(huntHooks, 'usePromoteHuntToCase').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    const onClose = vi.fn();

    renderWithClient(
      <HuntPromotionModal
        isOpen={true}
        onClose={onClose}
        hunt={mockDossier}
        promotionType="rule"
      />
    );

    expect(screen.getByText('Promote Findings to Detection Rule')).toBeDefined();
    expect(screen.getByText(/Governor Tier-2 Declarative Rule Contract/i)).toBeDefined();

    const justInput = screen.getByPlaceholderText(/State the operational security rationale/i);
    fireEvent.change(justInput, { target: { value: 'Valid operational security justification exceeding 10 chars' } });

    const dispatchBtn = screen.getByRole('button', { name: /Dispatch Rule Promotion/i });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(promoteRuleMock).toHaveBeenCalledWith({
        huntId: 'hunt-abcdef123456',
        justification: 'Valid operational security justification exceeding 10 chars',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('submits case promotion from HuntPromotionModal', async () => {
    const promoteCaseMock = vi.fn().mockResolvedValue({
      hunt_id: 'hunt-abcdef123456',
      promotion_type: 'case',
      target_id: 'CASE-2026-1001',
      message: 'Case escalated',
      promoted_at: '2026-10-10T02:00:00Z',
    });

    vi.spyOn(huntHooks, 'usePromoteHuntToRule').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(huntHooks, 'usePromoteHuntToCase').mockReturnValue({
      mutateAsync: promoteCaseMock,
      isPending: false,
    } as any);

    const onClose = vi.fn();

    renderWithClient(
      <HuntPromotionModal
        isOpen={true}
        onClose={onClose}
        hunt={mockDossier}
        promotionType="case"
      />
    );

    expect(screen.getByText('Escalate to Incident Case')).toBeDefined();

    const justInput = screen.getByPlaceholderText(/State the operational security rationale/i);
    fireEvent.change(justInput, { target: { value: 'Confirmed malicious incident requiring active containment' } });

    const dispatchBtn = screen.getByRole('button', { name: /Dispatch Case Escalation/i });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(promoteCaseMock).toHaveBeenCalledWith({
        huntId: 'hunt-abcdef123456',
        justification: 'Confirmed malicious incident requiring active containment',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
