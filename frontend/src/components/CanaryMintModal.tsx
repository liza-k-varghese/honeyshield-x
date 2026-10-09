import React, { useState } from 'react';
import {
  X,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Key,
  Database,
  FileCode,
  Globe,
  FileText,
} from 'lucide-react';
import { useMintCanary } from '../hooks/useDeception';
import { CanaryType, CanaryToken } from '../types';

interface CanaryMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCanaryMinted?: (canary: CanaryToken) => void;
}

const CANARY_TYPES: Array<{
  type: CanaryType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'AWS_API_KEY',
    label: 'AWS IAM Decoy Key',
    description: 'Inert AWS AKIA/Secret credential pair embedded in fake configs or repositories',
    icon: Key,
  },
  {
    type: 'DATABASE_CREDENTIAL',
    label: 'Database Decoy Connection',
    description: 'Inert PostgreSQL/MySQL connection string pointing to trap listener port',
    icon: Database,
  },
  {
    type: 'SERVICE_API_TOKEN',
    label: 'Internal Service Token',
    description: 'Decoy hsx_live_ Bearer token for simulated internal API access',
    icon: FileCode,
  },
  {
    type: 'WEB_TRIPWIRE_ENDPOINT',
    label: 'Web Tripwire Endpoint',
    description: 'Public Canary validation URL tripwire designed to trigger on HTTP hit',
    icon: Globe,
  },
  {
    type: 'CANARY_FILE_BEACON',
    label: 'Canary Configuration Beacon',
    description: 'Safe static text template with embedded tripwire token comment',
    icon: FileText,
  },
];

export const CanaryMintModal: React.FC<CanaryMintModalProps> = ({
  isOpen,
  onClose,
  onCanaryMinted,
}) => {
  const mintMutation = useMintCanary();

  const [name, setName] = useState<string>('');
  const [canaryType, setCanaryType] = useState<CanaryType>('AWS_API_KEY');
  const [environment, setEnvironment] = useState<string>('production');
  const [placementHint, setPlacementHint] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [mintedCanary, setMintedCanary] = useState<CanaryToken | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setName('');
    setCanaryType('AWS_API_KEY');
    setEnvironment('production');
    setPlacementHint('');
    setFormError(null);
    setMintedCanary(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    if (cleanName.length < 3 || cleanName.length > 100) {
      setFormError('Canary name must be between 3 and 100 characters.');
      return;
    }

    try {
      const created = await mintMutation.mutateAsync({
        name: cleanName,
        canary_type: canaryType,
        environment: environment.trim() || 'production',
        placement_hint: placementHint.trim() || undefined,
      });
      setMintedCanary(created);
      onCanaryMinted?.(created);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to mint canary token.');
    }
  };

  const handleCopyPayload = () => {
    if (!mintedCanary) return;
    const textToCopy = JSON.stringify(mintedCanary.decoy_payload, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mintedCanary ? 'Canary Honeytoken Minted' : 'Mint Canary Honeytoken'}
              </h2>
              <p className="text-xs text-slate-400">
                {mintedCanary
                  ? 'Decoy token deployed into deception grid ledger'
                  : 'Deploy active tripwires across your infrastructure and decoy repositories'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body & Form */}
        {mintedCanary ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Permanently Inert Security Decoy</p>
                  <p className="text-amber-200/80">
                    This decoy credential is syntactically realistic but permanently inert. Any interaction generates
                    a high-confidence presumptive compromise alert and provisions an incident case.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-slate-300">Token ID: {mintedCanary.token_id}</span>
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold">
                    {mintedCanary.status}
                  </span>
                </div>

                <div className="relative group">
                  <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-56">
                    {JSON.stringify(mintedCanary.decoy_payload, null, 2)}
                  </pre>
                  <button
                    onClick={handleCopyPayload}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Decoy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Asset Type</span>
                  <span className="font-medium text-slate-200 font-mono">{mintedCanary.canary_type}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Target Environment</span>
                  <span className="font-medium text-slate-200 capitalize">{mintedCanary.environment}</span>
                </div>
                {mintedCanary.placement_hint && (
                  <div className="col-span-2 p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Placement Hint</span>
                    <span className="font-mono text-slate-300">{mintedCanary.placement_hint}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
              <button
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Honeytoken Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production IAM Decoy Key, DB Admin Credentials"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-200 text-xs placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Canary Asset Type <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CANARY_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isSelected = canaryType === ct.type;
                    return (
                      <button
                        type="button"
                        key={ct.type}
                        onClick={() => setCanaryType(ct.type)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{ct.label}</div>
                          <div className="text-[11px] text-slate-400">{ct.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-200 text-xs outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="dmz">DMZ / Edge</option>
                    <option value="internal">Internal Core</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Placement Location Hint
                  </label>
                  <input
                    type="text"
                    value={placementHint}
                    onChange={(e) => setPlacementHint(e.target.value)}
                    placeholder="e.g. /home/deploy/.aws/credentials"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-200 text-xs placeholder-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mintMutation.isPending}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{mintMutation.isPending ? 'Minting...' : 'Mint Canary Token'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
