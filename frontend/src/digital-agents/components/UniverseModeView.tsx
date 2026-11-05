import React, { useState } from 'react';
import {
  AgentId,
  AgentAnimationState,
  AgentRuntimeStatus,
  DataPacketPayload,
  AgentHandoffRecord,
  FlowNodeDefinition,
  FlowConnectionDefinition,
  EventJourneyRecord,
  RealtimeStreamConnectionState,
  RealtimeStreamMetrics,
} from '../types';
import { AgentGallery } from './AgentGallery';
import { LiveDataFlow } from './LiveDataFlow';
import { AgentCommunicationPanel } from './AgentCommunicationPanel';
import { EventJourneyReplay } from './EventJourneyReplay';
import { TransferInspector } from './TransferInspector';
import { NexusAssistantModal } from './NexusAssistantModal';
import { MovementPrototype } from './MovementPrototype';
import { AgentWorkloadPanel } from './AgentWorkloadPanel';
import { ThreatMapView } from './ThreatMapView';
import {
  Sparkles,
  Users,
  Activity,
  History,
  MessageSquare,
  Globe,
  Eye,
  EyeOff,
  Pause,
  Play,
  ArrowLeft,
  Layers,
} from 'lucide-react';

interface UniverseModeViewProps {
  runtimeStatuses: Record<AgentId, AgentRuntimeStatus>;
  activePackets: DataPacketPayload[];
  completedPackets: DataPacketPayload[];
  failedPackets: DataPacketPayload[];
  handoffs: AgentHandoffRecord[];
  nodes: FlowNodeDefinition[];
  connections: FlowConnectionDefinition[];
  journeys: EventJourneyRecord[];
  isDemoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
  onSimulateState: (agentId: AgentId, state: AgentAnimationState) => void;
  onExitUniverseMode: () => void;
  onDeepLinkInvestigate?: (ip: string) => void;
  streamConnectionState?: RealtimeStreamConnectionState;
  streamMetrics?: RealtimeStreamMetrics;
}

export type UniverseSubTab =
  | 'prototype'
  | 'flow'
  | 'journey'
  | 'workload'
  | 'threatmap'
  | 'communication'
  | 'gallery';

export const UniverseModeView: React.FC<UniverseModeViewProps> = ({
  runtimeStatuses,
  activePackets,
  completedPackets,
  failedPackets,
  handoffs,
  nodes,
  connections,
  journeys,
  isDemoMode,
  onToggleDemoMode,
  onSimulateState,
  onExitUniverseMode,
  onDeepLinkInvestigate,
  streamConnectionState = 'connected',
  streamMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<UniverseSubTab>('prototype');
  const [selectedPacket, setSelectedPacket] = useState<DataPacketPayload | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [animationsPaused, setAnimationsPaused] = useState(false);

  // Map runtime states for assistant
  const agentStateStrings: Record<AgentId, string> = {
    scout: runtimeStatuses.scout.currentState,
    nexus: runtimeStatuses.nexus.currentState,
    oracle: runtimeStatuses.oracle.currentState,
    sentinel: runtimeStatuses.sentinel.currentState,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-mono text-slate-100">
      {/* Top Universe Command Bar */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 shadow-nexus-cyan backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Mode Title & Exit Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExitUniverseMode}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Return to SOC Operations Mode"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Operations Mode</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h1 className="text-base font-black text-white tracking-wider flex items-center gap-1.5">
                <span>DIGITAL AGENT UNIVERSE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                  SYS 1-3 CORE
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 4-Agent Autonomous Defense Simulation & Event Bus
            </p>
          </div>
        </div>

        {/* Center: Sub-tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('prototype')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'prototype'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Movement Prototype</span>
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'flow'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Cyber Universe</span>
          </button>

          <button
            onClick={() => setActiveTab('journey')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Event Journey</span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'workload'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Agent Workload</span>
          </button>

          <button
            onClick={() => setActiveTab('threatmap')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'threatmap'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Threat Map</span>
          </button>

          <button
            onClick={() => setActiveTab('communication')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'communication'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Agent Handoffs</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-cyan-600 text-white font-bold shadow-nexus-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Character Gallery</span>
          </button>
        </div>

        {/* Right Controls: Stream Health, Animation Pause, Reduced Motion, Ask NEXUS */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Real-Time WebSocket Connection Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                streamConnectionState === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : streamConnectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 uppercase font-bold text-[10px]">
              {streamConnectionState}
            </span>
            {streamMetrics && (
              <span className="text-slate-500 text-[10px]">
                ({streamMetrics.totalReceived} msgs)
              </span>
            )}
          </div>

          {/* Animation Pause Button */}
          <button
            onClick={() => setAnimationsPaused(!animationsPaused)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              animationsPaused
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={animationsPaused ? 'Resume Animations' : 'Pause Animations'}
          >
            {animationsPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              reducedMotion
                ? 'bg-purple-950 text-purple-300 border-purple-600'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={reducedMotion ? 'Enable Dynamic Motions' : 'Reduce Visual Motions'}
          >
            {reducedMotion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* NEXUS Assistant Summon Button */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-nexus-cyan transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask NEXUS</span>
          </button>
        </div>
      </div>

      {/* Active Sub-tab View Display */}
      {activeTab === 'prototype' && (
        <MovementPrototype
          onSelectPacket={(pkt) => setSelectedPacket(pkt)}
          reducedMotion={reducedMotion || animationsPaused}
          activeLivePacket={activePackets[0] || null}
          isLiveMode={!isDemoMode}
        />
      )}

      {activeTab === 'flow' && (
        <LiveDataFlow
          nodes={nodes}
          connections={connections}
          activePackets={activePackets}
          onSelectPacket={(pkt) => setSelectedPacket(pkt)}
          selectedPacketId={selectedPacket?.eventId}
          reducedMotion={reducedMotion || animationsPaused}
          onSelectAgent={(_agentId) => {
            setActiveTab('gallery');
          }}
        />
      )}

      {activeTab === 'journey' && (
        <EventJourneyReplay
          journeys={journeys}
          onFollowJourney={(_journey) => {
            setActiveTab('prototype');
          }}
          onDeepLinkInvestigate={onDeepLinkInvestigate}
          reducedMotion={reducedMotion || animationsPaused}
        />
      )}

      {activeTab === 'workload' && (
        <AgentWorkloadPanel
          runtimeStatuses={runtimeStatuses}
          onSelectAgent={(_agentId) => {
            setActiveTab('gallery');
          }}
          reducedMotion={reducedMotion || animationsPaused}
        />
      )}

      {activeTab === 'threatmap' && (
        <ThreatMapView onDeepLinkInvestigate={onDeepLinkInvestigate} />
      )}

      {activeTab === 'gallery' && (
        <AgentGallery
          runtimeStatuses={runtimeStatuses}
          isDemoMode={isDemoMode}
          onToggleDemoMode={onToggleDemoMode}
          onSimulateState={onSimulateState}
          reducedMotion={reducedMotion || animationsPaused}
        />
      )}

      {activeTab === 'communication' && (
        <AgentCommunicationPanel
          handoffs={handoffs}
          onSelectHandoff={(h) => {
            const match = activePackets.find((p) => p.transferId === h.transferId);
            if (match) setSelectedPacket(match);
          }}
        />
      )}

      {/* Transfer Inspector Modal */}
      <TransferInspector
        packet={selectedPacket}
        onClose={() => setSelectedPacket(null)}
        onDeepLinkInvestigate={onDeepLinkInvestigate}
      />

      {/* NEXUS Grounded Assistant Modal */}
      <NexusAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activePackets={activePackets}
        completedPackets={completedPackets}
        failedPackets={failedPackets}
        runtimeAgentStates={agentStateStrings}
        onDeepLinkInvestigate={onDeepLinkInvestigate}
      />
    </div>
  );
};
