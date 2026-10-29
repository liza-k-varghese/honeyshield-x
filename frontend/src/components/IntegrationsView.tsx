import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Edit2,
  AlertOctagon,
  ShieldCheck,
  Radio,
  CheckCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { WebhookEndpoint, IntegrationMetrics } from '../types';
import {
  fetchEndpoints,
  fetchIntegrationMetrics,
  deleteEndpoint,
  updateEndpoint,
} from '../api/client';
import { EndpointConfigModal } from './EndpointConfigModal';
import { EndpointTestModal } from './EndpointTestModal';
import { DlqDrawer } from './DlqDrawer';

export const IntegrationsView: React.FC = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [endpointToEdit, setEndpointToEdit] = useState<WebhookEndpoint | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [endpointToTest, setEndpointToTest] = useState<WebhookEndpoint | null>(null);
  const [isDlqDrawerOpen, setIsDlqDrawerOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eps, m] = await Promise.all([
        fetchEndpoints(),
        fetchIntegrationMetrics(),
      ]);
      setEndpoints(eps);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load integration data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete endpoint "${name}"?`)) return;
    try {
      await deleteEndpoint(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const handleToggleEnabled = async (ep: WebhookEndpoint) => {
    try {
      await updateEndpoint(ep.id, { enabled: !ep.enabled });
      loadData();
    } catch (err) {
      console.error('Failed to toggle endpoint status:', err);
    }
  };


  const getCircuitBadge = (state: string) => {
    switch (state) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>CIRCUIT OPEN</span>
          </span>
        );
      case 'half_open':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            <Radio className="w-3 h-3 text-amber-400" />
            <span>HALF-OPEN (PROBING)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>HEALTHY</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <span>SIEM & SOAR Integration Gateway</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise outbound webhook orchestrator with HMAC payload signing, SSRF defense, and bounded DLQ retries.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDlqDrawerOpen(true)}
            className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>DLQ ({metrics?.dlq_count ?? 0})</span>
          </button>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Gateway Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEndpointToEdit(null);
              setIsConfigModalOpen(true);
            }}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Webhook Target</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400">Registered Endpoints</div>
          <div className="text-lg font-bold text-white mt-1">
            {metrics?.active_endpoints ?? 0} <span className="text-xs text-slate-500 font-normal">/ {metrics?.total_endpoints ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active / Total targets</div>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400">Total Dispatched</div>
          <div className="text-lg font-bold text-sky-400 mt-1">
            {metrics?.total_dispatched ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Outbound event signals</div>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400">Delivered Successfully</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {metrics?.total_delivered ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">HTTP 2xx acknowledgments</div>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400">Average Roundtrip Latency</div>
          <div className="text-lg font-bold text-purple-400 mt-1">
            {metrics?.average_latency_ms ?? 0} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Direct IP connection</div>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400">Tripped Circuits</div>
          <div className={`text-lg font-bold mt-1 ${metrics?.circuits_open ? 'text-rose-400' : 'text-slate-300'}`}>
            {metrics?.circuits_open ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Shedding failed receivers</div>
        </div>
      </div>

      {/* Webhook Endpoints Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="font-semibold text-sm text-white">Configured Webhook Targets</div>
          <div className="text-xs text-slate-400">
            {endpoints.length} target{endpoints.length === 1 ? '' : 's'} registered
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Target & URL</th>
                <th className="py-3 px-4 font-semibold">Serializer</th>
                <th className="py-3 px-4 font-semibold">Subscribed Events</th>
                <th className="py-3 px-4 font-semibold">Health & Circuit</th>
                <th className="py-3 px-4 font-semibold">Deliveries</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    No webhook targets registered yet. Click &ldquo;Register Webhook Target&rdquo; to connect external SIEM/SOAR platforms.
                  </td>
                </tr>
              ) : (
                endpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-sans text-white text-xs">{ep.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(ep)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-sans cursor-pointer transition-colors ${
                            ep.enabled
                              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/80'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                          title={`Click to ${ep.enabled ? 'disable' : 'enable'} endpoint`}
                        >
                          {ep.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                      <div className="text-[11px] text-sky-400/90 truncate max-w-xs mt-0.5" title={ep.target_url}>
                        {ep.target_url}
                      </div>
                      {ep.description && (
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-xs mt-0.5">
                          {ep.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-purple-950/70 text-purple-300 border border-purple-800/60">
                        {ep.format}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {ep.events.map((ev) => (
                          <span
                            key={ev}
                            className="bg-slate-950 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getCircuitBadge(ep.circuit_state)}
                      {ep.consecutive_failures > 0 && (
                        <div className="text-[10px] text-rose-400 mt-1">
                          {ep.consecutive_failures} failure{ep.consecutive_failures === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      <div>
                        <span className="text-emerald-400">{ep.total_sent} sent</span> &bull;{' '}
                        <span className="text-rose-400">{ep.total_failed} failed</span>
                      </div>
                      {ep.last_delivery_at && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Last: {new Date(ep.last_delivery_at).toLocaleTimeString()} ({ep.last_status_code || '-'})
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5 font-sans">
                        <button
                          onClick={() => {
                            setEndpointToTest(ep);
                            setIsTestModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[11px] font-medium border border-slate-700 flex items-center space-x-1"
                          title="Dispatch Test Ping"
                        >
                          <Send className="w-3 h-3" />
                          <span>Test</span>
                        </button>

                        <button
                          onClick={() => {
                            setEndpointToEdit(ep);
                            setIsConfigModalOpen(true);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          title="Edit Target"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(ep.id, ep.name)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700"
                          title="Delete Target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise Security Architecture Callout */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
        <div className="space-y-1">
          <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-sky-400" />
            <span>HMAC-SHA256 Payload Signing</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            All outbound payloads include <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">X-HoneyShield-Signature</code> header binding a UTC timestamp with raw bytes. Replays beyond &plusmn;300 seconds are rejected.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Anti-DNS Rebinding & SSRF Immunity</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Destination hostnames are resolved before socket creation and checked against private, cloud metadata, and reserved networks. The socket connects directly to the validated IP.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <AlertOctagon className="w-4 h-4 text-purple-400" />
            <span>Governor Tier-3 Containment Isolation</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Outbound webhook telemetry is observational. External SOAR containment actions (<code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">SOAR_BLOCK_DISPATCH</code>) strictly enforce Level-3 Governor preview approval tokens.
          </p>
        </div>
      </div>

      {/* Sub-modals & Drawers */}
      <EndpointConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setEndpointToEdit(null);
        }}
        endpointToEdit={endpointToEdit}
        onSaved={loadData}
      />

      <EndpointTestModal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setEndpointToTest(null);
        }}
        endpoint={endpointToTest}
      />

      <DlqDrawer
        isOpen={isDlqDrawerOpen}
        onClose={() => setIsDlqDrawerOpen(false)}
        onRefreshMetrics={loadData}
      />
    </div>
  );
};
