import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, Key, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isSessionExpired?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, isSessionExpired }) => {
  const { login, breakGlass, clearSessionExpired } = useAuth();
  const [isBreakGlassMode, setIsBreakGlassMode] = useState(false);
  const [username, setUsername] = useState('responder_alex');
  const [password, setPassword] = useState('ResponderPass123!');
  const [passphrase, setPassphrase] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen && !isSessionExpired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isBreakGlassMode) {
        if (justification.trim().length < 20) {
          setError('Justification must be at least 20 characters');
          setLoading(false);
          return;
        }
        await breakGlass(passphrase, justification);
      } else {
        await login(username, password);
      }
      clearSessionExpired();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setIsBreakGlassMode(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#0B1020] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        {/* Close Button if dismissible */}
        {onClose && !isSessionExpired && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              HoneyShield-X SOC Console
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Unified Security Operations
            </p>
            <p className="text-[11px] font-mono text-cyan-400 mt-0.5">
              Detect. Deceive. Defend.
            </p>
          </div>
        </div>

        {isSessionExpired && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-amber-300 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Your SOC session has expired. Please re-authenticate.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Tab Controls: Operator Login vs Break-Glass */}
        <div className="flex border-b border-slate-800 mb-5 text-xs font-mono">
          <button
            type="button"
            className={`pb-2.5 px-3 font-medium transition-colors ${
              !isBreakGlassMode
                ? 'border-b-2 border-cyan-400 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setIsBreakGlassMode(false)}
          >
            Operator Sign In
          </button>
          <button
            type="button"
            className={`pb-2.5 px-3 font-medium transition-colors flex items-center space-x-1.5 ${
              isBreakGlassMode
                ? 'border-b-2 border-red-500 text-red-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setIsBreakGlassMode(true)}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Break-Glass Emergency</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBreakGlassMode ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Operator Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                    placeholder="e.g. analyst_sarah"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Seeded Quick Personas */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-mono">
                  Seeded Operator Accounts:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('responder_alex', 'ResponderPass123!')}
                    className="p-2 bg-slate-900 hover:bg-slate-850 text-cyan-300 rounded-lg border border-slate-800 hover:border-cyan-500/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Responder Alex</span>
                    <span className="text-[10px] text-slate-500 block">Incident Triage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('analyst_sarah', 'AnalystPass123!')}
                    className="p-2 bg-slate-900 hover:bg-slate-850 text-amber-300 rounded-lg border border-slate-800 hover:border-amber-500/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Analyst Sarah</span>
                    <span className="text-[10px] text-slate-500 block">Threat Intel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('admin_chief', 'AdminPass123!')}
                    className="p-2 bg-slate-900 hover:bg-slate-850 text-purple-300 rounded-lg border border-slate-800 hover:border-purple-500/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Admin Chief</span>
                    <span className="text-[10px] text-slate-500 block">Sec Administrator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('viewer_dan', 'ViewerPass123!')}
                    className="p-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 hover:border-slate-700 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Viewer Dan</span>
                    <span className="text-[10px] text-slate-500 block">Read-Only Observer</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-red-300 mb-1.5">
                  Break-Glass Passphrase
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-red-500 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full bg-slate-900 border border-red-900/60 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                    placeholder="Sealed emergency passphrase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Emergency Justification (minimum 20 characters)
                </label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-sans"
                  placeholder="Detail the operational security emergency..."
                />
              </div>

              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-300 leading-relaxed font-sans">
                Emergency Break-Glass issues a time-boxed 30-minute Security Administrator session and broadcasts an immutable audit log to all active SOC screens.
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            {onClose && !isSessionExpired && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-800"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-2 font-mono ${
                isBreakGlassMode
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              } disabled:opacity-50`}
            >
              <span>{loading ? 'Authenticating...' : isBreakGlassMode ? 'Engage Emergency Break-Glass' : 'Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
