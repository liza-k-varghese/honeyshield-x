import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AgentId,
  AgentAnimationState,
  AgentRuntimeStatus,
  DataPacketPayload,
  AgentHandoffRecord,
  FlowNodeDefinition,
  FlowConnectionDefinition,
  EventJourneyRecord,
  RealtimeStreamConnectionState,
  RealtimeStreamMetrics,
} from '../types';
import { BackendEventAdapter } from '../engine/BackendEventAdapter';
import { DemoSimulationEngine } from '../engine/DemoSimulationEngine';
import { RealtimeAgentWebSocketClient } from '../engine/RealtimeAgentWebSocketClient';
import { useIncidentStream } from '../../hooks/useIncidentStream';

const DEFAULT_NODES: FlowNodeDefinition[] = [
  {
    id: 'sensors',
    label: 'Network Sensors & Honeypots',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 10,
    y: 20,
    status: 'active',
    eventCount: 42,
  },
  {
    id: 'ingestion',
    label: 'Ingestion API Gateway',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 35,
    y: 20,
    status: 'active',
    eventCount: 42,
  },
  {
    id: 'queue',
    label: 'Redis Processing Queue',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 65,
    y: 20,
    status: 'active',
    eventCount: 39,
  },
  {
    id: 'persistence',
    label: 'PostgreSQL Event Outbox',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 90,
    y: 20,
    status: 'active',
    eventCount: 39,
  },
  {
    id: 'detection',
    label: 'Attack Detection Core',
    system: 'SYS 1',
    agentOwner: 'oracle',
    x: 10,
    y: 70,
    status: 'active',
    eventCount: 28,
  },
  {
    id: 'intel',
    label: 'Threat Intelligence Store',
    system: 'SYS 3',
    agentOwner: 'oracle',
    x: 35,
    y: 70,
    status: 'active',
    eventCount: 28,
  },
  {
    id: 'alerts',
    label: 'Confirmed Alert Evaluator',
    system: 'SYS 1',
    agentOwner: 'sentinel',
    x: 65,
    y: 70,
    status: 'active',
    eventCount: 16,
  },
  {
    id: 'notifications',
    label: 'SOC Push & Governor Console',
    system: 'SYS 1',
    agentOwner: 'sentinel',
    x: 90,
    y: 70,
    status: 'active',
    eventCount: 16,
  },
];

const DEFAULT_CONNECTIONS: FlowConnectionDefinition[] = [
  { id: 'c1', fromNodeId: 'sensors', toNodeId: 'ingestion', assignedAgent: 'scout', status: 'idle' },
  { id: 'c2', fromNodeId: 'ingestion', toNodeId: 'queue', assignedAgent: 'nexus', status: 'idle' },
  { id: 'c3', fromNodeId: 'queue', toNodeId: 'persistence', assignedAgent: 'nexus', status: 'idle' },
  { id: 'c4', fromNodeId: 'detection', toNodeId: 'intel', assignedAgent: 'oracle', status: 'idle' },
  { id: 'c5', fromNodeId: 'alerts', toNodeId: 'notifications', assignedAgent: 'sentinel', status: 'idle' },
];

const MAX_CONCURRENT_ANIMATIONS = 8;

export function useDigitalAgentUniverse() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [nodes, setNodes] = useState<FlowNodeDefinition[]>(DEFAULT_NODES);
  const [connections] = useState<FlowConnectionDefinition[]>(DEFAULT_CONNECTIONS);
  const [activePackets, setActivePackets] = useState<DataPacketPayload[]>([]);
  const [completedPackets, setCompletedPackets] = useState<DataPacketPayload[]>([]);
  const [failedPackets, setFailedPackets] = useState<DataPacketPayload[]>([]);
  const [handoffs, setHandoffs] = useState<AgentHandoffRecord[]>([]);
  const [journeys, setJourneys] = useState<EventJourneyRecord[]>([]);
  const [streamConnectionState, setStreamConnectionState] = useState<RealtimeStreamConnectionState>('connecting');
  const [streamMetrics, setStreamMetrics] = useState<RealtimeStreamMetrics>({
    totalReceived: 0,
    totalDeduplicated: 0,
    totalReplayed: 0,
    activeTransfers: 0,
    queuedTransfers: 0,
    batchedCount: 0,
    lastCursor: 0,
  });

  const [runtimeStatuses, setRuntimeStatuses] = useState<Record<AgentId, AgentRuntimeStatus>>({
    scout: {
      id: 'scout',
      currentState: 'observing',
      connectionStatus: 'connected',
      tasksCompleted: 42,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: new Date().toISOString(),
      recentActivity: [
        { id: 'act-s1', action: 'Polled Edge Honeypots', timestamp: new Date().toISOString(), success: true },
      ],
    },
    nexus: {
      id: 'nexus',
      currentState: 'idle',
      connectionStatus: 'connected',
      tasksCompleted: 39,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: new Date().toISOString(),
      recentActivity: [
        { id: 'act-n1', action: 'Flushed Outbox Events', timestamp: new Date().toISOString(), success: true },
      ],
    },
    oracle: {
      id: 'oracle',
      currentState: 'idle',
      connectionStatus: 'connected',
      tasksCompleted: 28,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: new Date().toISOString(),
      recentActivity: [
        { id: 'act-o1', action: 'Indexed IOC Reputation', timestamp: new Date().toISOString(), success: true },
      ],
    },
    sentinel: {
      id: 'sentinel',
      currentState: 'idle',
      connectionStatus: 'connected',
      tasksCompleted: 16,
      tasksFailed: 0,
      tasksPending: 0,
      lastActiveTimestamp: new Date().toISOString(),
      recentActivity: [
        { id: 'act-e1', action: 'Verified Governor Guards', timestamp: new Date().toISOString(), success: true },
      ],
    },
  });

  const adapterRef = useRef(new BackendEventAdapter());
  const demoEngineRef = useRef(new DemoSimulationEngine());
  const wsClientRef = useRef(new RealtimeAgentWebSocketClient());
  const { lastEvent: fallbackSseEvent } = useIncidentStream();

  // 1. Initialize and maintain Realtime WebSocket Client
  useEffect(() => {
    const wsClient = wsClientRef.current;
    wsClient.connect();

    const unsubState = wsClient.onStateChange((state) => {
      setStreamConnectionState(state);
      if (!isDemoMode) {
        setRuntimeStatuses((prev) => ({
          scout: { ...prev.scout, connectionStatus: state === 'connected' ? 'connected' : state === 'connecting' ? 'reconnecting' : 'disconnected' },
          nexus: { ...prev.nexus, connectionStatus: state === 'connected' ? 'connected' : state === 'connecting' ? 'reconnecting' : 'disconnected' },
          oracle: { ...prev.oracle, connectionStatus: state === 'connected' ? 'connected' : state === 'connecting' ? 'reconnecting' : 'disconnected' },
          sentinel: { ...prev.sentinel, connectionStatus: state === 'connected' ? 'connected' : state === 'connecting' ? 'reconnecting' : 'disconnected' },
        }));
      }
    });

    const unsubEvents = wsClient.subscribe((rawEvent, isHistorical) => {
      if (isDemoMode) return;
      handleLiveBackendEvent(rawEvent, isHistorical);
    });

    return () => {
      unsubState();
      unsubEvents();
      wsClient.disconnect();
    };
  }, [isDemoMode]);

  // Synchronize with fallback SSE if WebSocket is disconnected
  useEffect(() => {
    if (isDemoMode || streamConnectionState === 'connected' || !fallbackSseEvent) return;
    handleLiveBackendEvent(fallbackSseEvent, false);
  }, [fallbackSseEvent, streamConnectionState, isDemoMode]);

  // Process a live or historical backend event
  const handleLiveBackendEvent = useCallback((rawEvent: any, isHistorical: boolean = false) => {
    const packet = adapterRef.current.parseSecurityEvent(rawEvent);
    if (!packet) return;

    const handoff = adapterRef.current.createHandoffRecord(packet, rawEvent);
    const journey = adapterRef.current.buildEventJourney(packet);
    const agent = packet.assignedAgent;
    const isError = packet.status === 'failed' || rawEvent.status === 'failed';

    // Update metrics
    setStreamMetrics((prev) => ({
      ...prev,
      totalReceived: prev.totalReceived + 1,
      totalReplayed: isHistorical ? prev.totalReplayed + 1 : prev.totalReplayed,
      lastCursor: rawEvent.cursor || prev.lastCursor,
    }));

    // If historical, update counters and journey logs without animating in-flight movement
    if (isHistorical) {
      setCompletedPackets((prev) => [packet, ...prev.slice(0, 49)]);
      if (handoff) setHandoffs((prev) => [handoff, ...prev.slice(0, 49)]);
      setJourneys((prev) => [journey, ...prev.slice(0, 19)]);
      setNodes((prev) =>
        prev.map((n) => (n.agentOwner === agent ? { ...n, eventCount: n.eventCount + 1 } : n))
      );
      return;
    }

    // Rate-limiting / Bounded animation check
    setActivePackets((currentActive) => {
      if (currentActive.length >= MAX_CONCURRENT_ANIMATIONS && packet.severity !== 'critical') {
        // Queue/batch lower priority events
        setStreamMetrics((m) => ({ ...m, batchedCount: m.batchedCount + 1 }));
        setCompletedPackets((prev) => [packet, ...prev.slice(0, 49)]);
        return currentActive;
      }
      return [packet, ...currentActive.slice(0, MAX_CONCURRENT_ANIMATIONS - 1)];
    });

    if (isError) {
      setFailedPackets((prev) => [packet, ...prev.slice(0, 19)]);
    }
    if (handoff) {
      setHandoffs((prev) => [handoff, ...prev.slice(0, 49)]);
    }
    setJourneys((prev) => [journey, ...prev.slice(0, 19)]);

    // Update responsible agent runtime state
    setRuntimeStatuses((prev) => {
      const prevAgent = prev[agent];
      const nextAnimation: AgentAnimationState = isError
        ? 'failed'
        : agent === 'sentinel'
        ? 'alerting'
        : agent === 'oracle'
        ? 'analyzing'
        : 'processing';

      return {
        ...prev,
        [agent]: {
          ...prevAgent,
          currentState: nextAnimation,
          tasksCompleted: isError ? prevAgent.tasksCompleted : prevAgent.tasksCompleted + 1,
          tasksFailed: isError ? prevAgent.tasksFailed + 1 : prevAgent.tasksFailed,
          lastActiveTimestamp: new Date().toISOString(),
          recentActivity: [
            {
              id: `act-${Date.now()}`,
              action: `Handled ${packet.eventType} (${packet.status})`,
              timestamp: new Date().toISOString(),
              success: !isError,
            },
            ...prevAgent.recentActivity.slice(0, 4),
          ],
        },
      };
    });

    // Increment node event counts
    setNodes((prev) =>
      prev.map((n) => {
        if (n.agentOwner === agent) {
          return { ...n, eventCount: n.eventCount + 1, status: isError ? 'warning' : 'processing' };
        }
        return n;
      })
    );

    // Confirmation-gated delivery timer
    const travelDuration = packet.status === 'waiting' ? 4500 : 3000;
    const timer = setTimeout(() => {
      setActivePackets((curr) => curr.filter((p) => p.eventId !== packet.eventId));
      setCompletedPackets((prev) => [
        { ...packet, status: isError ? 'failed' : 'delivered', progressPercent: 100 },
        ...prev.slice(0, 49),
      ]);
      setRuntimeStatuses((prev) => ({
        ...prev,
        [agent]: {
          ...prev[agent],
          currentState: 'idle',
        },
      }));
      setNodes((prev) =>
        prev.map((n) => (n.agentOwner === agent ? { ...n, status: 'active' } : n))
      );
    }, travelDuration);

    return () => clearTimeout(timer);
  }, []);

  // Demo Simulation Heartbeat Loop
  useEffect(() => {
    if (!isDemoMode) return;

    if (journeys.length === 0) {
      const init = demoEngineRef.current.generateDemoPacket();
      setActivePackets([init.packet]);
      setHandoffs([init.handoff]);
      setJourneys([init.journey]);
    }

    const interval = setInterval(() => {
      const demo = demoEngineRef.current.generateDemoPacket();
      setActivePackets((prev) => [demo.packet, ...prev.slice(0, 7)]);
      setHandoffs((prev) => [demo.handoff, ...prev.slice(0, 29)]);
      setJourneys((prev) => [demo.journey, ...prev.slice(0, 9)]);

      const agent = demo.packet.assignedAgent;
      setRuntimeStatuses((prev) => ({
        ...prev,
        [agent]: {
          ...prev[agent],
          currentState:
            agent === 'sentinel' ? 'alerting' : agent === 'oracle' ? 'analyzing' : 'processing',
          tasksCompleted: prev[agent].tasksCompleted + 1,
          recentActivity: [
            {
              id: `demo-${Date.now()}`,
              action: `Simulated ${demo.packet.eventType}`,
              timestamp: new Date().toISOString(),
              success: true,
            },
            ...prev[agent].recentActivity.slice(0, 4),
          ],
        },
      }));

      setTimeout(() => {
        setRuntimeStatuses((prev) => ({
          ...prev,
          [agent]: { ...prev[agent], currentState: 'idle' },
        }));
      }, 2400);
    }, 5000);

    return () => clearInterval(interval);
  }, [isDemoMode, journeys.length]);

  const simulateAgentState = useCallback(
    (agentId: AgentId, state: AgentAnimationState) => {
      setRuntimeStatuses((prev) => ({
        ...prev,
        [agentId]: {
          ...prev[agentId],
          currentState: state,
        },
      }));
    },
    []
  );

  return {
    isDemoMode,
    toggleDemoMode: setIsDemoMode,
    runtimeStatuses,
    activePackets,
    completedPackets,
    failedPackets,
    handoffs,
    nodes,
    connections,
    journeys,
    streamConnectionState,
    streamMetrics,
    simulateAgentState,
  };
}
