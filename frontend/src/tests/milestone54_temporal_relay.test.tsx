import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniverseCommandCenter } from '../components/UniverseCommandCenter';
import {
  AgentId,
  AgentRuntimeStatus,
  EventJourneyRecord,
} from '../digital-agents/types';
import { Alert, Attack, DashboardStats } from '../types';

const mockRuntimeStatuses: Record<AgentId, AgentRuntimeStatus> = {
  scout: {
    id: 'scout',
    currentState: 'scanning',
    connectionStatus: 'connected',
    currentTaskId: 'task-1',
    currentTaskDescription: 'Scanning honeypot perimeter',
    tasksCompleted: 1420,
    tasksFailed: 0,
    tasksPending: 3,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  nexus: {
    id: 'nexus',
    currentState: 'processing',
    connectionStatus: 'connected',
    currentTaskId: 'task-2',
    currentTaskDescription: 'ACID Outbox streaming',
    tasksCompleted: 2890,
    tasksFailed: 1,
    tasksPending: 8,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  oracle: {
    id: 'oracle',
    currentState: 'analyzing',
    connectionStatus: 'connected',
    currentTaskId: 'task-3',
    currentTaskDescription: 'Correlating threat actor campaigns',
    tasksCompleted: 840,
    tasksFailed: 0,
    tasksPending: 2,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  sentinel: {
    id: 'sentinel',
    currentState: 'alerting',
    connectionStatus: 'connected',
    currentTaskId: 'task-4',
    currentTaskDescription: 'Governor rate-limit containment',
    tasksCompleted: 320,
    tasksFailed: 0,
    tasksPending: 1,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
};

const mockStats: DashboardStats = {
  total_attacks: 1250,
  active_alerts: 4,
  active_alerts_by_severity: {
    critical: 2,
    high: 2,
    medium: 0,
    low: 0,
  },
  unique_attacker_ips_24h: 38,
  system_health: {
    api: 'healthy',
    postgresql: 'healthy',
    redis: 'healthy',
  },
};

const mockAlerts: Alert[] = [
  {
    id: 101,
    attack_id: 501,
    alert_type: 'brute_force',
    severity: 'critical',
    status: 'open',
    message: 'Distributed SSH Brute Force Surge from 198.51.100.44',
    created_at: new Date().toISOString(),
  },
];

const mockAttacks: Attack[] = [
  {
    id: 501,
    attack_type: 'ssh_brute_force',
    source_ip: '198.51.100.44',
    destination_ip: '10.0.0.1',
    protocol: 'SSH',
    severity: 'critical',
    risk_score: 9.2,
    status: 'blocked',
    detected_at: new Date().toISOString(),
  },
];

const mockJourneys: EventJourneyRecord[] = [
  {
    eventId: 'evt-test-991',
    eventType: 'sensor.ssh_honeypot',
    severity: 'critical',
    sourceIp: '198.51.100.44',
    startTime: new Date(Date.now() - 15000).toISOString(),
    totalDurationMs: 280,
    isComplete: true,
    hasFailed: false,
    currentStageIndex: 3,
    stages: [
      {
        stageId: 'step-1',
        stageName: 'Sensor Detection',
        responsibleAgent: 'scout',
        details: 'Cowrie caught root password spray',
        timestamp: new Date().toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-2',
        stageName: 'Event Normalization',
        responsibleAgent: 'nexus',
        details: 'Parsed authentication logs',
        timestamp: new Date().toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-3',
        stageName: 'Threat Intelligence',
        responsibleAgent: 'oracle',
        details: 'Matched Tor Exit Node 198.51.100.89',
        timestamp: new Date().toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-4',
        stageName: 'Active Mitigation',
        responsibleAgent: 'sentinel',
        details: 'Firewall drop rule deployed',
        timestamp: new Date().toISOString(),
        status: 'active',
      },
    ],
  },
];

describe('Milestone 54 — Autonomous Four-Robot Relay Verification Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. Agent State Independence: all four agents expose distinct observable state in window.__HSX_RELAY_STATE__', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    const relayState = (window as any).__HSX_RELAY_STATE__;
    expect(relayState).toBeDefined();
    expect(relayState.agents).toBeDefined();

    const agents = relayState.agents;
    expect(agents.scout).toBeDefined();
    expect(agents.nexus).toBeDefined();
    expect(agents.oracle).toBeDefined();
    expect(agents.sentinel).toBeDefined();

    // Verify independent properties
    expect(agents.scout.agentId).toBe('scout');
    expect(agents.nexus.agentId).toBe('nexus');
    expect(agents.oracle.agentId).toBe('oracle');
    expect(agents.sentinel.agentId).toBe('sentinel');

    expect(agents.scout.startPosition.x).toBe(170);
    expect(agents.nexus.startPosition.x).toBe(810);
    expect(agents.oracle.startPosition.x).toBe(810);
    expect(agents.sentinel.startPosition.x).toBe(170);
  });

  it('2. Movement Activation & Position Progression: active carrier coordinates advance away from origin', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    const playBtn = screen.getByTitle('Toggle Physical Agent Locomotion [Space]');
    fireEvent.click(playBtn);

    // Initial state: Scout at origin
    let state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('scout');
    expect(state.isLocomotionPlaying).toBe(true);

    const initialX = state.agents.scout.currentPosition.x;
    const initialY = state.agents.scout.currentPosition.y;

    // Advance 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.agents.scout.progress).toBeGreaterThan(0);
    expect(state.agents.scout.currentPosition.x).not.toBe(initialX);
    expect(state.agents.scout.currentPosition.y).not.toBe(initialY);
  });

  it('3. Sequential Handoff Ordering: advances SCOUT -> NEXUS -> ORACLE -> SENTINEL without skips', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    const stepBtn = screen.getByTitle('Step Forward (+15%)');

    // Initial: SCOUT (0)
    let state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('scout');

    // Step across Scout leg into Leg 2 (NEXUS)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('nexus');
    expect(state.agents.nexus.status).not.toBe('completed');

    // Step across Nexus leg into Leg 3 (ORACLE)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('oracle');

    // Step across Oracle leg into Leg 4 (SENTINEL)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('sentinel');

    // Step across Sentinel leg back to SCOUT (Cycle Repeat)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('scout');
  });

  it('4. Packet Attachment Dynamics: locked to carrier during 14%-96% and detached outside', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Progress 0: detached
    let state = (window as any).__HSX_RELAY_STATE__;
    expect(state.agents.scout.packetAttached).toBe(false);

    // Step into transit: attached
    const stepBtn = screen.getByTitle('Step Forward (+15%)');
    fireEvent.click(stepBtn); // ~0.15
    fireEvent.click(stepBtn); // ~0.30

    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.agents.scout.packetAttached).toBe(true);
    expect(screen.getByText(/PKT #SCOUT/i)).toBeDefined();
  });

  it('5. Pause & Resume Controls: Space toggles locomotion and preserves coordinates', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Start playing
    fireEvent.keyDown(window, { key: ' ' });
    let state = (window as any).__HSX_RELAY_STATE__;
    expect(state.isLocomotionPlaying).toBe(true);

    // Advance 600ms
    act(() => {
      vi.advanceTimersByTime(600);
    });
    state = (window as any).__HSX_RELAY_STATE__;
    const pausedCoord = state.agents.scout.currentPosition.x;

    // Pause
    fireEvent.keyDown(window, { key: ' ' });
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.isLocomotionPlaying).toBe(false);

    // Ensure coordinates do NOT change while paused
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.agents.scout.currentPosition.x).toBe(pausedCoord);

    // Resume
    fireEvent.keyDown(window, { key: ' ' });
    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.isLocomotionPlaying).toBe(true);
  });

  it('6. Reset Behavior: resets carrier to SCOUT, progress to 0, and updates relayRunId', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    const stepBtn = screen.getByTitle('Step Forward (+15%)');
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);

    let state = (window as any).__HSX_RELAY_STATE__;
    const initialRunId = state.relayRunId;
    expect(state.movementProgress).toBeGreaterThan(0);

    // Click Reset
    const resetBtn = screen.getByTitle('Reset Locomotion to Origin');
    fireEvent.click(resetBtn);

    state = (window as any).__HSX_RELAY_STATE__;
    expect(state.currentAgent).toBe('scout');
    expect(state.movementProgress).toBe(0);
    expect(state.isLocomotionPlaying).toBe(false);
    expect(state.relayRunId).not.toBe(initialRunId);
  });

  it('7. Developer Diagnostics HUD (Milestone 54): renders all required diagnostic tokens', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Toggle HUD via hotkey 'H'
    fireEvent.keyDown(window, { key: 'H' });
    const hud = screen.getByTestId('developer-diagnostics-hud');
    expect(hud).toBeDefined();

    // Verify all Section 5 required fields
    expect(screen.getByText('CURRENT MODE:')).toBeDefined();
    expect(screen.getByText('CURRENT RELAY RUN:')).toBeDefined();
    expect(screen.getByText('Current Relay Stage:')).toBeDefined();
    expect(screen.getByText('Current Agent ID:')).toBeDefined();
    expect(screen.getByText('Movement State:')).toBeDefined();
    expect(screen.getByText('Agent Coordinates:')).toBeDefined();
    expect(screen.getByText('Packet Attachment:')).toBeDefined();
    expect(screen.getByText('Next Handoff:')).toBeDefined();
    expect(screen.getByText('LAST EVENT:')).toBeDefined();
    expect(screen.getByText('Failure Reason:')).toBeDefined();
    expect(screen.getByText('Four-Agent Diagnostic Status:')).toBeDefined();
  });

  it('8. Mode Isolation: Demo Mode toggle works independently from Live stream state', () => {
    const onToggleDemoMode = vi.fn();
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Hotkey 'D' toggles demo mode
    fireEvent.keyDown(window, { key: 'D' });
    expect(onToggleDemoMode).toHaveBeenCalledWith(true);
  });
});
