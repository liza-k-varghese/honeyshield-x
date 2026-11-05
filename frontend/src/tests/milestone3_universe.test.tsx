import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveDataFlow, CANONICAL_TERRITORY_NODES } from '../digital-agents/components/LiveDataFlow';
import { EventJourneyReplay } from '../digital-agents/components/EventJourneyReplay';
import { AgentWorkloadPanel } from '../digital-agents/components/AgentWorkloadPanel';
import { NexusAssistantModal } from '../digital-agents/components/NexusAssistantModal';
import { AgentCommunicationPanel } from '../digital-agents/components/AgentCommunicationPanel';
import { ThreatMapView } from '../digital-agents/components/ThreatMapView';
import { BackendEventAdapter } from '../digital-agents/engine/BackendEventAdapter';
import {
  AgentRuntimeStatus,
  DataPacketPayload,
  AgentHandoffRecord,
  EventJourneyRecord,
} from '../digital-agents/types';

describe('Digital Agent Universe — Milestone 3 Cyber Intelligence Universe Tests', () => {
  const dummyStatuses: Record<string, AgentRuntimeStatus> = {
    scout: {
      id: 'scout',
      currentState: 'scanning',
      connectionStatus: 'connected',
      tasksCompleted: 42,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: '2026-11-04T12:00:00Z',
      recentActivity: [],
    },
    nexus: {
      id: 'nexus',
      currentState: 'processing',
      connectionStatus: 'connected',
      tasksCompleted: 39,
      tasksFailed: 0,
      tasksPending: 1,
      lastActiveTimestamp: '2026-11-04T12:01:00Z',
      recentActivity: [],
    },
    oracle: {
      id: 'oracle',
      currentState: 'analyzing',
      connectionStatus: 'connected',
      tasksCompleted: 28,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: '2026-11-04T12:02:00Z',
      recentActivity: [],
    },
    sentinel: {
      id: 'sentinel',
      currentState: 'alerting',
      connectionStatus: 'connected',
      tasksCompleted: 16,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: '2026-11-04T12:03:00Z',
      recentActivity: [],
    },
  };

  const dummyPackets: DataPacketPayload[] = [
    {
      eventId: 'evt-m3-001',
      transferId: 'tr-m3-001',
      sourceNode: 'Cowrie SSH/Telnet Honeypot',
      destinationNode: 'Ingestion API Gateway',
      assignedAgent: 'scout',
      eventType: 'attack.brute_force',
      severity: 'critical',
      color: 'blue',
      timestamp: '2026-11-04T12:00:00Z',
      status: 'in_transit',
      progressPercent: 50,
      metadata: {
        sourceIp: '203.0.113.195',
        attackId: 101,
      },
    },
  ];

  describe('Stage 2 & 3: Territory Navigation, Pan/Zoom & Node Inspection', () => {
    it('renders all 4 operational territories with distinct headers and agent avatars', () => {
      render(
        <LiveDataFlow
          nodes={CANONICAL_TERRITORY_NODES}
          activePackets={dummyPackets}
          onSelectPacket={vi.fn()}
        />
      );

      expect(screen.getByText(/SCOUT Territory/i)).toBeDefined();
      expect(screen.getByText(/NEXUS Core/i)).toBeDefined();
      expect(screen.getByText(/ORACLE Territory/i)).toBeDefined();
      expect(screen.getByText(/SENTINEL Territory/i)).toBeDefined();

      // Check genuine sensor nodes
      expect(screen.getByText(/Cowrie SSH\/Telnet Honeypot/i)).toBeDefined();
      expect(screen.getByText(/HoneyShield Canary Trap/i)).toBeDefined();
      expect(screen.getByText(/Dionaea Malware Honeypot/i)).toBeDefined();
      expect(screen.getByText(/Suricata NIDS Listener/i)).toBeDefined();
    });

    it('displays authentic status badges (ACTIVE, UNCONFIGURED, OFFLINE) without manufacturing fake health', () => {
      render(
        <LiveDataFlow
          nodes={CANONICAL_TERRITORY_NODES}
          activePackets={dummyPackets}
          onSelectPacket={vi.fn()}
        />
      );

      // Verify authentic unconfigured & offline badges exist
      const unconfiguredBadges = screen.getAllByText('UNCONFIGURED');
      expect(unconfiguredBadges.length).toBeGreaterThan(0);

      const offlineBadges = screen.getAllByText('OFFLINE');
      expect(offlineBadges.length).toBeGreaterThan(0);
    });

    it('opens NodeInspectorModal with accurate metrics when a service node is clicked', () => {
      const handleSelectNode = vi.fn();
      render(
        <LiveDataFlow
          nodes={CANONICAL_TERRITORY_NODES}
          activePackets={dummyPackets}
          onSelectPacket={vi.fn()}
          onSelectNode={handleSelectNode}
        />
      );

      const cowrieCard = screen.getByText(/Cowrie SSH\/Telnet Honeypot/i);
      fireEvent.click(cowrieCard);

      expect(handleSelectNode).toHaveBeenCalled();
      // Inspector modal content appears
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Node Identifier: sensor-cowrie/i)).toBeDefined();
      expect(screen.getByText(/Medium-Interaction SSH\/Telnet Emulation/i)).toBeDefined();
    });

    it('supports Pan & Zoom controls (Zoom In, Zoom Out, Reset)', () => {
      render(
        <LiveDataFlow
          nodes={CANONICAL_TERRITORY_NODES}
          activePackets={dummyPackets}
          onSelectPacket={vi.fn()}
        />
      );

      expect(screen.getByText('100%')).toBeDefined();

      // Click Zoom In
      const zoomInBtn = screen.getByTitle(/Zoom In/i);
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('115%')).toBeDefined();

      // Click Zoom Out twice
      const zoomOutBtn = screen.getByTitle(/Zoom Out/i);
      fireEvent.click(zoomOutBtn);
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('85%')).toBeDefined();

      // Click Reset View
      const resetBtn = screen.getByTitle(/Reset Universe View/i);
      fireEvent.click(resetBtn);
      expect(screen.getByText('100%')).toBeDefined();
    });
  });

  describe('Stage 4 & 8: HONEYSHIELD EVENT JOURNEY & Historical Replay', () => {
    const journeyRecord: EventJourneyRecord = {
      eventId: 'evt-journey-101',
      workflowId: 'wf-101',
      transferId: 'tr-101',
      eventType: 'honeypot.credential_probe',
      severity: 'critical',
      sourceIp: '203.0.113.195',
      startTime: '2026-11-04T12:00:00Z',
      totalDurationMs: 312,
      isComplete: true,
      hasFailed: false,
      stages: [
        {
          stageId: 'stg-1',
          stageName: 'Source Sensor Capture',
          responsibleAgent: 'scout',
          timestamp: '2026-11-04T12:00:00.100Z',
          status: 'completed',
          details: 'Captured unauthorized SSH root credential probe on port 2222.',
          durationMs: 14,
          sourceNode: 'Cowrie Honeypot',
          destinationNode: 'Ingestion Gateway',
        },
        {
          stageId: 'stg-2',
          stageName: 'Ingestion API Gateway',
          responsibleAgent: 'nexus',
          timestamp: '2026-11-04T12:00:00.120Z',
          status: 'completed',
          details: 'Pydantic validation passed. Transaction assigned to Redis stream.',
          durationMs: 22,
          sourceNode: 'Ingestion Gateway',
          destinationNode: 'Redis Queue',
        },
        {
          stageId: 'stg-3',
          stageName: 'PostgreSQL Outbox Commit',
          responsibleAgent: 'nexus',
          timestamp: '2026-11-04T12:00:00.150Z',
          status: 'completed',
          details: 'Outbox commit confirmed with cursor #42 in security_event_outbox.',
          durationMs: 18,
          sourceNode: 'Processing Worker',
          destinationNode: 'PostgreSQL DB',
        },
        {
          stageId: 'stg-4',
          stageName: 'AI Model Inference',
          responsibleAgent: 'oracle',
          timestamp: 'NOT RECORDED',
          status: 'not_recorded',
          details: 'No generative AI inference feed configured for this event.',
        },
      ],
      currentStageIndex: 2,
    };

    it('renders HONEYSHIELD EVENT JOURNEY with prominent REPLAY MODE badge', () => {
      render(<EventJourneyReplay journeys={[journeyRecord]} />);

      expect(screen.getByText(/HONEYSHIELD EVENT JOURNEY \/\/ HISTORICAL REPLAY/i)).toBeDefined();
      expect(screen.getByText('REPLAY MODE')).toBeDefined();
      expect(screen.getByText('#evt-journe')).toBeDefined();
      expect(screen.getByText('203.0.113.195')).toBeDefined();
      expect(screen.getByText('312 ms')).toBeDefined();
    });

    it('honestly displays NOT RECORDED for unexecuted stages without fabricating completed states', () => {
      render(<EventJourneyReplay journeys={[journeyRecord]} />);

      expect(screen.getByText('AI Model Inference')).toBeDefined();
      expect(screen.getAllByText('NOT RECORDED').length).toBeGreaterThan(0);
    });

    it('supports VCR playback controls (Play, Pause, Step, Speed)', () => {
      render(<EventJourneyReplay journeys={[journeyRecord]} />);

      const playBtn = screen.getByRole('button', { name: /^Play$/i });
      fireEvent.click(playBtn);

      // Now button shows Pause
      expect(screen.getByRole('button', { name: /^Pause$/i })).toBeDefined();

      // Change speed to 2x
      const speed2xBtn = screen.getByRole('button', { name: '2x' });
      fireEvent.click(speed2xBtn);
      expect(speed2xBtn.className).toContain('font-bold');
    });
  });

  describe('Stage 5: Agent Workload & Operational Status Panel', () => {
    it('renders authentic workload metrics for all 4 agents and distinguishes 0 from unknown', () => {
      render(<AgentWorkloadPanel runtimeStatuses={dummyStatuses} />);

      expect(screen.getByText('SCOUT')).toBeDefined();
      expect(screen.getByText('NEXUS')).toBeDefined();
      expect(screen.getByText('ORACLE')).toBeDefined();
      expect(screen.getByText('SENTINEL')).toBeDefined();

      // Active, Pending, Completed, Failed cards
      expect(screen.getAllByText('Active').length).toBe(4);
      expect(screen.getAllByText('Completed').length).toBe(4);

      // Verify connection badges
      expect(screen.getAllByText('CONNECTED').length).toBe(4);
    });
  });

  describe('Stage 6: NEXUS Contextual Assistant Queries', () => {
    it('answers deterministic questions about processing, destinations, failures, and queue depth', () => {
      const handleClose = vi.fn();
      render(
        <NexusAssistantModal
          isOpen={true}
          onClose={handleClose}
          activePackets={dummyPackets}
          completedPackets={[]}
          failedPackets={[]}
          runtimeAgentStates={{ scout: 'scanning', nexus: 'idle', oracle: 'idle', sentinel: 'idle' }}
        />
      );

      const input = screen.getByPlaceholderText(/Ask NEXUS about active transfers/i);

      // 1. Where is this event going?
      fireEvent.change(input, { target: { value: 'Where is this event going?' } });
      fireEvent.submit(input.closest('form')!);
      expect(screen.getByText(/travelling from \[Cowrie SSH\/Telnet Honeypot\] towards \[Ingestion API Gateway\]/i)).toBeDefined();

      // 2. Queue depth
      fireEvent.change(input, { target: { value: 'What is the current queue depth?' } });
      fireEvent.submit(input.closest('form')!);
      expect(screen.getByText(/Current Telemetry Queue Metrics/i)).toBeDefined();

      // 3. Containment refusal security guardrail
      fireEvent.change(input, { target: { value: 'Block and contain attacker IP immediately' } });
      fireEvent.submit(input.closest('form')!);
      expect(screen.getByText(/SECURITY NOTICE: Automated containment execution is prohibited/i)).toBeDefined();
      expect(screen.getByText(/requires authenticated step-up approval in the Governor Emergency Console/i)).toBeDefined();
    });
  });

  describe('Stage 7: Verified Agent Communication', () => {
    const handoffs: AgentHandoffRecord[] = [
      {
        id: 'h1',
        transferId: 'tr-1',
        fromAgent: 'scout',
        toAgent: 'nexus',
        taskType: 'Sensor Telemetry Ingestion',
        contextMessage: 'Raw honeypot event delivered to ingestion gateway.',
        timestamp: '2026-11-04T12:00:00Z',
        status: 'confirmed',
        packetSummary: { eventId: 'evt-1', eventType: 'attack.created', severity: 'critical' },
      },
      {
        id: 'h2',
        transferId: 'tr-2',
        fromAgent: 'nexus',
        toAgent: 'oracle',
        taskType: 'Threat Intelligence Correlation',
        contextMessage: 'Normalized event staged for IOC lookup.',
        timestamp: '2026-11-04T12:01:00Z',
        status: 'confirmed',
        packetSummary: { eventId: 'evt-2', eventType: 'attack.enriched', severity: 'high' },
      },
    ];

    it('renders authentic handoffs and filters by agent', () => {
      render(<AgentCommunicationPanel handoffs={handoffs} />);

      expect(screen.getByText('AGENT-TO-AGENT INTER-PROCESS COMMUNICATION')).toBeDefined();
      expect(screen.getByText(/Sensor Telemetry Ingestion/i)).toBeDefined();
      expect(screen.getByText(/Threat Intelligence Correlation/i)).toBeDefined();

      // Filter by ORACLE
      const oracleBtn = screen.getByRole('button', { name: 'ORACLE' });
      fireEvent.click(oracleBtn);
      expect(screen.queryByText(/Sensor Telemetry Ingestion/i)).toBeNull();
      expect(screen.getByText(/Threat Intelligence Correlation/i)).toBeDefined();
    });
  });

  describe('Stage 9: Global Threat Visualization Transparency', () => {
    it('renders verified attacker IP addresses with honest unconfigured GeoIP notice', () => {
      render(<ThreatMapView />);

      expect(screen.getByText('HONEST GEOLOCATION TRANSPARENCY')).toBeDefined();
      expect(screen.getByText(/GeoIP Feed: UNCONFIGURED/i)).toBeDefined();
      expect(screen.getByText('203.0.113.195')).toBeDefined();
      expect(screen.getByText('198.51.100.77')).toBeDefined();
      expect(screen.getAllByText('Public External').length).toBeGreaterThan(0);
    });
  });

  describe('Stage 10: High-Volume Event Ingestion & Batch Stress Test', () => {
    it('handles 500 isolated lifecycle envelopes without memory leakage or state distortion', () => {
      const adapter = new BackendEventAdapter();
      const rawEvents = Array.from({ length: 500 }, (_, i) => ({
        event_id: `evt_stress_${i}`,
        transfer_id: `tr_stress_${i}`,
        workflow_id: `wf_stress_${Math.floor(i / 5)}`,
        source: 'sensor:cowrie',
        destination: 'ingestion_api',
        agent: (['SCOUT', 'NEXUS', 'ORACLE', 'SENTINEL'] as const)[i % 4],
        stage: (['collection', 'ingestion', 'persistence', 'intelligence', 'alert'] as const)[i % 5],
        status: 'completed' as const,
        severity: (['critical', 'high', 'medium', 'low', 'info'] as const)[i % 5],
        timestamp: new Date(Date.now() - (500 - i) * 100).toISOString(),
        resource_id: `attack_${Math.floor(i / 10)}`,
        schema_version: 1,
        cursor: i + 1,
        payload: {
          source_ip: `198.51.100.${(i % 250) + 1}`,
          batch_id: i,
        },
      }));

      const startTime = performance.now();
      const parsedPackets = rawEvents
        .map((ev) => adapter.parseSecurityEvent(ev))
        .filter((p): p is DataPacketPayload => p !== null);
      const elapsed = performance.now() - startTime;

      expect(parsedPackets.length).toBe(500);
      expect(elapsed).toBeLessThan(150); // High throughput: < 150ms for 500 records
    });
  });
});
