import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniverseCommandCenter } from '../components/UniverseCommandCenter';
import { DashboardStats, Alert, Attack, DigitalAgentRuntimeStatus, IncidentJourney } from '../types';

const mockStats: DashboardStats = {
  total_attacks: 1420,
  active_alerts: 4,
  critical_threats: 1,
  defense_readiness: 98.4,
};

const mockAlerts: Alert[] = [
  {
    id: 1,
    title: 'Unauthorized Privilege Escalation Attempt',
    description: 'Suspicious sudo access attempt on honeypot cluster node 01',
    severity: 'critical',
    status: 'open',
    source_ip: '198.51.100.89',
    destination_ip: '10.0.0.12',
    attack_type: 'Privilege Escalation',
    confidence_score: 96,
    created_at: '2026-11-08T00:00:00Z',
    updated_at: '2026-11-08T00:05:00Z',
  },
];

const mockAttacks: Attack[] = [
  {
    id: 1,
    attack_type: 'Credential Stuffing',
    source_ip: '198.51.100.89',
    destination_ip: '10.0.0.12',
    status: 'active',
    severity: 'critical',
    created_at: '2026-11-08T00:00:00Z',
  },
];

const mockRuntimeStatuses: Record<'scout' | 'nexus' | 'oracle' | 'sentinel', DigitalAgentRuntimeStatus> = {
  scout: { agentId: 'scout', currentState: 'hunting', activeTerritory: 'Perimeter Sensor Array', currentThreatLevel: 'elevated', packetCapacity: 5, tasksCompleted: 142, uptimeSeconds: 3600 },
  nexus: { agentId: 'nexus', currentState: 'normalizing', activeTerritory: 'Outbox Event Broker', currentThreatLevel: 'nominal', packetCapacity: 8, tasksCompleted: 98, uptimeSeconds: 3600 },
  oracle: { agentId: 'oracle', currentState: 'analyzing', activeTerritory: 'Threat Matrix Core', currentThreatLevel: 'nominal', packetCapacity: 4, tasksCompleted: 77, uptimeSeconds: 3600 },
  sentinel: { agentId: 'sentinel', currentState: 'guarding', activeTerritory: 'Remediation Hub', currentThreatLevel: 'critical', packetCapacity: 3, tasksCompleted: 45, uptimeSeconds: 3600 },
};

const mockJourneys: IncidentJourney[] = [
  {
    journey_id: 'JRN-DEMO-001',
    title: 'Compromised SSH Ingress Attack Chain',
    severity: 'critical',
    current_stage: 'remediation',
    stages: [
      { id: 'stg-1', name: 'Sensor Detection', agent: 'scout', status: 'completed', duration_ms: 1200, summary: 'Cowrie caught root password spray' },
      { id: 'stg-2', name: 'Event Normalization', agent: 'nexus', status: 'completed', duration_ms: 800, summary: 'Parsed authentication logs' },
      { id: 'stg-3', name: 'Threat Intelligence', agent: 'oracle', status: 'completed', duration_ms: 1500, summary: 'Matched Tor Exit Node 198.51.100.89' },
      { id: 'stg-4', name: 'Active Mitigation', agent: 'sentinel', status: 'in_progress', duration_ms: 600, summary: 'Firewall drop rule deployed' },
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

    const playBtn = screen.getByTitle('Play/Pause Relay Animation');
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
