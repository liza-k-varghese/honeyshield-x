import React, { useState } from 'react';
import { Target, X, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { HuntDossier, SeverityLevel } from '../types';
import { useCreateHunt } from '../hooks/useThreatHunting';

interface HuntHypothesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (hunt: HuntDossier) => void;
}

const COMMON_TACTICS = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
];

export const HuntHypothesisModal: React.FC<HuntHypothesisModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [selectedTactics, setSelectedTactics] = useState<string[]>([]);
  const [sourceIp, setSourceIp] = useState('');
  const [payloadSubstring, setPayloadSubstring] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createHuntMutation = useCreateHunt();

  if (!isOpen) return null;

  const toggleTactic = (tactic: string) => {
    if (selectedTactics.includes(tactic)) {
      setSelectedTactics(selectedTactics.filter((t) => t !== tactic));
    } else {
      setSelectedTactics([...selectedTactics, tactic]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 10) {
      setError('Hypothesis title must be at least 10 characters.');
      return;
    }
    setError(null);

    try {
      const created = await createHuntMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        severity,
        mitre_tactics: selectedTactics,
        mitre_techniques: [],
        query_spec: {
          source_ips: sourceIp.trim() ? [sourceIp.trim()] : [],
          payload_substring: payloadSubstring.trim() || null,
          regex_pattern: regexPattern.trim() || null,
        },
      });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create threat hunt hypothesis.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Author Adversary Threat Hypothesis</h3>
              <p className="text-xs text-slate-400">Initialize a structured investigative hunt inquiry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Hypothesis Title *</span>
              <span className="text-[11px] text-slate-500 font-mono">{title.length} / 150</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unauthenticated LFI & Path Traversal Probing on Internal Decoys"
              required
              minLength={10}
              maxLength={150}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Threat Narrative & Hypothesis Description *</span>
              <span className="text-[11px] text-slate-500 font-mono">{description.length} / 2000</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the assumed adversary technique, observed telemetry signals, and expected evidence indicators..."
              rows={3}
              required
              maxLength={2000}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Severity Band</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target Attacker IP (Optional)</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                placeholder="e.g. 198.51.100.42"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">MITRE ATT&CK Tactics</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800/80 max-h-24 overflow-y-auto">
              {COMMON_TACTICS.map((tactic) => {
                const active = selectedTactics.includes(tactic);
                return (
                  <button
                    key={tactic}
                    type="button"
                    onClick={() => toggleTactic(tactic)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {tactic}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Initial Query Predicates (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Payload Substring</label>
                <input
                  type="text"
                  value={payloadSubstring}
                  onChange={(e) => setPayloadSubstring(e.target.value)}
                  placeholder="e.g. /etc/passwd"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Regex Pattern (Safe AST)</label>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="e.g. \b(union|select)\b"
                  maxLength={64}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={createHuntMutation.isPending}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createHuntMutation.isPending || title.trim().length < 10}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center space-x-2 transition-colors"
            >
              {createHuntMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Draft...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Hypothesis Draft</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
