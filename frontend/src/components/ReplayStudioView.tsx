import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  Network,
  Cpu,
} from 'lucide-react';
import { useReplayAttack, useReplayIp } from '../hooks/useDetectionRules';
import { ReplayExecutionResponse } from '../types';
import { SeverityBadge } from './Badge';

interface ReplayStudioViewProps {
  initialTarget?: string;
  initialScope?: 'attack' | 'ip';
  onSimulateCandidate?: (target: string, scope: 'attack' | 'ip') => void;
}

export const ReplayStudioView: React.FC<ReplayStudioViewProps> = ({
  initialTarget = '',
  initialScope = 'attack',
  onSimulateCandidate,
}) => {
  const [scope, setScope] = useState<'attack' | 'ip'>(initialScope);
  const [targetId, setTargetId] = useState<string>(initialTarget);
  const [windowMinutes, setWindowMinutes] = useState<number>(15);
  const [replayResult, setReplayResult] = useState<ReplayExecutionResponse | null>(null);
  const [timelineStep, setTimelineStep] = useState<number | null>(null);

  const replayAttackMutation = useReplayAttack();
  const replayIpMutation = useReplayIp();

  const isPending = replayAttackMutation.isPending || replayIpMutation.isPending;
  const error = replayAttackMutation.error || replayIpMutation.error;

  const handleExecuteReplay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetId.trim()) return;

    if (scope === 'attack') {
      const aid = parseInt(targetId.trim(), 10);
      if (isNaN(aid)) return;
      replayAttackMutation.mutate(
        { attackId: aid, req: { window_minutes: windowMinutes, max_events: 200, record_audit: true } },
        {
          onSuccess: (data) => {
            setReplayResult(data);
            setTimelineStep(data.event_timeline.length > 0 ? data.event_timeline.length - 1 : null);
          },
        }
      );
    } else {
      replayIpMutation.mutate(
        { sourceIp: targetId.trim(), req: { window_minutes: windowMinutes, max_events: 200, record_audit: true } },
        {
          onSuccess: (data) => {
            setReplayResult(data);
            setTimelineStep(data.event_timeline.length > 0 ? data.event_timeline.length - 1 : null);
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Trigger Ribbon */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Deterministic Historical Event Replay Studio
              </h3>
              <p className="text-xs text-slate-400">
                Execute isolated dry-run re-evaluations of historical events with zero production side effects.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>ZERO DB MUTATION &bull; ZERO NOTIFICATIONS</span>
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleExecuteReplay} className="flex flex-col md:flex-row items-stretch md:items-end gap-3 pt-2">
          {/* Scope Toggle */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">Target Scope</label>
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setScope('attack')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  scope === 'attack' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Attack ID
              </button>
              <button
                type="button"
                onClick={() => setScope('ip')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  scope === 'ip' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Source IP
              </button>
            </div>
          </div>

          {/* Identifier Input */}
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              {scope === 'attack' ? 'Attack Container ID' : 'Source Attacker IP'}
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={scope === 'attack' ? 'e.g. 1' : 'e.g. 198.51.100.25'}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Window Slider */}
          <div className="space-y-1 min-w-[140px]">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Window:</span>
              <span className="text-sky-300 font-bold">{windowMinutes}m</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10))}
              className="w-full accent-sky-500 bg-slate-800"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !targetId.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Replaying Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Execute Replay</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            Replay execution failed: {String(error)}
          </div>
        )}
      </div>

      {/* Replay Results Workspace */}
      {replayResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Status & Detection Diff Banner */}
          <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Replay Execution ID</span>
                <span className="text-xs font-mono font-bold text-sky-400">{replayResult.replay_id}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Match Status:</span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase ${
                    replayResult.detection_diff.match_status === 'identical'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : replayResult.detection_diff.match_status === 'detection_equivalent_only'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {replayResult.detection_diff.match_status === 'identical'
                    ? 'DETERMINISTICALLY IDENTICAL'
                    : replayResult.detection_diff.match_status === 'detection_equivalent_only'
                    ? 'DETECTION EQUIVALENT (Operational Context Missing)'
                    : replayResult.detection_diff.match_status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono ml-2">
                  Duration: <strong className="text-slate-200">{replayResult.execution_duration_ms} ms</strong>
                </span>
              </div>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Finding */}
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Baseline Production Finding
                  </span>
                  {replayResult.baseline_detection && (
                    <SeverityBadge severity={replayResult.baseline_detection.severity} />
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detected:</span>
                    <span className="text-slate-200 font-mono">
                      {replayResult.baseline_detection?.detected ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operational Risk:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {replayResult.baseline_detection?.composite_operational_risk !== undefined && replayResult.baseline_detection?.composite_operational_risk !== null
                        ? `${replayResult.baseline_detection.composite_operational_risk.toFixed(1)} / 100 pts`
                        : `${replayResult.baseline_detection?.suggested_risk_score.toFixed(1) || '0.0'} pts`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rule Risk Score:</span>
                    <span className="text-sky-300 font-mono font-semibold">
                      {replayResult.baseline_detection?.raw_rule_risk_score !== undefined && replayResult.baseline_detection?.raw_rule_risk_score !== null
                        ? `${replayResult.baseline_detection.raw_rule_risk_score.toFixed(1)} / 10 pts`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Triggered Rules:</span>
                    <span className="text-slate-300 font-mono">
                      {replayResult.baseline_detection?.rules_triggered.join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Replayed Finding */}
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
                    Sandbox Replayed Finding
                  </span>
                  <SeverityBadge severity={replayResult.replayed_detection.severity} />
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detected:</span>
                    <span className="text-slate-200 font-mono">
                      {replayResult.replayed_detection.detected ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operational Risk:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {replayResult.replayed_detection.composite_operational_risk !== undefined && replayResult.replayed_detection.composite_operational_risk !== null
                        ? `${replayResult.replayed_detection.composite_operational_risk.toFixed(1)} / 100 pts`
                        : 'Context Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rule Risk Score:</span>
                    <span className="text-sky-300 font-mono font-semibold">
                      {replayResult.replayed_detection.raw_rule_risk_score !== undefined && replayResult.replayed_detection.raw_rule_risk_score !== null
                        ? `${replayResult.replayed_detection.raw_rule_risk_score.toFixed(1)} / 10 pts`
                        : `${replayResult.replayed_detection.suggested_risk_score.toFixed(1)} pts`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Triggered Rules:</span>
                    <span className="text-sky-300 font-mono font-semibold">
                      {replayResult.replayed_detection.rules_triggered.join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diff Delta Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
              <span className="text-slate-500">Delta Rules:</span>
              {replayResult.detection_diff.new_rules_triggered.length > 0 ? (
                replayResult.detection_diff.new_rules_triggered.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    + {r}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">0 new rules</span>
              )}

              {replayResult.detection_diff.suppressed_rules.length > 0 &&
                replayResult.detection_diff.suppressed_rules.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    - {r}
                  </span>
                ))}

              <span className="ml-auto flex items-center space-x-3 text-slate-400">
                <span>
                  Rule &Delta;: <strong className="text-white">{replayResult.detection_diff.rule_risk_delta !== undefined && replayResult.detection_diff.rule_risk_delta !== null ? (replayResult.detection_diff.rule_risk_delta > 0 ? `+${replayResult.detection_diff.rule_risk_delta}` : `${replayResult.detection_diff.rule_risk_delta}`) : 'N/A'}</strong>
                </span>
                <span>
                  Ops &Delta;: <strong className="text-white">{replayResult.detection_diff.operational_risk_delta !== undefined && replayResult.detection_diff.operational_risk_delta !== null ? (replayResult.detection_diff.operational_risk_delta > 0 ? `+${replayResult.detection_diff.operational_risk_delta}` : `${replayResult.detection_diff.operational_risk_delta}`) : 'Unavailable'}</strong>
                </span>
              </span>
            </div>
          </div>

          {/* Chronological Event Progression Stepper */}
          <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  Chronological Replay Progression ({replayResult.event_timeline.length} Events)
                </h4>
              </div>

              {replayResult.event_timeline.length > 0 && (
                <div className="text-xs font-mono text-slate-400">
                  Step: <span className="text-white font-bold">{timelineStep !== null ? timelineStep + 1 : 0}</span> / {replayResult.event_timeline.length}
                </div>
              )}
            </div>

            {replayResult.event_timeline.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded border border-slate-800">
                No telemetry events found for this target in the evaluated window.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {replayResult.event_timeline.map((ev, idx) => {
                  const isSelected = timelineStep === idx;
                  const hasTrigger = ev.cumulative_rules_triggered.length > 0;
                  return (
                    <div
                      key={ev.event_id}
                      onClick={() => setTimelineStep(idx)}
                      className={`p-3 rounded border text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-850 border-sky-500/60 shadow-md'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-600">#{idx + 1}</span>
                          <span className="text-slate-400">{new Date(ev.event_time).toLocaleTimeString()}</span>
                          <span className="text-sky-300 font-semibold">{ev.event_type}</span>
                        </div>
                        <span className="text-slate-500">{ev.source_ip}</span>
                      </div>

                      <div className="text-slate-300 text-[11px] truncate bg-slate-900/60 p-1.5 rounded border border-slate-800/60">
                        <code>{ev.payload_preview}</code>
                      </div>

                      {hasTrigger && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] text-amber-400 font-semibold uppercase">Cumulative Triggers:</span>
                          <div className="flex flex-wrap gap-1">
                            {ev.cumulative_rules_triggered.map((ruleId) => (
                              <span key={ruleId} className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
                                {ruleId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
