import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UniverseCommandCenter } from '../components/UniverseCommandCenter';
import {
  AgentId,
  AgentRuntimeStatus,
  EventJourneyRecord,
  RealtimeStreamMetrics,
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
  {
    id: 102,
    attack_id: 502,
    alert_type: 'c2_beacon',
    severity: 'high',
    status: 'acknowledged',
    message: 'Cobalt Strike C2 Beacon Detected from 203.0.113.89',
    created_at: new Date(Date.now() - 120000).toISOString(),
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
        stageName: 'Sensor Detect',
        responsibleAgent: 'scout',
        details: 'Ingest honeypot connection on Cowrie port 2222',
        timestamp: new Date(Date.now() - 14000).toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-2',
        stageName: 'Outbox Ingest',
        responsibleAgent: 'nexus',
        details: 'Outbox ACID commit & dispatch in PostgreSQL 17',
        timestamp: new Date(Date.now() - 10000).toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-3',
        stageName: 'Intel & Risk',
        responsibleAgent: 'oracle',
        details: 'Enrich IOC & calculate risk score 8.5',
        timestamp: new Date(Date.now() - 6000).toISOString(),
        status: 'completed',
      },
      {
        stageId: 'step-4',
        stageName: 'Alert & Dispatch',
        responsibleAgent: 'sentinel',
        details: 'Governor alert broadcast & containment',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        status: 'completed',
      },
    ],
  },
];

const mockStreamMetrics: RealtimeStreamMetrics = {
  totalReceived: 1250,
  totalDeduplicated: 14,
  totalReplayed: 0,
  activeTransfers: 1,
  queuedTransfers: 0,
  batchedCount: 42,
  lastCursor: 304,
};

describe('UniverseCommandCenter — Universe 2.0 Living Observatory & Spatial SOC', () => {
  const onToggleDemoMode = vi.fn();
  const onInvestigateIp = vi.fn();
  const onNavigateView = vi.fn();
  const onOpenNexusAssistant = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the central Event Singularity core and orbital rings with explicit state', () => {
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

    // Singularity Core labels & Header
    expect(screen.getByText('SINGULARITY')).toBeDefined();
    expect(screen.getByText(/ORBITAL COMMAND CENTER/i)).toBeDefined();
    expect(screen.getAllByText(/1250 EVENTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('CONNECTED')).toBeDefined();
  });

  it('renders all four agent quadrants with articulated robot presence', () => {
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

    // Agent designations
    expect(screen.getByText(/SCOUT TERRITORY/i)).toBeDefined();
    expect(screen.getByText(/NEXUS CORE/i)).toBeDefined();
    expect(screen.getByText(/ORACLE LAB/i)).toBeDefined();
    expect(screen.getAllByText(/SENTINEL BASTION/i).length).toBeGreaterThanOrEqual(1);

    // Territory detail descriptions
    expect(screen.getByText('4 Honeypot Traps')).toBeDefined();
    expect(screen.getByText('ACID Event Outbox')).toBeDefined();
    expect(screen.getByText('Threat Intel Store')).toBeDefined();
    expect(screen.getByText('Governor Containment')).toBeDefined();
  });

  it('displays the Trust & Telemetry bar with live monotonic cursor and mode status', () => {
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
        streamConnectionState="connected"
        streamMetrics={mockStreamMetrics}
      />
    );

    expect(screen.getByText(/AUTHENTIC LIVE TELEMETRY/i)).toBeDefined();
    expect(screen.getByText(/304/)).toBeDefined();
    expect(screen.getByText('connected')).toBeDefined();
  });

  it('switches to DEMO mode when demo toggle is clicked and displays DEMO core state', () => {
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

    const demoButton = screen.getByText('SIMULATE DEMO');
    fireEvent.click(demoButton);
    expect(onToggleDemoMode).toHaveBeenCalledWith(true);

    // When rerendered with isDemoMode = true
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

    expect(screen.getByText('EXIT DEMO')).toBeDefined();
    expect(screen.getByText(/SYNTHETIC SIMULATION/i)).toBeDefined();
    expect(screen.getByText('DEMO')).toBeDefined();
  });

  it('updates Observatory Inspector when selecting another agent quadrant', () => {
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

    // Default selected agent is scout
    expect(screen.getByText(/SCOUT \/\/ OBSERVATORY INSPECTOR/i)).toBeDefined();

    // Click ORACLE card
    const oracleCard = screen.getByText(/ORACLE LAB/i).closest('.hsx-territory-card');
    expect(oracleCard).not.toBeNull();
    if (oracleCard) {
      fireEvent.click(oracleCard);
    }

    expect(screen.getByText(/ORACLE \/\/ OBSERVATORY INSPECTOR/i)).toBeDefined();
  });

  it('deep-links to IP investigation when clicking trace link in defense pipeline', () => {
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

    const ipButton = screen.getByRole('button', { name: /198\.51\.100\.44/i });
    expect(ipButton).toBeDefined();
    fireEvent.click(ipButton);
    expect(onInvestigateIp).toHaveBeenCalledWith('198.51.100.44');
  });

  it('triggers navigation when clicking full feed or view switch actions', () => {
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

    const fullFeedButton = screen.getByText('VIEW ALL ALERTS');
    fireEvent.click(fullFeedButton);
    expect(onNavigateView).toHaveBeenCalledWith('alerts');
  });

  it('controls physical agent locomotion and updates transit state', () => {
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

    // Initial button says RUN LOCOMOTION
    const runBtn = screen.getByText('RUN LOCOMOTION');
    expect(runBtn).toBeDefined();

    // Click to start locomotion
    fireEvent.click(runBtn);
    expect(screen.getByText('PAUSE TRANSIT')).toBeDefined();

    // Toggle speed
    const speedBtn = screen.getByText('1X');
    fireEvent.click(speedBtn);
    expect(screen.getByText('2X')).toBeDefined();
  });

  it('opens and closes Holographic Core Diagnostics Modal when Event Singularity is clicked', () => {
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

    // Click Event Singularity Core
    const core = screen.getByTitle(/Event Singularity Core/i);
    fireEvent.click(core);

    // Modal should appear
    expect(screen.getByText(/CORE DIAGNOSTICS & TRUST VAULT/i)).toBeDefined();
    expect(screen.getByText('PostgreSQL 17')).toBeDefined();
    expect(screen.getByText('Redis Outbox Bus')).toBeDefined();
    expect(screen.getByText(/OPERATOR VALIDATION & TELEMETRY AUDIT/i)).toBeDefined();
    expect(screen.getAllByText('v1.0.0-rc5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/COPY SANITIZED DIAGNOSTICS/i)).toBeDefined();

    // Click close button
    const closeBtn = screen.getByRole('button', { name: '' }).closest('button');
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
  });

  it('supports Camera HUD navigation presets', () => {
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

    // Camera buttons
    const scoutCamBtn = screen.getByTitle(/Focus Scout Territory/i);
    fireEvent.click(scoutCamBtn);
    expect(screen.getByText(/SCOUT \/\/ OBSERVATORY INSPECTOR/i)).toBeDefined();

    const nexusCamBtn = screen.getByTitle(/Focus Nexus Territory/i);
    fireEvent.click(nexusCamBtn);
    expect(screen.getByText(/NEXUS \/\/ OBSERVATORY INSPECTOR/i)).toBeDefined();

    const resetBtn = screen.getByTitle(/Reset Camera to Global Overview/i);
    fireEvent.click(resetBtn);
  });

  it('correctly calculates and displays verified service health statuses', () => {
    // 1. All Healthy
    const { rerender } = render(
      <UniverseCommandCenter
        stats={{
          ...mockStats,
          system_health: { api: 'healthy', postgresql: 'connected', redis: 'connected' },
        }}
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
    expect(screen.getByText('3/3 HEALTHY')).toBeDefined();

    // 2. Degraded (Redis disconnected)
    rerender(
      <UniverseCommandCenter
        stats={{
          ...mockStats,
          system_health: { api: 'healthy', postgresql: 'connected', redis: 'disconnected' },
        }}
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
    expect(screen.getByText('2/3 SERVICES (1 DEGRADED)')).toBeDefined();

    // 3. Offline (Postgres error)
    rerender(
      <UniverseCommandCenter
        stats={{
          ...mockStats,
          system_health: { api: 'healthy', postgresql: 'error: connection refused', redis: 'connected' },
        }}
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
    expect(screen.getByText('2/3 SERVICES (1 OFFLINE)')).toBeDefined();

    // 4. Missing / Unknown
    rerender(
      <UniverseCommandCenter
        stats={{ ...mockStats, system_health: undefined as any }}
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
    expect(screen.getByText('SERVICES: UNKNOWN')).toBeDefined();
  });

  it('safely handles keyboard shortcuts and ignores input focus', () => {
    render(
      <div>
        <input data-testid="test-input" />
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
      </div>
    );

    // Focus on input field
    const input = screen.getByTestId('test-input');
    input.focus();

    // Dispatch keyboard shortcut '1' while inside input -> should NOT change agent or toggle demo
    fireEvent.keyDown(input, { key: '1' });
    fireEvent.keyDown(input, { key: 'd' });
    expect(onToggleDemoMode).not.toHaveBeenCalled();

    // Dispatch keyboard shortcut on window while NOT in input -> should toggle demo
    fireEvent.keyDown(window, { key: 'd' });
    expect(onToggleDemoMode).toHaveBeenCalledWith(true);
  });

  it('opens and dismisses the Guided Universe Showcase modal', () => {
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

    // Click SHOWCASE GUIDE button
    const guideBtn = screen.getByRole('button', { name: /SHOWCASE GUIDE/i });
    fireEvent.click(guideBtn);

    // Modal appears
    expect(screen.getByText(/GUIDED OPERATOR DEMONSTRATION SHOWCASE/i)).toBeDefined();
    expect(screen.getByText(/1\. SCOUT \/\/ SENSOR FRONTIER/i)).toBeDefined();
    expect(screen.getByText(/2\. NEXUS \/\/ PROCESSING CORE/i)).toBeDefined();
    expect(screen.getByText(/3\. ORACLE \/\/ INTELLIGENCE SANCTUM/i)).toBeDefined();
    expect(screen.getByText(/4\. SENTINEL \/\/ RESPONSE BASTION/i)).toBeDefined();

    // Dismiss modal
    const enterBtn = screen.getByRole('button', { name: /ENTER UNIVERSE SHOWCASE/i });
    fireEvent.click(enterBtn);
    expect(screen.queryByText(/GUIDED OPERATOR DEMONSTRATION SHOWCASE/i)).toBeNull();
  });
});
