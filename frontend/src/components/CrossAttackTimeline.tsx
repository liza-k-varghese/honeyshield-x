import React, { useState } from 'react';
import { CrossAttackEvent } from '../types';
import { Clock, Hash, Search } from 'lucide-react';

interface CrossAttackTimelineProps {
  events: CrossAttackEvent[];
  isLoading?: boolean;
}

export const CrossAttackTimeline: React.FC<CrossAttackTimelineProps> = ({ events, isLoading }) => {
  const [filterText, setFilterText] = useState('');

  const filteredEvents = React.useMemo(() => {
    if (!filterText.trim()) return events;
    const lower = filterText.toLowerCase();
    return events.filter(
      (ev) =>
        ev.event_type.toLowerCase().includes(lower) ||
        (ev.message && ev.message.toLowerCase().includes(lower)) ||
        (ev.mitre &&
          (ev.mitre.technique_id.toLowerCase().includes(lower) ||
            ev.mitre.technique_name.toLowerCase().includes(lower) ||
            ev.mitre.tactic_name.toLowerCase().includes(lower)))
    );
  }, [events, filterText]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 font-mono text-sm animate-pulse">
        Loading cross-attack event timeline...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">
            Chronological Cross-Attack Event Stream
          </span>
          <span className="text-xs font-mono text-slate-400">
            ({filteredEvents.length} of {events.length} events)
          </span>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter events, techniques..."
            className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm border border-slate-800 rounded-lg bg-slate-950/40">
          No events match the current filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEvents.map((ev, idx) => (
            <div
              key={ev.id || idx}
              className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
            >
              {/* Event Metadata Line */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {new Date(ev.event_time).toLocaleString()}
                  </span>

                  <span className="font-mono text-[11px] text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/60 font-semibold">
                    {ev.event_type}
                  </span>

                  <span className="font-mono text-[11px] text-slate-400 flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span>Attack #{ev.attack_id}</span>
                  </span>
                </div>

                {/* MITRE Technique Badge */}
                {ev.mitre && (
                  <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                    <span className="bg-purple-950/50 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded font-bold">
                      {ev.mitre.technique_id}
                    </span>
                    <span className="text-slate-400 hidden sm:inline">
                      {ev.mitre.technique_name}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      ({ev.mitre.tactic_name})
                    </span>
                  </div>
                )}
              </div>

              {/* Event Payload / Message (Safe Plain Text Rendering) */}
              {ev.message && (
                <div>
                  <pre className="text-xs font-mono text-slate-300 break-all whitespace-pre-wrap bg-slate-950 p-2.5 rounded border border-slate-850 select-text">
                    {ev.message}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
