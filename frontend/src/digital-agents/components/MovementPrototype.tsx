import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AgentId, AgentAnimationState, PacketColor, DataPacketPayload } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Server,
  Database,
  FastForward,
} from 'lucide-react';

interface MovementPrototypeProps {
  onSelectPacket?: (packet: DataPacketPayload) => void;
  reducedMotion?: boolean;
  activeLivePacket?: DataPacketPayload | null;
  isLiveMode?: boolean;
}

export type MovementStage =
  | 'ready'
  | 'approaching'
  | 'pickup'
  | 'travelling'
  | 'waiting'
  | 'delivering'
  | 'confirmed'
  | 'failed';

export const MovementPrototype: React.FC<MovementPrototypeProps> = ({
  onSelectPacket,
  reducedMotion = false,
  activeLivePacket = null,
  isLiveMode = false,
}) => {
  // Demo Configuration State
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('nexus');
  const [selectedPacketColor, setSelectedPacketColor] = useState<PacketColor>('cyan');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [isMultiAgentRelay, setIsMultiAgentRelay] = useState<boolean>(false);
  const [relayStageIndex, setRelayStageIndex] = useState<number>(0);

  // Animation Engine State
  const [stage, setStage] = useState<MovementStage>('ready');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // 0.0 to 1.0 along the path

  // SVG Path Reference for exact mathematical coordinate calculation
  const pathRef = useRef<SVGPathElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Active Multi-Agent Chain Configuration
  const relayChain: Array<{ agent: AgentId; color: PacketColor; from: string; to: string }> = [
    { agent: 'scout', color: 'blue', from: 'Sensors & Honeypots', to: 'Ingestion Gateway' },
    { agent: 'nexus', color: 'cyan', from: 'Ingestion Gateway', to: 'PostgreSQL Outbox' },
    { agent: 'oracle', color: 'purple', from: 'Detection Engine', to: 'Threat Intel Store' },
    { agent: 'sentinel', color: 'red', from: 'Confirmed Alerts', to: 'SOC Emergency Response' },
  ];

  const currentRelayStep = relayChain[relayStageIndex];
  const activeAgentId = (isLiveMode && activeLivePacket)
    ? activeLivePacket.assignedAgent
    : isMultiAgentRelay
    ? currentRelayStep.agent
    : selectedAgent;
  const activeColor = (isLiveMode && activeLivePacket)
    ? activeLivePacket.color
    : isMultiAgentRelay
    ? currentRelayStep.color
    : selectedPacketColor;
  const profile = AGENT_PROFILES[activeAgentId];
  const CharacterAvatar = AgentCharacterMap[activeAgentId];

  // Source & Destination Labels
  const sourceNodeLabel = (isLiveMode && activeLivePacket)
    ? activeLivePacket.sourceNode
    : isMultiAgentRelay
    ? currentRelayStep.from
    : activeAgentId === 'scout'
    ? 'Honeypot Sensor Grid'
    : activeAgentId === 'nexus'
    ? 'Ingestion API Gateway'
    : activeAgentId === 'oracle'
    ? 'Attack Detection Core'
    : 'Confirmed Alert Evaluator';

  const destNodeLabel = (isLiveMode && activeLivePacket)
    ? activeLivePacket.destinationNode
    : isMultiAgentRelay
    ? currentRelayStep.to
    : activeAgentId === 'scout'
    ? 'Ingestion API Gateway'
    : activeAgentId === 'nexus'
    ? 'PostgreSQL Event Outbox'
    : activeAgentId === 'oracle'
    ? 'Threat Intelligence Store'
    : 'SOC Push & Governor Console';

  // Construct Active Packet (Live or Demo)
  const currentPacket: DataPacketPayload = (isLiveMode && activeLivePacket)
    ? {
        ...activeLivePacket,
        progressPercent: Math.round(progress * 100),
        status:
          stage === 'confirmed'
            ? 'delivered'
            : stage === 'failed'
            ? 'failed'
            : stage === 'travelling'
            ? 'in_transit'
            : 'waiting',
      }
    : {
        eventId: `PKT-${activeAgentId.toUpperCase()}-${Math.floor(progress * 1000)}`,
        transferId: `TR-DEMO-${activeAgentId.toUpperCase()}`,
        sourceNode: sourceNodeLabel,
        destinationNode: destNodeLabel,
        assignedAgent: activeAgentId,
        eventType:
          activeColor === 'blue'
            ? 'sensor.canary_tripped'
            : activeColor === 'cyan'
            ? 'queue.event_persisted'
            : activeColor === 'purple'
            ? 'intel.ioc_correlated'
            : activeColor === 'red'
            ? 'alert.soc_dispatched'
            : 'delivery.confirmed',
        severity: activeColor === 'red' ? 'critical' : activeColor === 'purple' ? 'high' : 'medium',
        color: activeColor,
        timestamp: new Date().toISOString(),
        status:
          stage === 'confirmed'
            ? 'delivered'
            : stage === 'failed'
            ? 'failed'
            : stage === 'travelling'
            ? 'in_transit'
            : 'waiting',
        progressPercent: Math.round(progress * 100),
        metadata: {
          sourceIp: '198.51.100.99',
          ruleName: 'SSH Brute-Force Sliding Window Rule',
          failureReason: stage === 'failed' ? 'Simulated Connection Timeout' : undefined,
        },
      };

  // Trigger animation when new live packet arrives in Live Mode
  useEffect(() => {
    if (isLiveMode && activeLivePacket) {
      setProgress(0);
      setStage('ready');
      setIsPlaying(true);
    }
  }, [isLiveMode, activeLivePacket?.eventId]);

  // Map Movement Stage to Character Animation State
  const characterAnimationState: AgentAnimationState =
    stage === 'ready'
      ? 'idle'
      : stage === 'approaching'
      ? 'observing'
      : stage === 'pickup'
      ? 'pickup'
      : stage === 'travelling'
      ? 'travelling'
      : stage === 'waiting'
      ? 'waiting'
      : stage === 'delivering'
      ? 'delivering'
      : stage === 'confirmed'
      ? 'success'
      : 'failed';

  // Animation Loop using requestAnimationFrame
  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Rate of progress along curve (approx 4 seconds for full trip at 1x speed)
      const speedMultiplier = playbackSpeed * 0.28;

      setProgress((prevProgress) => {
        const nextProgress = prevProgress + deltaTime * speedMultiplier;

        // Stage Transitions along path
        if (nextProgress < 0.12) {
          setStage('approaching');
        } else if (nextProgress < 0.22) {
          setStage('pickup');
        } else if (nextProgress < 0.78) {
          setStage('travelling');
        } else if (nextProgress < 0.88) {
          setStage('waiting');
        } else if (nextProgress < 0.98) {
          setStage(simulateFailure ? 'failed' : 'delivering');
        } else {
          // Trip Complete
          setStage(simulateFailure ? 'failed' : 'confirmed');
          setIsPlaying(false);

          // Handle Multi-Agent Relay Handoff Progression
          if (isMultiAgentRelay && !simulateFailure) {
            setTimeout(() => {
              setRelayStageIndex((prevIndex) => {
                const nextIdx = (prevIndex + 1) % relayChain.length;
                setProgress(0);
                setStage('ready');
                setIsPlaying(true);
                return nextIdx;
              });
            }, 1200);
          }
          return 1.0;
        }

        return nextProgress;
      });

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [playbackSpeed, simulateFailure, isPlaying, isMultiAgentRelay, relayChain.length]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      animFrameRef.current = requestAnimationFrame(animate);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, animate]);

  // VCR Action Handlers
  const handleStart = () => {
    if (progress >= 1.0) {
      setProgress(0);
      setStage('ready');
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleResume = () => {
    if (progress < 1.0) {
      setIsPlaying(true);
    } else {
      handleStart();
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setStage('ready');
    if (isMultiAgentRelay) {
      setRelayStageIndex(0);
    }
  };

  // Compute Coordinates along SVG Bézier Curve
  const getCoordinates = (p: number) => {
    if (!pathRef.current) {
      // Linear interpolation fallback if path not mounted yet
      return { x: 150 + p * 700, y: 225 };
    }
    try {
      const totalLen = pathRef.current.getTotalLength();
      const point = pathRef.current.getPointAtLength(p * totalLen);
      return { x: point.x, y: point.y };
    } catch {
      return { x: 150 + p * 700, y: 225 };
    }
  };

  const currentCoords = getCoordinates(progress);

  // Packet Hex Colors
  const packetHex =
    activeColor === 'blue'
      ? '#3B82F6'
      : activeColor === 'cyan'
      ? '#00E5FF'
      : activeColor === 'purple'
      ? '#A855F7'
      : activeColor === 'red'
      ? '#EF4444'
      : '#10B981';

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Banner & Mode Indicators */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              FUNCTIONAL CHARACTER MOVEMENT PROTOTYPE
            </h2>
            {isLiveMode ? (
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                LIVE STREAM
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest animate-pulse">
                DEMO MODE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real physical translation of digital agents carrying active data packets along curved pipeline routes
          </p>
        </div>

        {/* Multi-Agent Relay Toggle */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <span className="text-slate-400">Workflow:</span>
          <button
            onClick={() => {
              setIsMultiAgentRelay(!isMultiAgentRelay);
              handleReset();
            }}
            className={`px-3 py-1 rounded font-bold transition-all ${
              isMultiAgentRelay
                ? 'bg-purple-600 text-white shadow-nexus-purple'
                : 'bg-cyan-600 text-white shadow-nexus-cyan'
            }`}
          >
            {isMultiAgentRelay ? '4-Agent Chain Relay' : 'Single Character'}
          </button>
        </div>
      </div>

      {/* Main Movement Canvas Area (1000 x 440 Responsive SVG) */}
      <div className="relative p-6 rounded-2xl bg-[#060a18]/95 border border-cyan-500/30 shadow-[0_0_30px_rgba(0,229,255,0.15)] overflow-hidden">
        {/* Subtle Cyber Grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

        {/* Real-time Status Overlay HUD */}
        <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between text-xs pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: profile.color }}
            />
            <span className="font-bold text-white">Active Agent:</span>
            <span style={{ color: profile.color }} className="font-extrabold uppercase">
              {profile.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Phase:</span>
            <span className="text-cyan-300 uppercase font-bold">{stage}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
            <span className="text-slate-400">Route Progress:</span>
            <span className="text-emerald-400 font-bold">{Math.round(progress * 100)}%</span>
            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden ml-1">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{ width: `${progress * 100}%`, backgroundColor: profile.color }}
              />
            </div>
          </div>
        </div>

        {/* SVG Movement World */}
        <svg
          viewBox="0 0 1000 440"
          className="w-full h-auto select-none overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for Route & Glow */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#00E5FF" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#A855F7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
            </linearGradient>

            <filter id="protoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Curved Bézier Movement Path */}
          <path
            ref={pathRef}
            id="travel-curve"
            d="M 160 220 C 350 110, 650 330, 840 220"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeDasharray="8 6"
            className={!reducedMotion && isPlaying ? 'animate-pulse' : ''}
          />

          {/* Source Node Landmark */}
          <g transform="translate(160, 220)">
            <circle cx="0" cy="0" r="46" fill="#0c1328" stroke="#3B82F6" strokeWidth="2.5" filter="url(#protoGlow)" />
            <circle cx="0" cy="0" r="32" fill="#060914" stroke="#1E3A8A" strokeWidth="1.5" />
            <Server x="-14" y="-14" className="w-7 h-7 text-blue-400" />
            <text x="0" y="62" fill="#94A3B8" fontSize="12" textAnchor="middle" fontWeight="bold">
              SOURCE
            </text>
            <text x="0" y="76" fill="#CBD5E1" fontSize="10" textAnchor="middle">
              {sourceNodeLabel}
            </text>
          </g>

          {/* Destination Node Landmark */}
          <g transform="translate(840, 220)">
            <circle
              cx="0"
              cy="0"
              r="46"
              fill="#0c1328"
              stroke={stage === 'confirmed' ? '#10B981' : stage === 'failed' ? '#EF4444' : '#EF4444'}
              strokeWidth="2.5"
              filter="url(#protoGlow)"
            />
            <circle cx="0" cy="0" r="32" fill="#060914" stroke="#7F1D1D" strokeWidth="1.5" />
            <Database x="-14" y="-14" className="w-7 h-7 text-red-400" />
            <text x="0" y="62" fill="#94A3B8" fontSize="12" textAnchor="middle" fontWeight="bold">
              DESTINATION
            </text>
            <text x="0" y="76" fill="#CBD5E1" fontSize="10" textAnchor="middle">
              {destNodeLabel}
            </text>
          </g>

          {/* Individual Movement Style Effects behind Agent */}
          {!reducedMotion && isPlaying && (
            <g transform={`translate(${currentCoords.x}, ${currentCoords.y})`}>
              {/* SCOUT: Quick Scanning Cones */}
              {activeAgentId === 'scout' && (
                <polygon
                  points="0,-10 -60,-40 -60,20"
                  fill="#3B82F6"
                  opacity="0.18"
                  className="animate-pulse pointer-events-none"
                />
              )}

              {/* NEXUS: Cyan Data Courier Particle Trail */}
              {activeAgentId === 'nexus' && (
                <>
                  <circle cx="-35" cy="5" r="5" fill="#00E5FF" opacity="0.6" filter="url(#protoGlow)" />
                  <circle cx="-55" cy="10" r="3" fill="#00E5FF" opacity="0.4" />
                  <circle cx="-75" cy="15" r="2" fill="#00E5FF" opacity="0.2" />
                </>
              )}

              {/* ORACLE: Holographic Shimmer Aura */}
              {activeAgentId === 'oracle' && (
                <ellipse
                  cx="0"
                  cy="0"
                  rx="48"
                  ry="24"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.5"
                  className="animate-spin origin-center"
                />
              )}

              {/* SENTINEL: Restrained Hazard Pulse */}
              {activeAgentId === 'sentinel' && (
                <circle
                  cx="0"
                  cy="0"
                  r="52"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                  opacity="0.4"
                  className="animate-ping"
                />
              )}
            </g>
          )}

          {/* THE PHYSICALLY MOVING ROBOT BODY */}
          <g
            transform={`translate(${currentCoords.x - 45}, ${currentCoords.y - 55})`}
            className="cursor-pointer transition-transform"
            onClick={() => onSelectPacket?.(currentPacket)}
          >
            {/* The Character Model */}
            <foreignObject width="90" height="110">
              <div className="w-full h-full flex items-center justify-center">
                <CharacterAvatar
                  state={characterAnimationState}
                  carryingPacket={progress > 0.18 && progress < 0.95}
                  packetColor={activeColor}
                  size={75}
                  reducedMotion={reducedMotion}
                />
              </div>
            </foreignObject>
          </g>

          {/* Glowing Data Packet (Pickup Location before pickup) */}
          {progress <= 0.18 && (
            <g
              transform="translate(230, 210)"
              filter="url(#protoGlow)"
              className="cursor-pointer"
              onClick={() => onSelectPacket?.(currentPacket)}
            >
              <rect x="-14" y="-14" width="28" height="28" rx="6" fill={packetHex} stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
              <text x="0" y="26" fill="#CBD5E1" fontSize="10" textAnchor="middle">
                DATA PACKET
              </text>
            </g>
          )}

          {/* Delivered Data Packet at Destination (after delivery) */}
          {progress >= 0.95 && (
            <g
              transform="translate(770, 210)"
              filter="url(#protoGlow)"
              className="cursor-pointer"
              onClick={() => onSelectPacket?.(currentPacket)}
            >
              <rect
                x="-14"
                y="-14"
                width="28"
                height="28"
                rx="6"
                fill={stage === 'failed' ? '#EF4444' : '#10B981'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
              <text x="0" y="26" fill={stage === 'failed' ? '#F87171' : '#6EE7B7'} fontSize="10" textAnchor="middle">
                {stage === 'failed' ? 'FAILED' : 'DELIVERED'}
              </text>
            </g>
          )}
        </svg>

        {/* Interactive Attached Packet Callout Ribbon */}
        <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Attached Packet:</span>
            <span
              onClick={() => onSelectPacket?.(currentPacket)}
              className="font-bold underline cursor-pointer hover:text-white flex items-center gap-1"
              style={{ color: packetHex }}
            >
              <span>{currentPacket.eventType}</span>
              <span className="text-[10px] text-slate-400">(#{currentPacket.eventId})</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Click packet or moving agent to inspect metadata in Transfer Inspector</span>
          </div>
        </div>
      </div>

      {/* VCR & Simulation Controls Console */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 font-mono">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          {/* Play / Pause / Resume / Reset VCR Buttons */}
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={progress > 0 && progress < 1.0 ? handleResume : handleStart}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{progress > 0 && progress < 1.0 ? 'Resume' : 'Start Movement'}</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Movement</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
              title="Reset Agent to Source"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed:</span>
            </span>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Simulated Failure Toggle */}
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded border-slate-700 text-red-500 focus:ring-red-400 bg-slate-900"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Simulate Failure Path</span>
              </span>
            </label>
          </div>
        </div>

        {/* Character & Packet Selection Controls (When in Single Agent Mode) */}
        {!isMultiAgentRelay && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Agent Selector */}
            <div className="space-y-1.5">
              <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                Select Active Carrier Agent:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['scout', 'nexus', 'oracle', 'sentinel'] as AgentId[]).map((agentId) => {
                  const p = AGENT_PROFILES[agentId];
                  const isCur = selectedAgent === agentId;
                  return (
                    <button
                      key={agentId}
                      onClick={() => {
                        setSelectedAgent(agentId);
                        handleReset();
                      }}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isCur
                          ? 'bg-slate-900 border-white text-white font-bold ring-1 ring-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-bold">{p.name}</span>
                      <span className="text-[9px] text-slate-500 block truncate">{p.designation.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packet Type / Color Selector */}
            <div className="space-y-1.5">
              <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                Select Carried Packet Type:
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { color: 'blue' as PacketColor, label: 'Sensor', hex: '#3B82F6' },
                  { color: 'cyan' as PacketColor, label: 'Process', hex: '#00E5FF' },
                  { color: 'purple' as PacketColor, label: 'Intel', hex: '#A855F7' },
                  { color: 'red' as PacketColor, label: 'Alert', hex: '#EF4444' },
                  { color: 'green' as PacketColor, label: 'Confirm', hex: '#10B981' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => setSelectedPacketColor(item.color)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedPacketColor === item.color
                        ? 'bg-slate-900 border-white text-white font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full mx-auto block mb-1" style={{ backgroundColor: item.hex }} />
                    <span className="text-[10px] block">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4-Agent Relay Progression Indicator (When in Chain Mode) */}
        {isMultiAgentRelay && (
          <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/30 space-y-2">
            <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider block">
              Multi-Agent Chain Relay Workflow (SCOUT → NEXUS → ORACLE → SENTINEL):
            </span>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              {relayChain.map((step, idx) => {
                const isStepActive = idx === relayStageIndex;
                const isPast = idx < relayStageIndex;
                const p = AGENT_PROFILES[step.agent];

                return (
                  <div
                    key={step.agent}
                    className={`p-2 rounded-lg border transition-all ${
                      isStepActive
                        ? 'bg-purple-950/80 border-purple-400 text-white font-bold ring-1 ring-purple-400'
                        : isPast
                        ? 'bg-slate-950 text-emerald-400 border-slate-800'
                        : 'bg-slate-950/40 text-slate-500 border-slate-900'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold" style={{ color: p.color }}>
                      Step {idx + 1}: {p.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">{step.from} → {step.to}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
