import React from 'react';
import { AlertLifecycleStatus, NotificationDeliveryStatus, SeverityLevel } from '../types';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const norm = severity.toLowerCase();
  switch (norm) {
    case 'critical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
          CRITICAL
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-800">
          HIGH
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-950 text-yellow-400 border border-yellow-800">
          MEDIUM
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          LOW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          {severity.toUpperCase()}
        </span>
      );
  }
};

interface StatusBadgeProps {
  status: AlertLifecycleStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status.toLowerCase();
  switch (norm) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-300 border border-rose-800/60">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-400 animate-pulse" />
          Open
        </span>
      );
    case 'acknowledged':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800/60">
          Acknowledged
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/60">
          Resolved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
};

interface NotificationBadgeProps {
  status: NotificationDeliveryStatus | string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ status }) => {
  const norm = status.toLowerCase();
  switch (norm) {
    case 'delivered':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
          Delivered
        </span>
      );
    case 'in_flight':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
          In Flight
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-red-950 text-red-300 border border-red-800">
          Failed
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
          Pending
        </span>
      );
  }
};
