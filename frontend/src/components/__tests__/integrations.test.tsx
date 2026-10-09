import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationsView } from '../IntegrationsView';
import { EndpointConfigModal } from '../EndpointConfigModal';
import { EndpointTestModal } from '../EndpointTestModal';
import { DlqDrawer } from '../DlqDrawer';
import * as client from '../../api/client';
import { WebhookEndpoint, IntegrationMetrics, DlqRecord } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  fetchEndpoints: vi.fn(),
  fetchEndpoint: vi.fn(),
  createEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  deleteEndpoint: vi.fn(),
  testEndpoint: vi.fn(),
  fetchDlq: vi.fn(),
  retryDlqItem: vi.fn(),
  deleteDlqRecord: vi.fn(),
  fetchIntegrationMetrics: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

// Mock Auth Context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    operator: {
      username: 'admin_eve',
      role: 'security_administrator',
      permissions: ['integration:view', 'integration:test', 'integration:retry', 'integration:admin'],
    },
    hasPermission: () => true,
    logout: vi.fn(),
    sessionExpired: false,
  }),
}));

const mockEndpoint1: WebhookEndpoint = {
  id: 'ep_123456789abc',
  name: 'Splunk HEC Production',
  target_url: 'https://splunk.corp.net/services/collector/raw',
  description: 'Enterprise SIEM Raw Collector',
  enabled: true,
  events: ['alert.triggered', 'canary.tripped'],
  format: 'honeyshield_json',
  custom_headers: { 'X-Custom': 'SplunkToken' },
  secret: 'hsx_whsec_••••••••',
  created_at: '2026-10-09T08:00:00Z',
  updated_at: '2026-10-09T08:00:00Z',
  circuit_state: 'closed',
  consecutive_failures: 0,
  total_sent: 142,
  total_failed: 2,
  last_delivery_at: '2026-10-09T08:30:00Z',
  last_status_code: 200,
};

const mockEndpoint2: WebhookEndpoint = {
  id: 'ep_987654321fed',
  name: 'Cortex SOAR Gateway',
  target_url: 'https://xsoar.enterprise.io/webhook',
  description: 'Automated Containment Dispatch',
  enabled: true,
  events: ['*'],
  format: 'cef',
  custom_headers: {},
  secret: 'hsx_whsec_••••••••',
  created_at: '2026-10-09T07:00:00Z',
  updated_at: '2026-10-09T07:00:00Z',
  circuit_state: 'open',
  consecutive_failures: 5,
  total_sent: 50,
  total_failed: 10,
  last_delivery_at: '2026-10-09T08:15:00Z',
  last_status_code: 503,
};

const mockMetrics: IntegrationMetrics = {
  total_endpoints: 2,
  active_endpoints: 2,
  total_dispatched: 204,
  total_delivered: 192,
  total_failed: 12,
  dlq_count: 3,
  average_latency_ms: 45.6,
  circuits_open: 1,
};

const mockDlqRecord: DlqRecord = {
  delivery_id: 'del_uuid_fail_1',
  endpoint_id: 'ep_987654321fed',
  endpoint_name: 'Cortex SOAR Gateway',
  target_url: 'https://xsoar.enterprise.io/webhook',
  event_type: 'canary.tripped',
  payload: { canary_id: 'canary_sql_dump', attacker_ip: '198.51.100.42' },
  attempts: 4,
  last_error: 'Remote endpoint returned HTTP 503: Service Unavailable',
  status_code: 503,
  created_at: '2026-10-09T08:20:00Z',
};

describe('Module 3.9: Enterprise Integrations Frontend Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (client.fetchEndpoints as any).mockResolvedValue([mockEndpoint1, mockEndpoint2]);
    (client.fetchIntegrationMetrics as any).mockResolvedValue(mockMetrics);
    (client.fetchDlq as any).mockResolvedValue({ items: [mockDlqRecord], total: 1 });
  });

  it('renders IntegrationsView with endpoints table and live KPI metrics', async () => {
    render(<IntegrationsView />);

    await waitFor(() => {
      expect(screen.getByText('SIEM & SOAR Integration Gateway')).toBeDefined();
      expect(screen.getByText('Splunk HEC Production')).toBeDefined();
      expect(screen.getByText('Cortex SOAR Gateway')).toBeDefined();
    });

    expect(screen.getByText('CIRCUIT OPEN')).toBeDefined();
    expect(screen.getByText('HEALTHY')).toBeDefined();
  });

  it('opens and submits EndpointConfigModal to create a new webhook target', async () => {
    (client.createEndpoint as any).mockResolvedValue({
      ...mockEndpoint1,
      secret: 'hsx_whsec_secret_plaintext_test_123',
    });

    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <EndpointConfigModal
        isOpen={true}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    expect(screen.getByText('Register Webhook Target')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. Splunk HEC Primary'), {
      target: { value: 'New Sentinel Target' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://siem.enterprise.corp/api/webhook'), {
      target: { value: 'https://sentinel.azure.com/api/ingest' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register & Generate Secret/i }));

    await waitFor(() => {
      expect(client.createEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Sentinel Target',
          target_url: 'https://sentinel.azure.com/api/ingest',
        })
      );
      expect(onSavedMock).toHaveBeenCalled();
      expect(screen.getByText('Webhook Target Registered Successfully')).toBeDefined();
      expect(screen.getByText('Save Your Webhook Signing Secret Now')).toBeDefined();
    });
  });

  it('opens EndpointTestModal and executes a signed test ping', async () => {
    (client.testEndpoint as any).mockResolvedValue({
      delivery_id: 'test_del_123',
      status: 'success',
      status_code: 200,
      latency_ms: 32.5,
      response_preview: '{"status":"ok"}',
      error: null,
    });

    render(
      <EndpointTestModal
        isOpen={true}
        endpoint={mockEndpoint1}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Test Webhook Connectivity')).toBeDefined();
    expect(screen.getByText('Splunk HEC Production')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Dispatch Signed Ping/i }));

    await waitFor(() => {
      expect(client.testEndpoint).toHaveBeenCalledWith(mockEndpoint1.id, expect.any(Object));
      expect(screen.getByText(/STATUS: SUCCESS/i)).toBeDefined();
      expect(screen.getByText('{"status":"ok"}')).toBeDefined();
    });
  });

  it('opens DlqDrawer, displays failed items, and triggers re-dispatch', async () => {
    (client.retryDlqItem as any).mockResolvedValue({
      delivery_id: 'retry_del_456',
      status: 'success',
      status_code: 200,
      latency_ms: 41.2,
      response_preview: 'OK',
      error: null,
    });

    render(
      <DlqDrawer
        isOpen={true}
        onClose={vi.fn()}
        onRefreshMetrics={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Dead-Letter Queue (DLQ)')).toBeDefined();
      expect(screen.getByText('Target: Cortex SOAR Gateway')).toBeDefined();
      expect(screen.getByText('Attempts: 4/4')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Re-Dispatch/i }));

    await waitFor(() => {
      expect(client.retryDlqItem).toHaveBeenCalledWith('del_uuid_fail_1');
      expect(screen.getByText(/Delivery replayed successfully/i)).toBeDefined();
    });
  });
});
