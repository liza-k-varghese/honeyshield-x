import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeceptionGridView } from '../DeceptionGridView';
import { CanaryMintModal } from '../CanaryMintModal';
import { CanaryDetailDossier } from '../CanaryDetailDossier';
import * as client from '../../api/client';
import { CanaryToken, CanaryHitEvent, CanaryContextResponse } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  fetchCanaries: vi.fn(),
  fetchCanary: vi.fn(),
  mintCanary: vi.fn(),
  updateCanary: vi.fn(),
  revokeCanary: vi.fn(),
  fetchCanaryHits: vi.fn(),
  fetchCanaryContext: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

// Mock Auth Context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    operator: {
      username: 'analyst_sarah',
      role: 'analyst',
      permissions: ['deception:view', 'deception:create', 'deception:update'],
    },
    hasPermission: (perm: string) =>
      ['deception:view', 'deception:create', 'deception:update', 'deception:admin'].includes(perm),
    logout: vi.fn(),
    sessionExpired: false,
  }),
}));

const mockCanary1: CanaryToken = {
  token_id: 'CANARY-TEST01',
  name: 'Production IAM Decoy',
  canary_type: 'AWS_API_KEY',
  status: 'active',
  created_at: '2026-10-09T00:00:00Z',
  created_by: 'analyst_sarah',
  environment: 'production',
  placement_hint: 'decoy repo /secrets/aws.json',
  decoy_payload: {
    aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
    aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    disclaimer: 'PERMANENTLY INERT DECOY',
  },
  hit_count: 2,
  last_tripped_at: '2026-10-09T01:00:00Z',
};

const mockCanary2: CanaryToken = {
  token_id: 'CANARY-TEST02',
  name: 'PostgreSQL DB Decoy',
  canary_type: 'DATABASE_CREDENTIAL',
  status: 'active',
  created_at: '2026-10-09T00:05:00Z',
  created_by: 'admin_chief',
  environment: 'internal',
  placement_hint: 'prod-config.yml',
  decoy_payload: {
    connection_string: 'postgresql://decoy_dba:synth_pass@127.0.0.1:5433/corp_core',
    disclaimer: 'PERMANENTLY INERT DECOY',
  },
  hit_count: 0,
  last_tripped_at: null,
};

const mockHit: CanaryHitEvent = {
  hit_id: 'hit-123',
  token_id: 'CANARY-TEST01',
  source_ip: '198.51.100.77',
  user_agent: 'curl/7.88.1',
  method: 'GET',
  headers: { host: 'canary.honeyshield.internal' },
  payload_sample: '',
  alert_id: 105,
  case_id: 'CASE-2026-1002',
  timestamp: '2026-10-09T01:00:00Z',
};

const mockContext: CanaryContextResponse = {
  token_id: 'CANARY-TEST01',
  canary_name: 'Production IAM Decoy',
  canary_type: 'AWS_API_KEY',
  environment: 'production',
  placement_hint: 'decoy repo /secrets/aws.json',
  status: 'active',
  created_by: 'analyst_sarah',
  created_at: '2026-10-09T00:00:00Z',
  total_hits: 2,
  recent_hits: [mockHit],
  advisory_summary: 'Canary token has been tripped 2 times. Most recent hit from 198.51.100.77.',
  associated_alert_ids: [105],
  associated_case_ids: ['CASE-2026-1002'],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Module 3.7 Frontend: Active Deception Grid & Canary Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.fetchCanaries).mockResolvedValue({
      canaries: [mockCanary1, mockCanary2],
      total: 2,
    });
    vi.mocked(client.fetchCanary).mockResolvedValue(mockCanary1);
    vi.mocked(client.fetchCanaryHits).mockResolvedValue({
      hits: [mockHit],
      total: 1,
    });
    vi.mocked(client.fetchCanaryContext).mockResolvedValue(mockContext);
  });

  it('renders DeceptionGridView with KPI ribbon, filters, and canaries list', async () => {
    render(<DeceptionGridView />, { wrapper: createWrapper() });

    expect(screen.getByText('Active Deception Grid & Canary Honeytoken Orchestrator')).toBeDefined();
    expect(screen.getByText('Total Deception Assets')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('CANARY-TEST01')).toBeDefined();
      expect(screen.getByText('Production IAM Decoy')).toBeDefined();
      expect(screen.getByText('CANARY-TEST02')).toBeDefined();
      expect(screen.getByText('PostgreSQL DB Decoy')).toBeDefined();
      expect(screen.getByText('TRIPPED')).toBeDefined();
      expect(screen.getByText('ARMED')).toBeDefined();
    });
  });

  it('navigates to CanaryDetailDossier upon clicking a canary row', async () => {
    render(<DeceptionGridView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Production IAM Decoy')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Production IAM Decoy'));

    await waitFor(() => {
      expect(screen.getByText('Canary Properties')).toBeDefined();
      expect(screen.getByText('Inert Decoy Payload Contract')).toBeDefined();
      expect(screen.getByText('198.51.100.77')).toBeDefined();
      expect(screen.getByText('CASE-2026-1002')).toBeDefined();
    });
  });

  it('renders CanaryMintModal, validates form, and calls mintCanary mutation', async () => {
    vi.mocked(client.mintCanary).mockResolvedValue({
      ...mockCanary1,
      token_id: 'CANARY-NEW99',
      name: 'New Service Token Decoy',
      canary_type: 'SERVICE_API_TOKEN',
    });

    const onClose = vi.fn();
    const onMinted = vi.fn();

    render(<CanaryMintModal isOpen={true} onClose={onClose} onCanaryMinted={onMinted} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Mint Canary Honeytoken')).toBeDefined();
    expect(screen.getByText('AWS IAM Decoy Key')).toBeDefined();
    expect(screen.getByText('Internal Service Token')).toBeDefined();

    // Select Service API Token
    fireEvent.click(screen.getByText('Internal Service Token'));

    // Fill form
    const nameInput = screen.getByPlaceholderText(/Production IAM Decoy Key/i);
    fireEvent.change(nameInput, { target: { value: 'New Service Token Decoy' } });

    // Submit form
    const submitBtn = screen.getByText('Mint Canary Token');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(client.mintCanary).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Service Token Decoy',
          canary_type: 'SERVICE_API_TOKEN',
          environment: 'production',
        })
      );
      expect(screen.getByText('Canary Honeytoken Minted')).toBeDefined();
      expect(screen.getByText('Permanently Inert Security Decoy')).toBeDefined();
    });
  });

  it('handles canary revocation in CanaryDetailDossier', async () => {
    vi.mocked(client.revokeCanary).mockResolvedValue({
      ...mockCanary1,
      status: 'revoked',
    });

    const onBack = vi.fn();
    render(<CanaryDetailDossier tokenId="CANARY-TEST01" onBack={onBack} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('Revoke Canary')).toBeDefined();
    });

    // Click revoke button -> shows confirmation
    fireEvent.click(screen.getByText('Revoke Canary'));
    expect(screen.getByText('Confirm revoke?')).toBeDefined();

    // Confirm revocation
    fireEvent.click(screen.getByText('Yes, Revoke'));

    await waitFor(() => {
      expect(client.revokeCanary).toHaveBeenCalledWith('CANARY-TEST01');
    });
  });

  it('triggers investigation and containment callbacks from CanaryDetailDossier', async () => {
    const onInvestigateIp = vi.fn();
    const onStageContainment = vi.fn();

    render(
      <CanaryDetailDossier
        tokenId="CANARY-TEST01"
        onBack={vi.fn()}
        onInvestigateIp={onInvestigateIp}
        onStageContainment={onStageContainment}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('198.51.100.77')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Investigate IP'));
    expect(onInvestigateIp).toHaveBeenCalledWith('198.51.100.77');

    fireEvent.click(screen.getByText('Stage Containment'));
    expect(onStageContainment).toHaveBeenCalledWith('198.51.100.77', 105);
  });
});
