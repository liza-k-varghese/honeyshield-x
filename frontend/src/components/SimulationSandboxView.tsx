import React, { useState } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useSimulateRule } from '../hooks/useDetectionRules';
import { CandidateRuleSpec, DetectionRuleSummary, SimulationExecutionResponse } from '../types';

interface SimulationSandboxViewProps {
  initialRule?: DetectionRuleSummary | null;
  initialTarget?: string;
  initialScope?: 'attack' | 'ip';
}

export const SimulationSandboxView: React.FC<SimulationSandboxViewProps> = ({
  initialRule,
  initialTarget = '',
  initialScope = 'ip',
}) => {
  const [targetScope, setTargetScope] = useState<'attack' | 'ip'>(initialScope);
  const [targetIdentifier, setTargetIdentifier] = useState<string>(initialTarget);
  const [windowMinutes, setWindowMinutes] = useState<number>(15);

  // Candidate rule form state
  const [ruleId, setRuleId] = useState<string>(initialRule ? `CANDIDATE_${initialRule.rule_id}` : 'CANDIDATE_CUSTOM_RULE');
  const [name, setName] = useState<string>(initialRule ? `Simulated ${initialRule.name}` : 'Simulated Custom Rule');
  const [vector, setVector] = useState<string>(initialRule ? initialRule.vector : 'web');
  const [ruleType, setRuleType] = useState<string>(initialRule ? initialRule.rule_type : 'threshold');
  const [thresholdCount, setThresholdCount] = useState<number>(initialRule ? Math.max(1, initialRule.threshold_count - 1) : 3);
  const [targetEvents, setTargetEvents] = useState<string>(
    initialRule ? initialRule.target_event_types.join(', ') : 'web_access, web_probe'
  );
  const [tokens, setTokens] = useState<string>(initialRule?.match_tokens ? initialRule.match_tokens.join('\n') : '');
  const [regexes, setRegexes] = useState<string>(initialRule?.regex_patterns ? initialRule.regex_patterns.join('\n') : '');

  const [simulationResult, setSimulationResult] = useState<SimulationExecutionResponse | null>(null);

  const simulateMutation = useSimulateRule();

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdentifier.trim() || !ruleId.trim()) return;

    const eventTypeList = targetEvents
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const matchTokensList = tokens
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const regexList = regexes
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const candidate: CandidateRuleSpec = {
      rule_id: ruleId.trim(),
      name: name.trim(),
      vector,
      rule_type: ruleType,
      target_event_types: eventTypeList.length > 0 ? eventTypeList : ['web_access'],
      window_minutes: windowMinutes,
      threshold_count: thresholdCount,
      severity: 'high',
      base_risk_score: 8.0,
      match_tokens: matchTokensList,
      regex_patterns: regexList,
    };

    simulateMutation.mutate(
      {
        target_scope: targetScope,
        target_identifier: targetIdentifier.trim(),
        window_minutes: windowMinutes,
        candidate_rule: candidate,
      },
      {
        onSuccess: (data) => {
          setSimulationResult(data);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Prominent Dry-Run Indicator Banner */}
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-emerald-300">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="font-bold uppercase tracking-wider font-mono">
            Pure In-Memory Dry-Run Sandbox &bull; Zero Production Modifications
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          Tested rules do not alter SEEDED_RULES or database tables
        </span>
      </div>

      {/* Authoring & Target Form */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Candidate Rule Authoring & Parameter Tuning</span>
        </h3>

        <form onSubmit={handleRunSimulation} className="space-y-4 text-xs font-mono">
          {/* Target Scope & Identifier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Target Scope</label>
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetScope('ip')}
                  className={`flex-1 py-1 rounded transition-colors text-center ${
                    targetScope === 'ip' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Source IP
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('attack')}
                  className={`flex-1 py-1 rounded transition-colors text-center ${
                    targetScope === 'attack' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Attack ID
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Target Entity Identifier</label>
              <input
                type="text"
                value={targetIdentifier}
                onChange={(e) => setTargetIdentifier(e.target.value)}
                placeholder={targetScope === 'ip' ? 'e.g. 198.51.100.25' : 'e.g. 1'}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Sliding Window ({windowMinutes}m)</label>
              <input
                type="range"
                min="1"
                max="60"
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500 bg-slate-800 mt-2"
              />
            </div>
          </div>

          {/* Candidate Specification Row 1: ID, Name, Vector, Mechanism */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-slate-400 block mb-1">Candidate Rule ID</label>
              <input
                type="text"
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Vector Category</label>
              <select
                value={vector}
                onChange={(e) => setVector(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              >
                <option value="auth">AUTH</option>
                <option value="web">WEB</option>
                <option value="network">NETWORK</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Mechanism</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              >
                <option value="threshold">Threshold</option>
                <option value="signature">Signature</option>
              </select>
            </div>
          </div>

          {/* Candidate Specification Row 2: Threshold & Target Events */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">
                Threshold Count: <strong className="text-amber-400">{thresholdCount} occurrences</strong>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={thresholdCount}
                onChange={(e) => setThresholdCount(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 bg-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Target Events (Comma separated)</label>
              <input
                type="text"
                value={targetEvents}
                onChange={(e) => setTargetEvents(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
          </div>

          {/* Tokens and Regex Pattern Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Match Tokens (One per line)</label>
              <textarea
                rows={3}
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="union select&#10;waitfor delay"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-emerald-300 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Regex Patterns (One per line, linear safe)</label>
              <textarea
                rows={3}
                value={regexes}
                onChange={(e) => setRegexes(e.target.value)}
                placeholder="(?i)\bunion\s+select\b"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sky-300 font-mono text-[11px]"
              />
            </div>
          </div>

          {simulateMutation.error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              Simulation rejected: {String(simulateMutation.error)}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={simulateMutation.isPending || !targetIdentifier.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              {simulateMutation.isPending ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Candidate In-Memory...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Dry-Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Result Report */}
      {simulationResult && (
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Simulation Report ID</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{simulationResult.simulation_id}</span>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-400">Duration:</span>
              <strong className="text-slate-200">{simulationResult.execution_duration_ms} ms</strong>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-400">Events Evaluated:</span>
              <strong className="text-slate-200">{simulationResult.events_evaluated}</strong>
            </div>
          </div>

          {/* Trigger Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">Candidate Triggered?</span>
              <span
                className={`text-sm font-bold font-mono ${
                  simulationResult.candidate_rule_triggered ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {simulationResult.candidate_rule_triggered ? 'YES — TRIGGERED' : 'NO — NOT TRIGGERED'}
              </span>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">Candidate Evidence Count</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {simulationResult.candidate_evidence_count} occurrences
              </span>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono block">New Coverage Additions</span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                +{simulationResult.new_detections_count} rule detection(s)
              </span>
            </div>
          </div>

          {/* Analytical Summary */}
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Comparison Summary</span>
            <p className="text-slate-300 leading-relaxed font-mono">{simulationResult.comparison_summary}</p>
          </div>

          {/* Matched Payload Samples */}
          {simulationResult.matched_payload_samples.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">
                Matched Payload Samples ({simulationResult.matched_payload_samples.length})
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                {simulationResult.matched_payload_samples.map((sample, i) => (
                  <div key={i} className="p-2 rounded bg-slate-950 text-emerald-300 border border-slate-800/80 truncate">
                    <code>{sample}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
