/**
 * HoneyShield X — Next Generation Universe Command Center (Universe 2.0)
 * Immersive Spatial SOC Universe, Articulated Robot Locomotion & Physical Event-Packet Handoffs
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AgentId,
  AgentRuntimeStatus,
  DataPacketPayload,
  EventJourneyRecord,
  RealtimeStreamConnectionState,
  RealtimeStreamMetrics,
  PacketColor,
} from '../digital-agents/types';
import { AGENT_PROFILES } from '../digital-agents/profiles';
import {
  ScoutCharacter,
  NexusCharacter,
  OracleCharacter,
  SentinelCharacter,
} from '../digital-agents/characters';
import { usePrefersReducedMotion } from './CyberMotion';
import { Alert, Attack, DashboardStats } from '../types';
import {
  Shield,
  Cpu,
  BrainCircuit,
  Bell,
  Radio,
  Search,
  Maximize2,
  ChevronRight,
  AlertTriangle,
  Clock,
  ExternalLink,
  Flame,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Compass,
  Activity,
  Server,
  Database,
  X,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Terminal,
  ArrowLeft,
} from 'lucide-react';
import './UniverseCommandCenter.css';

interface UniverseCommandCenterProps {
  stats?: DashboardStats;
  alerts?: Alert[];
  attacks?: Attack[];
  runtimeStatuses: Record<AgentId, AgentRuntimeStatus>;
  activePackets?: DataPacketPayload[];
  completedPackets?: DataPacketPayload[];
  failedPackets?: DataPacketPayload[];
  journeys?: EventJourneyRecord[];
  isDemoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
  onInvestigateIp: (ip: string) => void;
  onNavigateView: (view: string) => void;
  streamConnectionState?: RealtimeStreamConnectionState;
  streamMetrics?: RealtimeStreamMetrics;
  onOpenNexusAssistant?: () => void;
}

type CameraTarget = 'all' | 'singularity' | 'scout' | 'nexus' | 'oracle' | 'sentinel';
type CoreState = 'CONNECTED' | 'PROCESSING' | 'DEGRADED' | 'DISCONNECTED' | 'REPLAY' | 'DEMO';
type LocomotionStage = 'ready' | 'approaching' | 'pickup' | 'travelling' | 'waiting' | 'delivering' | 'confirmed' | 'failed';

export const UniverseCommandCenter: React.FC<UniverseCommandCenterProps> = ({
  stats,
  alerts = [],
  attacks = [],
  runtimeStatuses,
  activePackets = [],
  completedPackets: _completedPackets = [],
  failedPackets = [],
  journeys = [],
  isDemoMode,
  onToggleDemoMode,
  onInvestigateIp,
  onNavigateView,
  streamConnectionState = 'connected',
  streamMetrics,
  onOpenNexusAssistant,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Navigation & Selection States
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('scout');
  const [selectedJourney, setSelectedJourney] = useState<EventJourneyRecord | null>(null);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>('all');
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isShowcaseGuideOpen, setIsShowcaseGuideOpen] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState<boolean>(false);
  const [activeStageStepIndex, setActiveStageStepIndex] = useState<number>(0);
  const [isDevDiagnosticsOpen, setIsDevDiagnosticsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('debug') === '1' || p.get('hud') === '1' || p.get('diagnostics') === '1';
    }
    return false;
  });

  // Agent Locomotion & Packet Transit Engine State (Supports URL query param seeding for test and deep-linking)
  const [isLocomotionPlaying, setIsLocomotionPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('locomotion') === '1' || p.get('locomotion') === 'true';
    }
    return false;
  });
  const [locomotionProgress, setLocomotionProgress] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const val = parseFloat(new URLSearchParams(window.location.search).get('progress') || '0');
      return !isNaN(val) && val >= 0 && val <= 1 ? val : 0;
    }
    return 0;
  }); // 0.0 to 1.0
  const [locomotionStage, setLocomotionStage] = useState<LocomotionStage>(() => {
    if (typeof window !== 'undefined') {
      const p = parseFloat(new URLSearchParams(window.location.search).get('progress') || '0');
      if (p > 0.14 && p < 0.26) return 'pickup';
      if (p >= 0.26 && p < 0.78) return 'travelling';
      if (p >= 0.78 && p < 0.88) return 'waiting';
      if (p >= 0.88 && p < 0.98) return 'delivering';
      if (p >= 0.98) return 'confirmed';
    }
    return 'ready';
  });
  const [locomotionSpeed, setLocomotionSpeed] = useState<number>(1);
  const [relayAgentIndex, setRelayAgentIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const c = parseInt(new URLSearchParams(window.location.search).get('carrier') || '0', 10);
      return !isNaN(c) && c >= 0 && c <= 3 ? c : 0;
    }
    return 0;
  }); // 0: Scout, 1: Nexus, 2: Oracle, 3: Sentinel
  const [isReplayingHistorical, setIsReplayingHistorical] = useState<boolean>(false);
  const [relayRunId, setRelayRunId] = useState<string>(() => `RUN-${Date.now().toString(36).toUpperCase()}`);
  const runStartedAtRef = useRef<string>(new Date().toISOString());

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef<number>(locomotionProgress);

  // Relay Chain Agents & Conduit Path Definitions
  const relayChain: Array<{
    agent: AgentId;
    color: PacketColor;
    start: { x: number; y: number };
    control: { x: number; y: number };
    end: { x: number; y: number };
    name: string;
    stageLabel: string;
  }> = useMemo(
    () => [
      {
        agent: 'scout',
        color: 'blue',
        start: { x: 170, y: 130 },
        control: { x: 310, y: 190 },
        end: { x: 480, y: 280 },
        name: 'Sensor Detect',
        stageLabel: 'Honeypot Sensor Grid',
      },
      {
        agent: 'nexus',
        color: 'cyan',
        start: { x: 810, y: 130 },
        control: { x: 670, y: 190 },
        end: { x: 520, y: 280 },
        name: 'Outbox Ingest',
        stageLabel: 'ACID Outbox Persistence',
      },
      {
        agent: 'oracle',
        color: 'purple',
        start: { x: 810, y: 430 },
        control: { x: 670, y: 370 },
        end: { x: 520, y: 300 },
        name: 'Intel & Risk',
        stageLabel: 'IOC Correlation & Scoring',
      },
      {
        agent: 'sentinel',
        color: 'red',
        start: { x: 170, y: 430 },
        control: { x: 310, y: 370 },
        end: { x: 480, y: 300 },
        name: 'Alert & Dispatch',
        stageLabel: 'Governor Containment & Push',
      },
    ],
    []
  );

  const activeRelayStep = relayChain[relayAgentIndex];

  // Default to first journey if none selected
  useEffect(() => {
    if (!selectedJourney && journeys.length > 0) {
      setSelectedJourney(journeys[0]);
    }
  }, [journeys, selectedJourney]);

  // Derived counts
  const totalAttacksCount = stats?.total_attacks ?? attacks.length;
  const activeAlertsCount =
    stats?.active_alerts ??
    alerts.filter((a) => a.status === 'open' || a.status === 'acknowledged').length;

  // Active Profile & Runtime
  const selectedProfile = AGENT_PROFILES[selectedAgentId];
  const selectedRuntime = runtimeStatuses[selectedAgentId];

  // Critical Alerts for Floating Triage Stream
  const criticalAlerts = useMemo(() => {
    return alerts
      .filter((a) => a.severity === 'critical' || a.severity === 'high')
      .slice(0, 4);
  }, [alerts]);

  // Derived Event Singularity Core State (6 Explicit States)
  const coreState: CoreState = useMemo(() => {
    if (isDemoMode) return 'DEMO';
    if (isReplayingHistorical) return 'REPLAY';
    if (streamConnectionState === 'disconnected') return 'DISCONNECTED';
    if (streamConnectionState === 'reconnecting' || (streamMetrics && streamMetrics.queuedTransfers > 5)) return 'DEGRADED';
    if (activePackets.length > 0 || isLocomotionPlaying) return 'PROCESSING';
    return 'CONNECTED';
  }, [isDemoMode, isReplayingHistorical, streamConnectionState, streamMetrics, activePackets.length, isLocomotionPlaying]);

  // Verified Service Health Summary (Phase 10: Zero Fabricated Sensor / Service Metrics)
  const serviceHealthMetrics = useMemo(() => {
    const health = stats?.system_health;
    if (!health) {
      return {
        total: 0,
        healthy: 0,
        degraded: 0,
        offline: 0,
        label: 'SERVICES: UNKNOWN',
        statusColor: 'text-slate-400',
      };
    }

    if (typeof health.total_services === 'number') {
      const total = health.total_services;
      const healthy = health.healthy_services ?? 0;
      const degraded = health.degraded_services ?? 0;
      const offline = health.offline_services ?? 0;
      const statusColor = offline > 0 ? 'text-red-400' : degraded > 0 ? 'text-amber-400' : 'text-emerald-400';
      const label = offline > 0
        ? `${healthy}/${total} SERVICES (${offline} OFFLINE)`
        : degraded > 0
        ? `${healthy}/${total} SERVICES (${degraded} DEGRADED)`
        : `${healthy}/${total} HEALTHY`;
      return { total, healthy, degraded, offline, label, statusColor };
    }

    // Inspect individual verified subsystems
    const subsystems = [
      { name: 'API', val: (health.api || '').toLowerCase() },
      { name: 'PostgreSQL', val: (health.postgresql || '').toLowerCase() },
      { name: 'Redis', val: (health.redis || '').toLowerCase() },
    ];

    let healthy = 0;
    let degraded = 0;
    let offline = 0;

    subsystems.forEach((s) => {
      if (s.val === 'healthy' || s.val === 'connected' || s.val === 'ok' || s.val === 'online') {
        healthy++;
      } else if (s.val.includes('degraded') || s.val.includes('reconnecting') || s.val.includes('warning') || s.val.includes('stale') || s.val === 'disconnected') {
        degraded++;
      } else if (s.val.includes('error') || s.val.includes('unavailable') || s.val.includes('offline') || s.val.includes('failed')) {
        offline++;
      } else {
        degraded++;
      }
    });

    const total = subsystems.length;
    const statusColor = offline > 0 ? 'text-red-400' : degraded > 0 ? 'text-amber-400' : 'text-emerald-400';
    const label = offline > 0
      ? `${healthy}/${total} SERVICES (${offline} OFFLINE)`
      : degraded > 0
      ? `${healthy}/${total} SERVICES (${degraded} DEGRADED)`
      : `${healthy}/${total} HEALTHY`;

    return { total, healthy, degraded, offline, label, statusColor };
  }, [stats?.system_health]);

  // ==========================================================================
  // Procedural Constellation & Living Starfield Particle Canvas
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.offsetWidth || 1000);
    const height = (canvas.height = canvas.offsetHeight || 580);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;
    }

    const colors = ['#00e5ff', '#3b82f6', '#a855f7', '#ef4444', '#ffffff'];
    const particles: Particle[] = Array.from({ length: 75 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const render = () => {
      if (document.visibilityState === 'hidden') {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [prefersReducedMotion]);

  // ==========================================================================
  // Physical Character Locomotion & Packet Transit Animation Loop
  // ==========================================================================
  const animateLocomotion = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Rate of progress along curve (approx 3.2s per conduit leg at 1x)
      const speedMultiplier = locomotionSpeed * 0.32;
      const nextProgress = progressRef.current + deltaTime * speedMultiplier;

      if (nextProgress >= 1.0) {
        // Leg Complete: Seamlessly Advance Relay
        progressRef.current = 0.0;
        setLocomotionProgress(0.0);

        // If in single replay mode, finish after full cycle
        if (isReplayingHistorical && relayAgentIndex === 3) {
          setIsLocomotionPlaying(false);
          setIsReplayingHistorical(false);
          setLocomotionStage('ready');
          return;
        }

        setRelayAgentIndex((prevIdx) => (prevIdx + 1) % relayChain.length);
        setActiveStageStepIndex((prev) => (prev + 1) % 4);
        setLocomotionStage('approaching');
      } else {
        progressRef.current = nextProgress;
        setLocomotionProgress(nextProgress);

        // Stage Transitions along conduit
        if (nextProgress < 0.14) {
          setLocomotionStage('approaching');
        } else if (nextProgress < 0.26) {
          setLocomotionStage('pickup');
        } else if (nextProgress < 0.78) {
          setLocomotionStage('travelling');
        } else if (nextProgress < 0.88) {
          setLocomotionStage('waiting');
        } else if (nextProgress < 0.96) {
          setLocomotionStage('delivering');
        } else {
          setLocomotionStage('confirmed');
        }
      }

      if (isLocomotionPlaying) {
        animFrameRef.current = requestAnimationFrame(animateLocomotion);
      }
    },
    [locomotionSpeed, isLocomotionPlaying, isReplayingHistorical, relayAgentIndex, relayChain.length]
  );

  useEffect(() => {
    if (isLocomotionPlaying && !prefersReducedMotion) {
      lastTimeRef.current = null;
      animFrameRef.current = requestAnimationFrame(animateLocomotion);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLocomotionPlaying, animateLocomotion, prefersReducedMotion]);

  // Compute Coordinates along Quadratic Bézier Conduit
  const computeBezierPoint = (
    p: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ) => {
    const t = Math.max(0, Math.min(1, p));
    const invT = 1 - t;
    const x = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x;
    const y = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y;
    return { x, y };
  };

  const computeBezierTangent = (
    p: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ) => {
    const t = Math.max(0, Math.min(1, p));
    const vx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const vy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return { vx, vy };
  };

  const currentCoords = computeBezierPoint(
    locomotionProgress,
    activeRelayStep.start,
    activeRelayStep.control,
    activeRelayStep.end
  );

  const currentTangent = computeBezierTangent(
    locomotionProgress,
    activeRelayStep.start,
    activeRelayStep.control,
    activeRelayStep.end
  );

  const rawSlope = Math.atan2(currentTangent.vy, Math.abs(currentTangent.vx) + 0.001) * (180 / Math.PI);
  const bankingAngle = prefersReducedMotion ? 0 : Math.max(-14, Math.min(14, rawSlope * 0.35));

  // Determine individual agent deployment status during relay / live locomotion
  const isAnyLocomotionActive = isLocomotionPlaying || locomotionProgress > 0;
  const isScoutTravelling = isAnyLocomotionActive && activeRelayStep.agent === 'scout' && locomotionStage !== 'confirmed';
  const isNexusTravelling = isAnyLocomotionActive && activeRelayStep.agent === 'nexus' && locomotionStage !== 'confirmed';
  const isOracleTravelling = isAnyLocomotionActive && activeRelayStep.agent === 'oracle' && locomotionStage !== 'confirmed';
  const isSentinelTravelling = isAnyLocomotionActive && activeRelayStep.agent === 'sentinel' && locomotionStage !== 'confirmed';

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox' ||
          target.closest('input, textarea, [contenteditable="true"]')
        )
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (isShowcaseGuideOpen) {
            setIsShowcaseGuideOpen(false);
          } else if (isDiagnosticsModalOpen) {
            setIsDiagnosticsModalOpen(false);
          } else {
            setCameraTarget('all');
          }
          break;
        case 'g':
        case 'G':
        case '?':
          setIsShowcaseGuideOpen((prev) => !prev);
          break;
        case '0':
          setCameraTarget('all');
          setIsDiagnosticsModalOpen(false);
          break;
        case '1':
          setCameraTarget('scout');
          setSelectedAgentId('scout');
          break;
        case '2':
          setCameraTarget('nexus');
          setSelectedAgentId('nexus');
          break;
        case '3':
          setCameraTarget('oracle');
          setSelectedAgentId('oracle');
          break;
        case '4':
          setCameraTarget('sentinel');
          setSelectedAgentId('sentinel');
          break;
        case 'c':
        case 'C':
        case '5':
          setCameraTarget('singularity');
          setIsDiagnosticsModalOpen(true);
          break;
        case 'd':
        case 'D':
          onToggleDemoMode(!isDemoMode);
          break;
        case 'h':
        case 'H':
          setIsDevDiagnosticsOpen((prev) => !prev);
          break;
        case 'r':
        case 'R':
          handleTriggerReplay();
          break;
        case ' ':
          e.preventDefault();
          setIsLocomotionPlaying((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDemoMode, onToggleDemoMode, isDiagnosticsModalOpen, isShowcaseGuideOpen]);

  // Replay Trigger Action
  const handleTriggerReplay = () => {
    progressRef.current = 0;
    setIsReplayingHistorical(true);
    setRelayAgentIndex(0);
    setActiveStageStepIndex(0);
    setLocomotionProgress(0);
    setLocomotionStage('ready');
    setIsLocomotionPlaying(true);
  };

  // Safe Investigation Deep-Link
  const handleInvestigateClick = (ip: string) => {
    onInvestigateIp(ip);
  };

  // Synchronize Observable Relay State Model for autonomous verification & diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const agentStates: Record<string, any> = {};
      relayChain.forEach((step, idx) => {
        const isCurrent = idx === relayAgentIndex;
        const isPast = idx < relayAgentIndex;
        const status = isCurrent
          ? (!isLocomotionPlaying && locomotionProgress > 0
              ? 'paused'
              : locomotionStage === 'travelling'
              ? 'travelling'
              : locomotionStage === 'delivering'
              ? 'delivering'
              : 'docked')
          : isPast
          ? 'completed'
          : 'waiting_turn';
        const stage = isCurrent
          ? locomotionStage
          : isPast
          ? 'completed'
          : isLocomotionPlaying
          ? 'waiting'
          : 'idle';
        const progress = isCurrent ? locomotionProgress : isPast ? 1.0 : 0.0;
        const coords = isCurrent ? currentCoords : step.start;
        const packetAttached = isCurrent && locomotionProgress >= 0.14 && locomotionProgress <= 0.96;

        let reasonForWaiting = 'Standing by in quadrant bay';
        if (isCurrent && !isLocomotionPlaying && locomotionProgress > 0) {
          reasonForWaiting = 'Relay paused by operator';
        } else if (isCurrent) {
          reasonForWaiting = 'Movement active';
        } else if (isPast) {
          reasonForWaiting = 'Stage completed; awaiting next cycle';
        } else if (isLocomotionPlaying) {
          reasonForWaiting = `Waiting for ${activeRelayStep.agent.toUpperCase()} (Leg ${relayAgentIndex + 1}/4) to complete transfer`;
        }

        agentStates[step.agent] = {
          agentId: step.agent,
          relayRunId,
          transferId: `TR-HSX-${step.agent.toUpperCase()}-${relayRunId}`,
          stage,
          status,
          sourceNode: `quadrant:${step.agent}`,
          destinationNode: 'singularity:core',
          startPosition: step.start,
          currentPosition: coords,
          destinationPosition: step.end,
          progress,
          packetAttached,
          startedAt: isCurrent || isPast ? runStartedAtRef.current : null,
          lastUpdatedAt: new Date().toISOString(),
          completedAt: isPast ? runStartedAtRef.current : null,
          failureReason: null,
          reasonForWaiting,
        };
      });

      (window as any).__HSX_RELAY_STATE__ = {
        mode: isDemoMode
          ? 'DEMO'
          : isReplayingHistorical
          ? 'REPLAY'
          : streamConnectionState === 'connected'
          ? 'LIVE'
          : 'STANDBY',
        relayRunId,
        currentAgent: activeRelayStep.agent,
        currentStage: relayAgentIndex + 1,
        movementProgress: locomotionProgress,
        isLocomotionPlaying,
        locomotionSpeed,
        lastEvent: streamMetrics?.lastCursor
          ? `outbox.cursor.#${streamMetrics.lastCursor}`
          : attacks[0]
          ? `attack.${attacks[0].attack_type}`
          : 'relay.cycle.sync',
        failureReason: null,
        agents: agentStates,
      };
    }
  }, [
    relayChain,
    relayAgentIndex,
    activeRelayStep,
    locomotionStage,
    locomotionProgress,
    currentCoords,
    isLocomotionPlaying,
    locomotionSpeed,
    isDemoMode,
    isReplayingHistorical,
    streamConnectionState,
    relayRunId,
    streamMetrics,
    attacks,
  ]);

  return (
    <div className="space-y-6 font-mono text-slate-100 select-none">
      {/* ====================================================================
          1. Top Observatory Trust & Coordination Bar
          ==================================================================== */}
      <div className="p-4 rounded-xl hsx-console-panel flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-cyan-500/20">
        {/* Left: Mode Title & Real-time Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-widest text-white">
                HONEYSHIELD X // ORBITAL COMMAND CENTER
              </span>
              <span className="text-[10px] text-cyan-400/80 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30">
                v1.0.0-rc5
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    streamConnectionState === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                STREAM:{' '}
                <span className="text-slate-200 uppercase font-semibold">
                  {streamConnectionState}
                </span>
              </span>
              <span>•</span>
              <span>
                CURSOR SEQ:{' '}
                <span className="text-cyan-400 font-bold">
                  {streamMetrics?.lastCursor ? `#${streamMetrics.lastCursor}` : isDemoMode ? '#DEMO-104' : streamConnectionState === 'connected' ? 'SYNCED' : 'STANDBY'}
                </span>
              </span>
              <span>•</span>
              <span>
                INGEST BUFFER:{' '}
                <span className="text-emerald-400">
                  {streamMetrics?.totalReceived ?? totalAttacksCount} EVENTS
                </span>
              </span>
              <span>•</span>
              <span>
                SERVICES:{' '}
                <span className={`font-semibold ${serviceHealthMetrics.statusColor}`}>
                  {serviceHealthMetrics.label}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Indicator Badge */}
        <div className="flex items-center gap-2">
          {isDemoMode ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="font-bold tracking-wider">
                SYNTHETIC SIMULATION // DEMO MODE ACTIVE
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold tracking-wider">
                AUTHENTIC LIVE TELEMETRY // REAL-TIME SOC
              </span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateView('overview')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 hover:border-cyan-400 hover:text-white transition-all shadow-[0_0_10px_rgba(0,229,255,0.2)]"
            title="Return to Security Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            RETURN TO OVERVIEW
          </button>

          <button
            onClick={() => onToggleDemoMode(!isDemoMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              isDemoMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            {isDemoMode ? 'EXIT DEMO' : 'SIMULATE DEMO'}
          </button>

          <button
            onClick={() => onNavigateView('hunts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/50 hover:border-cyan-400 transition-all"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            THREAT HUNTING
          </button>

          <button
            onClick={() => onNavigateView('cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-purple-300 border border-purple-500/30 hover:bg-purple-950/50 hover:border-purple-400 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            INCIDENTS
          </button>

          <button
            onClick={() => setIsDiagnosticsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/50 hover:border-emerald-400 transition-all"
            title="Open Operator Diagnostics & Validation Panel (Key: C)"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            DIAGNOSTICS
          </button>

          <button
            onClick={() => setIsShowcaseGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/50 hover:border-cyan-400 transition-all"
            title="Open Guided Universe 2.0 Showcase Tour (Key: G or ?)"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            SHOWCASE GUIDE
          </button>

          {onOpenNexusAssistant && (
            <button
              onClick={onOpenNexusAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:scale-105 transition-all"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-cyan-200" />
              NEXUS AI
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. The Central Orbital Constellation Stage & Spatial Camera Viewport
          ==================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Orbital Map (8 Columns on XL) */}
        <div className="xl:col-span-8 hsx-universe-stage p-4 flex flex-col justify-between">
          {/* Living Starfield / Constellation Canvas */}
          <canvas ref={canvasRef} className="hsx-constellation-canvas" />

          {/* Spatial Grid & Scanline layers */}
          <div className="hsx-universe-grid-overlay" />
          <div className="hsx-universe-scanlines" />

          {/* Camera Navigation HUD (Top-Right of Stage) */}
          <div className="hsx-camera-hud">
            <span className="text-[9px] text-slate-400 flex items-center gap-1 pl-1">
              <Compass className="w-3 h-3 text-cyan-400" /> CAMERA:
            </span>
            <button
              onClick={() => setCameraTarget('all')}
              className={`hsx-camera-btn ${cameraTarget === 'all' ? 'hsx-camera-btn-active' : ''}`}
              title="Reset Camera to Global Overview [Key: 0 / Esc]"
            >
              RESET
            </button>
            <button
              onClick={() => {
                setCameraTarget('singularity');
                setIsDiagnosticsModalOpen(true);
              }}
              className={`hsx-camera-btn ${cameraTarget === 'singularity' ? 'hsx-camera-btn-active' : ''}`}
              title="Focus Singularity Core [Key: C]"
            >
              CORE
            </button>
            <button
              onClick={() => {
                setCameraTarget('scout');
                setSelectedAgentId('scout');
              }}
              className={`hsx-camera-btn ${cameraTarget === 'scout' ? 'hsx-camera-btn-active' : ''}`}
              title="Focus Scout Territory [Key: 1]"
            >
              SCOUT
            </button>
            <button
              onClick={() => {
                setCameraTarget('nexus');
                setSelectedAgentId('nexus');
              }}
              className={`hsx-camera-btn ${cameraTarget === 'nexus' ? 'hsx-camera-btn-active' : ''}`}
              title="Focus Nexus Territory [Key: 2]"
            >
              NEXUS
            </button>
            <button
              onClick={() => {
                setCameraTarget('oracle');
                setSelectedAgentId('oracle');
              }}
              className={`hsx-camera-btn ${cameraTarget === 'oracle' ? 'hsx-camera-btn-active' : ''}`}
              title="Focus Oracle Territory [Key: 3]"
            >
              ORACLE
            </button>
            <button
              onClick={() => {
                setCameraTarget('sentinel');
                setSelectedAgentId('sentinel');
              }}
              className={`hsx-camera-btn ${cameraTarget === 'sentinel' ? 'hsx-camera-btn-active' : ''}`}
              title="Focus Sentinel Territory [Key: 4]"
            >
              SENTINEL
            </button>
          </div>

          {/* Spatial World Container with Camera Scale & Pan */}
          <div className="hsx-spatial-viewport">
            <div className={`hsx-spatial-world camera-${cameraTarget}`}>
              {/* Concentric Rotating Orbital Rings */}
              <div className="hsx-orbital-ring hsx-orbital-ring-outer" />
              <div className="hsx-orbital-ring hsx-orbital-ring-mid" />
              <div className="hsx-orbital-ring hsx-orbital-ring-inner" />

              {/* SVG Luminous Energy Conduits Connecting Agents & Singularity */}
              <svg
                viewBox="0 0 1000 580"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              >
                <defs>
                  <linearGradient id="flux-scout" x1="0%" y1="0%" x2="50%" y2="50%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="flux-nexus" x1="100%" y1="0%" x2="50%" y2="50%">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="flux-oracle" x1="100%" y1="100%" x2="50%" y2="50%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="flux-sentinel" x1="0%" y1="100%" x2="50%" y2="50%">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* Conduit 1: SCOUT (Top-Left) to Singularity */}
                <path
                  d="M 170 130 Q 310 190 480 280"
                  fill="none"
                  stroke="url(#flux-scout)"
                  strokeWidth="2.5"
                  className="hsx-conduit-line"
                />

                {/* Conduit 2: NEXUS (Top-Right) to Singularity */}
                <path
                  d="M 810 130 Q 670 190 520 280"
                  fill="none"
                  stroke="url(#flux-nexus)"
                  strokeWidth="2.5"
                  className="hsx-conduit-line"
                />

                {/* Conduit 3: ORACLE (Bottom-Right) to Singularity */}
                <path
                  d="M 810 430 Q 670 370 520 300"
                  fill="none"
                  stroke="url(#flux-oracle)"
                  strokeWidth="2.5"
                  className="hsx-conduit-line"
                />

                {/* Conduit 4: SENTINEL (Bottom-Left) to Singularity */}
                <path
                  d="M 170 430 Q 310 370 480 300"
                  fill="none"
                  stroke="url(#flux-sentinel)"
                  strokeWidth="2.5"
                  className="hsx-conduit-line"
                />
              </svg>

              {/* The Central Event Singularity Core 2.0 (with 6 Explicit States) */}
              <div
                onClick={() => {
                  setCameraTarget('singularity');
                  setIsDiagnosticsModalOpen(true);
                }}
                className={`hsx-singularity-core hsx-core-${coreState.toLowerCase()} group`}
                title="HoneyShield X Event Singularity Core — Click for Full Platform Diagnostics"
              >
                <div className="hsx-singularity-pulse" />
                <Shield className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-[10px] font-black tracking-widest text-cyan-300">
                  SINGULARITY
                </span>
                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 my-0.5">
                  {coreState}
                </span>
                <span className="text-[9px] text-slate-400">
                  {totalAttacksCount} EVENTS
                </span>
              </div>

              {/* ====================================================================
                  The 4 Distinct Agent Quadrants with Original Articulated Robots
                  ==================================================================== */}

              {/* Quadrant II (Top-Left): SCOUT — Sensor Frontier */}
              <div
                onClick={() => {
                  setSelectedAgentId('scout');
                  setCameraTarget('scout');
                }}
                className={`hsx-territory-card hsx-territory-scout top-12 left-6 max-w-[210px] ${
                  selectedAgentId === 'scout' ? 'ring-2 ring-blue-400 scale-105' : ''
                }`}
              >
                <div className="hsx-radar-sweep" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> SCOUT TERRITORY
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isScoutTravelling ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/50 animate-pulse">
                        TRANSIT [1/4]
                      </span>
                    ) : isAnyLocomotionActive ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        STANDBY [1/4]
                      </span>
                    ) : null}
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {isScoutTravelling ? (
                    <div
                      className="w-[70px] h-[80px] rounded-lg border border-dashed border-blue-500/50 bg-blue-950/30 flex flex-col items-center justify-center relative overflow-hidden group select-none"
                      title="SCOUT is currently deployed in transit across the constellation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent animate-pulse" />
                      <Radio className="w-5 h-5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="text-[9px] font-mono text-blue-300 font-bold mt-1 tracking-wider">DEPLOYED</span>
                      <span className="text-[7.5px] font-mono text-blue-400/80">
                        {isLocomotionPlaying ? 'IN TRANSIT' : 'PAUSED'}
                      </span>
                    </div>
                  ) : (
                    <ScoutCharacter
                      state={runtimeStatuses.scout.currentState}
                      carryingPacket={activePackets.some((p) => p.assignedAgent === 'scout')}
                      size={70}
                      reducedMotion={prefersReducedMotion}
                    />
                  )}
                  <div className="text-[10px] text-slate-300">
                    <p className="font-semibold text-white">4 Honeypot Traps</p>
                    <p className="text-slate-400">SSH Cowrie, Dionaea</p>
                    <p className="text-blue-300 mt-1 font-bold">
                      {isScoutTravelling
                        ? 'Relaying Packet'
                        : isAnyLocomotionActive
                        ? 'Standby • Leg 1/4'
                        : `${runtimeStatuses.scout.tasksCompleted} Trapped`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quadrant I (Top-Right): NEXUS — Processing Nexus */}
              <div
                onClick={() => {
                  setSelectedAgentId('nexus');
                  setCameraTarget('nexus');
                }}
                className={`hsx-territory-card hsx-territory-nexus top-12 right-6 max-w-[210px] ${
                  selectedAgentId === 'nexus' ? 'ring-2 ring-cyan-400 scale-105' : ''
                }`}
              >
                <div className="hsx-circuit-bus" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" /> NEXUS CORE
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isNexusTravelling ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 animate-pulse">
                        TRANSIT [2/4]
                      </span>
                    ) : isAnyLocomotionActive ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        STANDBY [2/4]
                      </span>
                    ) : null}
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {isNexusTravelling ? (
                    <div
                      className="w-[70px] h-[80px] rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/30 flex flex-col items-center justify-center relative overflow-hidden group select-none"
                      title="NEXUS is currently deployed in transit across the constellation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent animate-pulse" />
                      <Cpu className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="text-[9px] font-mono text-cyan-300 font-bold mt-1 tracking-wider">DEPLOYED</span>
                      <span className="text-[7.5px] font-mono text-cyan-400/80">
                        {isLocomotionPlaying ? 'IN TRANSIT' : 'PAUSED'}
                      </span>
                    </div>
                  ) : (
                    <NexusCharacter
                      state={runtimeStatuses.nexus.currentState}
                      carryingPacket={activePackets.some((p) => p.assignedAgent === 'nexus')}
                      size={70}
                      reducedMotion={prefersReducedMotion}
                    />
                  )}
                  <div className="text-[10px] text-slate-300">
                    <p className="font-semibold text-white">ACID Event Outbox</p>
                    <p className="text-slate-400">PostgreSQL 17 Queue</p>
                    <p className="text-cyan-300 mt-1 font-bold">
                      {isNexusTravelling
                        ? 'Flushing Outbox'
                        : isAnyLocomotionActive
                        ? 'Standby • Leg 2/4'
                        : `${runtimeStatuses.nexus.tasksCompleted} Normalized`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quadrant IV (Bottom-Right): ORACLE — Intelligence Sanctum */}
              <div
                onClick={() => {
                  setSelectedAgentId('oracle');
                  setCameraTarget('oracle');
                }}
                className={`hsx-territory-card hsx-territory-oracle bottom-12 right-6 max-w-[210px] ${
                  selectedAgentId === 'oracle' ? 'ring-2 ring-purple-400 scale-105' : ''
                }`}
              >
                <div className="hsx-intel-glyph" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                    <BrainCircuit className="w-3.5 h-3.5" /> ORACLE LAB
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isOracleTravelling ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/50 animate-pulse">
                        TRANSIT [3/4]
                      </span>
                    ) : isAnyLocomotionActive ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        STANDBY [3/4]
                      </span>
                    ) : null}
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {isOracleTravelling ? (
                    <div
                      className="w-[70px] h-[80px] rounded-lg border border-dashed border-purple-500/50 bg-purple-950/30 flex flex-col items-center justify-center relative overflow-hidden group select-none"
                      title="ORACLE is currently deployed in transit across the constellation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent animate-pulse" />
                      <BrainCircuit className="w-5 h-5 text-purple-400 animate-pulse" />
                      <span className="text-[9px] font-mono text-purple-300 font-bold mt-1 tracking-wider">DEPLOYED</span>
                      <span className="text-[7.5px] font-mono text-purple-400/80">
                        {isLocomotionPlaying ? 'IN TRANSIT' : 'PAUSED'}
                      </span>
                    </div>
                  ) : (
                    <OracleCharacter
                      state={runtimeStatuses.oracle.currentState}
                      carryingPacket={activePackets.some((p) => p.assignedAgent === 'oracle')}
                      size={70}
                      reducedMotion={prefersReducedMotion}
                    />
                  )}
                  <div className="text-[10px] text-slate-300">
                    <p className="font-semibold text-white">Threat Intel Store</p>
                    <p className="text-slate-400">IOC Attribution 8.5/10</p>
                    <p className="text-purple-300 mt-1 font-bold">
                      {isOracleTravelling
                        ? 'Correlating IOC'
                        : isAnyLocomotionActive
                        ? 'Standby • Leg 3/4'
                        : `${runtimeStatuses.oracle.tasksCompleted} Correlated`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quadrant III (Bottom-Left): SENTINEL — Response Bastion */}
              <div
                onClick={() => {
                  setSelectedAgentId('sentinel');
                  setCameraTarget('sentinel');
                }}
                className={`hsx-territory-card hsx-territory-sentinel bottom-12 left-6 max-w-[210px] ${
                  selectedAgentId === 'sentinel' ? 'ring-2 ring-red-400 scale-105' : ''
                }`}
              >
                <div className="hsx-barrier-shield" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> SENTINEL BASTION
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSentinelTravelling ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/50 animate-pulse">
                        TRANSIT [4/4]
                      </span>
                    ) : isAnyLocomotionActive ? (
                      <span className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        STANDBY [4/4]
                      </span>
                    ) : null}
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {isSentinelTravelling ? (
                    <div
                      className="w-[70px] h-[80px] rounded-lg border border-dashed border-red-500/50 bg-red-950/30 flex flex-col items-center justify-center relative overflow-hidden group select-none"
                      title="SENTINEL is currently deployed in transit across the constellation"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent animate-pulse" />
                      <Bell className="w-5 h-5 text-red-400 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span className="text-[9px] font-mono text-red-300 font-bold mt-1 tracking-wider">DEPLOYED</span>
                      <span className="text-[7.5px] font-mono text-red-400/80">
                        {isLocomotionPlaying ? 'IN TRANSIT' : 'PAUSED'}
                      </span>
                    </div>
                  ) : (
                    <SentinelCharacter
                      state={runtimeStatuses.sentinel.currentState}
                      carryingPacket={activePackets.some((p) => p.assignedAgent === 'sentinel')}
                      size={70}
                      reducedMotion={prefersReducedMotion}
                    />
                  )}
                  <div className="text-[10px] text-slate-300">
                    <p className="font-semibold text-white">Governor Containment</p>
                    <p className="text-slate-400">SOC & Android Push</p>
                    <p className="text-red-300 mt-1 font-bold">
                      {isSentinelTravelling
                        ? 'Dispatching Push'
                        : isAnyLocomotionActive
                        ? 'Standby • Leg 4/4'
                        : `${activeAlertsCount} Open Alerts`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Developer Diagnostics HUD Overlay (Milestone 52) */}
              {isDevDiagnosticsOpen && (
                <div
                  className="absolute top-4 left-4 z-40 bg-slate-950/95 border border-amber-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-sm text-[11px] font-mono text-slate-200 select-none pointer-events-auto"
                  data-testid="developer-diagnostics-hud"
                >
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5 mb-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" /> RELAY DIAGNOSTICS HUD
                    </span>
                    <button
                      onClick={() => setIsDevDiagnosticsOpen(false)}
                      className="text-slate-400 hover:text-white px-1 text-xs"
                      title="Close HUD"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CURRENT MODE:</span>
                      <span className="font-bold text-cyan-300">
                        {isDemoMode ? 'DEMO' : isReplayingHistorical ? 'REPLAY' : streamConnectionState === 'connected' ? 'LIVE' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CURRENT RELAY RUN:</span>
                      <span className="text-amber-300 font-mono text-[10px]">{relayRunId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Relay Stage:</span>
                      <span className="font-bold text-white">Stage {relayAgentIndex + 1}/4: {activeRelayStep.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Agent ID:</span>
                      <span
                        className="font-bold uppercase"
                        style={{
                          color:
                            activeRelayStep.color === 'blue'
                              ? '#60a5fa'
                              : activeRelayStep.color === 'cyan'
                              ? '#67e8f9'
                              : activeRelayStep.color === 'purple'
                              ? '#c084fc'
                              : '#f87171',
                        }}
                      >
                        {activeRelayStep.agent}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Movement State:</span>
                      <span className="text-cyan-300 font-semibold uppercase">{locomotionStage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Agent Coordinates:</span>
                      <span className="text-slate-100 font-semibold">
                        ({currentCoords.x.toFixed(1)}, {currentCoords.y.toFixed(1)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Route Source:</span>
                      <span className="text-slate-300">
                        ({activeRelayStep.start.x}, {activeRelayStep.start.y})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Route Destination:</span>
                      <span className="text-slate-300">
                        ({activeRelayStep.end.x}, {activeRelayStep.end.y})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Animation Progress:</span>
                      <span className="font-bold text-amber-400">
                        {(locomotionProgress * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Packet Attachment:</span>
                      <span
                        className={`font-bold ${
                          locomotionProgress >= 0.14 && locomotionProgress <= 0.96
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {locomotionProgress >= 0.14 && locomotionProgress <= 0.96 ? 'ATTACHED' : 'DETACHED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Transfer ID:</span>
                      <span className="text-slate-300">
                        TR-DEMO-{activeRelayStep.agent.toUpperCase()}-{Math.floor(locomotionProgress * 1000)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Next Handoff:</span>
                      <span className="text-cyan-400 font-bold uppercase">
                        {relayChain[(relayAgentIndex + 1) % relayChain.length].agent}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">LAST EVENT:</span>
                      <span className="text-slate-300 font-mono text-[10px] truncate max-w-[170px]">
                        {streamMetrics?.lastCursor ? `#${streamMetrics.lastCursor}` : attacks[0] ? `${attacks[0].attack_type}` : 'relay.cycle.sync'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Elapsed Time:</span>
                      <span className="text-slate-300">
                        {((relayAgentIndex * 3.125 + locomotionProgress * 3.125) / locomotionSpeed).toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1 mt-1">
                      <span className="text-slate-400">Failure Reason:</span>
                      <span className="text-emerald-400 font-bold">None (Nominal)</span>
                    </div>

                    {/* Four-Agent Diagnostic Status Breakdown (Milestone 54) */}
                    <div className="border-t border-amber-500/30 pt-1.5 mt-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider">
                        Four-Agent Diagnostic Status:
                      </span>
                      {relayChain.map((step, idx) => {
                        const isCurrent = idx === relayAgentIndex;
                        const isPast = idx < relayAgentIndex;
                        const statusLabel =
                          !isLocomotionPlaying && locomotionProgress > 0 && isCurrent
                            ? 'PAUSED'
                            : isCurrent
                            ? `ACTIVE (${locomotionStage.toUpperCase()})`
                            : isPast
                            ? 'COMPLETED'
                            : isLocomotionPlaying
                            ? 'WAITING TURN'
                            : 'IDLE';
                        const statusColor = isCurrent
                          ? 'text-cyan-300 font-bold'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-slate-400';
                        return (
                          <div key={step.agent} className="flex justify-between text-[10px]">
                            <span
                              className="uppercase font-semibold"
                              style={{
                                color:
                                  step.color === 'blue'
                                    ? '#60a5fa'
                                    : step.color === 'cyan'
                                    ? '#67e8f9'
                                    : step.color === 'purple'
                                    ? '#c084fc'
                                    : '#f87171',
                              }}
                            >
                              {step.agent}:
                            </span>
                            <span className={statusColor}>{statusLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ====================================================================
                  Travelling Digital Agent & Physical Packet Delivery in Universe
                  ==================================================================== */}
              {(isLocomotionPlaying || locomotionProgress > 0) && (
                <div className="hsx-travelling-agent-container">
                  <div
                    className="hsx-travelling-agent"
                    style={{
                      left: `${(currentCoords.x / 1000) * 100}%`,
                      top: `${(currentCoords.y / 580) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${bankingAngle}deg)`,
                    }}
                  >
                    {activeRelayStep.agent === 'scout' && (
                      <ScoutCharacter
                        state={locomotionStage === 'pickup' ? 'pickup' : 'travelling'}
                        carryingPacket={locomotionProgress >= 0.14 && locomotionProgress <= 0.96}
                        packetColor="blue"
                        size={80}
                        reducedMotion={prefersReducedMotion}
                      />
                    )}
                    {activeRelayStep.agent === 'nexus' && (
                      <NexusCharacter
                        state={locomotionStage === 'pickup' ? 'pickup' : 'travelling'}
                        carryingPacket={locomotionProgress >= 0.14 && locomotionProgress <= 0.96}
                        packetColor="cyan"
                        size={80}
                        reducedMotion={prefersReducedMotion}
                      />
                    )}
                    {activeRelayStep.agent === 'oracle' && (
                      <OracleCharacter
                        state={locomotionStage === 'pickup' ? 'pickup' : 'travelling'}
                        carryingPacket={locomotionProgress >= 0.14 && locomotionProgress <= 0.96}
                        packetColor="purple"
                        size={80}
                        reducedMotion={prefersReducedMotion}
                      />
                    )}
                    {activeRelayStep.agent === 'sentinel' && (
                      <SentinelCharacter
                        state={locomotionStage === 'pickup' ? 'pickup' : 'travelling'}
                        carryingPacket={locomotionProgress >= 0.14 && locomotionProgress <= 0.96}
                        packetColor="red"
                        size={80}
                        reducedMotion={prefersReducedMotion}
                      />
                    )}

                    {/* Glowing Data Packet Capsule */}
                    {locomotionProgress >= 0.14 && locomotionProgress <= 0.96 && (
                      <div
                        className="hsx-packet-capsule"
                        style={{
                          borderColor:
                            activeRelayStep.color === 'blue'
                              ? '#3b82f6'
                              : activeRelayStep.color === 'cyan'
                              ? '#00e5ff'
                              : activeRelayStep.color === 'purple'
                              ? '#a855f7'
                              : '#ef4444',
                          color:
                            activeRelayStep.color === 'blue'
                              ? '#60a5fa'
                              : activeRelayStep.color === 'cyan'
                              ? '#67e8f9'
                              : activeRelayStep.color === 'purple'
                              ? '#c084fc'
                              : '#f87171',
                          boxShadow: `0 0 10px ${
                            activeRelayStep.color === 'blue'
                              ? 'rgba(59,130,246,0.5)'
                              : activeRelayStep.color === 'cyan'
                              ? 'rgba(0,229,255,0.5)'
                              : activeRelayStep.color === 'purple'
                              ? 'rgba(168,85,247,0.5)'
                              : 'rgba(239,68,68,0.5)'
                          }`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>PKT #{activeRelayStep.agent.toUpperCase()} • {locomotionStage.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Stage Locomotion & VCR Control Strip */}
          <div className="relative z-30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
            {/* Left: VCR Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLocomotionPlaying(!isLocomotionPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                title="Toggle Physical Agent Locomotion [Space]"
              >
                {isLocomotionPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isLocomotionPlaying ? 'PAUSE TRANSIT' : locomotionProgress > 0 ? 'RESUME TRANSIT' : 'RUN LOCOMOTION'}</span>
              </button>

              <button
                onClick={() => {
                  const next = progressRef.current + 0.15;
                  if (next >= 1.0) {
                    progressRef.current = 0.05;
                    setRelayAgentIndex((p) => (p + 1) % relayChain.length);
                    setActiveStageStepIndex((p) => (p + 1) % 4);
                    setLocomotionProgress(0.05);
                    setLocomotionStage('approaching');
                  } else {
                    progressRef.current = next;
                    setLocomotionProgress(next);
                    if (next < 0.14) setLocomotionStage('approaching');
                    else if (next < 0.26) setLocomotionStage('pickup');
                    else if (next < 0.78) setLocomotionStage('travelling');
                    else if (next < 0.88) setLocomotionStage('waiting');
                    else if (next < 0.96) setLocomotionStage('delivering');
                    else setLocomotionStage('confirmed');
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs"
                title="Step Forward (+15%)"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setLocomotionSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-cyan-300 text-xs font-bold"
                title="Toggle Speed (1X, 2X, 0.5X)"
              >
                {locomotionSpeed}X
              </button>

              <button
                onClick={() => {
                  progressRef.current = 0;
                  setIsLocomotionPlaying(false);
                  setLocomotionProgress(0);
                  setLocomotionStage('ready');
                  setRelayAgentIndex(0);
                  setActiveStageStepIndex(0);
                  setIsReplayingHistorical(false);
                  setRelayRunId(`RUN-${Date.now().toString(36).toUpperCase()}`);
                  runStartedAtRef.current = new Date().toISOString();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white"
                title="Reset Locomotion to Origin"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsDevDiagnosticsOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                  isDevDiagnosticsOpen
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
                title="Toggle Developer Diagnostics HUD [H]"
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>DEV HUD</span>
              </button>
            </div>

            {/* Middle: Compact Relay Status Indicator (Milestone 53) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono" data-testid="compact-relay-status-indicator">
              {/* Mode Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${
                isDemoMode
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  : isReplayingHistorical
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                  : streamConnectionState === 'connected'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                MODE: {isDemoMode ? 'DEMO' : isReplayingHistorical ? 'REPLAY' : streamConnectionState === 'connected' ? 'LIVE' : 'STANDBY'}
              </span>

              {/* State: RUNNING / PAUSED / READY */}
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                isLocomotionPlaying
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : locomotionProgress > 0
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isLocomotionPlaying ? 'bg-emerald-400 animate-ping' : locomotionProgress > 0 ? 'bg-amber-400' : 'bg-slate-500'
                }`} />
                STATUS: {isLocomotionPlaying ? 'RUNNING' : locomotionProgress > 0 ? 'PAUSED' : 'READY'}
              </span>

              <span className="text-slate-500">•</span>

              {/* Carrier Agent */}
              <span className="text-slate-400">CARRIER:</span>
              <span
                className="font-bold uppercase tracking-wider"
                style={{
                  color:
                    activeRelayStep.color === 'blue'
                      ? '#60a5fa'
                      : activeRelayStep.color === 'cyan'
                      ? '#67e8f9'
                      : activeRelayStep.color === 'purple'
                      ? '#c084fc'
                      : '#f87171',
                }}
              >
                {activeRelayStep.agent}
              </span>

              <span className="text-slate-500">•</span>

              {/* Stage */}
              <span className="text-slate-400">STAGE:</span>
              <span className="text-slate-200 font-semibold">
                {relayAgentIndex + 1}/4 ({locomotionStage.toUpperCase()})
              </span>

              <span className="text-slate-500">•</span>

              {/* Progress */}
              <span className="text-cyan-400 font-bold">{Math.round(locomotionProgress * 100)}%</span>

              <span className="text-slate-500">•</span>

              {/* Connection Stream */}
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  streamConnectionState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                NET: {streamConnectionState}
              </span>
            </div>

            {/* Right: Quick Action to Toggle Camera */}
            <button
              onClick={() => setCameraTarget((prev) => (prev === 'all' ? 'singularity' : 'all'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 text-xs hover:border-slate-500 transition-all font-mono"
              title="Toggle Camera View (Global Overview / Focused Core)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              {cameraTarget === 'all' ? 'FOCUS SINGULARITY' : 'OVERVIEW CAMERA'}
            </button>
          </div>
        </div>

        {/* Dedicated Agent & Territory Inspector (4 Columns on XL) */}
        <div className="xl:col-span-4 hsx-console-panel p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: selectedProfile.color }}
              />
              <h3 className="text-base font-bold text-white tracking-wider">
                {selectedProfile.name} // OBSERVATORY INSPECTOR
              </h3>
            </div>
            <span
              className="hsx-tag-badge"
              style={{
                backgroundColor: `${selectedProfile.color}20`,
                color: selectedProfile.color,
                border: `1px solid ${selectedProfile.color}50`,
              }}
            >
              {selectedRuntime.currentState}
            </span>
          </div>

          {/* Articulated Agent Display Banner */}
          <div className="flex items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            {selectedAgentId === 'scout' && (
              <ScoutCharacter state={selectedRuntime.currentState} size={120} />
            )}
            {selectedAgentId === 'nexus' && (
              <NexusCharacter state={selectedRuntime.currentState} size={120} />
            )}
            {selectedAgentId === 'oracle' && (
              <OracleCharacter state={selectedRuntime.currentState} size={120} />
            )}
            {selectedAgentId === 'sentinel' && (
              <SentinelCharacter state={selectedRuntime.currentState} size={120} />
            )}
          </div>

          {/* Agent Meta Details */}
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">DESIGNATION:</span>
              <p className="text-slate-200 font-semibold">{selectedProfile.designation}</p>
            </div>
            <div>
              <span className="text-slate-400">SYSTEM DOMAIN:</span>
              <p className="text-slate-200 font-semibold">{selectedProfile.systemDomain}</p>
            </div>
            <div>
              <span className="text-slate-400">OPERATIONAL TRAITS:</span>
              <p className="text-slate-300 italic">{selectedProfile.personality}</p>
            </div>
          </div>

          {/* Operational Metrics Counter */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block">COMPLETED</span>
              <span className="text-sm font-bold text-emerald-400">
                {selectedRuntime.tasksCompleted}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">PENDING</span>
              <span className="text-sm font-bold text-amber-400">
                {selectedRuntime.tasksPending}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">FAILED</span>
              <span className="text-sm font-bold text-red-400">
                {selectedRuntime.tasksFailed}
              </span>
            </div>
          </div>

          {/* Responsibilities */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400 block">
              CORE RESPONSIBILITIES:
            </span>
            <ul className="space-y-1 text-xs text-slate-300">
              {selectedProfile.responsibilities.slice(0, 3).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-cyan-400">▹</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deep link actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => onNavigateView('universe')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-all text-center"
            >
              TERRITORY VIEW
            </button>
            <button
              onClick={() => onNavigateView('hunts')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-all text-center"
            >
              AUDIT TELEMETRY
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. Contextual Event Journey Timeline & Defense Pipeline Scrubber
          ==================================================================== */}
      <div className="hsx-console-panel p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-widest">
              END-TO-END DEFENSE PIPELINE // EVENT JOURNEY SCRUBBER
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerReplay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-900/60 transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              REPLAY JOURNEY
            </button>

            {selectedJourney && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">EVENT ID:</span>
                <span className="text-cyan-400 font-bold">{selectedJourney.eventId}</span>
                <span className="text-slate-400 ml-2">SOURCE IP:</span>
                <button
                  onClick={() => handleInvestigateClick(selectedJourney.sourceIp)}
                  className="text-amber-300 hover:underline flex items-center gap-1 font-bold"
                >
                  {selectedJourney.sourceIp}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4-Stage Visual Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stage 1: SCOUT */}
          <div
            onClick={() => setActiveStageStepIndex(0)}
            className={`p-3.5 rounded-xl bg-slate-950/80 border transition-all cursor-pointer ${
              activeStageStepIndex === 0
                ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                : 'border-blue-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" /> 1. SENSOR DETECT
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">CONFIRMED</span>
            </div>
            <p className="text-xs text-slate-300">
              Honeypot handshake captured on Cowrie SSH listener port 2222.
            </p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
              <span>SCOUT Collector</span>
              <span>T+0.00s</span>
            </div>
          </div>

          {/* Stage 2: NEXUS */}
          <div
            onClick={() => setActiveStageStepIndex(1)}
            className={`p-3.5 rounded-xl bg-slate-950/80 border transition-all cursor-pointer ${
              activeStageStepIndex === 1
                ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                : 'border-cyan-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> 2. OUTBOX INGEST
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">COMMITTED</span>
            </div>
            <p className="text-xs text-slate-300">
              ACID transactional persistence in PostgreSQL 17 outbox queue.
            </p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
              <span>NEXUS Courier</span>
              <span>T+0.04s</span>
            </div>
          </div>

          {/* Stage 3: ORACLE */}
          <div
            onClick={() => setActiveStageStepIndex(2)}
            className={`p-3.5 rounded-xl bg-slate-950/80 border transition-all cursor-pointer ${
              activeStageStepIndex === 2
                ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'border-purple-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5" /> 3. INTEL & RISK
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">ATTRIBUTED</span>
            </div>
            <p className="text-xs text-slate-300">
              IOC correlation derived risk score 85.0 (HIGH) normalized to 8.5.
            </p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
              <span>ORACLE Analyst</span>
              <span>T+0.12s</span>
            </div>
          </div>

          {/* Stage 4: SENTINEL */}
          <div
            onClick={() => setActiveStageStepIndex(3)}
            className={`p-3.5 rounded-xl bg-slate-950/80 border transition-all cursor-pointer ${
              activeStageStepIndex === 3
                ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                : 'border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> 4. ALERT & DISPATCH
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">TRIAGED</span>
            </div>
            <p className="text-xs text-slate-300">
              Dispatched to SOC WebSocket stream and Android notifications.
            </p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
              <span>SENTINEL Bastion</span>
              <span>T+0.18s</span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. Live Priority Alert Notifications Stream
          ==================================================================== */}
      {criticalAlerts.length > 0 && (
        <div className="hsx-console-panel p-4 border border-red-500/30 bg-red-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400 animate-pulse" />
              <h4 className="text-xs font-bold text-red-300 tracking-wider">
                PRIORITY SOC INCIDENT STREAM ({criticalAlerts.length} CRITICAL ALERTS)
              </h4>
            </div>
            <button
              onClick={() => onNavigateView('alerts')}
              className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
            >
              VIEW ALL ALERTS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg bg-slate-950/90 border border-red-500/40 space-y-2 hover:border-red-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-red-300 border border-red-500/40">
                    {alert.severity}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'LIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2">
                  {alert.message || `Alert #${alert.id} on ${alert.alert_type}`}
                </p>
                <div className="pt-1 flex items-center justify-between border-t border-slate-800">
                  <button
                    onClick={() => {
                      const ipMatch = alert.message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                      if (ipMatch) handleInvestigateClick(ipMatch[0]);
                      else onNavigateView('cases');
                    }}
                    className="text-[10px] text-cyan-400 hover:underline font-bold flex items-center gap-1"
                  >
                    INVESTIGATE <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onNavigateView('cases')}
                    className="text-[10px] text-purple-400 hover:underline font-bold"
                  >
                    OPEN CASE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          5. Holographic Core Diagnostics Modal (Event Singularity Drilldown)
          ==================================================================== */}
      {isDiagnosticsModalOpen && (
        <div
          className="hsx-modal-backdrop"
          onClick={() => setIsDiagnosticsModalOpen(false)}
        >
          <div
            className="hsx-diagnostics-modal p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-widest">
                  EVENT SINGULARITY // CORE DIAGNOSTICS & TRUST VAULT
                </h3>
              </div>
              <button
                onClick={() => setIsDiagnosticsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">CORE STATE</span>
                <span className="text-cyan-400 font-bold text-sm">{coreState}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">OUTBOX SEQ</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {streamMetrics?.lastCursor ? `#${streamMetrics.lastCursor}` : isDemoMode ? '#DEMO-104' : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TOTAL INGEST</span>
                <span className="text-white font-bold text-sm">{totalAttacksCount} EVENTS</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ACTIVE ALERTS</span>
                <span className="text-red-400 font-bold text-sm">{activeAlertsCount}</span>
              </div>
            </div>

            {/* Subsystem Health Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> AUTHORIZED SUBSYSTEM HEALTH:
              </span>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Database className="w-3.5 h-3.5 text-blue-400" /> PostgreSQL 17
                  </span>
                  <span className={`font-bold text-[10px] uppercase ${
                    stats?.system_health?.postgresql?.toLowerCase() === 'connected' || stats?.system_health?.postgresql?.toLowerCase() === 'healthy'
                      ? 'text-emerald-400'
                      : stats?.system_health?.postgresql?.toLowerCase() === 'disconnected'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {stats?.system_health?.postgresql ? stats.system_health.postgresql.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Server className="w-3.5 h-3.5 text-red-400" /> Redis Outbox Bus
                  </span>
                  <span className={`font-bold text-[10px] uppercase ${
                    stats?.system_health?.redis?.toLowerCase() === 'connected' || stats?.system_health?.redis?.toLowerCase() === 'healthy'
                      ? 'text-emerald-400'
                      : stats?.system_health?.redis?.toLowerCase() === 'disconnected'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {stats?.system_health?.redis ? stats.system_health.redis.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-purple-400" /> WebSocket Stream
                  </span>
                  <span className="text-cyan-400 font-bold text-[10px] uppercase">
                    NET: {streamConnectionState}
                  </span>
                </div>
              </div>
            </div>

            {/* Operator Diagnostics Panel (Phase 7 & 8) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" /> OPERATOR VALIDATION & TELEMETRY AUDIT:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const diagnosticPayload = {
                      build_version: 'v1.0.0-rc5',
                      timestamp: new Date().toISOString(),
                      visualization_mode: isDemoMode ? 'DEMO SIMULATION' : isReplayingHistorical ? 'HISTORICAL REPLAY' : streamConnectionState === 'connected' ? 'LIVE STREAM' : 'STANDBY',
                      websocket_status: streamConnectionState,
                      last_outbox_cursor: streamMetrics?.lastCursor ?? (isDemoMode ? 104 : null),
                      last_event_id: activePackets?.[0]?.eventId ?? (attacks?.[0]?.id ? String(attacks[0].id) : 'NONE'),
                      last_transfer_id: activePackets?.[0]?.transferId ?? (isDemoMode ? 'tr_relay_001' : 'NONE'),
                      active_couriers: (activePackets?.length ?? 0) > 0 ? activePackets!.length : (isLocomotionPlaying ? 1 : 0),
                      pending_visual_transfers: streamMetrics?.queuedTransfers ?? 0,
                      failed_transfers: failedPackets?.length ?? 0,
                      selected_agent: selectedAgentId.toUpperCase(),
                      animation_state: isLocomotionPlaying ? `LOCOMOTION (${locomotionStage.toUpperCase()})` : 'PAUSED',
                      source_node: `quadrant:${relayChain[relayAgentIndex]?.agent ?? 'scout'}`,
                      destination_node: 'singularity:core',
                      service_health: serviceHealthMetrics.label,
                      subsystems: {
                        api: stats?.system_health?.api ?? 'healthy',
                        postgresql: stats?.system_health?.postgresql ?? 'unknown',
                        redis: stats?.system_health?.redis ?? 'unknown',
                      },
                      last_frontend_error: 'NONE (ALL SYSTEMS NOMINAL)',
                    };
                    navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
                    setCopiedDiagnostics(true);
                    setTimeout(() => setCopiedDiagnostics(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-colors"
                >
                  {copiedDiagnostics ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      COPIED TO CLIPBOARD
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-cyan-400" />
                      COPY SANITIZED DIAGNOSTICS
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">BUILD VERSION</span>
                  <span className="text-white font-bold">v1.0.0-rc5</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">OPERATING MODE</span>
                  <span className="text-amber-400 font-bold truncate block">
                    {isDemoMode ? 'DEMO SIMULATION' : isReplayingHistorical ? 'HISTORICAL REPLAY' : streamConnectionState === 'connected' ? 'LIVE STREAM' : 'STANDBY'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">WS STREAM STATE</span>
                  <span className="text-cyan-400 font-bold uppercase">{streamConnectionState}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">LAST OUTBOX CURSOR</span>
                  <span className="text-emerald-400 font-bold">
                    {streamMetrics?.lastCursor ? `#${streamMetrics.lastCursor}` : isDemoMode ? '#DEMO-104' : 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">LAST RECEIVED EVENT</span>
                  <span className="text-slate-200 font-bold truncate block">
                    {activePackets?.[0]?.eventId ?? (attacks?.[0]?.id ? `evt_${attacks[0].id}` : 'NONE')}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">LAST TRANSFER ID</span>
                  <span className="text-purple-400 font-bold truncate block">
                    {activePackets?.[0]?.transferId ?? (isDemoMode ? 'tr_relay_001' : 'NONE')}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">ACTIVE COURIERS</span>
                  <span className="text-cyan-300 font-bold">
                    {(activePackets?.length ?? 0) > 0 ? activePackets!.length : (isLocomotionPlaying ? 1 : 0)} COURIER(S)
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">PENDING TRANSFERS</span>
                  <span className="text-amber-400 font-bold">
                    {streamMetrics?.queuedTransfers ?? 0} PENDING
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">FAILED TRANSFERS</span>
                  <span className="text-red-400 font-bold">
                    {failedPackets?.length ?? 0} FAILED
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">SELECTED AGENT</span>
                  <span className="text-blue-400 font-bold uppercase">{selectedAgentId}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">ANIMATION STATE</span>
                  <span className="text-emerald-400 font-bold">
                    {isLocomotionPlaying ? `ACTIVE (${locomotionStage.toUpperCase()})` : 'PAUSED'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">ROUTING TOPOLOGY</span>
                  <span className="text-slate-300 font-bold truncate block">
                    quadrant:{relayChain[relayAgentIndex]?.agent ?? 'scout'} &rarr; singularity:core
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => {
                  setIsDiagnosticsModalOpen(false);
                  onNavigateView('alerts');
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-slate-200 border border-slate-700 hover:border-slate-500"
              >
                OPEN ALERTS CONSOLE
              </button>
              <button
                onClick={() => {
                  setIsDiagnosticsModalOpen(false);
                  onNavigateView('hunts');
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
              >
                OPEN THREAT HUNTING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. Guided Universe 2.0 Showcase Tour Modal (Milestone 19.3)
          ==================================================================== */}
      {isShowcaseGuideOpen && (
        <div
          className="hsx-modal-backdrop"
          onClick={() => setIsShowcaseGuideOpen(false)}
        >
          <div
            className="hsx-diagnostics-modal p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-widest">
                  UNIVERSE 2.0 // GUIDED OPERATOR DEMONSTRATION SHOWCASE
                </h3>
              </div>
              <button
                onClick={() => setIsShowcaseGuideOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Showcase Overview */}
            <p className="text-xs text-slate-300 leading-relaxed">
              Welcome to the flagship <span className="text-cyan-400 font-bold">HoneyShield X Universe 2.0</span> command center.
              This interactive environment visualizes SOC operational telemetry, 4-agent physical locomotion along Quadratic Bézier conduits, and outbox stream synchronization.
            </p>

            {/* Showcase 4-Grid Feature Tour */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <Radio className="w-4 h-4" /> 1. SCOUT // SENSOR FRONTIER
                </div>
                <p className="text-[11px] text-slate-400">
                  Located in the Top-Left quadrant (220, 200). Blue aerostat drone executes 360° radar sweeps, captures honeypot probes, and initiates the collection lifecycle.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Cpu className="w-4 h-4" /> 2. NEXUS // PROCESSING CORE
                </div>
                <p className="text-[11px] text-slate-400">
                  Located in the Top-Right quadrant (980, 200). Bipedal neural platform normalizes telemetry, binds ECS schemas, and commits immutable events to the transactional outbox.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <BrainCircuit className="w-4 h-4" /> 3. ORACLE // INTELLIGENCE SANCTUM
                </div>
                <p className="text-[11px] text-slate-400">
                  Located in the Bottom-Right quadrant (980, 640). Floating ocular prism cross-references indicators with STIX/TAXII threat intel and calculates contextual risk scores.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-red-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <Shield className="w-4 h-4" /> 4. SENTINEL // RESPONSE BASTION
                </div>
                <p className="text-[11px] text-slate-400">
                  Located in the Bottom-Left quadrant (220, 640). Armored walker verifies confirmed SOC alerts and activates defensive forcefield containment boundaries.
                </p>
              </div>
            </div>

            {/* Quick Operator Shortcuts & Controls */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-200 block">
                OPERATOR KEYBOARD CONTROLS & SHORTCUTS:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold block">SPACE</span>
                  <span className="text-slate-400">Run / Pause Locomotion</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold block">KEY D</span>
                  <span className="text-slate-400">Toggle Demo Simulation</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold block">KEY C / 5</span>
                  <span className="text-slate-400">Core Diagnostics & Outbox</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold block">KEYS 0 - 4</span>
                  <span className="text-slate-400">Camera Focus Presets</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">ESC</kbd> to close guide
              </span>
              <button
                onClick={() => setIsShowcaseGuideOpen(false)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all"
              >
                ENTER UNIVERSE SHOWCASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
