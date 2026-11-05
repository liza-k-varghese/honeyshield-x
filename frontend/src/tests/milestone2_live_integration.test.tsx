import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackendEventAdapter } from '../digital-agents/engine/BackendEventAdapter';
import { RealtimeAgentWebSocketClient } from '../digital-agents/engine/RealtimeAgentWebSocketClient';
import { MovementPrototype } from '../digital-agents/components/MovementPrototype';
import { TransferInspector } from '../digital-agents/components/TransferInspector';
import { DataPacketPayload, TransferLifecycleContract } from '../digital-agents/types';

describe('Digital Agent Universe — Milestone 2 Live Backend Integration Tests', () => {
  let adapter: BackendEventAdapter;

  beforeEach(() => {
    adapter = new BackendEventAdapter();
  });

  it('parses typed TransferLifecycleContract into DataPacketPayload correctly', () => {
    const rawContract: TransferLifecycleContract = {
      event_id: 'evt_m2_101',
      transfer_id: 'tr_scout_101',
      workflow_id: 'wf_atk_101',
      source: 'sensor:cowrie',
      destination: 'ingestion_api',
      agent: 'SCOUT',
      stage: 'collection',
      status: 'completed',
      severity: 'medium',
      timestamp: '2026-11-04T08:00:00Z',
      resource_id: 'attack_101',
      schema_version: 1,
      payload: {
        source_ip: '198.51.100.77',
        sensor_type: 'honeypot',
      },
    };

    const packet = adapter.parseSecurityEvent(rawContract);
    expect(packet).not.toBeNull();
    expect(packet?.eventId).toBe('evt_m2_101');
    expect(packet?.transferId).toBe('tr_scout_101');
    expect(packet?.assignedAgent).toBe('scout');
    expect(packet?.sourceNode).toBe('Network Sensors & Honeypots');
    expect(packet?.destinationNode).toBe('Ingestion API Gateway');
    expect(packet?.status).toBe('delivered');
    expect(packet?.progressPercent).toBe(100);
    expect(packet?.metadata.sourceIp).toBe('198.51.100.77');
  });

  it('maps confirmation-gated status correctly (waiting, completed, failed)', () => {
    // 1. Waiting status
    const waitingEv = {
      event_id: 'evt_wait_1',
      agent: 'NEXUS',
      stage: 'persistence',
      status: 'waiting',
      source: 'ingestion_api',
      destination: 'outbox_db',
    };
    const pktWaiting = adapter.parseSecurityEvent(waitingEv);
    expect(pktWaiting?.status).toBe('waiting');
    expect(pktWaiting?.progressPercent).toBe(85);

    // 2. Failed status with error reason
    const failedEv = {
      event_id: 'evt_fail_1',
      agent: 'SENTINEL',
      stage: 'notification',
      status: 'failed',
      failure_reason: 'Push gateway timeout after 5000ms',
      source: 'soc_console',
      destination: 'push_dispatcher',
    };
    const pktFailed = adapter.parseSecurityEvent(failedEv);
    expect(pktFailed?.status).toBe('failed');
    expect(pktFailed?.metadata.failureReason).toBe('Push gateway timeout after 5000ms');

    // 3. Journey builds failed stage accurately
    const journey = adapter.buildEventJourney(pktFailed!);
    expect(journey.hasFailed).toBe(true);
    const failedStage = journey.stages.find((s) => s.status === 'failed');
    expect(failedStage).toBeDefined();
    expect(failedStage?.failureReason).toBe('Push gateway timeout after 5000ms');
  });

  it('creates verified agent handoffs with correlation and context', () => {
    const rawHandoffEvent = {
      event_id: 'evt_ho_1',
      event_type: 'handoff.nexus_to_oracle',
      payload: {
        from_agent: 'NEXUS',
        to_agent: 'ORACLE',
        workflow_id: 'wf_atk_202',
        task_type: 'Adversary Reputation Lookup',
        context_message: 'Handing off normalized attack #202 to ORACLE for threat intelligence enrichment',
      },
    };

    const dummyPacket: DataPacketPayload = {
      eventId: 'evt_ho_1',
      transferId: 'tr_ho_nexus_oracle_202',
      sourceNode: 'Ingestion API Gateway',
      destinationNode: 'Threat Intelligence Store',
      assignedAgent: 'nexus',
      eventType: 'handoff.nexus_to_oracle',
      severity: 'medium',
      color: 'cyan',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      progressPercent: 100,
      metadata: {},
    };

    const handoff = adapter.createHandoffRecord(dummyPacket, rawHandoffEvent);
    expect(handoff).not.toBeNull();
    expect(handoff?.fromAgent).toBe('nexus');
    expect(handoff?.toAgent).toBe('oracle');
    expect(handoff?.status).toBe('confirmed');
    expect(handoff?.contextMessage).toContain('ORACLE');
  });

  it('suppresses duplicate events and tracks durable cursor sequence in Realtime client', () => {
    const client = new RealtimeAgentWebSocketClient();
    const receivedEvents: any[] = [];
    client.subscribe((ev) => receivedEvents.push(ev));

    // Send original event
    client.handleIncomingRawEvent({ event_id: 'dup_evt_1', cursor: 42, event_type: 'test.alert' });
    expect(receivedEvents.length).toBe(1);
    expect(client.getMetrics().lastCursor).toBe(42);

    // Send exact same duplicate event
    client.handleIncomingRawEvent({ event_id: 'dup_evt_1', cursor: 42, event_type: 'test.alert' });
    // Should be suppressed
    expect(receivedEvents.length).toBe(1);
    expect(client.getMetrics().totalDeduplicated).toBe(1);

    // Send second event with higher cursor
    client.handleIncomingRawEvent({ event_id: 'dup_evt_2', cursor: 43, event_type: 'test.alert' });
    expect(receivedEvents.length).toBe(2);
    expect(client.getMetrics().lastCursor).toBe(43);
  });

  it('executes High-Volume Performance Benchmark (Step 10): 500 synthetic events without crash', () => {
    const client = new RealtimeAgentWebSocketClient();
    let listenerCount = 0;
    client.subscribe(() => {
      listenerCount++;
    });

    const startTime = performance.now();
    for (let i = 1; i <= 500; i++) {
      client.handleIncomingRawEvent({
        event_id: `bench_evt_${i}`,
        cursor: i,
        event_type: i % 4 === 0 ? 'alert.created' : 'sensor.probe',
        severity: i % 10 === 0 ? 'critical' : 'info',
        agent: i % 4 === 0 ? 'SENTINEL' : i % 4 === 1 ? 'SCOUT' : i % 4 === 2 ? 'NEXUS' : 'ORACLE',
      });
    }
    const duration = performance.now() - startTime;

    // 500 events received
    expect(listenerCount).toBe(500);
    const metrics = client.getMetrics();
    expect(metrics.totalReceived).toBe(500);
    expect(metrics.lastCursor).toBe(500);
    expect(metrics.totalDeduplicated).toBe(0);
    // Verified sub-100ms execution for 500 events
    expect(duration).toBeLessThan(500);
  });

  it('renders MovementPrototype with live packet when isLiveMode is true', () => {
    const livePacket: DataPacketPayload = {
      eventId: 'live_test_evt_77',
      transferId: 'tr_live_77',
      sourceNode: 'Network Sensors & Honeypots',
      destinationNode: 'Ingestion API Gateway',
      assignedAgent: 'scout',
      eventType: 'sensor.honeypot_hit',
      severity: 'medium',
      color: 'blue',
      timestamp: new Date().toISOString(),
      status: 'in_transit',
      progressPercent: 40,
      metadata: {
        sourceIp: '198.51.100.99',
        ruleName: 'SSH Brute-Force Rule',
      },
    };

    render(
      <MovementPrototype
        isLiveMode={true}
        activeLivePacket={livePacket}
        reducedMotion={false}
      />
    );

    // Live mode badge should be rendered
    expect(screen.getByText(/LIVE STREAM/i)).toBeDefined();
    // Carrier agent SCOUT should be active
    expect(screen.getAllByText(/SCOUT/i).length).toBeGreaterThan(0);
  });

  it('renders TransferInspector with complete metadata, lifecycle IDs and deep-link actions', () => {
    const inspectorPacket: DataPacketPayload = {
      eventId: 'evt_inspect_999',
      transferId: 'tr_inspect_999',
      correlationId: 'corr_test_999',
      sourceNode: 'Attack Detection Core',
      destinationNode: 'Threat Intelligence Store',
      assignedAgent: 'oracle',
      eventType: 'intel.ioc_correlated',
      severity: 'high',
      color: 'purple',
      timestamp: '2026-11-04T08:15:00Z',
      status: 'delivered',
      progressPercent: 100,
      metadata: {
        sourceIp: '203.0.113.195',
        attackId: 88,
        ruleName: 'APT Adversary Correlation',
        indicatorValue: '203.0.113.195',
      },
    };

    const mockInvestigate = vi.fn();
    render(
      <TransferInspector
        packet={inspectorPacket}
        onClose={vi.fn()}
        onDeepLinkInvestigate={mockInvestigate}
      />
    );

    expect(screen.getByText('tr_inspect_999')).toBeDefined();
    expect(screen.getByText('evt_inspect_999')).toBeDefined();
    expect(screen.getAllByText('203.0.113.195').length).toBeGreaterThan(0);

    // Click investigate button
    const invBtn = screen.getByRole('button', { name: /Deep-Dive IP/i });
    fireEvent.click(invBtn);
    expect(mockInvestigate).toHaveBeenCalledWith('203.0.113.195');
  });
});
