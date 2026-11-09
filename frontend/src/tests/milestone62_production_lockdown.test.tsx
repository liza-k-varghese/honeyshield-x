import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniverseCommandCenter } from '../components/UniverseCommandCenter';
import { AgentId, AgentRuntimeStatus } from '../digital-agents/types';
import { DashboardStats } from '../types';

const mockRuntimeStatuses: Record<AgentId, AgentRuntimeStatus> = {
  scout: {
    id: 'scout',
    currentState: 'scanning',
    connectionStatus: 'connected',
    currentTaskId: 'task-1',
    currentTaskDescription: 'Scanning honeypot perimeter',
    tasksCompleted: 100,
    tasksFailed: 0,
    tasksPending: 1,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  nexus: {
    id: 'nexus',
    currentState: 'processing',
    connectionStatus: 'connected',
    currentTaskId: 'task-2',
    currentTaskDescription: 'Outbox event stream',
    tasksCompleted: 200,
    tasksFailed: 0,
    tasksPending: 2,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  oracle: {
    id: 'oracle',
    currentState: 'analyzing',
    connectionStatus: 'connected',
    currentTaskId: 'task-3',
    currentTaskDescription: 'Threat correlation',
    tasksCompleted: 80,
    tasksFailed: 0,
    tasksPending: 0,
    lastActiveTimestamp: new Date().toISOString(),
    recentActivity: [],
  },
  sentinel: {
    id: 'sentinel',
    currentState: 'alerting',
    connectionStatus: 'connected',
    currentTaskId: 'task-4',
    currentTaskDescription: 'Containment active',
    tasksCompleted: 40,
    tasksFailed: 0,
    tasksPending: 0,
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

describe('Milestone 62: Production Debug Interface Lockdown & Telemetry Isolation', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalImportMeta = (import.meta as any).env;

  beforeEach(() => {
    delete (window as any).__HSX_RELAY_STATE__;
    delete (window as any).__HSX_DEBUG__;
    delete (window as any).__HSX_SIMULATE_PROD__;
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    (import.meta as any).env = originalImportMeta;
    delete (window as any).__HSX_RELAY_STATE__;
    delete (window as any).__HSX_DEBUG__;
    delete (window as any).__HSX_SIMULATE_PROD__;
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('1. Authorizes telemetry in testing/development environment', () => {
    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={[]}
        attacks={[]}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={[]}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    const relayState = (window as any).__HSX_RELAY_STATE__;
    expect(relayState).toBeDefined();
    expect(relayState.engineVersion).toBe('1.0.0-rc5-state-purity');
    expect(relayState.agents).toBeDefined();
    expect(relayState.agents.scout).toBeDefined();
  });

  it('2. Production mode strictly excludes window.__HSX_RELAY_STATE__ even if __HSX_DEBUG__ is injected', () => {
    // Simulate production environment
    (window as any).__HSX_SIMULATE_PROD__ = true;

    // Inject unauthorized console global
    (window as any).__HSX_DEBUG__ = true;

    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={[]}
        attacks={[]}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={[]}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // In production, __HSX_RELAY_STATE__ must NOT be attached
    expect((window as any).__HSX_RELAY_STATE__).toBeUndefined();
  });

  it('3. Production mode strictly ignores ?debug=1 URL query parameter', () => {
    (window as any).__HSX_SIMULATE_PROD__ = true;

    // Inject unauthorized URL query param
    window.history.replaceState({}, '', '/?debug=1&hud=1');

    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={[]}
        attacks={[]}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={[]}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Telemetry model must remain unexposed
    expect((window as any).__HSX_RELAY_STATE__).toBeUndefined();

    // Dev HUD must not be opened in production
    expect(screen.queryByTestId('developer-diagnostics-hud')).toBeNull();
  });

  it('4. Production mode actively scrubs pre-existing __HSX_RELAY_STATE__', () => {
    // Pre-populate stale telemetry artifact
    (window as any).__HSX_RELAY_STATE__ = { stale: true };

    (window as any).__HSX_SIMULATE_PROD__ = true;

    render(
      <UniverseCommandCenter
        stats={mockStats}
        alerts={[]}
        attacks={[]}
        runtimeStatuses={mockRuntimeStatuses}
        journeys={[]}
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onInvestigateIp={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenNexusAssistant={vi.fn()}
      />
    );

    // Must be scrubbed/deleted
    expect((window as any).__HSX_RELAY_STATE__).toBeUndefined();
  });
});
