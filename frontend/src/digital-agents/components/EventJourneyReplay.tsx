import React, { useState, useEffect } from 'react';
import { EventJourneyRecord } from '../types';
import { AGENT_PROFILES } from '../profiles';
import { AgentCharacterMap } from '../characters';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Clock,
  CheckCircle2,
  AlertOctagon,
  History,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface EventJourneyReplayProps {
  journeys: EventJourneyRecord[];
  onSelectJourney?: (journey: EventJourneyRecord) => void;
  onFollowJourney?: (journey: EventJourneyRecord, stageIndex: number) => void;
  onDeepLinkInvestigate?: (ip: string) => void;
  reducedMotion?: boolean;
}

// Canonical HoneyShield X 11-Stage Pipeline Definition
export const CANONICAL_JOURNEY_STAGES = [
  { key: 'sensor', name: 'Source Sensor Capture', defaultAgent: 'scout' as const, source: 'Cowrie / Canary Trap', dest: 'Ingestion Gateway' },
  { key: 'ingestion', name: 'Ingestion API Gateway', defaultAgent: 'nexus' as const, source: 'Network Sensors', dest: 'Validation Pipeline' },
  { key: 'validation', name: 'Schema Validation', defaultAgent: 'nexus' as const, source: 'Ingestion Gateway', dest: 'Normalization Engine' },
  { key: 'normalization', name: 'ECS Normalization', defaultAgent: 'nexus' as const, source: 'Schema Validator', dest: 'Redis Queue' },
  { key: 'queue', name: 'Redis Queue Buffering', defaultAgent: 'nexus' as const, source: 'Normalizer', dest: 'Processing Workers' },
  { key: 'worker', name: 'Worker Stream Processing', defaultAgent: 'nexus' as const, source: 'Redis Stream', dest: 'PostgreSQL Outbox' },
  { key: 'persistence', name: 'PostgreSQL Outbox Commit', defaultAgent: 'nexus' as const, source: 'Processing Worker', dest: 'Transactional DB' },
  { key: 'detection', name: 'Attack Detection Core', defaultAgent: 'oracle' as const, source: 'PostgreSQL Outbox', dest: 'Threat Intel Store' },
  { key: 'intel', name: 'Threat Intel Enrichment', defaultAgent: 'oracle' as const, source: 'Detection Engine', dest: 'Confirmed Alert Evaluator' },
  { key: 'alert', name: 'Confirmed Alert Triage', defaultAgent: 'sentinel' as const, source: 'Threat Intel Store', dest: 'Push Dispatcher' },
  { key: 'notification', name: 'Push Dispatch & Governor', defaultAgent: 'sentinel' as const, source: 'Alert Evaluator', dest: 'Android & SOC Console' },
];

export const EventJourneyReplay: React.FC<EventJourneyReplayProps> = ({
  journeys,
  onSelectJourney,
  onFollowJourney,
  onDeepLinkInvestigate,
  reducedMotion = false,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    journeys[0]?.eventId || 'EVT-INITIAL'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [activeStageStep, setActiveStageStep] = useState<number>(0);

  const activeJourney =
    journeys.find((j) => j.eventId === selectedEventId) || journeys[0];

  useEffect(() => {
    setActiveStageStep(activeJourney ? activeJourney.stages.length - 1 : 0);
    setIsPlaying(false);
  }, [selectedEventId, activeJourney]);

  // Automated Replay Stepper Timer (0.5x, 1x, 2x speeds)
  useEffect(() => {
    if (!isPlaying || !activeJourney) return;

    const interval = setInterval(() => {
      setActiveStageStep((curr) => {
        if (curr >= activeJourney.stages.length - 1) {
          setIsPlaying(false);
          return curr;
        }
        return curr + 1;
      });
    }, 1500 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, activeJourney, playbackSpeed]);

  if (!activeJourney) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        No event journeys recorded in the event store.
      </div>
    );
  }

  const currentStage = activeJourney.stages[activeStageStep] || activeJourney.stages[0];
  const agentProfile = AGENT_PROFILES[currentStage.responsibleAgent];
  const AgentAvatar = AgentCharacterMap[currentStage.responsibleAgent];

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Banner with Clear REPLAY Watermark and Live Isolation Notice */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white tracking-wider">
              HONEYSHIELD EVENT JOURNEY // HISTORICAL REPLAY
            </h2>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
              REPLAY MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step reconstruction of security event progression across all 4 digital agents • Pure isolated visualization (zero live state mutations)
          </p>
        </div>

        {/* Journey Selector Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Select Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              const found = journeys.find((j) => j.eventId === e.target.value);
              if (found) onSelectJourney?.(found);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            {journeys.map((j) => (
              <option key={j.eventId} value={j.eventId}>
                #{j.eventId.slice(0, 8)} ({j.eventType} - {j.severity.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Event Metadata Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Event ID</span>
          <span className="font-bold text-white truncate block">#{activeJourney.eventId.slice(0, 10)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Workflow ID</span>
          <span className="font-bold text-cyan-300 truncate block">
            {activeJourney.workflowId || 'wf_auto_correlated'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Transfer ID</span>
          <span className="font-bold text-purple-300 truncate block">
            {activeJourney.transferId || `tr_${activeJourney.eventId.slice(0, 8)}`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Source IP</span>
          <span className="font-bold text-amber-300 truncate block">{activeJourney.sourceIp || activeJourney.attackerIp || 'N/A'}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Total Duration</span>
          <span className="font-bold text-emerald-400 block">
            {activeJourney.totalDurationMs ? `${activeJourney.totalDurationMs} ms` : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase block">Recorded Stages</span>
          <span className="font-bold text-purple-400 block">
            {activeJourney.stages.length} / {CANONICAL_JOURNEY_STAGES.length}
          </span>
        </div>
      </div>

      {/* Main Journey Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Replay Player & Active Avatar (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-between min-h-[460px]">
          {/* Active Stage Indicator */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="text-slate-400">
              Stage {activeStageStep + 1} of {activeJourney.stages.length}
            </span>
            <span
              className="font-bold uppercase px-2 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: `${agentProfile.color}25`,
                color: agentProfile.accentColor,
                border: `1px solid ${agentProfile.color}60`,
              }}
            >
              {agentProfile.name} // {currentStage.stageName}
            </span>
          </div>

          {/* Active Agent Avatar Canvas */}
          <div className="py-6 flex flex-col items-center">
            <div className="w-36 h-36 flex items-center justify-center">
              <AgentAvatar
                state={currentStage.status === 'completed' ? 'success' : currentStage.status === 'failed' ? 'failed' : 'processing'}
                carryingPacket={true}
                packetColor={
                  currentStage.responsibleAgent === 'scout'
                    ? 'blue'
                    : currentStage.responsibleAgent === 'nexus'
                    ? 'cyan'
                    : currentStage.responsibleAgent === 'oracle'
                    ? 'purple'
                    : 'red'
                }
                size={144}
                reducedMotion={reducedMotion}
              />
            </div>
            <h4
              className="text-base font-black tracking-wide mt-2"
              style={{ color: agentProfile.color }}
            >
              {agentProfile.name}
            </h4>
            <span className="text-xs text-slate-400">{agentProfile.designation}</span>
          </div>

          {/* Follow Journey CTA Button */}
          <button
            onClick={() => onFollowJourney?.(activeJourney, activeStageStep)}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Follow Carrier in Cyber Universe</span>
          </button>

          {/* VCR Style Playback Controls */}
          <div className="w-full pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveStageStep(0)}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Restart Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveStageStep((c) => Math.max(0, c - 1))}
                disabled={activeStageStep === 0}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors"
                title="Step Backward"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition-colors text-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-white fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => setActiveStageStep((c) => Math.min(activeJourney.stages.length - 1, c + 1))}
                disabled={activeStageStep >= activeJourney.stages.length - 1}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition-colors"
                title="Step Forward"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector (0.5x, 1x, 2x) */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Speed:</span>
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-purple-950 text-purple-300 border border-purple-500 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Detailed Journey Timeline Stages (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Full Lifecycle Processing Stages</span>
            </span>
            {activeJourney.sourceIp && onDeepLinkInvestigate && (
              <button
                onClick={() => onDeepLinkInvestigate(activeJourney.sourceIp)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                <span>Investigate {activeJourney.sourceIp}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {activeJourney.stages.map((stage, idx) => {
              const isCurrent = idx === activeStageStep;
              const isPast = idx < activeStageStep;
              const stageAgent = AGENT_PROFILES[stage.responsibleAgent];

              return (
                <div
                  key={stage.stageId || idx}
                  onClick={() => setActiveStageStep(idx)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer text-xs space-y-1.5 ${
                    isCurrent
                      ? 'bg-slate-900/95 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-400'
                      : isPast
                      ? 'bg-slate-950/60 border-slate-800 opacity-80'
                      : 'bg-slate-950/30 border-slate-900 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: `${stageAgent.color}30`,
                          color: stageAgent.color,
                          border: `1px solid ${stageAgent.color}`,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-white text-xs">{stage.stageName}</h4>
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded"
                        style={{ color: stageAgent.color }}
                      >
                        {stageAgent.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">
                        {stage.timestamp && stage.timestamp !== 'NOT RECORDED'
                          ? stage.timestamp.includes('T')
                            ? new Date(stage.timestamp).toLocaleTimeString()
                            : stage.timestamp
                          : 'NOT RECORDED'}
                      </span>
                      {stage.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase font-bold">COMPLETED</span>
                        </span>
                      ) : stage.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-rose-400">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase font-bold">FAILED</span>
                        </span>
                      ) : stage.status === 'not_recorded' || stage.status === 'not_available' ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-bold">
                          NOT RECORDED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase font-bold">WAITING</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 pl-7">{stage.details}</p>

                  {/* Stage Metrics: Latency, Source -> Destination, Backend ID */}
                  <div className="pl-7 pt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 border-t border-slate-900/60">
                    {stage.durationMs ? (
                      <span>Latency: <strong className="text-slate-200">{stage.durationMs}ms</strong></span>
                    ) : (
                      <span>Latency: <strong className="text-slate-500">N/A</strong></span>
                    )}

                    {(stage.sourceNode || stage.destinationNode) && (
                      <span className="flex items-center gap-1">
                        <span>{stage.sourceNode || 'Sensor'}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                        <span>{stage.destinationNode || 'Outbox'}</span>
                      </span>
                    )}

                    {stage.backendRecordId && (
                      <span className="text-purple-300">
                        Record: #{stage.backendRecordId.slice(0, 10)}
                      </span>
                    )}

                    {stage.failureReason && (
                      <span className="text-rose-400 font-bold">
                        Reason: {stage.failureReason}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
