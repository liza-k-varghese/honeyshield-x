import React, { useState } from 'react';
import { AgentId, AgentAnimationState, AgentRuntimeStatus } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import {
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Activity,
  CheckCircle,
  AlertOctagon,
  Clock,
  Radio,
  Sliders,
  Terminal,
} from 'lucide-react';

interface AgentGalleryProps {
  runtimeStatuses: Record<AgentId, AgentRuntimeStatus>;
  isDemoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
  onSimulateState?: (agentId: AgentId, state: AgentAnimationState) => void;
  reducedMotion?: boolean;
}

export const AgentGallery: React.FC<AgentGalleryProps> = ({
  runtimeStatuses,
  isDemoMode,
  onToggleDemoMode,
  onSimulateState,
  reducedMotion = false,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('nexus');
  const [previewStateOverride, setPreviewStateOverride] = useState<AgentAnimationState | null>(null);
  const [carryingPacketPreview, setCarryingPacketPreview] = useState(false);

  const profile = AGENT_PROFILES[selectedAgentId];
  const runtime = runtimeStatuses[selectedAgentId];
  const CharacterComponent = AgentCharacterMap[selectedAgentId];

  // Active state is either manual preview override or real backend runtime state
  const activeDisplayState = previewStateOverride || runtime.currentState;

  const handleSelectState = (state: AgentAnimationState) => {
    setPreviewStateOverride(state);
    if (isDemoMode && onSimulateState) {
      onSimulateState(selectedAgentId, state);
    }
  };

  const handleResetPreview = () => {
    setPreviewStateOverride(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Gallery Control Ribbon */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-white tracking-wider">
              DIGITAL AGENT UNIVERSE // CHARACTER GALLERY
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Interactive Roster of Autonomous HoneyShield X Cyber Defense Avatars
          </p>
        </div>

        {/* Demo Mode Isolation Toggle */}
        <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Mode:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider ${
                isDemoMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {isDemoMode ? 'DEMO SIMULATION' : 'LIVE BACKEND'}
            </span>
          </div>

          <button
            onClick={() => onToggleDemoMode(!isDemoMode)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              isDemoMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isDemoMode ? 'Switch to LIVE' : 'Enable DEMO'}
          </button>
        </div>
      </div>

      {/* Main 4-Agent Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {(Object.keys(AGENT_PROFILES) as AgentId[]).map((id) => {
          const p = AGENT_PROFILES[id];
          const r = runtimeStatuses[id];
          const isSelected = selectedAgentId === id;
          const CardAvatar = AgentCharacterMap[id];

          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedAgentId(id);
                setPreviewStateOverride(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedAgentId(id);
                  setPreviewStateOverride(null);
                }
              }}
              className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 select-none flex flex-col items-center text-center font-mono ${
                isSelected
                  ? 'bg-slate-900/95 border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-2 ring-cyan-400'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
              }`}
            >
              {/* Character Avatar Icon */}
              <div className="py-2">
                <CardAvatar
                  state={r.currentState}
                  size={90}
                  reducedMotion={reducedMotion}
                />
              </div>

              {/* Title & Badge */}
              <div className="mt-2 w-full">
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <h3 className="font-extrabold text-sm text-white tracking-wider">
                    {p.name}
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {p.designation}
                </p>

                {/* Status Pill */}
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="capitalize">{r.connectionStatus}</span>
                  </span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold uppercase">
                    {r.currentState}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Character Deep-Dive Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Full Character Stage (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden">
          {/* Ambient Lighting Backdrop */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ backgroundColor: profile.color }}
          />

          {/* Top Title & System Domain */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
            <span className="text-slate-400 uppercase">{profile.systemDomain}</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${profile.color}25`,
                color: profile.accentColor,
                border: `1px solid ${profile.color}50`,
              }}
            >
              ACTIVE STATE: {activeDisplayState}
            </span>
          </div>

          {/* Large Hero Character Canvas */}
          <div className="my-auto py-6 flex items-center justify-center">
            <CharacterComponent
              state={activeDisplayState}
              carryingPacket={carryingPacketPreview}
              packetColor={
                selectedAgentId === 'scout'
                  ? 'blue'
                  : selectedAgentId === 'nexus'
                  ? 'cyan'
                  : selectedAgentId === 'oracle'
                  ? 'purple'
                  : 'red'
              }
              size={220}
              reducedMotion={reducedMotion}
            />
          </div>

          {/* Quick Animation Controls */}
          <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-2 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulation Controls:</span>
              </span>
              {previewStateOverride && (
                <button
                  onClick={handleResetPreview}
                  className="text-cyan-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Live</span>
                </button>
              )}
            </div>

            {/* Carrying Packet Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={carryingPacketPreview}
                onChange={(e) => setCarryingPacketPreview(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900"
              />
              <span>Attach carried security data packet</span>
            </label>
          </div>
        </div>

        {/* Right Column: Specifications, Tasks & State Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Agent Role & Personality Card */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">
                  {profile.name}
                </h3>
                <p className="text-xs text-cyan-400">{profile.designation}</p>
              </div>
              <span className="text-xs text-slate-500 italic">
                &ldquo;{profile.personality}&rdquo;
              </span>
            </div>

            {/* Responsibilities List */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                Operational Responsibilities:
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {profile.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">•</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Workload Task Statistics */}
          <div className="grid grid-cols-3 gap-3 font-mono text-center">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Completed Tasks</span>
              <span className="text-lg font-bold text-emerald-400">
                {runtime.tasksCompleted}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Pending In Queue</span>
              <span className="text-lg font-bold text-amber-400">
                {runtime.tasksPending}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Failed / Retry</span>
              <span className="text-lg font-bold text-red-400">
                {runtime.tasksFailed}
              </span>
            </div>
          </div>

          {/* Supported Animation States Switcher */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Animation State Previewer</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Click any state to preview character mechanics
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.supportedAnimations.map((anim) => {
                const isActive = activeDisplayState === anim;
                return (
                  <button
                    key={anim}
                    onClick={() => handleSelectState(anim)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      isActive
                        ? 'bg-white text-slate-950 shadow-md scale-105 font-bold'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {anim}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Agent Activity Log */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Recent Operational Actions</span>
            </span>

            <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
              {runtime.recentActivity.length > 0 ? (
                runtime.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {act.success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className="text-slate-200">{act.action}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs py-2 text-center">
                  No recent activity recorded for this agent.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
