import {
  AgentId,
  DataPacketPayload,
  AgentHandoffRecord,
  EventJourneyRecord,
} from '../types';

export class DemoSimulationEngine {
  private demoIndex = 1;

  public generateDemoPacket(): {
    packet: DataPacketPayload;
    handoff: AgentHandoffRecord;
    journey: EventJourneyRecord;
  } {
    const idNum = this.demoIndex++;
    const eventId = `DEMO-EVT-${1000 + idNum}`;
    const transferId = `DEMO-TR-${2000 + idNum}`;
    const timestamp = new Date().toISOString();

    const sampleAttackers = [
      '198.51.100.42',
      '203.0.113.88',
      '192.0.2.144',
      '198.51.100.99',
    ];
    const sourceIp = sampleAttackers[idNum % sampleAttackers.length];

    const stages: Array<{
      agent: AgentId;
      type: string;
      source: string;
      dest: string;
      color: 'blue' | 'cyan' | 'purple' | 'red';
      sev: 'high' | 'critical' | 'medium';
    }> = [
      {
        agent: 'scout',
        type: 'sensor.canary_tripped',
        source: 'Edge Canary Trap',
        dest: 'Ingestion Gateway',
        color: 'blue',
        sev: 'medium',
      },
      {
        agent: 'nexus',
        type: 'queue.event_persisted',
        source: 'Ingestion Gateway',
        dest: 'PostgreSQL Outbox',
        color: 'cyan',
        sev: 'medium',
      },
      {
        agent: 'oracle',
        type: 'intel.ioc_correlated',
        source: 'Detection Engine',
        dest: 'Threat Intel Registry',
        color: 'purple',
        sev: 'high',
      },
      {
        agent: 'sentinel',
        type: 'alert.soc_dispatched',
        source: 'Alert Evaluator',
        dest: 'Mobile & WebSocket HUD',
        color: 'red',
        sev: 'critical',
      },
    ];

    const pick = stages[idNum % stages.length];

    const packet: DataPacketPayload = {
      eventId,
      transferId,
      sourceNode: pick.source,
      destinationNode: pick.dest,
      assignedAgent: pick.agent,
      eventType: pick.type,
      severity: pick.sev,
      color: pick.color,
      timestamp,
      status: 'in_transit',
      progressPercent: 45,
      metadata: {
        sourceIp,
        attackId: 200 + (idNum % 10),
        ruleName: 'Synthetic SSH Brute-Force Rule',
        indicatorValue: sourceIp,
        alertTitle: `DEMO: Autonomous Threat Detonation from ${sourceIp}`,
      },
    };

    const handoff: AgentHandoffRecord = {
      id: `DEMO-HO-${Date.now()}-${idNum}`,
      transferId,
      fromAgent: pick.agent === 'sentinel' ? 'oracle' : pick.agent === 'oracle' ? 'nexus' : 'scout',
      toAgent: pick.agent,
      taskType: 'Simulated Threat Handoff',
      contextMessage: `Synthetic event #${eventId} forwarded to ${pick.agent.toUpperCase()} for pipeline progression.`,
      timestamp,
      status: 'confirmed',
      packetSummary: {
        eventId,
        eventType: pick.type,
        severity: pick.sev,
      },
    };

    const baseTime = Date.now();
    const journey: EventJourneyRecord = {
      eventId,
      eventType: pick.type,
      severity: pick.sev,
      sourceIp,
      startTime: timestamp,
      totalDurationMs: 295,
      isComplete: true,
      hasFailed: false,
      currentStageIndex: 4,
      stages: [
        {
          stageId: 'demo-stg-1',
          stageName: 'Edge Trap Trigger',
          responsibleAgent: 'scout',
          timestamp: new Date(baseTime).toISOString(),
          status: 'completed',
          details: `Tripwire activated by adversary probe at ${sourceIp}.`,
          durationMs: 35,
        },
        {
          stageId: 'demo-stg-2',
          stageName: 'Queue & Transactional Outbox',
          responsibleAgent: 'nexus',
          timestamp: new Date(baseTime + 35).toISOString(),
          status: 'completed',
          details: 'Event validated, assigned monotonic cursor, and committed.',
          durationMs: 50,
        },
        {
          stageId: 'demo-stg-3',
          stageName: 'Threat Correlation',
          responsibleAgent: 'oracle',
          timestamp: new Date(baseTime + 85).toISOString(),
          status: 'completed',
          details: 'IP matched known threat actor. Risk score elevated to 88.0.',
          durationMs: 110,
        },
        {
          stageId: 'demo-stg-4',
          stageName: 'Response & Dispatch',
          responsibleAgent: 'sentinel',
          timestamp: new Date(baseTime + 195).toISOString(),
          status: 'completed',
          details: 'Dispatched push notification and live WebSocket frame.',
          durationMs: 100,
        },
      ],
    };

    return { packet, handoff, journey };
  }
}
