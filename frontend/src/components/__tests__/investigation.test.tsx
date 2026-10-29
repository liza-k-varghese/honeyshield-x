import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttackChainGraph } from '../AttackChainGraph';
import { MitreMatrixView } from '../MitreMatrixView';
import { CrossAttackTimeline } from '../CrossAttackTimeline';
import { AttackGraphResponse, CrossAttackEvent } from '../../types';

describe('AttackChainGraph Component', () => {
  const mockGraph: AttackGraphResponse = {
    entity_id: '198.51.100.42',
    entity_type: 'source_ip',
    nodes: [
      {
        id: 'entity:198.51.100.42',
        type: 'entity',
        label: 'Attacker: 198.51.100.42',
        stage: 'Attacker Entity',
        severity: 'high',
        event_count: 5,
        evidence_ids: [1, 2],
      },
      {
        id: 'stage:TA0043:T1046',
        type: 'tactic_stage',
        label: 'Reconnaissance',
        stage: 'TA0043',
        tactic_id: 'TA0043',
        technique_id: 'T1046',
        technique_name: 'Network Service Discovery',
        severity: 'medium',
        event_count: 3,
        evidence_ids: [1, 2, 3],
      },
      {
        id: 'alert:1',
        type: 'alert',
        label: 'Alert #1 (Critical)',
        stage: 'Alert Triggered',
        severity: 'critical',
        event_count: 5,
        evidence_ids: [1, 2, 3, 4, 5],
      },
    ],
    edges: [
      {
        id: 'edge:1',
        source: 'entity:198.51.100.42',
        target: 'stage:TA0043:T1046',
        label: 'initiates',
        transition_type: 'chronological',
      },
      {
        id: 'edge:2',
        source: 'stage:TA0043:T1046',
        target: 'alert:1',
        label: 'triggers',
        transition_type: 'escalation',
      },
    ],
    summary: {
      stages_observed: 1,
      total_events: 5,
      highest_severity: 'critical',
      has_execution: false,
      risk_score: 85.5,
    },
  };

  it('renders SVG graph with nodes and directed edges', () => {
    const { container } = render(<AttackChainGraph graph={mockGraph} />);

    // Summary metrics
    expect(screen.getByText('1')).toBeDefined(); // stages observed
    expect(screen.getAllByText('5 events').length).toBeGreaterThanOrEqual(1); // total evidence
    expect(screen.getByText('85.5')).toBeDefined(); // risk score
    expect(screen.getByText('No Execution')).toBeDefined();

    // SVG elements
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    // Node texts
    expect(screen.getByText('TA0043')).toBeDefined();
    expect(screen.getByText('T1046 (3 ev)')).toBeDefined();
  });

  it('allows clicking a node to inspect evidence and metadata', () => {
    render(<AttackChainGraph graph={mockGraph} />);

    // Click stage node
    const stageNodeText = screen.getByText('T1046 (3 ev)');
    fireEvent.click(stageNodeText);

    // Inspection panel appears
    expect(screen.getByText('Node: tactic_stage')).toBeDefined();
    expect(screen.getByText('T1046 - Network Service Discovery')).toBeDefined();
    expect(screen.getByText('1, 2, 3')).toBeDefined();
  });
});

describe('MitreMatrixView Component', () => {
  const mockEvents: CrossAttackEvent[] = [
    {
      id: 101,
      attack_id: 5,
      event_type: 'network_scan',
      source_ip: '198.51.100.42',
      message: 'SYN scan on port 80',
      event_time: '2026-10-07T14:00:00Z',
      mitre: {
        tactic_id: 'TA0043',
        tactic_name: 'Reconnaissance',
        technique_id: 'T1046',
        technique_name: 'Network Service Discovery',
        confidence: 0.95,
        stage_order: 1,
        source: 'rule:PORT_SCAN_SWEEP',
        evidence_ids: [101],
      },
    },
  ];

  it('renders MITRE ATT&CK Matrix with active tactics and techniques', () => {
    render(<MitreMatrixView events={mockEvents} />);

    expect(screen.getByText('MITRE ATT&CK Matrix Alignment')).toBeDefined();
    expect(screen.getByText('T1046')).toBeDefined();
    expect(screen.getByText('Network Service Discovery')).toBeDefined();
    expect(screen.getByText('conf: 95%')).toBeDefined();
  });
});

describe('CrossAttackTimeline Component', () => {
  const mockEvents: CrossAttackEvent[] = [
    {
      id: 201,
      attack_id: 1,
      event_type: 'web_access',
      source_ip: '198.51.100.42',
      message: '<script>alert("xss")</script> & command=cat /etc/passwd',
      event_time: '2026-10-07T10:00:00Z',
      mitre: {
        tactic_id: 'TA0001',
        tactic_name: 'Initial Access',
        technique_id: 'T1190',
        technique_name: 'Exploit Public-Facing Application',
        confidence: 0.9,
        stage_order: 3,
        source: 'rule:WEB_PATH_TRAVERSAL',
        evidence_ids: [201],
      },
    },
    {
      id: 202,
      attack_id: 2,
      event_type: 'ssh_login_failed',
      source_ip: '198.51.100.42',
      message: 'failed password for root',
      event_time: '2026-10-07T11:00:00Z',
      mitre: null,
    },
  ];

  it('renders chronological event list and safely displays payloads', () => {
    render(<CrossAttackTimeline events={mockEvents} />);

    expect(screen.getByText('Attack #1')).toBeDefined();
    expect(screen.getByText('Attack #2')).toBeDefined();
    expect(screen.getByText('T1190')).toBeDefined();

    // Payload must be rendered as raw text inside <pre>
    const payloadPre = screen.getByText('<script>alert("xss")</script> & command=cat /etc/passwd');
    expect(payloadPre).toBeDefined();
    expect(payloadPre.tagName.toLowerCase()).toBe('pre');
  });

  it('filters events by search query', () => {
    render(<CrossAttackTimeline events={mockEvents} />);

    const searchInput = screen.getByPlaceholderText('Filter events, techniques...');
    fireEvent.change(searchInput, { target: { value: 'failed password' } });

    expect(screen.queryByText('Attack #1')).toBeNull();
    expect(screen.getByText('Attack #2')).toBeDefined();
  });
});
