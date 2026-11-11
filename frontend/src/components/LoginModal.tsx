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
      <div className="w-full max-w-md bg-[#111C29] border border-[#1E2D3D] rounded-2xl shadow-soc-lg p-6 text-[#F0F5F8] relative">
        {/* Close Button if dismissible */}
        {onClose && !isSessionExpired && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D6C9]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div className="p-2.5 bg-[#00D6C9]/10 border border-[#00D6C9]/30 rounded-xl text-[#00D6C9] shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#F0F5F8] font-sans">
              HoneyShield-X SOC Console
            </h2>
            <p className="text-xs text-[#94A6B8] font-sans">
              Unified Security Operations
            </p>
            <p className="text-[11px] font-mono text-[#00D6C9] mt-0.5">
              Detect. Deceive. Defend.
            </p>
          </div>
        </div>

        {isSessionExpired && (
          <div className="mb-4 p-3 bg-[#E5B65A]/15 border border-[#E5B65A]/35 rounded-xl flex items-center space-x-2 text-[#E5B65A] text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#E5B65A]" />
            <span>Your SOC session has expired. Please re-authenticate.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-[#EF6268]/15 border border-[#EF6268]/35 rounded-xl text-[#EF6268] text-xs font-mono">
            {error}
          </div>
        )}

        {/* Tab Controls: Operator Login vs Break-Glass */}
        <div className="flex border-b border-[#1E2D3D] mb-5 text-xs font-mono">
          <button
            type="button"
            className={`pb-2.5 px-3 font-medium transition-colors ${
              !isBreakGlassMode
                ? 'border-b-2 border-[#00D6C9] text-[#00D6C9] font-bold'
                : 'text-[#94A6B8] hover:text-[#F0F5F8]'
            }`}
            onClick={() => setIsBreakGlassMode(false)}
          >
            Operator Sign In
          </button>
          <button
            type="button"
            className={`pb-2.5 px-3 font-medium transition-colors flex items-center space-x-1.5 ${
              isBreakGlassMode
                ? 'border-b-2 border-[#EF6268] text-[#EF6268] font-bold'
                : 'text-[#94A6B8] hover:text-[#F0F5F8]'
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
                <label className="block text-xs font-medium text-[#F0F5F8] mb-1.5">
                  Operator Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-[#94A6B8] pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#080D14] border border-[#1E2D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F0F5F8] placeholder-[#5A6E82] focus:outline-none focus:border-[#00D6C9] focus:ring-1 focus:ring-[#00D6C9] font-mono transition-colors"
                    placeholder="e.g. analyst_sarah"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#F0F5F8] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#94A6B8] pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#080D14] border border-[#1E2D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F0F5F8] placeholder-[#5A6E82] focus:outline-none focus:border-[#00D6C9] focus:ring-1 focus:ring-[#00D6C9] font-mono transition-colors"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Seeded Quick Personas */}
              <div className="pt-1">
                <span className="text-[11px] text-[#94A6B8] block mb-1.5 font-mono">
                  Seeded Operator Accounts:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('responder_alex', 'ResponderPass123!')}
                    className="p-2 bg-[#192737] hover:bg-[#1E2D3D] text-[#00D6C9] rounded-lg border border-[#1E2D3D] hover:border-[#00D6C9]/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Responder Alex</span>
                    <span className="text-[10px] text-[#94A6B8] block">Incident Triage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('analyst_sarah', 'AnalystPass123!')}
                    className="p-2 bg-[#192737] hover:bg-[#1E2D3D] text-[#E5B65A] rounded-lg border border-[#1E2D3D] hover:border-[#E5B65A]/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Analyst Sarah</span>
                    <span className="text-[10px] text-[#94A6B8] block">Threat Intel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('admin_chief', 'AdminPass123!')}
                    className="p-2 bg-[#192737] hover:bg-[#1E2D3D] text-[#A78BFA] rounded-lg border border-[#1E2D3D] hover:border-[#8B5CF6]/40 text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Admin Chief</span>
                    <span className="text-[10px] text-[#94A6B8] block">Sec Administrator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPersona('viewer_dan', 'ViewerPass123!')}
                    className="p-2 bg-[#192737] hover:bg-[#1E2D3D] text-[#94A6B8] rounded-lg border border-[#1E2D3D] hover:border-[#5A6E82] text-left transition-colors font-mono"
                  >
                    <span className="font-semibold block text-[11px]">Viewer Dan</span>
                    <span className="text-[10px] text-[#94A6B8] block">Read-Only Observer</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#EF6268] mb-1.5">
                  Break-Glass Passphrase
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#EF6268] pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full bg-[#080D14] border border-[#EF6268]/40 rounded-lg pl-9 pr-3 py-2 text-xs text-[#F0F5F8] placeholder-[#5A6E82] focus:outline-none focus:border-[#EF6268] font-mono"
                    placeholder="Sealed emergency passphrase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F0F5F8] mb-1.5">
                  Emergency Justification (minimum 20 characters)
                </label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-[#080D14] border border-[#1E2D3D] rounded-lg p-2.5 text-xs text-[#F0F5F8] placeholder-[#5A6E82] focus:outline-none focus:border-[#EF6268] font-sans"
                  placeholder="Detail the operational security emergency..."
                />
              </div>

              <div className="p-3 bg-[#EF6268]/10 border border-[#EF6268]/30 rounded-lg text-xs text-[#EF6268] leading-relaxed font-sans">
                Emergency Break-Glass issues a time-boxed 30-minute Security Administrator session and broadcasts an immutable audit log to all active SOC screens.
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            {onClose && !isSessionExpired && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#192737] hover:bg-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8] text-xs font-medium rounded-lg transition-colors border border-[#1E2D3D]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-colors flex items-center space-x-2 font-mono ${
                isBreakGlassMode
                  ? 'bg-[#EF6268] hover:bg-[#EF6268]/90 text-[#F0F5F8]'
                  : 'bg-[#00D6C9] hover:bg-[#00BFB3] text-[#080D14]'
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
