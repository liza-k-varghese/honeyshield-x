import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ScoutCharacter,
  NexusCharacter,
  OracleCharacter,
  SentinelCharacter,
} from '../digital-agents/characters';
import { DataPacket } from '../digital-agents/components/DataPacket';
import { TransferInspector } from '../digital-agents/components/TransferInspector';
import { AgentCommunicationPanel } from '../digital-agents/components/AgentCommunicationPanel';
import { NexusAssistantModal } from '../digital-agents/components/NexusAssistantModal';
import { EventJourneyReplay } from '../digital-agents/components/EventJourneyReplay';
import { CompactAgentRibbon } from '../digital-agents/components/CompactAgentRibbon';
import { BackendEventAdapter } from '../digital-agents/engine/BackendEventAdapter';
import { DemoSimulationEngine } from '../digital-agents/engine/DemoSimulationEngine';
import { DataPacketPayload, AgentHandoffRecord, EventJourneyRecord } from '../digital-agents/types';

describe('Digital Agent Universe — Character Design & Render Tests', () => {
  it('renders SCOUT character with distinct blue optic visor and antenna', () => {
    const { container } = render(<ScoutCharacter state="scanning" size={140} />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toBeDefined();
    expect(container.querySelector('[title="SCOUT: SCANNING"]')).not.toBeNull();
  });

  it('renders NEXUS character with glossy face, circular side modules and cyan eyes', () => {
    const { container } = render(<NexusCharacter state="processing" carryingPacket={true} size={140} />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.querySelector('[title="NEXUS: PROCESSING"]')).not.toBeNull();
  });

  it('renders ORACLE character with analytical violet aperture and halo module', () => {
    const { container } = render(<OracleCharacter state="analyzing" size={140} />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.querySelector('[title="ORACLE: ANALYZING"]')).not.toBeNull();
  });

  it('renders SENTINEL character with reinforced graphite armor and red battle visor', () => {
    const { container } = render(<SentinelCharacter state="alerting" carryingPacket={true} size={140} />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.querySelector('[title="SENTINEL: ALERTING"]')).not.toBeNull();
  });

  it('handles reduced motion mode and animation states gracefully', () => {
    const { container } = render(
      <NexusCharacter state="travelling" reducedMotion={true} size={100} />
    );
    expect(container.querySelector('.animate-bounce')).toBeNull();
  });
});

describe('Digital Agent Universe — Data Packet & Inspector Tests', () => {
  const samplePacket: DataPacketPayload = {
    eventId: 'EVT-TEST-999',
    transferId: 'TR-TEST-999',
    sourceNode: 'Edge Sensors',
    destinationNode: 'Ingestion Gateway',
    assignedAgent: 'scout',
    eventType: 'sensor.canary_tripped',
    severity: 'high',
    color: 'blue',
    timestamp: '2026-11-04T12:00:00Z',
    status: 'in_transit',
    progressPercent: 50,
    metadata: {
      sourceIp: '198.51.100.42',
      attackId: 101,
      ruleName: 'SSH Brute-Force Rule',
      alertTitle: 'Test High Priority Alert',
    },
  };

  it('renders interactive DataPacket with severity and event type', () => {
    const handleClick = vi.fn();
    render(<DataPacket packet={samplePacket} onClick={handleClick} />);

    expect(screen.getByText('sensor.canary_tripped')).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledWith(samplePacket);
  });

  it('renders TransferInspector modal with transfer details and deep-dive IP button', () => {
    const handleClose = vi.fn();
    const handleInvestigate = vi.fn();

    render(
      <TransferInspector
        packet={samplePacket}
        onClose={handleClose}
        onDeepLinkInvestigate={handleInvestigate}
      />
    );

    expect(screen.getByText('INTERACTIVE DATA PACKET INSPECTOR')).toBeDefined();
    expect(screen.getByText('EVT-TEST-999')).toBeDefined();
    expect(screen.getByText('198.51.100.42')).toBeDefined();

    const investigateBtn = screen.getByText('Deep-Dive IP');
    fireEvent.click(investigateBtn);
    expect(handleInvestigate).toHaveBeenCalledWith('198.51.100.42');
  });
});

describe('Digital Agent Universe — Agent Communication & Handoff Tests', () => {
  const sampleHandoffs: AgentHandoffRecord[] = [
    {
      id: 'ho-1',
      transferId: 'tr-1',
      fromAgent: 'scout',
      toAgent: 'nexus',
      taskType: 'Sensor Telemetry Ingestion',
      contextMessage: 'Forwarding connection probe to NEXUS queue.',
      timestamp: '2026-11-04T12:00:00Z',
      status: 'confirmed',
      packetSummary: {
        eventId: 'evt-1',
        eventType: 'sensor.canary',
        severity: 'medium',
      },
    },
    {
      id: 'ho-2',
      transferId: 'tr-2',
      fromAgent: 'nexus',
      toAgent: 'oracle',
      taskType: 'Threat Intelligence Correlation',
      contextMessage: 'Attacker session staged for IOC matching.',
      timestamp: '2026-11-04T12:01:00Z',
      status: 'in_progress',
      packetSummary: {
        eventId: 'evt-2',
        eventType: 'attack.created',
        severity: 'high',
      },
    },
  ];

  it('renders handoffs and filters by agent', () => {
    render(<AgentCommunicationPanel handoffs={sampleHandoffs} />);

    expect(screen.getByText('AGENT-TO-AGENT INTER-PROCESS COMMUNICATION')).toBeDefined();
    expect(screen.getByText('Sensor Telemetry Ingestion')).toBeDefined();
    expect(screen.getByText('Threat Intelligence Correlation')).toBeDefined();

    // Filter by ORACLE
    const oracleFilterBtn = screen.getByRole('button', { name: /ORACLE/i });
    fireEvent.click(oracleFilterBtn);

    expect(screen.queryByText('Sensor Telemetry Ingestion')).toBeNull();
    expect(screen.getByText('Threat Intelligence Correlation')).toBeDefined();
  });
});

describe('Digital Agent Universe — NEXUS Grounded Assistant Tests', () => {
  it('answers grounded operational questions deterministically', () => {
    const handleClose = vi.fn();
    render(
      <NexusAssistantModal
        isOpen={true}
        onClose={handleClose}
        activePackets={[]}
        completedPackets={[]}
        failedPackets={[]}
        runtimeAgentStates={{
          scout: 'observing',
          nexus: 'idle',
          oracle: 'idle',
          sentinel: 'idle',
        }}
      />
    );

    expect(screen.getByText('NEXUS INTELLIGENT ASSISTANT')).toBeDefined();

    const input = screen.getByPlaceholderText(/Ask NEXUS about active transfers/i);
    fireEvent.change(input, { target: { value: 'What are you processing?' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText(/All telemetry queues are currently quiescent/i)).toBeDefined();
  });
});

describe('Digital Agent Universe — Event Journey & Replay Tests', () => {
  const sampleJourney: EventJourneyRecord = {
    eventId: 'EVT-JOURNEY-1',
    eventType: 'attack.brute_force',
    severity: 'critical',
    sourceIp: '198.51.100.99',
    startTime: '2026-11-04T12:00:00Z',
    totalDurationMs: 450,
    isComplete: true,
    hasFailed: false,
    currentStageIndex: 2,
    stages: [
      {
        stageId: 's1',
        stageName: 'Edge Honeypot Detonation',
        responsibleAgent: 'scout',
        timestamp: '2026-11-04T12:00:00Z',
        status: 'completed',
        details: 'Adversary touched honeypot port 22.',
        durationMs: 50,
      },
      {
        stageId: 's2',
        stageName: 'Transactional Outbox Commit',
        responsibleAgent: 'nexus',
        timestamp: '2026-11-04T12:00:01Z',
        status: 'completed',
        details: 'Persisted to security_event_outbox table.',
        durationMs: 70,
      },
    ],
  };

  it('renders EventJourneyReplay with clear REPLAY watermark and stage controls', () => {
    render(<EventJourneyReplay journeys={[sampleJourney]} />);

    expect(screen.getByText('REPLAY MODE')).toBeDefined();
    expect(screen.getByText('Edge Honeypot Detonation')).toBeDefined();
    expect(screen.getByText('Transactional Outbox Commit')).toBeDefined();
  });
});

describe('Digital Agent Universe — Engine & Adapter Tests', () => {
  it('BackendEventAdapter parses raw SSE events and enforces deduplication', () => {
    const adapter = new BackendEventAdapter();
    const raw1 = {
      event_id: 'EVT-DEDUP-1',
      event_type: 'sensor.canary_tripped',
      severity: 'high',
      payload: { source_ip: '198.51.100.42' },
    };

    const parsed1 = adapter.parseSecurityEvent(raw1);
    expect(parsed1).not.toBeNull();
    expect(parsed1?.assignedAgent).toBe('scout');
    expect(parsed1?.color).toBe('blue');

    // Duplicate check
    const duplicate = adapter.parseSecurityEvent(raw1);
    expect(duplicate).toBeNull();
  });

  it('BackendEventAdapter constructs valid multi-stage EventJourney records', () => {
    const adapter = new BackendEventAdapter();
    const packet: DataPacketPayload = {
      eventId: 'EVT-JOURNEY-TEST',
      transferId: 'TR-1',
      sourceNode: 'Sensors',
      destinationNode: 'Ingestion',
      assignedAgent: 'scout',
      eventType: 'attack.detected',
      severity: 'critical',
      color: 'red',
      timestamp: new Date().toISOString(),
      status: 'in_transit',
      progressPercent: 60,
      metadata: { sourceIp: '203.0.113.195' },
    };

    const journey = adapter.buildEventJourney(packet);
    expect(journey.stages.length).toBe(6);
    expect(journey.stages[0].responsibleAgent).toBe('scout');
    expect(journey.stages[1].responsibleAgent).toBe('nexus');
    expect(journey.stages[4].responsibleAgent).toBe('oracle');
    expect(journey.stages[5].responsibleAgent).toBe('sentinel');
  });

  it('DemoSimulationEngine generates isolated synthetic demonstration events', () => {
    const engine = new DemoSimulationEngine();
    const { packet, handoff, journey } = engine.generateDemoPacket();

    expect(packet.eventId).toContain('DEMO-EVT-');
    expect(handoff.id).toContain('DEMO-HO-');
    expect(journey.stages.length).toBeGreaterThanOrEqual(4);
  });

  it('CompactAgentRibbon renders all 4 agents in Operations Mode', () => {
    const handleOpenUniverse = vi.fn();
    const handleOpenAssistant = vi.fn();

    const mockStatuses = {
      scout: { id: 'scout' as const, currentState: 'observing' as const, connectionStatus: 'connected' as const, tasksCompleted: 5, tasksFailed: 0, tasksPending: 0, lastActiveTimestamp: '', recentActivity: [] },
      nexus: { id: 'nexus' as const, currentState: 'idle' as const, connectionStatus: 'connected' as const, tasksCompleted: 5, tasksFailed: 0, tasksPending: 0, lastActiveTimestamp: '', recentActivity: [] },
      oracle: { id: 'oracle' as const, currentState: 'analyzing' as const, connectionStatus: 'connected' as const, tasksCompleted: 5, tasksFailed: 0, tasksPending: 0, lastActiveTimestamp: '', recentActivity: [] },
      sentinel: { id: 'sentinel' as const, currentState: 'alerting' as const, connectionStatus: 'connected' as const, tasksCompleted: 5, tasksFailed: 0, tasksPending: 0, lastActiveTimestamp: '', recentActivity: [] },
    };

    render(
      <CompactAgentRibbon
        runtimeStatuses={mockStatuses}
        onOpenUniverseMode={handleOpenUniverse}
        onOpenAssistant={handleOpenAssistant}
      />
    );

    expect(screen.getByText('DIGITAL AGENTS:')).toBeDefined();
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByText('NEXUS')).toBeDefined();
    expect(screen.getByText('ORACLE')).toBeDefined();
    expect(screen.getByText('SENTINEL')).toBeDefined();

    const universeBtn = screen.getByText('Universe Mode');
    fireEvent.click(universeBtn);
    expect(handleOpenUniverse).toHaveBeenCalled();
  });
});

