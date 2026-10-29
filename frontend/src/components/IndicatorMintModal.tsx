import React, { useState } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  Globe,
  Hash,
  Cpu,
  Radio,
} from 'lucide-react';
import { useCreateIndicator } from '../hooks/useThreatIntel';
import { IndicatorType, ThreatIndicator } from '../types';

interface IndicatorMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIndicatorCreated?: (indicator: ThreatIndicator) => void;
}

const INDICATOR_TYPES: Array<{
  type: IndicatorType;
  label: string;
  defaultHalfLife: number;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'ip',
    label: 'IPv4 / IPv6 Address',
    defaultHalfLife: 14,
    placeholder: '198.51.100.45 or 2001:db8::1',
    icon: Globe,
  },
  {
    type: 'cidr',
    label: 'CIDR Subnet Block',
    defaultHalfLife: 30,
    placeholder: '198.51.100.0/24',
    icon: Globe,
  },
  {
    type: 'domain',
    label: 'FQDN / Domain',
    defaultHalfLife: 30,
    placeholder: 'malicious-c2.adversary.org',
    icon: Globe,
  },
  {
    type: 'hash',
    label: 'File Hash (MD5 / SHA-1 / SHA-256)',
    defaultHalfLife: 90,
    placeholder: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    icon: Hash,
  },
  {
    type: 'user_agent',
    label: 'Scanner User Agent',
    defaultHalfLife: 7,
    placeholder: 'Masscan/1.3.2 (http://github.com/robertdavidgraham/masscan)',
    icon: Cpu,
  },
  {
    type: 'canary_token',
    label: 'Canary Tripwire Token',
    defaultHalfLife: 60,
    placeholder: 'CANARY-2026-XXXX',
    icon: Radio,
  },
];

export const IndicatorMintModal: React.FC<IndicatorMintModalProps> = ({
  isOpen,
  onClose,
  onIndicatorCreated,
}) => {
  const [selectedType, setSelectedType] = useState<IndicatorType>('ip');
  const [value, setValue] = useState('');
  const [threatLevel, setThreatLevel] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [confidence, setConfidence] = useState<number>(0.85);
  const [halfLifeDays, setHalfLifeDays] = useState<number>(14);
  const [campaign, setCampaign] = useState('');
  const [tagsInput, setTagsInput] = useState('external_threat, manual_mint');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateIndicator();

  if (!isOpen) return null;

  const handleTypeChange = (type: IndicatorType) => {
    setSelectedType(type);
    const found = INDICATOR_TYPES.find((t) => t.type === type);
    if (found) {
      setHalfLifeDays(found.defaultHalfLife);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanVal = value.trim();
    if (!cleanVal) {
      setFormError('Indicator value is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      const created = await createMutation.mutateAsync({
        indicator_type: selectedType,
        indicator_value: cleanVal,
        threat_level: threatLevel,
        confidence,
        half_life_days: halfLifeDays,
        campaign: campaign.trim() || undefined,
        tags,
        description: description.trim() || undefined,
      });

      if (onIndicatorCreated) {
        onIndicatorCreated(created);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to mint indicator');
    }
  };

  const selectedDef = INDICATOR_TYPES.find((t) => t.type === selectedType) || INDICATOR_TYPES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Mint Threat Indicator</h2>
              <p className="text-xs text-slate-400">
                Register verified adversary observable with deterministic temporal decay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Indicator Type Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Indicator Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INDICATOR_TYPES.map((t) => {
                const IconComponent = t.icon;
                const isSelected = selectedType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => handleTypeChange(t.type)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-medium'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Indicator Value */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Indicator Value <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedDef.placeholder}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
            />
          </div>

          {/* Threat Level & Base Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Threat Level
              </label>
              <select
                value={threatLevel}
                onChange={(e) => setThreatLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="critical">Critical (Severity 4)</option>
                <option value="high">High (Severity 3)</option>
                <option value="medium">Medium (Severity 2)</option>
                <option value="low">Low (Severity 1)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Base Confidence ({Math.round(confidence * 100)}%)
              </label>
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-2.5"
              />
            </div>
          </div>

          {/* Half-life Days & Campaign */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Half-Life (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={halfLifeDays}
                onChange={(e) => setHalfLifeDays(parseInt(e.target.value) || 14)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard {selectedDef.label}: {selectedDef.defaultHalfLife} days
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Attributed Campaign (Optional)
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. APT29-SOLARWIND or FIN7-C2"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="scanner, c2, credential_dumping"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Analyst Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Analyst Rationale / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes on infrastructure observation, evidence provenance, and defensive rationale..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
            >
              {createMutation.isPending ? 'Minting...' : 'Mint Threat Indicator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
