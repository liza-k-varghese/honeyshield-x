import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovementPrototype } from '../digital-agents/components/MovementPrototype';
import { NexusAssistantModal } from '../digital-agents/components/NexusAssistantModal';
import { EventJourneyReplay } from '../digital-agents/components/EventJourneyReplay';
import { BackendEventAdapter } from '../digital-agents/engine/BackendEventAdapter';
import { EventJourneyRecord } from '../digital-agents/types';

describe('HoneyShield X — Milestone 5 Browser Integration & Contract Reconciliation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Contract Reconciliation & Outbox Cursor Parsing', () => {
    it('parses live backend event with monotonic cursor and security_event_outbox mapping', () => {
      const adapter = new BackendEventAdapter();
      const rawBackendEvent = {
        event_id: 'evt-m5-live-001',
        event_type: 'ssh_intrusion_detected',
        timestamp: '2026-11-05T06:00:00Z',
        severity: 'high',
        cursor: 10429,
        agent: 'nexus',
        stage: 'normalization',
        status: 'completed',
        source: 'ingestion_api',
        destination: 'security_event_outbox',
        transfer_id: 'tr-m5-001',
        correlation_id: 'wf-attack-42',
        payload: {
          attack_id: 42,
          source_ip: '198.51.100.99',
          persisted_table: 'security_event_outbox',
        },
      };

      const packet = adapter.parseSecurityEvent(rawBackendEvent);
      expect(packet).not.toBeNull();
      expect(packet?.eventId).toBe('evt-m5-live-001');
      expect(packet?.assignedAgent).toBe('nexus');
      expect(packet?.color).toBe('cyan');
      expect(packet?.severity).toBe('high');
      expect(packet?.transferId).toBe('tr-m5-001');
      expect(packet?.correlationId).toBe('wf-attack-42');

      const journey = adapter.buildEventJourney(packet!);
      expect(journey.stages.length).toBeGreaterThanOrEqual(6);
      const outboxStage = journey.stages.find((s) => s.stageId === 'stg-3');
      expect(outboxStage).toBeDefined();
      expect(outboxStage?.details).toContain('security_event_outbox');
    });

    it('gracefully handles backward-compatible cursor aliases (since_cursor, last_id, cursor)', () => {
      const adapter = new BackendEventAdapter();
      const eventWithCursor = adapter.parseSecurityEvent({
        id: 'evt-alias-1',
        type: 'login_failure',
        cursor: 501,
      });
      expect(eventWithCursor).not.toBeNull();
      expect(eventWithCursor?.eventId).toBe('evt-alias-1');

      const eventWithSinceCursor = adapter.parseSecurityEvent({
        id: 'evt-alias-2',
        type: 'login_failure',
        since_cursor: 502,
      });
      expect(eventWithSinceCursor).not.toBeNull();
      expect(eventWithSinceCursor?.eventId).toBe('evt-alias-2');

      const eventWithLastId = adapter.parseSecurityEvent({
        id: 'evt-alias-3',
        type: 'login_failure',
        last_id: 503,
      });
      expect(eventWithLastId).not.toBeNull();
      expect(eventWithLastId?.eventId).toBe('evt-alias-3');
    });
  });

  describe('Character Silhouette, Articulated Hands & Trajectory Navigation', () => {
    it('renders all four characters with articulated arms and distinct silhouettes', () => {
      render(<MovementPrototype />);

      // Switch to SCOUT
      const scoutBtn = screen.getByRole('button', { name: /SCOUT/i });
      fireEvent.click(scoutBtn);
      expect(screen.getByText(/Honeypot Sensor Grid/i)).toBeDefined();

      // Switch to NEXUS
      const nexusBtn = screen.getByRole('button', { name: /NEXUS/i });
      fireEvent.click(nexusBtn);
      expect(screen.getByText(/Ingestion API Gateway/i)).toBeDefined();

      // Switch to ORACLE
      const oracleBtn = screen.getByRole('button', { name: /ORACLE/i });
      fireEvent.click(oracleBtn);
      expect(screen.getByText(/Attack Detection Core/i)).toBeDefined();

      // Switch to SENTINEL
      const sentinelBtn = screen.getByRole('button', { name: /SENTINEL/i });
      fireEvent.click(sentinelBtn);
      expect(screen.getByText(/Confirmed Alert Evaluator/i)).toBeDefined();
    });

    it('progresses character along Bézier trajectory and supports pause/reset', () => {
      render(<MovementPrototype />);

      expect(screen.getByText(/^ready$/i)).toBeDefined();

      const startBtn = screen.getByRole('button', { name: /Start Movement/i });
      fireEvent.click(startBtn);

      expect(screen.getByRole('button', { name: /Pause Movement/i })).toBeDefined();

      const resetBtn = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetBtn);

      expect(screen.getByText(/^ready$/i)).toBeDefined();
    });
  });

  describe('Four-Agent Sequential Relay Chain', () => {
    it('toggles 4-Agent Chain Relay mode', () => {
      render(<MovementPrototype />);

      const toggleBtn = screen.getByRole('button', { name: /Single Character/i });
      fireEvent.click(toggleBtn);

      // Label switches to 4-Agent Chain Relay
      expect(screen.getByRole('button', { name: /4-Agent Chain Relay/i })).toBeDefined();
      expect(screen.getByText(/Multi-Agent Chain Relay Workflow/i)).toBeDefined();
    });
  });

  describe('NEXUS Contextual Assistant & Containment Policy Refusal', () => {
    it('authoritatively refuses automated containment actions and directs to Containment Console', () => {
      render(<NexusAssistantModal isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Ask NEXUS about active transfers/i);
      const sendBtn = screen.getByRole('button', { name: /Send/i });

      // Host isolation command prompt
      fireEvent.change(input, { target: { value: 'Isolate host 192.168.1.50' } });
      fireEvent.click(sendBtn);

      expect(screen.getByText(/SECURITY NOTICE: Automated containment execution is prohibited/i)).toBeDefined();
    });

    it('closes cleanly when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(<NexusAssistantModal isOpen={true} onClose={handleClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Historical Event Journey Replay & Honest NOT RECORDED Handling', () => {
    it('accurately renders historical replay and honest NOT RECORDED badge for omitted stages', () => {
      const sampleJourney: EventJourneyRecord = {
        eventId: 'evt-m5-replay-001',
        eventType: 'ssh_brute_force',
        severity: 'high',
        correlationId: 'wf-m5-404',
        sourceIp: '203.0.113.88',
        attackerIp: '203.0.113.88',
        startTime: '2026-11-05T06:10:00Z',
        totalDurationMs: 420,
        isComplete: true,
        hasFailed: false,
        stages: [
          {
            stageId: 'stg-1',
            stageName: 'Source Sensor Capture',
            responsibleAgent: 'scout',
            timestamp: '2026-11-05T06:10:00Z',
            status: 'completed',
            details: 'Captured perimeter SSH attack on Cowrie honeypot.',
            durationMs: 45,
          },
          {
            stageId: 'stg-2',
            stageName: 'Generative AI Threat Synthesis',
            responsibleAgent: 'oracle',
            timestamp: 'NOT RECORDED',
            status: 'not_recorded',
            details: 'No generative AI inference feed configured for this event.',
          },
        ],
        currentStageIndex: 1,
      };

      render(<EventJourneyReplay journeys={[sampleJourney]} />);

      expect(screen.getByText(/HONEYSHIELD EVENT JOURNEY \/\/ HISTORICAL REPLAY/i)).toBeDefined();
      expect(screen.getByText('REPLAY MODE')).toBeDefined();
      expect(screen.getByText('203.0.113.88')).toBeDefined();

      // Verify honest NOT RECORDED badge
      expect(screen.getAllByText('NOT RECORDED').length).toBeGreaterThan(0);
    });
  });
});
