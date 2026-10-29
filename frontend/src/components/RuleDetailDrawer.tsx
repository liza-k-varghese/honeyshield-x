import React, { useState } from 'react';
import {
  X,
  Lock,
  Code,
  Activity,
  BarChart3,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useRuleDetail, useRuleEfficacy } from '../hooks/useDetectionRules';
import { SeverityBadge } from './Badge';

interface RuleDetailDrawerProps {
  ruleId: string | null;
  onClose: () => void;
  onSimulateCandidate?: (ruleId: string) => void;
}

export const RuleDetailDrawer: React.FC<RuleDetailDrawerProps> = ({
  ruleId,
  onClose,
  onSimulateCandidate,
}) => {
  const [activeTab, setActiveTab] = useState<'criteria' | 'efficacy'>('criteria');
  const [timeRangeHours, setTimeRangeHours] = useState<number>(24);

  const { data: rule, isLoading: isRuleLoading } = useRuleDetail(ruleId || '', Boolean(ruleId));
  const { data: efficacy, isLoading: isEfficacyLoading } = useRuleEfficacy(
    ruleId || '',
    timeRangeHours,
    Boolean(ruleId)
  );

  if (!ruleId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d111a] border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {rule?.name || ruleId}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  {rule?.rule_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Canonical Vector: <span className="text-slate-300 font-semibold uppercase">{rule?.vector}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center space-x-4 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('criteria')}
            className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'criteria'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Rule Specification & Criteria</span>
          </button>

          <button
            onClick={() => setActiveTab('efficacy')}
            className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'efficacy'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Empirical Efficacy Telemetry</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isRuleLoading ? (
            <div className="py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
              Loading detection rule specification...
            </div>
          ) : activeTab === 'criteria' ? (
            <div className="space-y-5">
              {/* Frozen Immutability Banner */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Production Declarative Rule &bull; Frozen & Immutable</span>
                </div>
                <SeverityBadge severity={rule?.severity || 'low'} />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Description & Threat Scope
                </h4>
                <p className="text-xs text-slate-200 bg-slate-900 p-3 rounded border border-slate-800/80 leading-relaxed">
                  {rule?.description}
                </p>
              </div>

              {/* Criteria Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-mono block">Mechanism</span>
                  <span className="text-xs font-semibold text-slate-200 capitalize">{rule?.rule_type}</span>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-mono block">Time Window</span>
                  <span className="text-xs font-semibold text-slate-200">{rule?.window_minutes} minutes</span>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-mono block">Threshold</span>
                  <span className="text-xs font-semibold text-amber-400">{rule?.threshold_count} occurrences</span>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-mono block">Base Risk Score</span>
                  <span className="text-xs font-semibold text-rose-400">{rule?.base_risk_score.toFixed(1)} / 10.0</span>
                </div>
              </div>

              {/* Target Event Types */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Target Telemetry Event Types
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {rule?.target_event_types.map((ev) => (
                    <span
                      key={ev}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fast Substring Match Tokens */}
              {rule?.match_tokens && rule.match_tokens.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Fast Match Tokens (Substring Scanning)
                  </h4>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs space-y-1">
                    {rule.match_tokens.map((token, i) => (
                      <div key={i} className="text-emerald-400">
                        <span className="text-slate-600 mr-2">{i + 1}.</span>
                        <code>{token}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regex Patterns (Safely Escaped) */}
              {rule?.regex_patterns && rule.regex_patterns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Linear Non-Backtracking Regular Expressions
                  </h4>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs space-y-2 overflow-x-auto">
                    {rule.regex_patterns.map((pattern, i) => (
                      <div key={i} className="text-sky-300 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-600 block text-[10px] mb-0.5">Pattern #{i + 1}:</span>
                        <pre className="whitespace-pre-wrap break-all text-[11px]">{pattern}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empirical Efficacy Tab */
            <div className="space-y-5">
              {/* Lookback Selector */}
              <div className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 font-mono">Historical Telemetry Lookback:</span>
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
                  {[24, 72, 168].map((hrs) => (
                    <button
                      key={hrs}
                      onClick={() => setTimeRangeHours(hrs)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        timeRangeHours === hrs
                          ? 'bg-sky-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {hrs === 24 ? '24h' : hrs === 72 ? '3d' : '7d'}
                    </button>
                  ))}
                </div>
              </div>

              {isEfficacyLoading ? (
                <div className="py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
                  Aggregating historical telemetry across events...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono block">Total Triggers</span>
                      <span className="text-lg font-bold text-white font-mono">
                        {efficacy?.total_triggers ?? 0}
                      </span>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono block">Unique Attackers</span>
                      <span className="text-lg font-bold text-sky-400 font-mono">
                        {efficacy?.unique_attackers ?? 0}
                      </span>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono block">Correlated Rate</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {efficacy?.correlated_rate_pct?.toFixed(1) ?? 0}%
                      </span>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono block">Avg Risk Score</span>
                      <span className="text-lg font-bold text-amber-400 font-mono">
                        {efficacy?.avg_associated_risk_score?.toFixed(1) ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* False Positive Heuristic Indicator */}
                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-slate-200">False-Positive Heuristic Indicator</span>
                      </div>
                      <span className="font-mono text-purple-300 font-bold">
                        {efficacy?.false_positive_indicator !== null
                          ? `${efficacy?.false_positive_indicator?.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {efficacy?.false_positive_indicator_note}
                    </p>
                  </div>

                  {/* Top Attacking IPs for this Rule */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Top Attacking Entities (Rule Triggers)
                    </h4>
                    {efficacy?.top_attacking_ips && efficacy.top_attacking_ips.length > 0 ? (
                      <div className="divide-y divide-slate-800/80 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
                        {efficacy.top_attacking_ips.map((item) => (
                          <div key={item.source_ip} className="p-2.5 flex items-center justify-between">
                            <span className="text-sky-300">{item.source_ip}</span>
                            <span className="text-slate-400 font-medium">
                              {item.trigger_count} occurrences
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs bg-slate-950 rounded border border-slate-800">
                        No attack records currently associated with this rule in the selected window.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Rule Status: <span className="text-emerald-400 font-semibold">Active in Capstone Engine</span>
          </div>
          <button
            onClick={() => {
              onClose();
              if (onSimulateCandidate && rule) {
                onSimulateCandidate(rule.rule_id);
              }
            }}
            className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Adjusted Rule</span>
          </button>
        </div>
      </div>
    </div>
  );
};
