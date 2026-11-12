import React from 'react';
import { AlertLifecycleStatus, NotificationDeliveryStatus, SeverityLevel } from '../types';

interface SeverityBadgeProps {
  severity?: SeverityLevel | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const norm = (severity || 'low').toLowerCase();
  switch (norm) {
    case 'critical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/35 shadow-sm">
          CRITICAL
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/35 shadow-sm">
          HIGH
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider bg-[#E5B65A]/10 text-[#E5B65A] border border-[#E5B65A]/25">
          MEDIUM
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/35 shadow-sm">
          LOW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wider bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]">
          {severity ? severity.toUpperCase() : 'UNKNOWN'}
        </span>
      );
  }
};

interface StatusBadgeProps {
  status?: AlertLifecycleStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = (status || 'open').toLowerCase();
  switch (norm) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/30">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#EF6268] animate-pulse" />
          Open
        </span>
      );
    case 'acknowledged':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/30">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#E5B65A]" />
          Acknowledged
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/30">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#48C99B]" />
          Resolved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]">
          {status}
        </span>
      );
  }
};

interface NotificationBadgeProps {
  status?: NotificationDeliveryStatus | string | null;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ status }) => {
  const norm = (status || 'pending').toLowerCase();
  switch (norm) {
    case 'delivered':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/30">
          Delivered
        </span>
      );
    case 'in_flight':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/30">
          In Flight
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/30">
          Failed
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#192737] text-[#94A6B8] border border-[#1E2D3D]">
          Pending
        </span>
      );
  }
};
