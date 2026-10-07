import React from 'react';
import { Clock, Terminal, Globe, Shield } from 'lucide-react';
import { AttackEvent } from '../types';

interface EventTimelineProps {
  events: AttackEvent[];
  isLoading?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex space-x-3 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-800 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-sm">No security events recorded for this attack container yet.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((event) => {
        const isAuth = event.event_type.toLowerCase().includes('ssh') || event.event_type.toLowerCase().includes('auth') || event.event_type.toLowerCase().includes('login');
        const isWeb = event.event_type.toLowerCase().includes('web') || event.event_type.toLowerCase().includes('http');

        return (
          <div key={event.id} className="relative group">
            {/* Timeline node */}
            <div
              className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isAuth ? 'bg-amber-400' : isWeb ? 'bg-sky-400' : 'bg-purple-400'
              }`}
            />

            {/* Event Content Card */}
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-slate-800 text-slate-300">
                    {isAuth ? (
                      <Terminal className="w-3 h-3" />
                    ) : isWeb ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                  </span>
                  <span className="text-xs font-mono font-semibold text-sky-300">{event.event_type}</span>
                  {event.source_ip && (
                    <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      src: {event.source_ip}
                    </span>
                  )}
                </div>
                <time className="text-[11px] font-mono text-slate-500">
                  {new Date(event.event_time).toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>

              {/* Message safely rendered as plain text (NO dangerouslySetInnerHTML) */}
              <div className="mt-2 text-xs font-mono text-slate-300 bg-slate-900/90 p-2.5 rounded border border-slate-800/80 break-words whitespace-pre-wrap select-text">
                {event.message || '(Empty payload message)'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
