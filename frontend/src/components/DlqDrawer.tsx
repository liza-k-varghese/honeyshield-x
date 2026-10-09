import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, AlertOctagon, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { DlqRecord } from '../types';
import { fetchDlq, retryDlqItem, deleteDlqRecord } from '../api/client';

interface DlqDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMetrics?: () => void;
}

export const DlqDrawer: React.FC<DlqDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshMetrics,
}) => {
  const [items, setItems] = useState<DlqRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  const loadDlq = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDlq(100, 0);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load DLQ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDlq();
      setActionMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetry = async (deliveryId: string) => {
    try {
      const res = await retryDlqItem(deliveryId);
      if (res.status === 'success') {
        setActionMessage({ id: deliveryId, text: 'Delivery replayed successfully! Removed from DLQ.', success: true });
        loadDlq();
        onRefreshMetrics?.();
      } else {
        setActionMessage({ id: deliveryId, text: `Retry failed: ${res.error || 'Server rejected request'}`, success: false });
      }
    } catch (err: any) {
      setActionMessage({ id: deliveryId, text: `Retry error: ${err?.message}`, success: false });
    }
  };

  const handlePurge = async (deliveryId: string) => {
    try {
      await deleteDlqRecord(deliveryId);
      loadDlq();
      onRefreshMetrics?.();
    } catch (err) {
      console.error('Failed to purge DLQ item:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Dead-Letter Queue (DLQ)</h3>
              <p className="text-xs text-slate-400">
                {total} failed deliveries held (Hard-capped at 500)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadDlq}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DLQ Records List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">Dead-Letter Queue is Empty</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                All outbound webhook dispatches are healthy or delivered successfully.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.delivery_id}
                className="bg-slate-950 border border-slate-800/90 rounded-lg p-3.5 space-y-2.5 text-xs font-mono"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-rose-300 flex items-center space-x-2">
                      <span className="bg-rose-950 text-rose-400 px-2 py-0.5 rounded text-[10px] border border-rose-800/60">
                        {item.event_type}
                      </span>
                      <span>Target: {item.endpoint_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {item.target_url}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right whitespace-nowrap">
                    Attempts: {item.attempts}/4
                    <div className="mt-0.5">{new Date(item.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="p-2 bg-rose-950/30 rounded border border-rose-900/40 text-[11px] text-rose-300">
                  {item.last_error}
                </div>

                {actionMessage && actionMessage.id === item.delivery_id && (
                  <div
                    className={`p-2 rounded text-[11px] ${
                      actionMessage.success
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950/50 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {actionMessage.text}
                  </div>
                )}

                {/* Payload Accordion */}
                <div>
                  <button
                    onClick={() => setExpandedId(expandedId === item.delivery_id ? null : item.delivery_id)}
                    className="flex items-center space-x-1 text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    {expandedId === item.delivery_id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{expandedId === item.delivery_id ? 'Hide Payload' : 'Inspect Payload JSON'}</span>
                  </button>

                  {expandedId === item.delivery_id && (
                    <pre className="mt-1.5 p-2 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 overflow-x-auto max-h-36">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handlePurge(item.delivery_id)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded text-[11px] border border-slate-800 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Purge</span>
                  </button>
                  <button
                    onClick={() => handleRetry(item.delivery_id)}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-Dispatch</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
