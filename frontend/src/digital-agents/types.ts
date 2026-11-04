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

export interface FlowNodeDefinition {
  id: string;
  label: string;
  system: 'SYS 1' | 'SYS 2' | 'SYS 3';
  agentOwner: AgentId;
  x: number; // Percentage (0-100) or SVG grid units
  y: number;
  status: 'active' | 'processing' | 'idle' | 'warning' | 'offline';
  eventCount: number;
  lastActive?: string;
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
  status: 'pending' | 'active' | 'completed' | 'failed';
  details: string;
  durationMs?: number;
  failureReason?: string;
}

export interface EventJourneyRecord {
  eventId: string;
  correlationId?: string;
  eventType: string;
  severity: PacketSeverity;
  sourceIp: string;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  stages: EventJourneyStage[];
  currentStageIndex: number;
  isComplete: boolean;
  hasFailed: boolean;
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
