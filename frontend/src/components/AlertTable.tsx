import React, { useState } from 'react';
import { Filter, ChevronRight, ShieldAlert } from 'lucide-react';
import { Alert, AlertLifecycleStatus, SeverityLevel } from '../types';
import { NotificationBadge, SeverityBadge, StatusBadge } from './Badge';

interface AlertTableProps {
  alerts: Alert[];
  isLoading?: boolean;
  onSelectAlert: (alert: Alert) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  isLoading,
  onSelectAlert,
  statusFilter,
  onStatusFilterChange,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== 'all' && (alert.severity || '').toLowerCase() !== severityFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-[#111C29] rounded-xl border border-[#1E2D3D] shadow-soc-sm overflow-hidden">
      {/* Controls & Filter Toolbar */}
      <div className="p-4 border-b border-[#1E2D3D] bg-[#111C29] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-[#00D6C9]" />
          <h2 className="text-sm font-semibold text-[#F0F5F8]">Active Alert Feed</h2>
          <span className="text-xs font-mono text-[#94A6B8] px-2 py-0.5 rounded-full bg-[#192737] border border-[#1E2D3D]">
            {filteredAlerts.length} total
          </span>
        </div>

        {/* Status & Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-lg bg-[#080D14] p-1 border border-[#1E2D3D] text-xs">
            {(['all', 'open', 'acknowledged', 'resolved'] as (AlertLifecycleStatus | 'all')[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/35'
                    : 'text-[#94A6B8] hover:text-[#F0F5F8]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Dropdown Filter */}
          <div className="flex items-center space-x-1.5 bg-[#080D14] px-2.5 py-1 rounded-lg border border-[#1E2D3D] text-xs text-[#94A6B8]">
            <Filter className="w-3 h-3 text-[#94A6B8]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs text-[#F0F5F8] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#111C29] text-[#F0F5F8]">Severity: All</option>
              <option value="critical" className="bg-[#111C29] text-[#EF6268]">Critical</option>
              <option value="high" className="bg-[#111C29] text-[#E5B65A]">High</option>
              <option value="medium" className="bg-[#111C29] text-[#E5B65A]">Medium</option>
              <option value="low" className="bg-[#111C29] text-[#48C99B]">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1E2D3D] bg-[#080D14] text-[11px] font-mono text-[#94A6B8] uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Alert ID</th>
              <th className="py-3 px-4 font-medium">Severity</th>
              <th className="py-3 px-4 font-medium">Alert Type / Message</th>
              <th className="py-3 px-4 font-medium">Attack ID</th>
              <th className="py-3 px-4 font-medium">Created Time</th>
              <th className="py-3 px-4 font-medium">Lifecycle</th>
              <th className="py-3 px-4 font-medium">Transport</th>
              <th className="py-3 px-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2D3D]/60 text-xs font-sans">
            {isLoading ? (
              // Loading Skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-12" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-16" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-48" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-12" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-24" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-20" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-[#192737] rounded w-16" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-[#192737] rounded w-6 ml-auto" /></td>
                </tr>
              ))
            ) : filteredAlerts.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#94A6B8]">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#5A6E82]" />
                  <p className="font-medium text-sm text-[#F0F5F8]">No security alerts matching the current filter.</p>
                  <p className="text-xs text-[#94A6B8] mt-1">Try switching status or severity filters.</p>
                </td>
              </tr>
            ) : (
              // Alert Rows
              filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert(alert)}
                  className="hover:bg-[#192737]/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-medium text-[#F0F5F8]">
                    #{alert.id}
                  </td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={alert.severity as SeverityLevel} />
                  </td>
                  <td className="py-3 px-4 max-w-xs md:max-w-md">
                    <div className="font-medium text-[#F0F5F8] truncate">{alert.alert_type}</div>
                    <div className="text-[11px] text-[#94A6B8] truncate">{alert.message}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#00D6C9]">
                    {alert.attack_id ? `#${alert.attack_id}` : 'None'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#94A6B8] whitespace-nowrap">
                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status as AlertLifecycleStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <NotificationBadge status={alert.notification_status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex p-1 rounded text-[#94A6B8] group-hover:text-[#00D6C9] group-hover:bg-[#192737] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch-Friendly Card View (screens < md) */}
      <div className="md:hidden divide-y divide-[#1E2D3D]">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 space-y-2 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-[#192737] rounded w-16" />
                <div className="h-4 bg-[#192737] rounded w-20" />
              </div>
              <div className="h-4 bg-[#192737] rounded w-3/4" />
              <div className="h-3 bg-[#192737] rounded w-1/2" />
            </div>
          ))
        ) : filteredAlerts.length === 0 ? (
          <div className="py-10 text-center text-[#94A6B8] px-4">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#5A6E82]" />
            <p className="font-medium text-sm text-[#F0F5F8]">No security alerts matching filter.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              className="p-3.5 hover:bg-[#192737]/70 active:bg-[#192737] transition-colors cursor-pointer flex items-center justify-between gap-3 min-h-[56px]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#94A6B8]">ID #{alert.id}</span>
                  <SeverityBadge severity={alert.severity as SeverityLevel} />
                  <StatusBadge status={alert.status as AlertLifecycleStatus} />
                </div>
                <div className="font-semibold text-xs text-[#F0F5F8] truncate font-mono">
                  Vector: {alert.alert_type}
                </div>
                <p className="text-[11px] text-[#94A6B8] truncate">
                  {alert.message}
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-[#5A6E82]">
                  <span>{alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                  {alert.attack_id && (
                    <>
                      <span>&bull;</span>
                      <span className="text-[#00D6C9]">Attack #{alert.attack_id}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 p-1 rounded text-[#94A6B8]">
                <ChevronRight className="w-5 h-5 text-[#00D6C9]" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
