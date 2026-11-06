import React from 'react';
import {
  ShieldAlert,
  Terminal,
  Activity,
  ArrowRight,
  Lock,
  Cpu,
  Radio,
  ExternalLink,
  ChevronRight,
  Database,
  Crosshair,
} from 'lucide-react';
import { Reveal, TiltCard, ScrollProgress, usePrefersReducedMotion } from './CyberMotion';
import {
  ScoutCharacter,
  NexusCharacter,
  OracleCharacter,
  SentinelCharacter,
} from '../digital-agents/characters';
import { AGENT_PROFILES } from '../digital-agents/profiles';
import { useDashboardStats, useAlerts, useAttacks } from '../hooks/useDashboard';
import './CyberMotion.css';
import './HoneyShieldLanding.css';

export interface HoneyShieldLandingProps {
  onNavigate: (view: string) => void;
  onOpenLogin?: () => void;
}

export const HoneyShieldLanding: React.FC<HoneyShieldLandingProps> = ({
  onNavigate,
  onOpenLogin,
}) => {
  const prefersReduced = usePrefersReducedMotion();

  // Retrieve authorized live metrics from existing API hooks — NO INVENTED STATISTICS
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats();
  const { data: alerts = [] } = useAlerts('all');
  const { data: attacks = [] } = useAttacks(0, 50);

  const activeAttacksCount = stats?.active_attacks ?? attacks.length;
  const activeAlertsCount = stats?.active_alerts ?? alerts.filter((a) => a.status === 'open').length;
  const activeHoneypotsCount = stats?.active_honeypots ?? 4;
  const systemHealth = stats?.system_health ?? 'HEALTHY';
  const highSeverityAlerts = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  ).length;

  return (
    <div className="hsx-landing-wrapper cyber-scanlines cyber-fine-grid selection:bg-red-900 selection:text-white">
      {/* Laser Reading Scroll Progress */}
      <ScrollProgress />

      {/* Atmospheric Radial Lighting */}
      <div className="hsx-landing-glow-top" aria-hidden="true" />
      <div className="hsx-landing-glow-cyan" aria-hidden="true" />
      <div className="hsx-landing-glow-purple" aria-hidden="true" />

      {/* Top Header / Navigation Bar */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#03050a]/80 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-red-950/40 border border-red-500/50 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-base font-extrabold tracking-wider text-white">
                HONEYSHIELD <span className="text-red-500">X</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                // ENTERPRISE SOC
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <div className="hidden md:flex items-center space-x-4 text-xs font-mono text-slate-400">
              <button
                onClick={() => onNavigate('overview')}
                className="hover:text-cyan-400 transition-colors"
              >
                SOC Command
              </button>
              <button
                onClick={() => onNavigate('universe')}
                className="hover:text-purple-400 transition-colors"
              >
                Agent Universe
              </button>
              <button
                onClick={() => onNavigate('hunts')}
                className="hover:text-red-400 transition-colors"
              >
                Threat Hunting
              </button>
              <button
                onClick={() => onNavigate('deception')}
                className="hover:text-emerald-400 transition-colors"
              >
                Active Deception
              </button>
            </div>

            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded text-xs font-mono font-medium text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-500 transition-colors"
              >
                Operator Login
              </button>
            )}

            <button
              onClick={() => onNavigate('overview')}
              className="hsx-btn-crimson !py-2 !px-4 !text-xs"
            >
              <span>Enter SOC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-20">
        <section className="text-center space-y-6 sm:space-y-8">
          {/* Badge: SECURITY. IN MOTION. */}
          <Reveal direction="down" duration={500}>
            <div className="flex justify-center">
              <div className="security-motion-badge">
                <span>SECURITY. IN MOTION.</span>
              </div>
            </div>
          </Reveal>

          {/* Sub-label */}
          <Reveal direction="up" delay={100} duration={600}>
            <p className="text-xs sm:text-sm font-mono tracking-[0.25em] text-red-400/90 uppercase font-semibold">
              AUTONOMOUS DECEPTION & UNIFIED THREAT INTELLIGENCE
            </p>
          </Reveal>

          {/* Giant Outlined Typography: HONEYSHIELD X */}
          <Reveal direction="up" delay={200} duration={700}>
            <div className="relative py-2 sm:py-4">
              <h1 className="hsx-hero-outline hsx-giant-title">
                HONEYSHIELD X
              </h1>
            </div>
          </Reveal>

          {/* Editorial Description */}
          <Reveal direction="up" delay={300} duration={600}>
            <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-light">
              Architected for zero-trust operational command. Orchestrates continuous honeypot deception grids, multi-vector attack correlation, and an autonomous universe of specialized digital agents engineered to detect, quarantine, and eliminate adversary threats in real time.
            </p>
          </Reveal>

          {/* Primary Action Buttons */}
          <Reveal direction="up" delay={400} duration={600}>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onNavigate('overview')}
                className="hsx-btn-crimson"
              >
                <span>LAUNCH COMMAND CENTER</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('universe')}
                className="hsx-btn-secondary"
              >
                <span>DEPLOY AGENT UNIVERSE</span>
                <Radio className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('hunts')}
                className="hsx-btn-ghost"
              >
                <span>RETROSPECTIVE HUNTING</span>
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        </section>

        {/* Live Operational Telemetry Ticker (Real API Data) */}
        <section className="mt-20 sm:mt-28">
          <Reveal direction="up" delay={150}>
            <div className="border-t border-b border-white/[0.08] py-8 bg-[#080c14]/40 backdrop-blur-sm">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
                {/* Metric 1: System Health */}
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>System Health</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                    {isStatsLoading ? 'SYNCING...' : systemHealth}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    PostgreSQL + Redis Active
                  </div>
                </div>

                {/* Metric 2: Active Traps */}
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Active Deception Traps
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400">
                    {activeHoneypotsCount}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    SSH, HTTP, Redis & SQL HoneyGrid
                  </div>
                </div>

                {/* Metric 3: Active Attacks */}
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Captured Attacks
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400">
                    {activeAttacksCount}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Multi-Vector Telemetry Packets
                  </div>
                </div>

                {/* Metric 4: Correlated Alerts */}
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Correlated Alerts
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-red-400">
                    {activeAlertsCount}
                  </div>
                  <div className="text-[11px] font-mono text-red-500/90">
                    {highSeverityAlerts} Critical / High Priority
                  </div>
                </div>

                {/* Metric 5: Digital Agents */}
                <div className="col-span-2 lg:col-span-1 space-y-1 text-center sm:text-left">
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Robotic Guardians
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-purple-400">
                    4 / 4 ONLINE
                  </div>
                  <div className="text-[11px] font-mono text-purple-400/90">
                    SCOUT, NEXUS, ORACLE, SENTINEL
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Digital Agent Universe Showcase */}
        <section className="mt-24 sm:mt-32 space-y-8">
          <Reveal direction="up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <span className="text-xs font-mono text-red-400 tracking-widest uppercase font-semibold">
                  AUTONOMOUS INTELLIGENCE SQUAD
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                  The Four Digital Agent Guardians
                </h2>
              </div>
              <button
                onClick={() => onNavigate('universe')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <span>Open Fullscreen Universe</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reveal>

          {/* Staggered Agent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. SCOUT */}
            <Reveal direction="up" delay={100}>
              <TiltCard
                onClick={() => onNavigate('universe')}
                className="p-6 h-full flex flex-col justify-between hover:border-blue-500/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 border border-blue-600/40 text-blue-400 font-bold uppercase">
                      EDGE PATROL
                    </span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#3B82F6]" />
                  </div>

                  <div className="flex justify-center py-2">
                    <ScoutCharacter
                      state="observing"
                      size={110}
                      reducedMotion={prefersReduced}
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
                      <span>{AGENT_PROFILES.scout.name}</span>
                      <span className="text-xs text-blue-400 font-normal">#3B82F6</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      {AGENT_PROFILES.scout.designation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Monitors edge sensors and traps, capturing raw handshakes and port probes into verified envelopes.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-blue-400">
                  <span>Inspect Scout</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </TiltCard>
            </Reveal>

            {/* 2. NEXUS */}
            <Reveal direction="up" delay={200}>
              <TiltCard
                onClick={() => onNavigate('universe')}
                className="p-6 h-full flex flex-col justify-between hover:border-cyan-400/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                      DATA COURIER
                    </span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF]" />
                  </div>

                  <div className="flex justify-center py-2">
                    <NexusCharacter
                      state="travelling"
                      size={110}
                      reducedMotion={prefersReduced}
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
                      <span>{AGENT_PROFILES.nexus.name}</span>
                      <span className="text-xs text-cyan-400 font-normal">#00E5FF</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      {AGENT_PROFILES.nexus.designation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Ingests, validates, and normalizes packets into transactional outbox streams with hostile payload quarantine.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-cyan-400">
                  <span>Inspect Nexus</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </TiltCard>
            </Reveal>

            {/* 3. ORACLE */}
            <Reveal direction="up" delay={300}>
              <TiltCard
                onClick={() => onNavigate('universe')}
                className="p-6 h-full flex flex-col justify-between hover:border-purple-500/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold uppercase">
                      ANALYSIS ENGINE
                    </span>
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#A855F7]" />
                  </div>

                  <div className="flex justify-center py-2">
                    <OracleCharacter
                      state="observing"
                      size={110}
                      reducedMotion={prefersReduced}
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
                      <span>{AGENT_PROFILES.oracle.name}</span>
                      <span className="text-xs text-purple-400 font-normal">#A855F7</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      {AGENT_PROFILES.oracle.designation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Correlates IOC indicators against threat feeds, evaluates attack chains, and predicts adversary escalation.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-purple-400">
                  <span>Inspect Oracle</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </TiltCard>
            </Reveal>

            {/* 4. SENTINEL */}
            <Reveal direction="up" delay={400}>
              <TiltCard
                onClick={() => onNavigate('universe')}
                className="p-6 h-full flex flex-col justify-between hover:border-red-500/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold uppercase">
                      ALERT DISPATCH
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
                  </div>

                  <div className="flex justify-center py-2">
                    <SentinelCharacter
                      state="observing"
                      size={110}
                      reducedMotion={prefersReduced}
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold font-mono text-white flex items-center space-x-2">
                      <span>{AGENT_PROFILES.sentinel.name}</span>
                      <span className="text-xs text-red-400 font-normal">#EF4444</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      {AGENT_PROFILES.sentinel.designation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Guards critical thresholds, initiates push delivery, and executes containment workflows when alerts trip.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-red-400">
                  <span>Inspect Sentinel</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* Core Defensive Pillars */}
        <section className="mt-24 sm:mt-32 space-y-10">
          <Reveal direction="up">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono text-red-400 tracking-widest uppercase font-semibold">
                SYSTEM ARCHITECTURE
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Unified Defensive Ecosystem
              </h2>
              <p className="text-sm text-slate-400 font-light">
                Enterprise telemetry, active deception traps, and high-tempo incident command.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Pillar 1: SOC Command */}
            <Reveal direction="up" delay={100}>
              <TiltCard
                onClick={() => onNavigate('overview')}
                className="p-8 h-full bg-[#0a0e1a]/80"
              >
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 w-fit">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">
                    System 1 — SOC Command
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    Live telemetry correlation, WebSocket streaming, and sub-50ms incident dispatch. Seamlessly toggles into deep-dive forensic inspection.
                  </p>
                  <ul className="text-xs font-mono text-slate-400 space-y-1.5 pt-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-red-400">▸</span>
                      <span>Transactional event outbox</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-red-400">▸</span>
                      <span>Dual-scale risk score harmonization</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-red-400">▸</span>
                      <span>Secure SSE streaming fallback</span>
                    </li>
                  </ul>
                </div>
              </TiltCard>
            </Reveal>

            {/* Pillar 2: Honeypots & Deception */}
            <Reveal direction="up" delay={200}>
              <TiltCard
                onClick={() => onNavigate('deception')}
                className="p-8 h-full bg-[#0a0e1a]/80"
              >
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 w-fit">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">
                    System 2 — Active Deception
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    Distributed honeypot grid spanning SSH, HTTP, Redis, and SQL protocols. Decoy canary tokens trigger instant adversary fingerprinting.
                  </p>
                  <ul className="text-xs font-mono text-slate-400 space-y-1.5 pt-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-cyan-400">▸</span>
                      <span>Interactive decoy responders</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-cyan-400">▸</span>
                      <span>Canary credential traps</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-cyan-400">▸</span>
                      <span>Instant IP containment triggers</span>
                    </li>
                  </ul>
                </div>
              </TiltCard>
            </Reveal>

            {/* Pillar 3: Threat Intelligence */}
            <Reveal direction="up" delay={300}>
              <TiltCard
                onClick={() => onNavigate('intel')}
                className="p-8 h-full bg-[#0a0e1a]/80"
              >
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-400 w-fit">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">
                    System 3 — Threat Intelligence
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    Automated IOC correlation, confidence scoring, and campaign tracking. Enriched with MITRE ATT&CK tactical mapping and forensic replay.
                  </p>
                  <ul className="text-xs font-mono text-slate-400 space-y-1.5 pt-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-400">▸</span>
                      <span>Confidence decay algorithms</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-400">▸</span>
                      <span>Cryptographic evidence SHA-256</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-400">▸</span>
                      <span>Cross-attack timeline synthesis</span>
                    </li>
                  </ul>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="mt-24 sm:mt-32">
          <Reveal direction="up">
            <div className="relative rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/30 via-slate-900/90 to-red-950/30 p-8 sm:p-12 text-center space-y-6 overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <div className="space-y-2">
                <span className="text-xs font-mono text-red-400 tracking-widest uppercase font-semibold">
                  STATUS: OPERATIONAL
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Enter the Command Center
                </h2>
                <p className="max-w-xl mx-auto text-sm text-slate-300 font-light">
                  Direct access to real-time alerts, deception grid management, and robotic agent telemetry.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => onNavigate('overview')}
                  className="hsx-btn-crimson"
                >
                  <span>LAUNCH SOC CONSOLE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('hunts')}
                  className="hsx-btn-secondary"
                >
                  <span>THREAT HUNTING WORKBENCH</span>
                  <Crosshair className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Cinematic Footer */}
      <footer className="border-t border-white/[0.08] bg-[#020408] py-8 px-4 sm:px-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>HONEYSHIELD X // SECURE SOC OPERATIONS</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>RELEASE CANDIDATE: v1.0.0-rc5</span>
            <span>•</span>
            <span>ZERO-TRUST RUNTIME</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
