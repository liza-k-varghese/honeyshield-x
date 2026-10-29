import React, { useState } from 'react';
import {
  Filter,
  RotateCw,
} from 'lucide-react';
import { useAuditEvents } from '../hooks/useDetectionRules';
import { SeverityBadge } from './Badge';

export const AuditTrailView: React.FC = () => {
  const [limit, setLimit] = useState<number>(50);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [eventTypeFilter] = useState<string>('all');

  const { data, isLoading, refetch, isFetching } = useAuditEvents(
    limit,
    sourceFilter === 'all' ? undefined : sourceFilter,
    eventTypeFilter === 'all' ? undefined : eventTypeFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <Filter className="w-4 h-4 text-sky-400" />
            <span>Audit Source:</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
            {['all', 'operator_replay_studio', 'operator_simulation_sandbox', 'operator_console'].map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  sourceFilter === src
                    ? 'bg-sky-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {src === 'all' ? 'ALL SOURCES' : src.replace('operator_', '').replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-slate-400 font-mono">
            <span>Limit:</span>
            {[25, 50, 100].map((lim) => (
              <button
                key={lim}
                onClick={() => setLimit(lim)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  limit === lim ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'
                }`}
              >
                {lim}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Refresh Audit Events"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Stream */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
          Loading operator and system audit trail...
        </div>
      ) : data?.events.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-lg border border-slate-800">
          No audit records found matching the active filters.
        </div>
      ) : (
        <div className="rounded-lg bg-slate-900 border border-slate-800 divide-y divide-slate-800/80 shadow-sm overflow-hidden">
          {data?.events.map((ev) => (
            <div key={ev.id} className="p-4 hover:bg-slate-850/50 transition-colors space-y-1.5 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">#{ev.id}</span>
                  <span className="font-semibold text-sky-300">{ev.event_type}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {ev.source}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                  <span>{new Date(ev.created_at).toLocaleString()}</span>
                  <SeverityBadge severity={ev.severity} />
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] break-words">
                <code>{ev.message}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
