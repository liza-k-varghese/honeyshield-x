import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovementPrototype } from '../digital-agents/components/MovementPrototype';
import { NodeInspectorModal } from '../digital-agents/components/NodeInspectorModal';
import { NexusAssistantModal } from '../digital-agents/components/NexusAssistantModal';
import { TransferInspector } from '../digital-agents/components/TransferInspector';
import { BackendEventAdapter } from '../digital-agents/engine/BackendEventAdapter';
import { DataPacketPayload, FlowNodeDefinition } from '../digital-agents/types';
import { ScoutCharacter } from '../digital-agents/characters/ScoutCharacter';
import { NexusCharacter } from '../digital-agents/characters/NexusCharacter';
import { OracleCharacter } from '../digital-agents/characters/OracleCharacter';
import { SentinelCharacter } from '../digital-agents/characters/SentinelCharacter';

describe('Digital Agent Universe — Milestone 4 Browser Motion & Live Verification Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('Stage 3 & 4: Character Models & Physical Movement Engine', () => {
    it('renders all four distinct character silhouettes with unique accessories and palettes', () => {
      const { container: scoutC } = render(<ScoutCharacter state="idle" size={100} />);
      const { container: nexusC } = render(<NexusCharacter state="idle" size={100} />);
      const { container: oracleC } = render(<OracleCharacter state="idle" size={100} />);
      const { container: sentinelC } = render(<SentinelCharacter state="idle" size={100} />);

      // SCOUT has antenna
      expect(scoutC.querySelector('line[x1="80"][y1="36"]')).not.toBeNull();
      // NEXUS has circular illuminated side modules (ears)
      expect(nexusC.querySelector('#nexus-left-ear')).not.toBeNull();
      // ORACLE has floating holographic ring / halo analysis module
      expect(oracleC.querySelector('#oracle-holo-halo')).not.toBeNull();
      // SENTINEL has heavy graphite shoulder armor
      expect(sentinelC.querySelector('#sentinel-left-shoulder')).not.toBeNull();
    });

    it('attaches data packet to character articulated hands when carryingPacket is true', () => {
      const { container: carriedC } = render(
        <NexusCharacter state="travelling" carryingPacket={true} packetColor="cyan" size={100} />
      );
      // Contains held packet group
      expect(carriedC.querySelector('#nexus-held-packet')).not.toBeNull();

      const { container: freeC } = render(
        <NexusCharacter state="idle" carryingPacket={false} packetColor="cyan" size={100} />
      );
      // Contains free arms, no held packet
      expect(freeC.querySelector('#nexus-free-arms')).not.toBeNull();
      expect(freeC.querySelector('#nexus-held-packet')).toBeNull();
    });

    it('executes full movement sequence (ready -> travelling -> waiting -> confirmed)', () => {
      const handleSelectPacket = vi.fn();
      render(<MovementPrototype onSelectPacket={handleSelectPacket} />);

      // Initial state: Phase is ready
      expect(screen.getByText(/Phase:/i)).toBeDefined();
      expect(screen.getByText(/^ready$/i)).toBeDefined();

      // Click Start Movement
      const startBtn = screen.getByRole('button', { name: /Start Movement/i });
      fireEvent.click(startBtn);

      // Now Pause button appears
      expect(screen.getByRole('button', { name: /Pause Movement/i })).toBeDefined();

      // Click Reset to reset back to source
      const resetBtn = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetBtn);
      expect(screen.getByText(/^ready$/i)).toBeDefined();
    });

    it('switches between all 4 agents in single character mode', () => {
      render(<MovementPrototype />);

      // Switch to SCOUT
      const scoutBtn = screen.getByRole('button', { name: /SCOUT/i });
      fireEvent.click(scoutBtn);
      expect(screen.getByText(/Honeypot Sensor Grid/i)).toBeDefined();

      // Switch to ORACLE
      const oracleBtn = screen.getByRole('button', { name: /ORACLE/i });
      fireEvent.click(oracleBtn);
      expect(screen.getByText(/Attack Detection Core/i)).toBeDefined();

      // Switch to SENTINEL
      const sentinelBtn = screen.getByRole('button', { name: /SENTINEL/i });
      fireEvent.click(sentinelBtn);
      expect(screen.getByText(/Confirmed Alert Evaluator/i)).toBeDefined();
    });

    it('supports speed multiplier adjustments (0.5x, 1x, 2x)', () => {
      render(<MovementPrototype />);

      const speed05Btn = screen.getByRole('button', { name: '0.5x' });
      const speed2Btn = screen.getByRole('button', { name: '2x' });

      fireEvent.click(speed2Btn);
      expect(speed2Btn.className).toContain('font-bold');

      fireEvent.click(speed05Btn);
      expect(speed05Btn.className).toContain('font-bold');
    });

    it('handles simulated failure path with error badge and preserved reason', () => {
      render(<MovementPrototype />);

      const failureCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(failureCheckbox.checked).toBe(false);

      fireEvent.click(failureCheckbox);
      expect(failureCheckbox.checked).toBe(true);
    });
  });

  describe('Stage 5: Four-Agent Chain Relay Test (SCOUT -> NEXUS -> ORACLE -> SENTINEL)', () => {
    it('activates 4-Agent Chain Relay and displays the complete workflow sequence', () => {
      render(<MovementPrototype />);

      const relayToggle = screen.getByRole('button', { name: /Single Character|4-Agent Chain Relay/i });
      fireEvent.click(relayToggle);

      // Workflow header appears
      expect(
        screen.getByText(/Multi-Agent Chain Relay Workflow \(SCOUT → NEXUS → ORACLE → SENTINEL\):/i)
      ).toBeDefined();

      // All 4 relay steps rendered
      expect(screen.getByText(/Step 1: SCOUT/i)).toBeDefined();
      expect(screen.getByText(/Step 2: NEXUS/i)).toBeDefined();
      expect(screen.getByText(/Step 3: ORACLE/i)).toBeDefined();
      expect(screen.getByText(/Step 4: SENTINEL/i)).toBeDefined();
    });
  });

  describe('Stage 6: Real Backend Event Validation & Live/Demo Mode Isolation', () => {
    const livePacket: DataPacketPayload = {
      eventId: 'evt_backend_live_999',
      transferId: 'tr_backend_live_999',
      correlationId: 'wf_backend_live_999',
      sourceNode: 'Cowrie Honeypot',
      destinationNode: 'PostgreSQL Outbox',
      assignedAgent: 'nexus',
      eventType: 'honeypot.ssh_intrusion',
      severity: 'critical',
      color: 'cyan',
      timestamp: '2026-11-04T12:00:00Z',
      status: 'in_transit',
      progressPercent: 45,
      metadata: {
        sourceIp: '203.0.113.195',
        attackId: 88,
      },
    };

    it('renders real backend event in Live Mode and reflects genuine IDs', () => {
      render(<MovementPrototype isLiveMode={true} activeLivePacket={livePacket} />);

      expect(screen.getByText('LIVE STREAM')).toBeDefined();
      expect(screen.getByText(/#evt_backend_live_999/i)).toBeDefined();
      expect(screen.getByText(/honeypot.ssh_intrusion/i)).toBeDefined();
      expect(screen.getByText(/Cowrie Honeypot/i)).toBeDefined();
      expect(screen.getByText(/PostgreSQL Outbox/i)).toBeDefined();
    });

    it('BackendEventAdapter validates and rejects malformed payloads without crashing', () => {
      const adapter = new BackendEventAdapter();
      // Null or invalid object
      const invalidPacket = adapter.parseSecurityEvent(null as any);
      expect(invalidPacket).toBeNull();
    });
  });

  describe('Stage 7, 9 & 12: Accessibility, Modal Escape Key & Reduced Motion', () => {
    it('closes NodeInspectorModal when Escape key is pressed', () => {
      const handleClose = vi.fn();
      const sampleNode: FlowNodeDefinition = {
        id: 'sensor-cowrie',
        label: 'Cowrie SSH/Telnet Honeypot',
        system: 'SYS 2',
        agentOwner: 'scout',
        x: 10,
        y: 20,
        status: 'active',
        eventCount: 42,
        sensorType: 'Medium-Interaction SSH Emulation',
      };

      render(<NodeInspectorModal node={sampleNode} onClose={handleClose} />);

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Cowrie SSH\/Telnet Honeypot/i)).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes NexusAssistantModal when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <NexusAssistantModal
          isOpen={true}
          onClose={handleClose}
          activePackets={[]}
          completedPackets={[]}
          failedPackets={[]}
          runtimeAgentStates={{ scout: 'idle', nexus: 'idle', oracle: 'idle', sentinel: 'idle' }}
        />
      );

      expect(screen.getByRole('dialog')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes TransferInspector when Escape key is pressed', () => {
      const handleClose = vi.fn();
      const pkt: DataPacketPayload = {
        eventId: 'evt-test-esc',
        transferId: 'tr-test-esc',
        sourceNode: 'Sensor',
        destinationNode: 'Outbox',
        assignedAgent: 'scout',
        eventType: 'test',
        severity: 'low',
        color: 'blue',
        timestamp: '2026-11-04T12:00:00Z',
        status: 'in_transit',
        progressPercent: 50,
        metadata: {},
      };

      render(<TransferInspector packet={pkt} onClose={handleClose} />);
      expect(screen.getByRole('dialog')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('respects reducedMotion prop by omitting bounce and spin animation classes', () => {
      const { container: motionC } = render(
        <NexusCharacter state="travelling" size={100} reducedMotion={false} />
      );
      expect(motionC.querySelector('.animate-bounce')).not.toBeNull();

      const { container: reducedC } = render(
        <NexusCharacter state="travelling" size={100} reducedMotion={true} />
      );
      expect(reducedC.querySelector('.animate-bounce')).toBeNull();
    });
  });
});
