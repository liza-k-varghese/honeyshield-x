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
    if (severityFilter !== 'all' && alert.severity.toLowerCase() !== severityFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
      {/* Controls & Filter Toolbar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Active Alert Feed</h2>
          <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
            {filteredAlerts.length} total
          </span>
        </div>

        {/* Status & Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            {(['all', 'open', 'acknowledged', 'resolved'] as (AlertLifecycleStatus | 'all')[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Dropdown Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Severity: All</option>
              <option value="critical" className="bg-slate-900">Critical</option>
              <option value="high" className="bg-slate-900">High</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="low" className="bg-slate-900">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/20 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Alert ID</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Alert Type / Message</th>
              <th className="py-3 px-4">Attack ID</th>
              <th className="py-3 px-4">Created Time</th>
              <th className="py-3 px-4">Lifecycle</th>
              <th className="py-3 px-4">Transport</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              // Loading Skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-12" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-12" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-24" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-slate-800 rounded w-6 ml-auto" /></td>
                </tr>
              ))
            ) : filteredAlerts.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-sm">No security alerts matching the current filter.</p>
                  <p className="text-xs text-slate-600 mt-1">Try switching status or severity filters.</p>
                </td>
              </tr>
            ) : (
              // Alert Rows
              filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert(alert)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-300">
                    #{alert.id}
                  </td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={alert.severity as SeverityLevel} />
                  </td>
                  <td className="py-3 px-4 max-w-xs md:max-w-md">
                    <div className="font-medium text-white truncate">{alert.alert_type}</div>
                    <div className="text-[11px] text-slate-400 truncate">{alert.message}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sky-400">
                    {alert.attack_id ? `#${alert.attack_id}` : 'None'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status as AlertLifecycleStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <NotificationBadge status={alert.notification_status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex p-1 rounded text-slate-400 group-hover:text-white group-hover:bg-slate-800 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
