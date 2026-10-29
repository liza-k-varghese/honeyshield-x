import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginModal } from '../LoginModal';
import { Header } from '../Header';
import { CommandExecutionModal } from '../CommandExecutionModal';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import * as client from '../../api/client';
import { VirtualIncidentItem } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  authLogin: vi.fn(),
  authLogout: vi.fn(),
  authBreakGlass: vi.fn(),
  fetchCurrentOperator: vi.fn(),
  executeIncidentCommand: vi.fn(),
  previewIncidentCommand: vi.fn(),
}));

const mockIncident: VirtualIncidentItem = {
  incident_id: 'INC-999',
  alert_id: 999,
  attack_id: 88,
  source_ip: '198.51.100.99',
  attack_type: 'Credential Stuffing',
  severity: 'high',
  status: 'open',
  risk_score: 75.0,
  notification_status: 'none',
  event_count: 3,
  created_at: new Date().toISOString(),
};

describe('Module 3.5 Operator Authentication & RBAC Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders LoginModal with persona selector buttons', () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    expect(screen.getByText('HoneyShield-X SOC Console')).toBeDefined();
    expect(screen.getByText('Viewer Dan')).toBeDefined();
    expect(screen.getByText('Analyst Sarah')).toBeDefined();
    expect(screen.getByText('Responder Alex')).toBeDefined();
    expect(screen.getByText('Admin Chief')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('switches personas and fills credentials in LoginModal', () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const analystButton = screen.getByText('Analyst Sarah');
    fireEvent.click(analystButton);

    const usernameInput = screen.getByPlaceholderText('e.g. analyst_sarah') as HTMLInputElement;
    expect(usernameInput.value).toBe('analyst_sarah');
  });

  it('submits successful login and saves operator session', async () => {
    const mockResponse = {
      token: 'test_token_abc123',
      token_type: 'Bearer',
      expires_at: new Date(Date.now() + 28800000).toISOString(),
      idle_timeout_seconds: 1800,
      operator: {
        username: 'analyst_sarah',
        full_name: 'Sarah Chen (Senior Analyst)',
        role: 'analyst',
        is_break_glass: false,
        permissions: ['read:telemetry', 'read:dossier', 'read:rules', 'read:audit', 'command:ack'],
      },
    };

    (client.authLogin as any).mockResolvedValue(mockResponse);

    const onClose = vi.fn();
    render(
      <AuthProvider>
        <LoginModal isOpen={true} onClose={onClose} />
      </AuthProvider>
    );

    const submitBtn = screen.getByText('Sign In');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(client.authLogin).toHaveBeenCalledWith({
        username: 'responder_alex',
        password: 'ResponderPass123!',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('validates break-glass justification length >= 20 chars', async () => {
    render(
      <AuthProvider>
        <LoginModal isOpen={true} />
      </AuthProvider>
    );

    const breakGlassTab = screen.getByText('Break-Glass Emergency');
    fireEvent.click(breakGlassTab);

    expect(screen.getByText('Break-Glass Passphrase')).toBeDefined();

    // Type short justification
    const justificationInput = screen.getByPlaceholderText('Detail the operational security emergency...');
    fireEvent.change(justificationInput, { target: { value: 'Too short' } });

    const submitBtn = screen.getByText('Engage Emergency Break-Glass');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Justification must be at least 20 characters')).toBeDefined();
      expect(client.authBreakGlass).not.toHaveBeenCalled();
    });
  });

  it('renders Header with operator identity and role badge', () => {
    render(
      <AuthProvider>
        <Header activeView="dashboard" />
      </AuthProvider>
    );

    // Initial operator loaded in AuthContext is responder_alex
    expect(screen.getByText('responder_alex')).toBeDefined();
    expect(screen.getByText('Responder')).toBeDefined();
    expect(screen.getByText('Switch')).toBeDefined();
  });

  it('enforces RBAC restrictions in CommandExecutionModal for viewer role', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Seed session storage with viewer operator
    const viewerProfile = {
      username: 'viewer_dan',
      full_name: 'Dan Viewer',
      role: 'viewer',
      is_break_glass: false,
      permissions: ['read:telemetry', 'read:dossier'],
    };
    sessionStorage.setItem('hsx_operator', JSON.stringify(viewerProfile));
    sessionStorage.setItem('hsx_token', 'test_viewer_token');

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CommandExecutionModal
            incident={mockIncident}
            defaultAction="ALERT_ACKNOWLEDGE"
            onClose={() => {}}
          />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Expect role restriction banner
    expect(screen.getByText(/Role restriction:/i)).toBeDefined();
    expect(screen.getByText(/viewer/i)).toBeDefined();
    expect(screen.getByText(/command:ack/i)).toBeDefined();

    // Execute button must be disabled
    const execBtn = screen.getByRole('button', { name: /Execute Governed Action/i });
    expect((execBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('provides a valid fallback operator profile satisfying OperatorProfile interface', () => {
    let capturedAuth: any;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Consumer</div>;
    };

    render(<TestConsumer />);

    expect(capturedAuth.isAuthenticated).toBe(true);
    expect(capturedAuth.operator).toBeDefined();
    expect(capturedAuth.operator.username).toBe('responder_alex');
    expect(capturedAuth.operator.email).toBe('responder_alex@honeyshield.local');
    expect(capturedAuth.operator.is_active).toBe(true);
    expect(capturedAuth.operator.role).toBe('incident_responder');
    expect(Array.isArray(capturedAuth.operator.permissions)).toBe(true);
  });
});
