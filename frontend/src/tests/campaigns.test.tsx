import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignsView } from '../components/CampaignsView';
import { CampaignDossierDrawer } from '../components/CampaignDossierDrawer';
import { CampaignGraphView } from '../components/CampaignGraphView';
import { CampaignContainmentModal } from '../components/CampaignContainmentModal';
import * as client from '../api/client';
import {
  CampaignSummary,
  CampaignDossier,
  CampaignMetrics,
  CampaignGraphResponse,
} from '../types';

// Mock API client
vi.mock('../api/client', () => ({
  fetchCampaigns: vi.fn(),
  fetchCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  fetchCampaignGraph: vi.fn(),
  fetchCampaignTimeline: vi.fn(),
  fetchCampaignMetrics: vi.fn(),
  triggerCampaignClustering: vi.fn(),
  mergeCampaigns: vi.fn(),
  containCampaign: vi.fn(),
  linkCampaignCase: vi.fn(),
  unlinkCampaignCase: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

// Mock Auth Context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    operator: {
      username: 'analyst_sarah',
      role: 'analyst',
      permissions: ['campaign:view', 'campaign:update', 'campaign:admin'],
    },
    hasPermission: () => true,
    logout: vi.fn(),
    sessionExpired: false,
  }),
}));

const mockSummary1: CampaignSummary = {
  campaign_id: 'camp-112233445566',
  name: 'Multi-Vector SSH/SQL Campaign Alpha',
  status: 'active',
  severity: 'critical',
  confidence: 0.92,
  entity_count: 5,
  attack_count: 2,
  alert_count: 2,
  canary_count: 2,
  ioc_count: 3,
  case_count: 1,
  mitre_tactics: ['Initial Access', 'Credential Access'],
  first_seen: '2026-10-09T01:00:00Z',
  last_seen: '2026-10-09T05:00:00Z',
  tags: ['c2', 'ssh'],
  source_ips: ['198.51.100.10', '198.51.100.11'],
  anchor_type: 'source_ip',
};

const mockSummary2: CampaignSummary = {
  campaign_id: 'camp-998877665544',
  name: 'Reconnaissance Probe Beta',
  status: 'dormant',
  severity: 'medium',
  confidence: 0.65,
  entity_count: 1,
  attack_count: 1,
  alert_count: 0,
  canary_count: 0,
  ioc_count: 1,
  case_count: 0,
  mitre_tactics: ['Reconnaissance'],
  first_seen: '2026-10-08T10:00:00Z',
  last_seen: '2026-10-08T14:00:00Z',
  tags: ['probe'],
  source_ips: ['203.0.113.88'],
  anchor_type: 'source_ip',
};

const mockMetrics: CampaignMetrics = {
  active_campaigns: 1,
  critical_campaigns: 1,
  high_campaigns: 0,
  dormant_campaigns: 1,
  resolved_campaigns: 0,
  mean_dwell_time_hours: 4.5,
  top_mitre_tactics: [
    { tactic: 'Initial Access', count: 5 },
    { tactic: 'Credential Access', count: 3 },
  ],
};

const mockDossier: CampaignDossier = {
  campaign_id: 'camp-112233445566',
  name: 'Multi-Vector SSH/SQL Campaign Alpha',
  status: 'active',
  severity: 'critical',
  confidence: 0.92,
  first_seen: '2026-10-09T01:00:00Z',
  last_seen: '2026-10-09T05:00:00Z',
  source_ips: ['198.51.100.10', '198.51.100.11'],
  destination_ips: ['10.0.0.1'],
  user_agents: ['Custom-Scanner/2.0'],
  cves: ['CVE-2023-38606'],
  attack_ids: [101, 102],
  alert_ids: [201, 202],
  canary_ids: ['canary-db-prod-cred'],
  ioc_ids: ['malicious-c2.test'],
  case_ids: ['1'],
  mitre_tactics: ['Initial Access', 'Credential Access'],
  mitre_techniques: ['T1190', 'T1110'],
  notes: 'High confidence coordinated campaign attacking SSH and SQL decoy.',
  tags: ['c2', 'brute_force'],
  created_at: '2026-10-09T01:00:00Z',
  updated_at: '2026-10-09T05:00:00Z',
};

const mockGraphResponse: CampaignGraphResponse = {
  campaign_id: 'camp-112233445566',
  nodes: [
    {
      id: 'ip:198.51.100.10',
      label: '198.51.100.10',
      node_type: 'ip',
      severity: 'critical',
    },
    {
      id: 'ioc:malicious-c2.test',
      label: 'malicious-c2.test',
      node_type: 'ioc',
      severity: 'high',
    },
    {
      id: 'alert:201',
      label: 'SSH Brute Force',
      node_type: 'alert',
      severity: 'critical',
    },
    {
      id: 'canary:canary-db-prod-cred',
      label: 'canary-db-prod-cred',
      node_type: 'canary',
    },
    {
      id: 'case:1',
      label: 'Case #1',
      node_type: 'case',
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'ip:198.51.100.10',
      target: 'ioc:malicious-c2.test',
      label: 'associated_ioc',
      edge_type: 'associated_ioc',
    },
    {
      id: 'e2',
      source: 'ip:198.51.100.10',
      target: 'alert:201',
      label: 'triggered_alert',
      edge_type: 'triggered_alert',
    },
  ],
  summary: {
    total_nodes: 5,
    total_edges: 2,
    stages_observed: 2,
    highest_severity: 'critical',
    has_canary: true,
    has_ioc: true,
    has_cases: true,
  },
  truncation: {
    is_truncated: false,
    total_nodes_discovered: 5,
    rendered_nodes: 5,
    pruned_nodes_count: 0,
    pruned_by_type: {},
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Module 3.10: Attack Campaign Intelligence Frontend Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (client.fetchCampaigns as any).mockResolvedValue({
      items: [mockSummary1, mockSummary2],
      total: 2,
      limit: 100,
      offset: 0,
    });
    (client.fetchCampaignMetrics as any).mockResolvedValue(mockMetrics);
    (client.fetchCampaign as any).mockResolvedValue(mockDossier);
    (client.fetchCampaignGraph as any).mockResolvedValue(mockGraphResponse);
    (client.fetchCampaignTimeline as any).mockResolvedValue({
      campaign_id: 'camp-112233445566',
      events: [
        {
          id: 'ev-1',
          timestamp: '2026-10-09T01:00:00Z',
          event_type: 'attack',
          title: 'Initial SSH Brute Force Ingress',
          severity: 'critical',
          source_ip: '198.51.100.10',
        },
      ],
      total: 1,
    });
  });

  it('renders CampaignsView with KPI metrics and campaigns table', async () => {
    renderWithClient(<CampaignsView />);

    await waitFor(() => {
      expect(screen.getByText('Cross-Module Attack Campaign Intelligence Core')).toBeDefined();
      expect(screen.getByText('Multi-Vector SSH/SQL Campaign Alpha')).toBeDefined();
      expect(screen.getByText('Reconnaissance Probe Beta')).toBeDefined();
    });

    expect(screen.getByText('camp-112233445566')).toBeDefined();
    expect(screen.getByText('4.5h')).toBeDefined(); // Mean Dwell Time
  });

  it('triggers manual re-clustering when button is clicked', async () => {
    (client.triggerCampaignClustering as any).mockResolvedValue({
      status: 'completed',
      campaigns_created: 1,
      campaigns_updated: 2,
      total_active_campaigns: 3,
      duration_ms: 120.5,
    });

    renderWithClient(<CampaignsView />);

    await waitFor(() => {
      expect(screen.getByText('Trigger Re-Clustering')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Trigger Re-Clustering'));

    await waitFor(() => {
      expect(client.triggerCampaignClustering).toHaveBeenCalledWith({ lookback_hours: 168 });
      expect(screen.getByText(/Clustering complete: 1 created, 2 updated/i)).toBeDefined();
    });
  });

  it('renders CampaignDossierDrawer with multi-entity details and case linking', async () => {
    renderWithClient(
      <CampaignDossierDrawer
        campaignId="camp-112233445566"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Multi-Vector SSH/SQL Campaign Alpha')).toBeDefined();
      expect(screen.getByText(/198\.51\.100\.10/)).toBeDefined();
      expect(screen.getByText(/canary-db-prod-cred/)).toBeDefined();
      expect(screen.getByText(/malicious-c2\.test/)).toBeDefined();
    });

    // Test case linking
    (client.linkCampaignCase as any).mockResolvedValue({
      linked: true,
      campaign_id: 'camp-112233445566',
      case_id: '42',
    });

    const caseInput = screen.getByPlaceholderText('Enter Case ID to link...');
    fireEvent.change(caseInput, { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: /Link Case/i }));

    await waitFor(() => {
      expect(client.linkCampaignCase).toHaveBeenCalledWith('camp-112233445566', '42');
    });
  });

  it('renders CampaignGraphView with nodes, edges, and node inspector', async () => {
    render(<CampaignGraphView graph={mockGraphResponse} />);

    expect(screen.getByText('5 Nodes • 2 Edges')).toBeDefined();
    expect(screen.getByText('Max Sev: critical')).toBeDefined();
    expect(screen.getByText('198.51.100.10')).toBeDefined();
    expect(screen.getByText(/SSH Brute Force/)).toBeDefined();
  });

  it('displays explicit truncation banner when graph bounds are exceeded', () => {
    const truncatedGraph: CampaignGraphResponse = {
      ...mockGraphResponse,
      truncation: {
        is_truncated: true,
        total_nodes_discovered: 145,
        rendered_nodes: 100,
        pruned_nodes_count: 45,
        pruned_by_type: { ip: 25, ioc: 20 },
      },
    };

    render(<CampaignGraphView graph={truncatedGraph} />);

    expect(screen.getByText(/Graph Display Truncated:/i)).toBeDefined();
    expect(screen.getByText(/Displaying 100 of 145 total nodes/i)).toBeDefined();
    expect(screen.getByText('-25 ips')).toBeDefined();
    expect(screen.getByText('-20 iocs')).toBeDefined();
  });

  it('validates and submits Governor Tier-3 campaign containment', async () => {
    (client.containCampaign as any).mockResolvedValue({
      status: 'dispatched',
      campaign_id: 'camp-112233445566',
      contained_entities: ['198.51.100.10', '198.51.100.11'],
      governor_eval: { approved: true, tier: 3 },
      dispatched_at: '2026-10-09T05:30:00Z',
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderWithClient(
      <CampaignContainmentModal
        isOpen={true}
        onClose={onClose}
        campaign={mockDossier}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText('Governor Tier-3 Campaign Containment')).toBeDefined();
    expect(screen.getByText('Multi-Vector SSH/SQL Campaign Alpha')).toBeDefined();

    // Fill token & justification
    const tokenInput = screen.getByPlaceholderText(/Enter approval token/i);
    fireEvent.change(tokenInput, { target: { value: 'tok-valid-governor-123' } });

    const justificationInput = screen.getByPlaceholderText(/Explain operational reason for containment/i);
    fireEvent.change(justificationInput, {
      target: { value: 'Confirmed adversarial campaign attempting brute force and lateral traversal.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dispatch Containment/i }));

    await waitFor(() => {
      expect(client.containCampaign).toHaveBeenCalledWith(
        'camp-112233445566',
        expect.objectContaining({
          action_type: 'BLOCK_IP',
          approval_token: 'tok-valid-governor-123',
          justification: 'Confirmed adversarial campaign attempting brute force and lateral traversal.',
        }),
        expect.any(String)
      );
      expect(screen.getByText('Campaign Containment Dispatched Successfully')).toBeDefined();
    });
  });

  it('renders CampaignsView gracefully when campaign has undefined source_ips', async () => {
    const summaryNoIps: CampaignSummary = {
      ...mockSummary1,
      campaign_id: 'camp-no-ips-999',
      name: 'Campaign Without IPs',
      source_ips: undefined,
    };
    (client.fetchCampaigns as any).mockResolvedValue({
      items: [summaryNoIps],
      total: 1,
    });

    renderWithClient(<CampaignsView />);

    await waitFor(() => {
      expect(screen.getByText('Campaign Without IPs')).toBeDefined();
      expect(screen.getByText(/0 IPs/)).toBeDefined();
    });
  });
});
