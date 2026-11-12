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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#94A6B8] font-mono">
            <Filter className="w-4 h-4 text-[#00D6C9]" />
            <span>Vector Filter:</span>
          </div>
          <div className="flex items-center space-x-1 bg-[#080D14] p-1 rounded-lg border border-[#1E2D3D] text-xs font-mono">
            {['all', 'auth', 'web', 'network'].map((v) => (
              <button
                key={v}
                onClick={() => setVectorFilter(v)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  vectorFilter === v
                    ? 'bg-[#00D6C9] text-[#080D14] font-semibold'
                    : 'text-[#94A6B8] hover:text-[#F0F5F8]'
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-[#94A6B8] font-mono ml-2">
            <span>Mechanism:</span>
          </div>
          <div className="flex items-center space-x-1 bg-[#080D14] p-1 rounded-lg border border-[#1E2D3D] text-xs font-mono">
            {['all', 'threshold', 'signature'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  typeFilter === t
                    ? 'bg-[#00D6C9] text-[#080D14] font-semibold'
                    : 'text-[#94A6B8] hover:text-[#F0F5F8]'
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
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] font-mono transition-colors flex items-center space-x-1.5 shadow-soc-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Candidate Rule Sandbox</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-[#94A6B8] text-xs font-mono animate-pulse">
          Loading declarative rule catalog...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#EF6268]/15 border border-[#EF6268]/30 text-[#EF6268] text-xs font-mono">
          Failed to load detection rules: {String(error)}
        </div>
      ) : data?.rules.length === 0 ? (
        <div className="p-8 text-center text-[#94A6B8] text-xs bg-[#111C29] rounded-xl border border-[#1E2D3D] font-mono">
          No detection rules match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="rounded-xl bg-[#111C29] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-all p-5 flex flex-col justify-between space-y-4 shadow-soc-sm"
            >
              <div className="space-y-3">
                {/* Header: Vector, Severity, Immutability */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#192737] text-[#00D6C9] border border-[#1E2D3D]">
                    Vector: {rule.vector}
                  </span>
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={rule.severity} />
                    <span
                      title="Production rules are immutable in code"
                      className="flex items-center space-x-1 text-[10px] text-[#94A6B8] bg-[#080D14] px-1.5 py-0.5 rounded border border-[#1E2D3D] font-mono"
                    >
                      <Lock className="w-2.5 h-2.5 text-[#94A6B8]" />
                      <span>FROZEN</span>
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-sm font-semibold text-[#F0F5F8] tracking-tight flex items-center space-x-1.5 font-mono">
                    <span>{rule.name}</span>
                  </h4>
                  <p className="text-xs text-[#94A6B8] mt-1 line-clamp-2 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                {/* Key Metrics / Attributes */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#080D14] p-2.5 rounded-lg border border-[#1E2D3D]">
                  <div>
                    <span className="text-[#94A6B8] block text-[10px]">Type / Window:</span>
                    <span className="text-[#F0F5F8] font-semibold capitalize">
                      {rule.rule_type} ({rule.window_minutes}m)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A6B8] block text-[10px]">Threshold / Score:</span>
                    <span className="text-[#E5B65A] font-semibold">
                      {rule.threshold_count} req &bull; {rule.base_risk_score.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Target Events */}
                <div>
                  <span className="text-[10px] text-[#94A6B8] font-mono block mb-1">Target Events:</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.target_event_types.map((ev) => (
                      <span
                        key={ev}
                        className="text-[10px] font-mono bg-[#080D14] text-[#94A6B8] px-1.5 py-0.5 rounded border border-[#1E2D3D]"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1E2D3D] flex items-center justify-between font-mono">
                <button
                  onClick={() => onSelectRule(rule.rule_id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D6C9]/15 text-[#00D6C9] hover:bg-[#00D6C9]/25 border border-[#00D6C9]/35 transition-colors flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Criteria</span>
                </button>

                <button
                  onClick={() => onOpenSimulation(rule)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] border border-transparent hover:border-[#1E2D3D] transition-colors flex items-center space-x-1"
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
