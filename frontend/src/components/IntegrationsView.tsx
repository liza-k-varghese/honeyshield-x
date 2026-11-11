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
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-[#EF6268]/15 text-[#EF6268] border border-[#EF6268]/40">
            <AlertTriangle className="w-3 h-3 text-[#EF6268]" />
            <span>CIRCUIT OPEN</span>
          </span>
        );
      case 'half_open':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-[#E5B65A]/15 text-[#E5B65A] border border-[#E5B65A]/40">
            <Radio className="w-3 h-3 text-[#E5B65A]" />
            <span>HALF-OPEN (PROBING)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/40">
            <CheckCircle className="w-3 h-3 text-[#48C99B]" />
            <span>HEALTHY</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#111C29] border border-[#1E2D3D] shadow-soc-sm">
        <div>
          <h2 className="text-lg font-bold text-[#F0F5F8] font-mono tracking-tight flex items-center space-x-2">
            <Globe className="w-5 h-5 text-[#00D6C9]" />
            <span>SIEM & SOAR Integration Gateway</span>
          </h2>
          <p className="text-xs text-[#94A6B8] mt-0.5">
            Enterprise outbound webhook orchestrator with HMAC payload signing, SSRF defense, and bounded DLQ retries.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsDlqDrawerOpen(true)}
            className="px-3.5 py-1.5 bg-[#EF6268]/15 hover:bg-[#EF6268]/25 text-[#EF6268] border border-[#EF6268]/40 rounded-lg text-xs font-semibold font-mono flex items-center space-x-1.5 transition-colors"
          >
            <AlertOctagon className="w-4 h-4 text-[#EF6268]" />
            <span>DLQ ({metrics?.dlq_count ?? 0})</span>
          </button>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-[#192737] border border-[#1E2D3D] text-[#94A6B8] hover:text-[#F0F5F8] transition-colors"
            title="Refresh Gateway Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00D6C9]' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEndpointToEdit(null);
              setIsConfigModalOpen(true);
            }}
            className="px-4 py-1.5 bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] rounded-lg text-xs font-semibold font-mono shadow-soc-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Webhook Target</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <div className="text-[11px] font-mono text-[#94A6B8]">Registered Endpoints</div>
          <div className="text-lg font-bold font-mono text-[#F0F5F8] mt-1">
            {metrics?.active_endpoints ?? 0} <span className="text-xs text-[#94A6B8]/60 font-normal">/ {metrics?.total_endpoints ?? 0}</span>
          </div>
          <div className="text-[10px] text-[#94A6B8]/60 font-mono mt-0.5">Active / Total targets</div>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <div className="text-[11px] font-mono text-[#94A6B8]">Total Dispatched</div>
          <div className="text-lg font-bold font-mono text-[#00D6C9] mt-1">
            {metrics?.total_dispatched ?? 0}
          </div>
          <div className="text-[10px] text-[#94A6B8]/60 font-mono mt-0.5">Outbound event signals</div>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <div className="text-[11px] font-mono text-[#94A6B8]">Delivered Successfully</div>
          <div className="text-lg font-bold font-mono text-[#48C99B] mt-1">
            {metrics?.total_delivered ?? 0}
          </div>
          <div className="text-[10px] text-[#94A6B8]/60 font-mono mt-0.5">HTTP 2xx acknowledgments</div>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <div className="text-[11px] font-mono text-[#94A6B8]">Average Roundtrip Latency</div>
          <div className="text-lg font-bold font-mono text-[#F0F5F8] mt-1">
            {metrics?.average_latency_ms ?? 0} <span className="text-xs text-[#94A6B8]/60 font-normal">ms</span>
          </div>
          <div className="text-[10px] text-[#94A6B8]/60 font-mono mt-0.5">Direct IP connection</div>
        </div>

        <div className="p-3.5 bg-[#111C29] border border-[#1E2D3D] rounded-xl shadow-soc-sm">
          <div className="text-[11px] font-mono text-[#94A6B8]">Tripped Circuits</div>
          <div className={`text-lg font-bold font-mono mt-1 ${metrics?.circuits_open ? 'text-[#EF6268]' : 'text-[#F0F5F8]'}`}>
            {metrics?.circuits_open ?? 0}
          </div>
          <div className="text-[10px] text-[#94A6B8]/60 font-mono mt-0.5">Shedding failed receivers</div>
        </div>
      </div>

      {/* Webhook Endpoints Table */}
      <div className="bg-[#111C29] border border-[#1E2D3D] rounded-xl overflow-hidden shadow-soc-sm">
        <div className="p-4 border-b border-[#1E2D3D] flex items-center justify-between bg-[#080D14]/80">
          <div className="font-semibold text-sm font-mono text-[#F0F5F8]">Configured Webhook Targets</div>
          <div className="text-xs text-[#94A6B8] font-mono">
            {endpoints.length} target{endpoints.length === 1 ? '' : 's'} registered
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D14]/60 text-[#94A6B8] font-mono border-b border-[#1E2D3D] text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Target & URL</th>
                <th className="py-3 px-4 font-semibold">Serializer</th>
                <th className="py-3 px-4 font-semibold">Subscribed Events</th>
                <th className="py-3 px-4 font-semibold">Health & Circuit</th>
                <th className="py-3 px-4 font-semibold">Deliveries</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D3D]/60 font-mono text-[#F0F5F8]">
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A6B8] font-sans">
                    No webhook targets registered yet. Click &ldquo;Register Webhook Target&rdquo; to connect external SIEM/SOAR platforms.
                  </td>
                </tr>
              ) : (
                endpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-[#192737]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#F0F5F8] text-xs">{ep.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(ep)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                            ep.enabled
                              ? 'bg-[#48C99B]/15 text-[#48C99B] border border-[#48C99B]/40 hover:bg-[#48C99B]/25'
                              : 'bg-[#192737] text-[#94A6B8] border border-[#1E2D3D] hover:bg-[#192737]/80'
                          }`}
                          title={`Click to ${ep.enabled ? 'disable' : 'enable'} endpoint`}
                        >
                          {ep.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                      <div className="text-[11px] text-[#00D6C9] truncate max-w-xs mt-0.5" title={ep.target_url}>
                        {ep.target_url}
                      </div>
                      {ep.description && (
                        <div className="text-[10px] text-[#94A6B8] truncate max-w-xs mt-0.5">
                          {ep.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/35">
                        {ep.format}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {ep.events.map((ev) => (
                          <span
                            key={ev}
                            className="bg-[#080D14] text-[#94A6B8] border border-[#1E2D3D] px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getCircuitBadge(ep.circuit_state)}
                      {ep.consecutive_failures > 0 && (
                        <div className="text-[10px] text-[#EF6268] mt-1 font-mono">
                          {ep.consecutive_failures} failure{ep.consecutive_failures === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      <div>
                        <span className="text-[#48C99B]">{ep.total_sent} sent</span> &bull;{' '}
                        <span className="text-[#EF6268]">{ep.total_failed} failed</span>
                      </div>
                      {ep.last_delivery_at && (
                        <div className="text-[10px] text-[#94A6B8] mt-0.5">
                          Last: {new Date(ep.last_delivery_at).toLocaleTimeString()} ({ep.last_status_code || '-'})
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5 font-mono">
                        <button
                          onClick={() => {
                            setEndpointToTest(ep);
                            setIsTestModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-[#192737] hover:bg-[#00D6C9] hover:text-[#080D14] text-[#00D6C9] rounded-md text-[11px] font-medium border border-[#1E2D3D] flex items-center space-x-1 transition-colors"
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
                          className="p-1 rounded-md bg-[#192737] hover:bg-[#192737]/80 text-[#F0F5F8] border border-[#1E2D3D]"
                          title="Edit Target"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(ep.id, ep.name)}
                          className="p-1 rounded-md bg-[#192737] hover:bg-[#EF6268]/20 text-[#EF6268] border border-[#1E2D3D]"
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
      <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#94A6B8] shadow-soc-sm">
        <div className="space-y-1">
          <div className="font-semibold text-[#F0F5F8] flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-[#00D6C9]" />
            <span>HMAC-SHA256 Payload Signing</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            All outbound payloads include <code className="text-[#00D6C9] bg-[#080D14] px-1 py-0.5 rounded border border-[#1E2D3D]">X-HoneyShield-Signature</code> header binding a UTC timestamp with raw bytes. Replays beyond &plusmn;300 seconds are rejected.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-[#F0F5F8] flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#48C99B]" />
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
