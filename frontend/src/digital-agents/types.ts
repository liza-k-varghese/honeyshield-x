/**
 * HoneyShield X — Digital Agent Universe
 * Core Types & Schema Definitions
 */

export type AgentId = 'scout' | 'nexus' | 'oracle' | 'sentinel';

export type AgentAnimationState =
  | 'idle'
  | 'observing'
  | 'scanning'
  | 'pickup'
  | 'travelling'
  | 'processing'
  | 'analyzing'
  | 'waiting'
  | 'delivering'
  | 'alerting'
  | 'success'
  | 'warning'
  | 'failed'
  | 'disconnected'
  | 'reconnecting';

export type PacketSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type PacketColor = 'blue' | 'cyan' | 'purple' | 'red' | 'amber' | 'green';

export interface DigitalAgentProfile {
  id: AgentId;
  name: string;
  designation: string;
  color: string; // Hex color code
  accentColor: string;
  glowClass: string;
  personality: string;
  systemDomain: string; // e.g. "System 1 - Sensors", "System 1 - Core", "System 3 - Threat Intel", "System 1 - Response"
  responsibilities: string[];
  supportedAnimations: AgentAnimationState[];
}

export interface AgentRuntimeStatus {
  id: AgentId;
  currentState: AgentAnimationState;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  currentTaskId?: string;
  currentTaskDescription?: string;
  activePacketId?: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksPending: number;
  lastActiveTimestamp: string;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    success: boolean;
  }>;
}

export interface DataPacketPayload {
  eventId: string;
  transferId: string;
  correlationId?: string;
  sourceNode: string;
  destinationNode: string;
  assignedAgent: AgentId;
  eventType: string;
  severity: PacketSeverity;
  color: PacketColor;
  timestamp: string;
  status: 'minted' | 'in_transit' | 'processing' | 'delivered' | 'failed' | 'waiting';
  progressPercent: number; // 0 to 100
  metadata: {
    sourceIp?: string;
    attackId?: number;
    ruleName?: string;
    indicatorValue?: string;
    alertTitle?: string;
    failureReason?: string;
    [key: string]: any;
  };
}

export interface AgentHandoffRecord {
  id: string;
  transferId: string;
  fromAgent: AgentId;
  toAgent: AgentId;
  taskType: string;
  contextMessage: string;
  timestamp: string;
  status: 'initiated' | 'in_progress' | 'confirmed' | 'rejected';
  confirmedAt?: string;
  packetSummary: {
    eventId: string;
    eventType: string;
    severity: PacketSeverity;
  };
}

export type TerritoryId = 'territory_sensors' | 'territory_core' | 'territory_intel' | 'territory_soc';

export interface TerritoryDefinition {
  id: TerritoryId;
  name: string;
  agent: AgentId;
  color: string;
  subsystem: string;
  description: string;
  nodeIds: string[];
}

export interface FlowNodeDefinition {
  id: string;
  label: string;
  system: 'SYS 1' | 'SYS 2' | 'SYS 3';
  agentOwner: AgentId;
  x: number; // Percentage (0-100) or SVG grid units
  y: number;
  status: 'active' | 'processing' | 'idle' | 'warning' | 'offline' | 'unconfigured' | 'unknown';
  eventCount: number;
  lastActive?: string;
  sensorType?: string;
  heartbeat?: string;
  latencyMs?: number;
  pipelineDestination?: string;
}

export interface FlowConnectionDefinition {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  assignedAgent: AgentId;
  status: 'idle' | 'active_transfer' | 'congested' | 'paused';
}

export interface EventJourneyStage {
  stageId: string;
  stageName: string;
  responsibleAgent: AgentId;
  timestamp: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'not_recorded' | 'not_available';
  details: string;
  durationMs?: number;
  failureReason?: string;
  sourceNode?: string;
  destinationNode?: string;
  backendRecordId?: string;
  stageKey?: string;
}

export interface EventJourneyRecord {
  eventId: string;
  workflowId?: string;
  transferId?: string;
  correlationId?: string;
  eventType: string;
  severity: PacketSeverity;
  sourceIp: string;
  attackerIp?: string;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  stages: EventJourneyStage[];
  currentStageIndex: number;
  isComplete: boolean;
  hasFailed: boolean;
  attackId?: number;
  alertId?: number;
}

export interface AgentWorkloadMetrics {
  agentId: AgentId;
  name: string;
  operationalState: string;
  currentTask: string;
  activeTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  queueDepth: number | 'UNAVAILABLE';
  lastActivity: string;
  connectionStatus: 'CONNECTED' | 'IDLE' | 'DISCONNECTED';
  recentHandoffsCount: number;
}

export interface ThreatGeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  city?: string;
  lat: number;
  lng: number;
  severity: PacketSeverity;
  attackCount: number;
  lastSeen: string;
  attackType: string;
  verified: boolean;
}

export interface TransferLifecycleContract {
  event_id: string;
  transfer_id: string;
  workflow_id: string;
  source: string;
  destination: string;
  agent: 'SCOUT' | 'NEXUS' | 'ORACLE' | 'SENTINEL';
  stage:
    | 'collection'
    | 'ingestion'
    | 'normalization'
    | 'persistence'
    | 'intelligence'
    | 'alert'
    | 'notification'
    | 'containment'
    | 'handoff';
  status: 'started' | 'in_transit' | 'waiting' | 'completed' | 'failed';
  severity: PacketSeverity;
  timestamp: string;
  resource_id: string;
  schema_version: number | string;
  failure_reason?: string;
  payload?: Record<string, any>;
  cursor?: number;
}

export type RealtimeStreamConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface RealtimeStreamMetrics {
  totalReceived: number;
  totalDeduplicated: number;
  totalReplayed: number;
  activeTransfers: number;
  queuedTransfers: number;
  batchedCount: number;
  lastCursor: number;
}

export interface NexusAssistantResponse {
  query: string;
  timestamp: string;
  groundedFacts: {
    activeTransfersCount: number;
    failedTransfersCount: number;
    latestCompletedTransfer?: DataPacketPayload;
    currentOwningAgent?: AgentId;
    processingSummary: string;
  };
  answer: string;
  suggestedFollowUps: string[];
}

