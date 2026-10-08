import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CaseManagementView } from '../CaseManagementView';
import { CaseDetailDossier } from '../CaseDetailDossier';
import { PostIncidentReportModal } from '../PostIncidentReportModal';
import { CasePromotionModal } from '../CasePromotionModal';
import * as client from '../../api/client';
import { IncidentCase, PostIncidentReport } from '../../types';

// Mock API client
vi.mock('../../api/client', () => ({
  fetchCases: vi.fn(),
  fetchCase: vi.fn(),
  createCase: vi.fn(),
  updateCase: vi.fn(),
  completeCaseTask: vi.fn(),
  addCaseNote: vi.fn(),
  fetchCaseReport: vi.fn(),
  previewIncidentCommand: vi.fn(),
  executeIncidentCommand: vi.fn(),
}));

const mockCase: IncidentCase = {
  case_id: 'CASE-2026-1001',
  title: 'Multi-Vector Credential Assault on SSH Decoy',
  description: 'Automated dictionary assault against port 2222 honeypot sensor.',
  severity: 'high',
  status: 'investigating',
  assigned_to: 'analyst_sarah',
  source_ip: '198.51.100.44',
  target_id: 12,
  alert_ids: [101, 102],
  playbook_template: 'SSH_BRUTE_FORCE_SOP',
  tasks: [
    {
      task_id: 'task-1',
      step_number: 1,
      phase: 'Identification',
      title: 'Analyze SSH Authentication Telemetry',
      description: 'Review failed login usernames and session frequencies.',
      governor_action: null,
      is_mandatory: true,
      status: 'completed',
      completed_by: 'analyst_sarah',
      completed_at: '2026-10-08T16:00:00Z',
      command_execution_id: null,
      notes: 'Confirmed 45 attempts in 60 seconds.',
    },
    {
      task_id: 'task-2',
      step_number: 2,
      phase: 'Containment',
      title: 'Stage Host Drop Rules for Adversary Subnet',
      description: 'Submit containment staging request to Governor.',
      governor_action: 'CONTAINMENT_STAGING_REQUEST',
      is_mandatory: true,
      status: 'pending',
      completed_by: null,
      completed_at: null,
      command_execution_id: null,
      notes: null,
    },
  ],
  notes: [
    {
      note_id: 'note-1',
      operator_id: 'analyst_sarah',
      role: 'analyst',
      message: 'Initial triage confirms brute force behavior from known VPS provider.',
      created_at: '2026-10-08T16:05:00Z',
    },
  ],
  created_by: 'analyst_sarah',
  created_at: '2026-10-08T15:55:00Z',
  updated_at: '2026-10-08T16:05:00Z',
  closed_at: null,
  closed_by: null,
  playbook_progress: 0.5,
  advisory_summary: 'Targeted credential attacks observed. Containment recommended.',
};

const mockReport: PostIncidentReport = {
  case_id: 'CASE-2026-1001',
  title: 'Multi-Vector Credential Assault on SSH Decoy',
  severity: 'high',
  status: 'investigating',
  executive_summary: 'On 2026-10-08, HoneyShield-X neutralized an SSH brute force assault.',
  incident_timeline: [
    {
      timestamp: '2026-10-08T15:55:00Z',
      phase: 'Identification',
      actor: 'analyst_sarah',
      event: 'Case opened and initial triage executed',
      type: 'creation',
    },
  ],
  playbook_adherence: '50.0% (1/2 tasks completed)',
  remediation_actions: ['Containment staged for review'],
  root_cause_analysis: 'Automated credential dictionary attack against exposed decoy port.',
  assigned_operator: 'analyst_sarah',
  signoff_operator: 'responder_alex',
  generated_at: '2026-10-08T16:30:00Z',
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

describe('Module 3.6 Frontend: Case Management & Playbooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.fetchCases).mockResolvedValue({
      cases: [mockCase],
      total: 1,
    });
    vi.mocked(client.fetchCase).mockResolvedValue(mockCase);
    vi.mocked(client.fetchCaseReport).mockResolvedValue(mockReport);
  });

  it('renders CaseManagementView with cases, status badges, and progress bar', async () => {
    render(<CaseManagementView />, { wrapper: createWrapper() });

    expect(screen.getByText('SOC Incident Case Management & Playbooks')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('CASE-2026-1001')).toBeDefined();
      expect(screen.getByText('Multi-Vector Credential Assault on SSH Decoy')).toBeDefined();
      expect(screen.getByText('SSH_BRUTE_FORCE_SOP')).toBeDefined();
      expect(screen.getByText('50%')).toBeDefined();
    });
  });

  it('filters cases by search query', async () => {
    render(<CaseManagementView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CASE-2026-1001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search case ID, title, IP, handler...');
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_CASE' } });

    expect(screen.queryByText('CASE-2026-1001')).toBeNull();
    expect(screen.getByText('No incident cases found')).toBeDefined();
  });

  it('renders CaseDetailDossier with playbook tasks and advisory summary', async () => {
    render(<CaseDetailDossier caseId="CASE-2026-1001" onBack={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('CASE-2026-1001')).toBeDefined();
      expect(screen.getByText('ADVISORY THREAT CONTEXTUALIZATION')).toBeDefined();
      expect(screen.getByText('Targeted credential attacks observed. Containment recommended.')).toBeDefined();
      expect(screen.getByText('Analyze SSH Authentication Telemetry')).toBeDefined();
      expect(screen.getByText('Stage Host Drop Rules for Adversary Subnet')).toBeDefined();
    });
  });

  it('allows adding an investigation journal note', async () => {
    vi.mocked(client.addCaseNote).mockResolvedValue({
      note_id: 'note-2',
      operator_id: 'responder_alex',
      role: 'incident_responder',
      message: 'WHOIS lookup confirms ASN 64500.',
      created_at: new Date().toISOString(),
    });

    render(<CaseDetailDossier caseId="CASE-2026-1001" onBack={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Forensic Journal/i)).toBeDefined();
    });

    // Switch to journal tab
    fireEvent.click(screen.getByText(/Forensic Journal/i));

    const noteInput = screen.getByPlaceholderText('Log forensic findings, adversary attribution, or tactical changes...');
    fireEvent.change(noteInput, { target: { value: 'WHOIS lookup confirms ASN 64500.' } });

    const submitBtn = screen.getByText('Add Journal Note');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(client.addCaseNote).toHaveBeenCalledWith('CASE-2026-1001', 'WHOIS lookup confirms ASN 64500.');
    });
  });

  it('renders PostIncidentReportModal with deterministic executive summary and timeline', async () => {
    render(
      <PostIncidentReportModal
        caseId="CASE-2026-1001"
        isOpen={true}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Post-Incident Review (PIR) Report')).toBeDefined();
      expect(screen.getByText('On 2026-10-08, HoneyShield-X neutralized an SSH brute force assault.')).toBeDefined();
      expect(screen.getByText('50.0% (1/2 tasks completed)')).toBeDefined();
      expect(screen.getByText('Automated credential dictionary attack against exposed decoy port.')).toBeDefined();
    });
  });

  it('allows creating an incident case via CasePromotionModal', async () => {
    vi.mocked(client.createCase).mockResolvedValue(mockCase);

    const onCreated = vi.fn();
    render(
      <CasePromotionModal
        isOpen={true}
        onClose={vi.fn()}
        onCaseCreated={onCreated}
        initialAlertIds={[101, 102]}
        initialSourceIp="198.51.100.44"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Promote Alerts to Incident Case')).toBeDefined();
    const titleInput = screen.getByPlaceholderText('e.g. Multi-Vector Credential Assault on SSH Decoy');
    expect((titleInput as HTMLInputElement).value).toBe('Adversary Intrusion from 198.51.100.44');

    const submitBtn = screen.getByText('Promote / Create Case');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(client.createCase).toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalledWith('CASE-2026-1001');
    });
  });
});
