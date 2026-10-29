import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThreatIntelView } from '../ThreatIntelView';
import { IndicatorMintModal } from '../IndicatorMintModal';
import { IndicatorDossierDrawer } from '../IndicatorDossierDrawer';
import { FeedExportModal } from '../FeedExportModal';
import * as client from '../../api/client';
import { ThreatIndicator, CampaignCluster, IndicatorContextResponse } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  fetchThreatIndicators: vi.fn(),
  fetchThreatIndicator: vi.fn(),
  fetchIndicatorContext: vi.fn(),
  fetchThreatCampaigns: vi.fn(),
  createThreatIndicator: vi.fn(),
  updateThreatIndicator: vi.fn(),
  revokeThreatIndicator: vi.fn(),
  whitelistThreatIndicator: vi.fn(),
  promoteCaseObservable: vi.fn(),
  getThreatFeedExportUrl: vi.fn((format: string, token?: string) => `/api/v1/threat-intelligence/export/${format}${token ? `?token=${token}` : ''}`),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

// Mock Auth Context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    operator: {
      username: 'analyst_sarah',
      role: 'analyst',
      permissions: ['threat_intel:view', 'threat_intel:create', 'threat_intel:update', 'threat_intel:revoke', 'threat_intel:admin', 'threat_intel:export'],
    },
    hasPermission: (_perm: string) => true,
    logout: vi.fn(),
    sessionExpired: false,
  }),
}));

const mockIndicator1: ThreatIndicator = {
  id: 101,
  indicator_type: 'ip',
  indicator_value: '198.51.100.99',
  threat_level: 'critical',
  source: 'honeypot_trap',
  base_confidence: 0.90,
  decayed_confidence: 0.885,
  status: 'active',
  half_life_days: 14,
  hit_count: 3,
  first_seen: '2026-10-09T00:00:00Z',
  last_seen: '2026-10-09T04:00:00Z',
  campaign: 'APT29-SOLARWIND',
  tags: ['scanner', 'ssh_brute_force'],
  description: 'High frequency SSH brute forcer against honeypot grid',
  created_at: '2026-10-09T00:00:00Z',
};

const mockIndicator2: ThreatIndicator = {
  id: 102,
  indicator_type: 'domain',
  indicator_value: 'c2-drop.adversary.org',
  threat_level: 'high',
  source: 'incident_case',
  base_confidence: 0.85,
  decayed_confidence: 0.55,
  status: 'decaying',
  half_life_days: 30,
  hit_count: 1,
  first_seen: '2026-09-01T00:00:00Z',
  last_seen: '2026-09-10T00:00:00Z',
  campaign: 'FIN7-INFRA',
  tags: ['c2', 'dns_beacon'],
  description: 'Adversary staging domain extracted from incident case',
  created_at: '2026-09-01T00:00:00Z',
};

const mockCampaigns: CampaignCluster[] = [
  {
    campaign_id: 'CAMP-APT29-SOLARWIND',
    name: 'APT29-SOLARWIND',
    indicator_count: 5,
    highest_severity: 'critical',
    highest_confidence: 0.92,
    indicator_types: ['ip', 'domain'],
    first_seen: '2026-10-01T00:00:00Z',
    last_seen: '2026-10-09T04:00:00Z',
  },
];

const mockContext: IndicatorContextResponse = {
  advisory: true,
  authoritative: false,
  generated_at: '2026-10-09T04:00:00Z',
  indicator_value: '198.51.100.99',
  indicator_type: 'ip',
  threat_posture: 'high_frequency_scanning',
  narrative: 'Observed automated dictionary attacks targeting SSH authentication endpoints.',
  tags_annotated: ['ssh_brute_force', 'scanner'],
  recommended_actions: [
    'Stage automated firewall drop rule via Module 3.4 Governor',
    'Cross-reference other SSH honeypot endpoints for lateral recon',
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Module 3.8: Threat Intelligence Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.fetchThreatIndicators).mockResolvedValue({
      indicators: [mockIndicator1, mockIndicator2],
      total: 2,
      page: 1,
      page_size: 100,
    });
    vi.mocked(client.fetchThreatCampaigns).mockResolvedValue({
      campaigns: mockCampaigns,
      total: 1,
    });
    vi.mocked(client.fetchThreatIndicator).mockResolvedValue(mockIndicator1);
    vi.mocked(client.fetchIndicatorContext).mockResolvedValue(mockContext);
  });

  it('renders ThreatIntelView with KPIs and indicator records', async () => {
    renderWithClient(<ThreatIntelView />);

    expect(screen.getByText('Threat Intelligence & IOC Fusion')).toBeDefined();
    expect(screen.getByText('Tracked IOCs')).toBeDefined();
    expect(screen.getByText('Mint Indicator')).toBeDefined();
    expect(screen.getByText('Export Feeds')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('198.51.100.99')).toBeDefined();
      expect(screen.getByText('c2-drop.adversary.org')).toBeDefined();
      expect(screen.getAllByText('APT29-SOLARWIND').length).toBeGreaterThan(0);
    });
  });

  it('renders IndicatorMintModal with all indicator types and submits payload', async () => {
    vi.mocked(client.createThreatIndicator).mockResolvedValue(mockIndicator1);

    renderWithClient(<IndicatorMintModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByText('Mint Threat Indicator').length).toBeGreaterThan(0);
    expect(screen.getByText('IPv4 / IPv6 Address')).toBeDefined();
    expect(screen.getByText('CIDR Subnet Block')).toBeDefined();
    expect(screen.getByText('FQDN / Domain')).toBeDefined();

    // Fill in value
    const input = screen.getByPlaceholderText('198.51.100.45 or 2001:db8::1');
    fireEvent.change(input, { target: { value: '203.0.113.88' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Mint Threat Indicator' });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(client.createThreatIndicator).toHaveBeenCalledWith(
        expect.objectContaining({
          indicator_type: 'ip',
          indicator_value: '203.0.113.88',
        })
      );
    });
  });

  it('renders IndicatorDossierDrawer with decay metrics and advisory analysis', async () => {
    renderWithClient(<IndicatorDossierDrawer indicatorId={101} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('IOC Threat Dossier')).toBeDefined();
      expect(screen.getByText('198.51.100.99')).toBeDefined();
      expect(screen.getByText('Advisory Only · Non-Authoritative')).toBeDefined();
      expect(screen.getByText(/Observed automated dictionary attacks/)).toBeDefined();
      expect(screen.getByText('Revoke Indicator')).toBeDefined();
      expect(screen.getByText('Whitelist Observable')).toBeDefined();
    });
  });

  it('renders FeedExportModal with format specifications and direct export link', () => {
    renderWithClient(<FeedExportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Export Defensive Feeds')).toBeDefined();
    expect(screen.getByText('JSON Feed')).toBeDefined();
    expect(screen.getByText('Firewall EDL')).toBeDefined();
    expect(screen.getByText('STIX 2.1')).toBeDefined();
    expect(screen.getByText('Fetch Feed')).toBeDefined();
    expect(screen.getByText('Copy')).toBeDefined();
  });
});
