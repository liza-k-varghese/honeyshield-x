import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MovementPrototype } from '../digital-agents/components/MovementPrototype';

describe('Digital Agent Universe — Movement Prototype Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders movement prototype with source, destination, and Bézier path', () => {
    const { container } = render(<MovementPrototype />);

    expect(screen.getByText('FUNCTIONAL CHARACTER MOVEMENT PROTOTYPE')).toBeDefined();
    expect(screen.getByText('SOURCE')).toBeDefined();
    expect(screen.getByText('DESTINATION')).toBeDefined();
    expect(container.querySelector('#travel-curve')).not.toBeNull();
  });

  it('provides working VCR controls: Start, Pause, Resume, Reset', () => {
    render(<MovementPrototype />);

    // Initial state: Start Movement button visible
    const startBtn = screen.getByRole('button', { name: /Start Movement/i });
    expect(startBtn).toBeDefined();

    // Click Start
    act(() => {
      fireEvent.click(startBtn);
    });

    // Pause button appears while running
    const pauseBtn = screen.getByRole('button', { name: /Pause Movement/i });
    expect(pauseBtn).toBeDefined();

    // Click Pause
    act(() => {
      fireEvent.click(pauseBtn);
    });

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    act(() => {
      fireEvent.click(resetBtn);
    });

    // Resets back to Start Movement
    expect(screen.getByRole('button', { name: /Start Movement/i })).toBeDefined();
  });

  it('allows switching active carrier agent between SCOUT, NEXUS, ORACLE, and SENTINEL', () => {
    render(<MovementPrototype />);

    // Click SCOUT
    const scoutBtn = screen.getByRole('button', { name: /SCOUT/i });
    act(() => {
      fireEvent.click(scoutBtn);
    });
    expect(screen.getAllByText(/SCOUT/i).length).toBeGreaterThanOrEqual(1);

    // Click ORACLE
    const oracleBtn = screen.getByRole('button', { name: /ORACLE/i });
    act(() => {
      fireEvent.click(oracleBtn);
    });
    expect(screen.getAllByText(/ORACLE/i).length).toBeGreaterThanOrEqual(1);

    // Click SENTINEL
    const sentinelBtn = screen.getByRole('button', { name: /SENTINEL/i });
    act(() => {
      fireEvent.click(sentinelBtn);
    });
    expect(screen.getAllByText(/SENTINEL/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows selecting packet colors and updates attached packet metadata', () => {
    render(<MovementPrototype />);

    // Select Red Alert Packet
    const alertButtons = screen.getAllByRole('button', { name: /Alert/i });
    const packetAlertBtn = alertButtons[alertButtons.length - 1];
    act(() => {
      fireEvent.click(packetAlertBtn);
    });
    expect(screen.getAllByText(/alert.soc_dispatched/i).length).toBeGreaterThanOrEqual(1);

    // Select Sensor Blue Packet
    const sensorButtons = screen.getAllByRole('button', { name: /Sensor/i });
    const packetSensorBtn = sensorButtons[sensorButtons.length - 1];
    act(() => {
      fireEvent.click(packetSensorBtn);
    });
    expect(screen.getAllByText(/sensor.canary_tripped/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports 4-Agent Chain Relay mode', () => {
    render(<MovementPrototype />);

    // Toggle relay mode
    const relayToggle = screen.getByRole('button', { name: /4-Agent Chain Relay|Single Character/i });
    act(() => {
      fireEvent.click(relayToggle);
    });

    expect(screen.getByText(/Multi-Agent Chain Relay Workflow/i)).toBeDefined();
    expect(screen.getByText(/Step 1: SCOUT/i)).toBeDefined();
    expect(screen.getByText(/Step 2: NEXUS/i)).toBeDefined();
    expect(screen.getByText(/Step 3: ORACLE/i)).toBeDefined();
    expect(screen.getByText(/Step 4: SENTINEL/i)).toBeDefined();
  });

  it('supports speed adjustments (0.5x, 1x, 2x)', () => {
    render(<MovementPrototype />);

    const speed2x = screen.getByRole('button', { name: '2x' });
    act(() => {
      fireEvent.click(speed2x);
    });
    expect(speed2x.className).toContain('bg-cyan-600');

    const speedHalf = screen.getByRole('button', { name: '0.5x' });
    act(() => {
      fireEvent.click(speedHalf);
    });
    expect(speedHalf.className).toContain('bg-cyan-600');
  });

  it('triggers onSelectPacket when attached packet is clicked', () => {
    const handleSelectPacket = vi.fn();
    render(<MovementPrototype onSelectPacket={handleSelectPacket} />);

    // Click on the attached packet ribbon link
    const packetElements = screen.getAllByText(/queue.event_persisted|sensor.canary_tripped/i);
    act(() => {
      fireEvent.click(packetElements[0]);
    });

    expect(handleSelectPacket).toHaveBeenCalled();
  });

  it('toggles simulate failure path without crashing', () => {
    render(<MovementPrototype />);

    const failureCheckbox = screen.getByRole('checkbox', { name: /Simulate Failure Path/i }) as HTMLInputElement;
    act(() => {
      fireEvent.click(failureCheckbox);
    });
    expect(failureCheckbox.checked).toBe(true);
  });
});
