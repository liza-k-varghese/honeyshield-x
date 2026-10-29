import React from 'react';
import { MitreCatalogEntry, CrossAttackEvent, AttackGraphResponse } from '../types';
import { Shield } from 'lucide-react';

interface MitreMatrixViewProps {
  catalog?: MitreCatalogEntry[];
  events?: CrossAttackEvent[];
  graph?: AttackGraphResponse;
}

interface TacticDefinition {
  id: string;
  name: string;
  order: number;
}

const TACTICS_KILLCHAIN: TacticDefinition[] = [
  { id: 'TA0043', name: 'Reconnaissance', order: 1 },
  { id: 'TA0042', name: 'Resource Development', order: 2 },
  { id: 'TA0001', name: 'Initial Access', order: 3 },
  { id: 'TA0002', name: 'Execution', order: 4 },
  { id: 'TA0003', name: 'Persistence', order: 5 },
  { id: 'TA0004', name: 'Privilege Escalation', order: 6 },
  { id: 'TA0005', name: 'Defense Evasion', order: 7 },
  { id: 'TA0006', name: 'Credential Access', order: 8 },
  { id: 'TA0007', name: 'Discovery', order: 9 },
  { id: 'TA0008', name: 'Lateral Movement', order: 10 },
  { id: 'TA0009', name: 'Collection', order: 11 },
  { id: 'TA0011', name: 'Command & Control', order: 12 },
  { id: 'TA0010', name: 'Exfiltration', order: 13 },
  { id: 'TA0040', name: 'Impact', order: 14 },
];

export const MitreMatrixView: React.FC<MitreMatrixViewProps> = ({ events = [], graph }) => {
  // Extract all observed MITRE mappings from events and graph nodes
  const observedByTactic = React.useMemo(() => {
    const map = new Map<
      string,
      Map<string, { techniqueId: string; techniqueName: string; confidence: number; source: string; count: number }>
    >();

    // From events
    events.forEach((ev) => {
      if (ev.mitre) {
        const tacticId = ev.mitre.tactic_id;
        if (!map.has(tacticId)) {
          map.set(tacticId, new Map());
        }
        const techMap = map.get(tacticId)!;
        const techKey = ev.mitre.technique_id;
        if (!techMap.has(techKey)) {
          techMap.set(techKey, {
            techniqueId: ev.mitre.technique_id,
            techniqueName: ev.mitre.technique_name,
            confidence: ev.mitre.confidence,
            source: ev.mitre.source,
            count: 1,
          });
        } else {
          techMap.get(techKey)!.count += 1;
        }
      }
    });

    // From graph nodes
    if (graph) {
      graph.nodes.forEach((node) => {
        if (node.tactic_id && node.technique_id) {
          const tacticId = node.tactic_id;
          if (!map.has(tacticId)) {
            map.set(tacticId, new Map());
          }
          const techMap = map.get(tacticId)!;
          if (!techMap.has(node.technique_id)) {
            techMap.set(node.technique_id, {
              techniqueId: node.technique_id,
              techniqueName: node.technique_name || node.label,
              confidence: 0.9,
              source: node.stage,
              count: node.event_count || 1,
            });
          }
        }
      });
    }

    return map;
  }, [events, graph]);

  const activeTacticCount = observedByTactic.size;
  const totalObservedTechniques = Array.from(observedByTactic.values()).reduce(
    (acc, m) => acc + m.size,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">MITRE ATT&CK Matrix Alignment</span>
          <span className="text-xs text-slate-400">Enterprise v14 Framework</span>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-slate-400">
            Active Tactics:{' '}
            <strong className="text-sky-400">{activeTacticCount}</strong> / 14
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Mapped Techniques:{' '}
            <strong className="text-emerald-400">{totalObservedTechniques}</strong>
          </span>
        </div>
      </div>

      {/* Grid of ATT&CK Tactics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {TACTICS_KILLCHAIN.map((tactic) => {
          const techniquesMap = observedByTactic.get(tactic.id);
          const isActive = !!techniquesMap && techniquesMap.size > 0;
          const techniques = techniquesMap ? Array.from(techniquesMap.values()) : [];

          return (
            <div
              key={tactic.id}
              className={`flex flex-col rounded-lg border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-sky-500/40 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              {/* Tactic Column Header */}
              <div
                className={`p-2.5 border-b flex flex-col justify-between ${
                  isActive
                    ? 'border-sky-500/30 bg-sky-950/20'
                    : 'border-slate-800/60 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{tactic.id}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  )}
                </div>
                <h4
                  className={`text-xs font-semibold mt-0.5 truncate ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                  title={tactic.name}
                >
                  {tactic.name}
                </h4>
              </div>

              {/* Observed Techniques List */}
              <div className="p-2 flex-1 space-y-2">
                {isActive ? (
                  techniques.map((tech) => (
                    <div
                      key={tech.techniqueId}
                      className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-sky-400">
                          {tech.techniqueId}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 rounded">
                          {tech.count} ev
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-tight">
                        {tech.techniqueName}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                        <span>conf: {(tech.confidence * 100).toFixed(0)}%</span>
                        <span className="truncate max-w-[80px]" title={tech.source}>
                          {tech.source}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-[11px] font-mono text-slate-600">
                    No activity
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
