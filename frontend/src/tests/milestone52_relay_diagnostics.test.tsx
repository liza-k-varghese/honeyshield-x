import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const mockAlerts: Alert[] = [];
const mockAttacks: Attack[] = [];
const mockJourneys: EventJourneyRecord[] = [];

describe('Milestone 52 — Four-Robot Movement Diagnostics, Relay Repair & Verification', () => {
  const onToggleDemoMode = vi.fn();
  const onInvestigateIp = vi.fn();
  const onNavigateView = vi.fn();
  const onOpenNexusAssistant = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Four-Agent Relay Ordering: advances strictly SCOUT -> NEXUS -> ORACLE -> SENTINEL -> SCOUT', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    const stepBtn = screen.getByTitle(/Step Forward/i);

    // Initial Carrier is SCOUT
    expect(screen.getByText('SCOUT')).toBeDefined();

    // Step 1: Scout in transit Leg 1/4
    fireEvent.click(stepBtn);
    expect(screen.getByText(/TRANSIT \[1\/4\]/i)).toBeDefined();

    // Advance 6 more times (total 7 clicks = 105% -> handoff to NEXUS)
    for (let i = 0; i < 6; i++) {
      fireEvent.click(stepBtn);
    }
    expect(screen.getByText('NEXUS')).toBeDefined();
    expect(screen.getByText(/TRANSIT \[2\/4\]/i)).toBeDefined();

    // Advance 7 more times -> handoff to ORACLE
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    expect(screen.getByText('ORACLE')).toBeDefined();
    expect(screen.getByText(/TRANSIT \[3\/4\]/i)).toBeDefined();

    // Advance 7 more times -> handoff to SENTINEL
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    expect(screen.getByText('SENTINEL')).toBeDefined();
    expect(screen.getByText(/TRANSIT \[4\/4\]/i)).toBeDefined();

    // Advance 7 more times -> cycles back to SCOUT
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByText(/TRANSIT \[1\/4\]/i)).toBeDefined();
  });

  it('2. Distinguishes Sequential Waiting: shows STANDBY [X/4] on waiting robots and TRANSIT on active carrier', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    const stepBtn = screen.getByTitle(/Step Forward/i);

    // Step forward 15% - Scout is in transit
    fireEvent.click(stepBtn);

    // SCOUT dock shows TRANSIT [1/4]
    expect(screen.getByText('TRANSIT [1/4]')).toBeDefined();
    expect(screen.getByText('Relaying Packet')).toBeDefined();

    // NEXUS, ORACLE, SENTINEL show explicit STANDBY indicators
    expect(screen.getByText('STANDBY [2/4]')).toBeDefined();
    expect(screen.getByText('STANDBY [3/4]')).toBeDefined();
    expect(screen.getByText('STANDBY [4/4]')).toBeDefined();

    expect(screen.getByText('Standby • Leg 2/4')).toBeDefined();
    expect(screen.getByText('Standby • Leg 3/4')).toBeDefined();
    expect(screen.getByText('Standby • Leg 4/4')).toBeDefined();
  });

  it('3. Developer Diagnostics HUD: toggles via DEV HUD button and hotkey H with required fields', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    // Initial state: HUD is closed
    expect(screen.queryByTestId('developer-diagnostics-hud')).toBeNull();

    // Click DEV HUD button
    const devHudBtn = screen.getByRole('button', { name: /DEV HUD/i });
    fireEvent.click(devHudBtn);

    // HUD opens
    const hud = screen.getByTestId('developer-diagnostics-hud');
    expect(hud).toBeDefined();
    expect(screen.getByText(/RELAY DIAGNOSTICS HUD/i)).toBeDefined();
    expect(screen.getByText(/Current Relay Stage:/i)).toBeDefined();
    expect(screen.getByText(/Current Agent ID:/i)).toBeDefined();
    expect(screen.getByText(/Movement State:/i)).toBeDefined();
    expect(screen.getByText(/Agent Coordinates:/i)).toBeDefined();
    expect(screen.getByText(/Route Source:/i)).toBeDefined();
    expect(screen.getByText(/Route Destination:/i)).toBeDefined();
    expect(screen.getByText(/Animation Progress:/i)).toBeDefined();
    expect(screen.getByText(/Packet Attachment:/i)).toBeDefined();
    expect(screen.getByText(/Active Transfer ID:/i)).toBeDefined();
    expect(screen.getByText(/Next Handoff:/i)).toBeDefined();
    expect(screen.getByText(/Elapsed Time:/i)).toBeDefined();
    expect(screen.getByText(/Failure Reason:/i)).toBeDefined();

    // Toggle off via keyboard 'h'
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.queryByTestId('developer-diagnostics-hud')).toBeNull();

    // Toggle on via keyboard 'H'
    fireEvent.keyDown(window, { key: 'H' });
    expect(screen.getByTestId('developer-diagnostics-hud')).toBeDefined();
  });

  it('4. Packet Attachment & Spatial Consistency: displays packet capsule only during transit interval 14%-96%', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    const stepBtn = screen.getByTitle(/Step Forward/i);

    // Initial 0%: Packet detached
    expect(screen.queryByText(/PKT #SCOUT/i)).toBeNull();

    // Step 1: 15% (>= 14%) -> Packet capsule appears
    fireEvent.click(stepBtn);
    expect(screen.getByText(/PKT #SCOUT/i)).toBeDefined();

    // Advance through midway
    fireEvent.click(stepBtn); // 30%
    fireEvent.click(stepBtn); // 45%
    fireEvent.click(stepBtn); // 60%
    expect(screen.getByText(/PKT #SCOUT/i)).toBeDefined();
  });

  it('5. Pause, Resume and Reset Control Integrity', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    // Start locomotion
    const runBtn = screen.getByRole('button', { name: /RUN LOCOMOTION/i });
    fireEvent.click(runBtn);
    expect(screen.getByRole('button', { name: /PAUSE TRANSIT/i })).toBeDefined();

    // Pause locomotion
    const pauseBtn = screen.getByRole('button', { name: /PAUSE TRANSIT/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByRole('button', { name: /RESUME TRANSIT|RUN LOCOMOTION/i })).toBeDefined();

    // Reset button
    const resetBtn = screen.getByTitle(/Reset Locomotion/i);
    fireEvent.click(resetBtn);
    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByRole('button', { name: /RUN LOCOMOTION/i })).toBeDefined();
  });

  it('6. Mode Isolation: Demo Mode toggle works independently from locomotion state', () => {
    const { rerender } = render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    const demoBtn = screen.getByText('SIMULATE DEMO');
    fireEvent.click(demoBtn);
    expect(onToggleDemoMode).toHaveBeenCalledWith(true);

    rerender(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={true}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    expect(screen.getByText('DEMO')).toBeDefined();
    expect(screen.getByText('EXIT DEMO')).toBeDefined();
    expect(screen.getByText('CARRIER:')).toBeDefined();
  });

  it('7. Historical Replay Lifecycle: shortcut R resets carrier to origin and starts playback', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={mockAlerts}
        attacks={mockAttacks}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={mockJourneys}
        isDemoMode={false}
        onToggleDemoMode={onToggleDemoMode}
        onInvestigateIp={onInvestigateIp}
        onNavigateView={onNavigateView}
        onOpenNexusAssistant={onOpenNexusAssistant}
      />
    );

    // Advance to Nexus first
    const stepBtn = screen.getByTitle(/Step Forward/i);
    for (let i = 0; i < 7; i++) {
      fireEvent.click(stepBtn);
    }
    expect(screen.getByText('NEXUS')).toBeDefined();

    // Press 'r' to trigger replay
    fireEvent.keyDown(window, { key: 'r' });

    // Should reset carrier to SCOUT and start locomotion
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByRole('button', { name: /PAUSE TRANSIT/i })).toBeDefined();
  });
});
