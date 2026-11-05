import React from 'react';
import { AgentId, AgentRuntimeStatus } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import { Bot, MessageSquare, Sparkles, ArrowUpRight } from 'lucide-react';

interface CompactAgentRibbonProps {
  runtimeStatuses: Record<AgentId, AgentRuntimeStatus>;
  onOpenUniverseMode: () => void;
  onOpenAssistant: () => void;
  onSelectAgent?: (id: AgentId) => void;
}

export const CompactAgentRibbon: React.FC<CompactAgentRibbonProps> = ({
  runtimeStatuses,
  onOpenUniverseMode,
  onOpenAssistant,
  onSelectAgent,
}) => {
  return (
    <div className="p-3 rounded-xl bg-[#070b1a]/95 border border-cyan-500/25 shadow-nexus-cyan backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-xs">
      {/* Left: Brand & Agents Quick Status */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">
            DIGITAL AGENTS:
          </span>
        </div>

        {/* 4 Agent Mini Indicators */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto py-1">
          {(['scout', 'nexus', 'oracle', 'sentinel'] as AgentId[]).map((agentId) => {
            const profile = AGENT_PROFILES[agentId];
            const runtime = runtimeStatuses[agentId];
            const AvatarComponent = AgentCharacterMap[agentId];

            return (
              <div
                key={agentId}
                onClick={() => onSelectAgent?.(agentId)}
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all shrink-0"
                title={`${profile.name} (${profile.designation}): ${runtime.currentState.toUpperCase()}`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <AvatarComponent state={runtime.currentState} size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-[11px] text-white flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: profile.color }}
                    />
                    {profile.name}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase">
                    {runtime.currentState}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Quick Launch Action Buttons */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        <button
          onClick={onOpenAssistant}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 hover:text-white flex items-center gap-1.5 transition-colors text-xs"
          title="Open NEXUS Intelligent Assistant"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ask NEXUS</span>
        </button>

        <button
          onClick={onOpenUniverseMode}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition-colors text-xs shadow-nexus-cyan"
          title="Launch Fullscreen Digital Agent Universe Mode"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Universe Mode</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
