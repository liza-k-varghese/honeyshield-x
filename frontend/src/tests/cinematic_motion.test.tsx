import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Reveal,
  TiltCard,
  ScrollProgress,
  CurtainTransition,
} from '../components/CyberMotion';
import { HoneyShieldLanding } from '../components/HoneyShieldLanding';

// Create fresh QueryClient for test isolation
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HoneyShield X — Cinematic CyberMotion Component Suite', () => {
  it('renders Reveal component and applies initial reveal classes', () => {
    const { container } = render(
      <Reveal direction="up" delay={150} duration={400} distance={20}>
        <div data-testid="reveal-child">Cyber Target</div>
      </Reveal>
    );

    const child = screen.getByTestId('reveal-child');
    expect(child).toBeDefined();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('hsx-reveal-init');
    expect(wrapper.className).toContain('hsx-reveal-up');
  });

  it('renders TiltCard and calculates 3D transform on mouse movements', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <TiltCard onClick={handleClick} maxTilt={10} className="custom-test-card">
        <span data-testid="card-content">Cyber Core</span>
      </TiltCard>
    );

    const card = container.querySelector('.cyber-tilt-card') as HTMLElement;
    expect(card).toBeDefined();
    expect(screen.getByTestId('card-content')).toBeDefined();

    // Mock getBoundingClientRect
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Simulate mouse move to upper-left quadrant
    fireEvent.mouseMove(card, { clientX: 20, clientY: 10 });
    expect(card.style.transform).toContain('rotateX');
    expect(card.style.transform).toContain('rotateY');

    // Simulate mouse leave -> resets transform
    fireEvent.mouseLeave(card);
    expect(card.style.transform).toContain('rotateX(0deg) rotateY(0deg)');

    // Verify click handler
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders ScrollProgress component with accessible progressbar attributes', () => {
    render(<ScrollProgress />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-label')).toBe('Page reading progress');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('handles CurtainTransition completion callback', () => {
    vi.useFakeTimers();
    const handleComplete = vi.fn();

    const { rerender } = render(
      <CurtainTransition isActive={false} onComplete={handleComplete} duration={200} />
    );

    // Not active initially
    expect(document.querySelector('.hsx-curtain-overlay')).toBeNull();

    // Activate transition
    rerender(<CurtainTransition isActive={true} onComplete={handleComplete} duration={200} />);
    expect(document.querySelector('.hsx-curtain-overlay')).toBeDefined();

    // Fast-forward transition timer
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(handleComplete).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe('HoneyShield X — HoneyShieldLanding Cinematic Portal Suite', () => {
  beforeEach(() => {
    // Mock global fetch for dashboard endpoints
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/stats')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                total_attacks: 1420,
                active_alerts: 7,
                unique_attacker_ips_24h: 38,
                system_health: { api: 'ok', postgresql: 'ok', redis: 'ok' },
              }),
          });
        }
        if (url.includes('/api/v1/alerts')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: 'alt-1',
                  severity: 'critical',
                  title: 'SSH Brute Force Trap Tripped',
                  status: 'open',
                },
              ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      })
    );
  });

  it('renders the SECURITY. IN MOTION. label and HONEYSHIELD X hero typography', () => {
    const handleNavigate = vi.fn();
    renderWithQuery(<HoneyShieldLanding onNavigate={handleNavigate} />);

    // Outlined HONEYSHIELD X title
    const heroTitle = screen.getByText('HONEYSHIELD X');
    expect(heroTitle).toBeDefined();
    expect(heroTitle.className).toContain('hsx-hero-outline');

    // SECURITY. IN MOTION. badge
    const badge = screen.getByText('SECURITY. IN MOTION.');
    expect(badge).toBeDefined();

    // Verify sub-headline
    expect(
      screen.getByText('AUTONOMOUS DECEPTION & UNIFIED THREAT INTELLIGENCE')
    ).toBeDefined();
  });

  it('renders the 4 Digital Agents (SCOUT, NEXUS, ORACLE, SENTINEL) and handles navigation', () => {
    const handleNavigate = vi.fn();
    renderWithQuery(<HoneyShieldLanding onNavigate={handleNavigate} />);

    // Agent Names
    expect(screen.getByText('SCOUT')).toBeDefined();
    expect(screen.getByText('NEXUS')).toBeDefined();
    expect(screen.getByText('ORACLE')).toBeDefined();
    expect(screen.getByText('SENTINEL')).toBeDefined();

    // Agent Hex Colors
    expect(screen.getByText('#3B82F6')).toBeDefined();
    expect(screen.getByText('#00E5FF')).toBeDefined();
    expect(screen.getByText('#A855F7')).toBeDefined();
    expect(screen.getByText('#EF4444')).toBeDefined();

    // Click "LAUNCH COMMAND CENTER" button
    const enterSocBtn = screen.getByText('LAUNCH COMMAND CENTER');
    fireEvent.click(enterSocBtn);
    expect(handleNavigate).toHaveBeenCalledWith('overview');

    // Click "DEPLOY AGENT UNIVERSE" button
    const deployAgentsBtn = screen.getByText('DEPLOY AGENT UNIVERSE');
    fireEvent.click(deployAgentsBtn);
    expect(handleNavigate).toHaveBeenCalledWith('universe');

    // Click "RETROSPECTIVE HUNTING" button
    const huntingBtn = screen.getByText('RETROSPECTIVE HUNTING');
    fireEvent.click(huntingBtn);
    expect(handleNavigate).toHaveBeenCalledWith('hunts');
  });
});
