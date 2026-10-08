import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, Key } from 'lucide-react';
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
  const [passphrase, setPassphrase] = useState('HoneyShield-SOC-Emergency-BreakGlass-2026!');
  const [justification, setJustification] = useState('Active ransomware containment incident response authorization');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">HoneyShield-X SOC Console</h2>
            <p className="text-xs text-slate-400">Deterministic Operator Authentication (Module 3.5)</p>
          </div>
        </div>

        {isSessionExpired && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center space-x-2 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Your SOC session has expired. Please re-authenticate.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex border-b border-slate-800 mb-4 text-sm">
          <button
            type="button"
            className={`pb-2 px-3 font-medium transition-colors ${
              !isBreakGlassMode
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setIsBreakGlassMode(false)}
          >
            Operator Login
          </button>
          <button
            type="button"
            className={`pb-2 px-3 font-medium transition-colors flex items-center space-x-1 ${
              isBreakGlassMode
                ? 'border-b-2 border-red-500 text-red-400'
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operator Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. analyst_sarah"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-1">
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Quick SOC Personas:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('viewer_dan', 'ViewerPass123!')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-left transition-colors"
                  >
                    Viewer Dan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('analyst_sarah', 'AnalystPass123!')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 text-left transition-colors"
                  >
                    Analyst Sarah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('responder_alex', 'ResponderPass123!')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-left transition-colors"
                  >
                    Responder Alex
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('admin_chief', 'AdminPass123!')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-slate-700 text-left transition-colors"
                  >
                    Admin Chief
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-red-300 mb-1">Break-Glass Passphrase</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-red-500" />
                  <input
                    type="password"
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full bg-slate-950 border border-red-900/60 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                    placeholder="Sealed emergency passphrase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Justification (minimum 20 characters)
                </label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  placeholder="Detail the operational security emergency..."
                />
              </div>

              <div className="p-2.5 bg-red-950/40 border border-red-800/50 rounded text-xs text-red-300">
                Warning: Break-glass generates a time-boxed 30-minute Security Administrator session and broadcasts an alert to all SOC screens.
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            {onClose && !isSessionExpired && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                isBreakGlassMode
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-blue-600 hover:bg-blue-500'
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
