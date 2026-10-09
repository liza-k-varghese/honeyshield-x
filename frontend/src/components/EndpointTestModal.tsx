import React, { useState } from 'react';
import { X, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { WebhookEndpoint, TestPingResponse } from '../types';
import { testEndpoint } from '../api/client';

interface EndpointTestModalProps {
  endpoint: WebhookEndpoint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EndpointTestModal: React.FC<EndpointTestModalProps> = ({
  endpoint,
  isOpen,
  onClose,
}) => {
  const [eventType, setEventType] = useState('test.ping');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<TestPingResponse | null>(null);

  if (!isOpen || !endpoint) return null;

  const handleSendTest = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const res = await testEndpoint(endpoint.id, {
        event_type: eventType,
        sample_data: {
          test: true,
          endpoint_name: endpoint.name,
          format: endpoint.format,
          message: 'HoneyShield-X Test Ping Verification',
          dispatched_at: new Date().toISOString(),
        },
      });
      setResult(res);
    } catch (err: any) {
      setResult({
        delivery_id: 'local_error',
        status: 'failed',
        status_code: null,
        latency_ms: 0,
        response_preview: null,
        error: err?.message || 'Failed executing test ping.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Test Webhook Connectivity</h3>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Target:</span>
              <span className="text-slate-200 font-semibold">{endpoint.name}</span>
            </div>
            <div className="text-slate-400 truncate flex items-center justify-between">
              <span>URL:</span>
              <span className="text-sky-400">{endpoint.target_url}</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Serializer:</span>
              <span className="text-purple-300 font-semibold uppercase">{endpoint.format}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Simulated Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="test.ping">test.ping (System Connectivity Check)</option>
              <option value="alert.triggered">alert.triggered (High-Severity Alert Simulation)</option>
              <option value="canary.tripped">canary.tripped (Honeytoken Breach Simulation)</option>
              <option value="case.escalated">case.escalated (Incident Escalation Simulation)</option>
            </select>
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-2 ${
                result.status === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <div className="flex items-center space-x-1.5">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>Status: {result.status.toUpperCase()}</span>
                </div>
                <div className="flex items-center space-x-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{result.latency_ms} ms</span>
                </div>
              </div>

              {result.status_code && (
                <div className="font-mono text-[11px]">
                  Remote HTTP Status: <strong>{result.status_code}</strong>
                </div>
              )}

              {result.error && (
                <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded font-mono">
                  {result.error}
                </div>
              )}

              {result.response_preview && (
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Response Preview:</span>
                  <pre className="bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-300 overflow-x-auto max-h-24">
                    {result.response_preview}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Close
            </button>
            <button
              onClick={handleSendTest}
              disabled={isSending}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5"
            >
              {isSending ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Signed Ping</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
