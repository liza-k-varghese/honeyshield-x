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
            <div className="w-2.5 h-2.5 rounded-full bg-[#192737] mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#192737] rounded w-1/3" />
              <div className="h-4 bg-[#192737] rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-[#94A6B8] border border-dashed border-[#1E2D3D] rounded-xl">
        <Clock className="w-8 h-8 mx-auto mb-2 text-[#5A6E82]" />
        <p className="text-sm">No security events recorded for this attack container yet.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1E2D3D]">
      {events.map((event) => {
        const isAuth = event.event_type.toLowerCase().includes('ssh') || event.event_type.toLowerCase().includes('auth') || event.event_type.toLowerCase().includes('login');
        const isWeb = event.event_type.toLowerCase().includes('web') || event.event_type.toLowerCase().includes('http');

        return (
          <div key={event.id} className="relative group">
            {/* Timeline node */}
            <div
              className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-[#111C29] ${
                isAuth ? 'bg-[#E5B65A]' : isWeb ? 'bg-[#00D6C9]' : 'bg-[#8B5CF6]'
              }`}
            />

            {/* Event Content Card */}
            <div className="p-3.5 rounded-lg bg-[#080D14] border border-[#1E2D3D] hover:border-[#00D6C9]/40 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-[#192737] text-[#94A6B8]">
                    {isAuth ? (
                      <Terminal className="w-3 h-3 text-[#E5B65A]" />
                    ) : isWeb ? (
                      <Globe className="w-3 h-3 text-[#00D6C9]" />
                    ) : (
                      <Shield className="w-3 h-3 text-[#8B5CF6]" />
                    )}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#F0F5F8] uppercase tracking-wide">
                    {event.event_type}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#94A6B8]">
                  <span>{new Date(event.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  {event.source_ip && (
                    <>
                      <span>•</span>
                      <span className="text-[#00D6C9]">{event.source_ip}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Event Payload / Message */}
              <div className="text-xs font-mono text-[#F0F5F8] bg-[#111C29] p-2.5 rounded border border-[#1E2D3D] break-all leading-relaxed select-text">
                {event.message}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
