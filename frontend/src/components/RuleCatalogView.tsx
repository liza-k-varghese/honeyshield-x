import React, { useState } from 'react';
import {
  Filter,
  Eye,
  Sliders,
  Lock,
} from 'lucide-react';
import { useDetectionRules } from '../hooks/useDetectionRules';
import { DetectionRuleSummary } from '../types';
import { SeverityBadge } from './Badge';

interface RuleCatalogViewProps {
  onSelectRule: (ruleId: string) => void;
  onOpenSimulation: (rule?: DetectionRuleSummary) => void;
}

export const RuleCatalogView: React.FC<RuleCatalogViewProps> = ({
  onSelectRule,
  onOpenSimulation,
}) => {
  const [vectorFilter, setVectorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading, error } = useDetectionRules(
    vectorFilter === 'all' ? undefined : vectorFilter,
    typeFilter === 'all' ? undefined : typeFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-sky-400" />
            <span>Vector Filter:</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
            {['all', 'auth', 'web', 'network'].map((v) => (
              <button
                key={v}
                onClick={() => setVectorFilter(v)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  vectorFilter === v
                    ? 'bg-sky-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 ml-2">
            <span>Mechanism:</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
            {['all', 'threshold', 'signature'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  typeFilter === t
                    ? 'bg-sky-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenSimulation()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Candidate Rule Sandbox</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
          Loading declarative rule catalog...
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          Failed to load detection rules: {String(error)}
        </div>
      ) : data?.rules.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-lg border border-slate-800">
          No detection rules match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                {/* Header: Vector, Severity, Immutability */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                    Vector: {rule.vector}
                  </span>
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={rule.severity} />
                    <span
                      title="Production rules are immutable in code"
                      className="flex items-center space-x-1 text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                      <span>FROZEN</span>
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5">
                    <span>{rule.name}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                {/* Key Metrics / Attributes */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/70 p-2.5 rounded border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Type / Window:</span>
                    <span className="text-slate-300 font-semibold capitalize">
                      {rule.rule_type} ({rule.window_minutes}m)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Threshold / Score:</span>
                    <span className="text-amber-400 font-semibold">
                      {rule.threshold_count} req &bull; {rule.base_risk_score.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Target Events */}
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block mb-1">Target Events:</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.target_event_types.map((ev) => (
                      <span
                        key={ev}
                        className="text-[10px] font-mono bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => onSelectRule(rule.rule_id)}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 transition-colors flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Criteria</span>
                </button>

                <button
                  onClick={() => onOpenSimulation(rule)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center space-x-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Test Adjustment</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
