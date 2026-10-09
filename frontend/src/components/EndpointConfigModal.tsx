import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, Copy, Check, Lock, Globe } from 'lucide-react';
import { WebhookEndpoint, WebhookFormat } from '../types';
import { createEndpoint, updateEndpoint } from '../api/client';

interface EndpointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointToEdit?: WebhookEndpoint | null;
  onSaved: () => void;
}

const AVAILABLE_EVENTS = [
  { id: 'alert.triggered', label: 'High-Severity Alerts', desc: 'Real-time alert generation' },
  { id: 'canary.tripped', label: 'Canary Honeytoken Breach', desc: 'Deception grid tripwires' },
  { id: 'case.escalated', label: 'Case Escalated', desc: 'Incident case progression' },
  { id: 'case.resolved', label: 'Case Resolved', desc: 'Incident containment & closure' },
  { id: 'ioc.minted', label: 'Threat IOC Minted', desc: 'New indicator observation' },
  { id: 'ioc.revoked', label: 'Threat IOC Revoked', desc: 'De-activated or expired indicator' },
  { id: 'soar.containment.dispatched', label: 'SOAR Containment Staged', desc: 'External containment trigger' },
  { id: '*', label: 'Wildcard (All Events)', desc: 'Deliver every security telemetry event' },
];

export const EndpointConfigModal: React.FC<EndpointConfigModalProps> = ({
  isOpen,
  onClose,
  endpointToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<WebhookFormat>('honeyshield_json');
  const [enabled, setEnabled] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['alert.triggered']);
  const [customHeaderKey, setCustomHeaderKey] = useState('');
  const [customHeaderVal, setCustomHeaderVal] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time secret display after creation
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (endpointToEdit) {
      setName(endpointToEdit.name);
      setTargetUrl(endpointToEdit.target_url);
      setDescription(endpointToEdit.description || '');
      setFormat(endpointToEdit.format);
      setEnabled(endpointToEdit.enabled);
      setSelectedEvents(endpointToEdit.events || ['alert.triggered']);
      setCustomHeaders(endpointToEdit.custom_headers || {});
      setCreatedSecret(null);
    } else {
      setName('');
      setTargetUrl('');
      setDescription('');
      setFormat('honeyshield_json');
      setEnabled(true);
      setSelectedEvents(['alert.triggered']);
      setCustomHeaders({});
      setCreatedSecret(null);
    }
    setError(null);
    setCopied(false);
  }, [endpointToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleEvent = (eventId: string) => {
    if (eventId === '*') {
      setSelectedEvents(['*']);
      return;
    }
    const filtered = selectedEvents.filter((e) => e !== '*');
    if (filtered.includes(eventId)) {
      const next = filtered.filter((e) => e !== eventId);
      setSelectedEvents(next.length ? next : ['alert.triggered']);
    } else {
      setSelectedEvents([...filtered, eventId]);
    }
  };

  const handleAddHeader = () => {
    if (!customHeaderKey.trim() || !customHeaderVal.trim()) return;
    setCustomHeaders({
      ...customHeaders,
      [customHeaderKey.trim()]: customHeaderVal.trim(),
    });
    setCustomHeaderKey('');
    setCustomHeaderVal('');
  };

  const handleRemoveHeader = (keyToRemove: string) => {
    const next = { ...customHeaders };
    delete next[keyToRemove];
    setCustomHeaders(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Endpoint name is required.');
      return;
    }

    if (!targetUrl.trim()) {
      setError('Target URL is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (endpointToEdit) {
        await updateEndpoint(endpointToEdit.id, {
          name: name.trim(),
          target_url: targetUrl.trim(),
          description: description.trim() || null,
          format,
          enabled,
          events: selectedEvents,
          custom_headers: customHeaders,
        });
        onSaved();
        onClose();
      } else {
        const res = await createEndpoint({
          name: name.trim(),
          target_url: targetUrl.trim(),
          description: description.trim() || null,
          format,
          enabled,
          events: selectedEvents,
          custom_headers: customHeaders,
        });
        onSaved();
        if (res.secret && !res.secret.includes('••••')) {
          setCreatedSecret(res.secret);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save endpoint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {createdSecret ? (
          /* One-time Secret Display View */
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Webhook Target Registered Successfully</h3>
            </div>

            <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-2">
              <div className="font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Save Your Webhook Signing Secret Now</span>
              </div>
              <p>
                HoneyShield-X signs outbound dispatches with HMAC-SHA256 using this secret. For security reasons, this secret will <strong>never be shown again</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">HMAC-SHA256 Secret</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={createdSecret}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 font-mono text-xs text-emerald-400 select-all"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Standard Configuration Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <span>{endpointToEdit ? 'Edit Webhook Target' : 'Register Webhook Target'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure destination URL, SIEM/SOAR format preset, and event subscriptions with SSRF safeguards.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Endpoint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Splunk HEC Primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Payload Serializer</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as WebhookFormat)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="honeyshield_json">HoneyShield-X JSON (Native Enriched)</option>
                  <option value="cef">ArcSight CEF (Common Event Format)</option>
                  <option value="leef">IBM QRadar LEEF 2.0</option>
                  <option value="syslog_json">RFC 5424 Syslog JSON</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Destination URL</label>
              <input
                type="text"
                required
                placeholder="https://siem.enterprise.corp/api/webhook"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Production strictly enforces HTTPS. Loopback, RFC 1918, link-local, and cloud metadata addresses are prohibited.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Context or receiver notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Event Subscriptions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                {AVAILABLE_EVENTS.map((ev) => (
                  <label
                    key={ev.id}
                    className="flex items-start space-x-2 text-xs text-slate-300 cursor-pointer p-1.5 hover:bg-slate-900 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev.id) || selectedEvents.includes('*')}
                      onChange={() => toggleEvent(ev.id)}
                      className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-slate-200">{ev.label}</div>
                      <div className="text-[10px] text-slate-500">{ev.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Headers Section */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Custom HTTP Headers</label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Header Name (e.g. Authorization)"
                  value={customHeaderKey}
                  onChange={(e) => setCustomHeaderKey(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Splunk 12345)"
                  value={customHeaderVal}
                  onChange={(e) => setCustomHeaderVal(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddHeader}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                >
                  Add
                </button>
              </div>

              {Object.keys(customHeaders).length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/40 rounded border border-slate-800">
                  {Object.entries(customHeaders).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center space-x-1.5 bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-[11px] font-mono border border-slate-700"
                    >
                      <span>{k}: {v.slice(0, 15)}{v.length > 15 ? '...' : ''}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(k)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="enable-toggle"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-slate-700 text-sky-600 focus:ring-0"
              />
              <label htmlFor="enable-toggle" className="text-xs text-slate-300 cursor-pointer">
                Enable target immediately for real-time dispatch
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{endpointToEdit ? 'Update Endpoint' : 'Register & Generate Secret'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
