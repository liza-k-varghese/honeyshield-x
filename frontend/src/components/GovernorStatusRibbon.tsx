import React, { useState } from 'react';
import { Shield, ShieldAlert, Activity, Wifi, WifiOff, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { useGovernorStatus, useToggleGovernorLockout } from '../hooks/useIncidentCommand';
import { StreamConnectionStatus } from '../hooks/useIncidentStream';

interface GovernorStatusRibbonProps {
  streamStatus: StreamConnectionStatus;
  operatorId?: string;
}

export const GovernorStatusRibbon: React.FC<GovernorStatusRibbonProps> = ({
  streamStatus,
  operatorId = 'soc_operator',
}) => {
  const { data: governor, isLoading } = useGovernorStatus(operatorId);
  const toggleLockoutMutation = useToggleGovernorLockout();
  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [justification, setJustification] = useState('');

  if (isLoading || !governor) {
    return (
      <div className="bg-[#111726] border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-cyan-400" />
          Loading Governor Telemetry...
        </span>
      </div>
    );
  }

  const cb = governor.circuit_breaker;
  const isBreakerOpen = cb.state === 'OPEN';
  const isBreakerHalfOpen = cb.state === 'HALF_OPEN';

  const handleToggleLockout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim() || justification.trim().length < 5) return;
    toggleLockoutMutation.mutate({
      engaged: !governor.lockout_engaged,
      justification: justification.trim(),
      operatorId,
    });
    setShowLockoutModal(false);
    setJustification('');
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* 1. Live Stream Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          {streamStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-emerald-400 font-medium">STREAM ACTIVE (SSE)</span>
            </>
          ) : streamStatus === 'connecting' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-amber-400 font-medium">CONNECTING...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-mono text-rose-400 font-medium">STREAM OFFLINE (POLLING)</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Governor Rate Limiting & Cooldowns */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Rate Limit:</span>
          <span className="font-mono font-semibold text-slate-200">
            {governor.operator_actions_last_minute} / {governor.operator_rate_limit_max}
          </span>
          <span className="text-slate-500">act/min</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Entity Cooldowns:</span>
          <span className="font-mono font-semibold text-slate-200">
            {governor.active_cooldowns_count}
          </span>
          <span className="text-slate-500">active</span>
        </div>
      </div>

      {/* 3. Circuit Breaker Status */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono ${
            isBreakerOpen
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              : isBreakerHalfOpen
              ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          {isBreakerOpen ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          ) : isBreakerHalfOpen ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>
            BREAKER: {cb.state}
            {isBreakerOpen && ` (${cb.cooldown_remaining_seconds}s)`}
          </span>
        </div>
      </div>

      {/* 4. Emergency Lockout Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowLockoutModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition ${
            governor.lockout_engaged
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
          title="Emergency Lockout freezes all outbound notification dispatches"
        >
          {governor.lockout_engaged ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>LOCKOUT ENGAGED</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
              <span>ENGAGE LOCKOUT</span>
            </>
          )}
        </button>
      </div>

      {/* Modal for Lockout Toggle */}
      {showLockoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                {governor.lockout_engaged ? 'Release Governor Lockout' : 'Engage Emergency Outbound Lockout'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {governor.lockout_engaged
                ? 'Releasing lockout will restore outbound notification dispatching to configured webhook providers.'
                : 'Engaging lockout will immediately reject all outbound notification dispatches (HTTP 503 fail-closed). Internal alert triage remains functional.'}
            </p>
            <form onSubmit={handleToggleLockout} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Mandatory Operator Justification (min 5 characters):
                </label>
                <textarea
                  required
                  minLength={5}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Reason for emergency lockout action..."
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLockoutModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={justification.trim().length < 5 || toggleLockoutMutation.isPending}
                  className={`px-3 py-1.5 rounded text-xs font-medium text-white transition ${
                    governor.lockout_engaged
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  } disabled:opacity-50`}
                >
                  {toggleLockoutMutation.isPending
                    ? 'Processing...'
                    : governor.lockout_engaged
                    ? 'Confirm Release'
                    : 'Confirm Lockout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
