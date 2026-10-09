import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  FileCode2,
  Database,
  ExternalLink,
} from 'lucide-react';
import { getThreatFeedExportUrl } from '../api/client';

interface FeedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'json' | 'csv' | 'stix';

export const FeedExportModal: React.FC<FeedExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [feedToken, setFeedToken] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentExportUrl = getThreatFeedExportUrl(format, feedToken.trim() || undefined);

  const handleCopyUrl = () => {
    const fullUrl = `${window.location.origin}${currentExportUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectDownload = () => {
    window.open(currentExportUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Export Defensive Feeds</h2>
              <p className="text-xs text-slate-400">
                Consume high-confidence IOCs via automated firewalls and threat intelligence platforms
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Feed Format Specification
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === 'json'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold">JSON Feed</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  REST blocklist with confidence, provenance, and active indicators
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === 'csv'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold">Firewall EDL</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Palo Alto / Fortinet External Dynamic List format with formula injection defenses
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('stix')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === 'stix'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold">STIX 2.1</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  OASIS STIX 2.1 compliant indicator bundle for SIEM/SOAR ingestion
                </p>
              </button>
            </div>
          </div>

          {/* Feed Token (Optional for Automated Polling) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Automated Feed Token (Optional)
            </label>
            <input
              type="text"
              value={feedToken}
              onChange={(e) => setFeedToken(e.target.value)}
              placeholder="Leave blank to use current active operator session"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Firewalls polling without cookies/headers can supply ?token= matching HONEYSHIELD_FEED_TOKEN
            </span>
          </div>

          {/* Generated URL & Copy Bar */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Export URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${currentExportUrl}`}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Defensive Guarantee Note */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-start gap-2.5 text-emerald-300 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-medium text-slate-200">Security-Hardened Export Guarantees:</span>
              <p className="text-[11px] text-slate-400">
                All feeds sanitize control characters (\r, \n), strip internal loopback/RFC 1918 IPs, neutralize CSV spreadsheet injection attacks, and exclude revoked or whitelisted observables.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDirectDownload}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Fetch Feed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
