import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Shield,
  Activity,
  Layers,
  Clock,
  Link,
  Edit3,
  Radio,
  Flame,
  Globe,
  ExternalLink,
  Save,
} from 'lucide-react';
import { CampaignDossier, CampaignStatus, SeverityLevel } from '../types';
import {
  useCampaign,
  useCampaignGraph,
  useCampaignTimeline,
  useUpdateCampaign,
  useLinkCase,
  useUnlinkCase,
} from '../hooks/useCampaigns';
import { CampaignGraphView } from './CampaignGraphView';

interface CampaignDossierDrawerProps {
  campaignId: string | null;
  onClose: () => void;
  onInvestigateIp?: (ip: string) => void;
  onStageContainment?: (campaign: CampaignDossier) => void;
}

export const CampaignDossierDrawer: React.FC<CampaignDossierDrawerProps> = ({
  campaignId,
  onClose,
  onInvestigateIp,
  onStageContainment,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'graph' | 'timeline'>('dossier');

  // Edit State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<CampaignStatus>('active');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editJustification, setEditJustification] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // Case Link State
  const [newCaseId, setNewCaseId] = useState<string>('');

  const { data: campaign, isLoading, isError } = useCampaign(campaignId);
  const { data: graphData, isLoading: isGraphLoading } = useCampaignGraph(
    activeTab === 'graph' ? campaignId : null
  );
  const { data: timelineData, isLoading: isTimelineLoading } = useCampaignTimeline(
    activeTab === 'timeline' ? campaignId : null
  );

  const updateMutation = useUpdateCampaign();
  const linkCaseMutation = useLinkCase();
  const unlinkCaseMutation = useUnlinkCase();

  if (!campaignId) return null;

  const startEditing = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditStatus(campaign.status);
    setEditNotes(campaign.notes || '');
    setEditJustification('');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    setEditError(null);

    if (editStatus !== campaign.status && (!editJustification || editJustification.length < 5)) {
      setEditError('Status overrides require an operator justification of at least 5 characters.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: campaign.campaign_id,
        payload: {
          name: editName.trim() || undefined,
          status: editStatus,
          notes: editNotes.trim() || undefined,
          justification: editJustification.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update campaign');
    }
  };

  const handleLinkCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !newCaseId.trim()) return;
    try {
      await linkCaseMutation.mutateAsync({
        id: campaign.campaign_id,
        caseId: newCaseId.trim(),
      });
      setNewCaseId('');
    } catch (err) {
      // Handled by query client
    }
  };

  const handleUnlinkCase = async (caseId: string) => {
    if (!campaign) return;
    try {
      await unlinkCaseMutation.mutateAsync({
        id: campaign.campaign_id,
        caseId,
      });
    } catch (err) {
      // Handled
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'contained':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/60';
      case 'dormant':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'resolved':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
      case 'archived':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      case 'high':
        return 'bg-orange-950/70 text-orange-300 border-orange-800/60';
      case 'medium':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'low':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Drawer Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
        <div className="space-y-1.5 flex-1 pr-4">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-sky-400 font-semibold">{campaignId}</span>
            {campaign && (
              <>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                    campaign.status
                  )}`}
                >
                  {campaign.status}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                    campaign.severity
                  )}`}
                >
                  {campaign.severity}
                </span>
              </>
            )}
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {campaign?.name || 'Loading Campaign Intelligence...'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-5 border-b border-slate-800 bg-slate-950/40 flex items-center space-x-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'dossier'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Intelligence Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'graph'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Correlation Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'timeline'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Chronological Timeline</span>
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300">
        {isLoading && (
          <div className="py-20 text-center text-slate-400">Loading campaign intelligence...</div>
        )}

        {isError && (
          <div className="py-20 text-center text-rose-400">Error loading campaign intelligence.</div>
        )}

        {campaign && activeTab === 'dossier' && (
          <div className="space-y-6">
            {/* Quick Actions Ribbon */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] font-mono mr-2">Quick Actions:</span>
              <button
                onClick={() => onStageContainment?.(campaign)}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center space-x-1.5 shadow-sm transition-colors text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Governor Containment</span>
              </button>
              <button
                onClick={startEditing}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center space-x-1.5 transition-colors text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Override Status / Notes</span>
              </button>
            </div>

            {/* Inline Edit Form */}
            {isEditing && (
              <form
                onSubmit={handleSaveEdit}
                className="bg-slate-950 p-4 rounded-lg border border-sky-800/60 space-y-3"
              >
                <div className="flex items-center justify-between font-semibold text-sky-300 pb-1 border-b border-slate-800">
                  <span>Edit Campaign Properties</span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    &times;
                  </button>
                </div>
                {editError && <div className="text-rose-400 text-[11px]">{editError}</div>}
                <div className="space-y-1">
                  <label className="text-slate-400">Campaign Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400">Lifecycle Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as CampaignStatus)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="active">active</option>
                      <option value="contained">contained</option>
                      <option value="dormant">dormant</option>
                      <option value="resolved">resolved</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">
                      Justification {editStatus !== campaign.status && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={editJustification}
                      onChange={(e) => setEditJustification(e.target.value)}
                      placeholder="Required for status change"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Analyst Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded border border-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center space-x-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* Campaign Metrics & Metadata Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Confidence</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {Math.round(campaign.confidence * 100)}%
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">First Seen</span>
                <span className="text-xs font-mono text-slate-300 truncate block">
                  {new Date(campaign.first_seen).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Last Activity</span>
                <span className="text-xs font-mono text-slate-300 truncate block">
                  {new Date(campaign.last_seen).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Telemetry Events</span>
                <span className="text-base font-bold font-mono text-sky-400">
                  {campaign.attack_ids.length + campaign.alert_ids.length}
                </span>
              </div>
            </div>

            {/* Attacker Entities (IPs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                  <Globe className="w-4 h-4 text-rose-400" />
                  <span>Observed Attacker IPs ({campaign.source_ips.length})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/60 rounded-lg border border-slate-800 font-mono text-[11px]">
                {campaign.source_ips.length === 0 ? (
                  <span className="text-slate-500">None detected</span>
                ) : (
                  campaign.source_ips.map((ip) => (
                    <button
                      key={ip}
                      onClick={() => onInvestigateIp?.(ip)}
                      title="Investigate IP in SOC Console"
                      className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 flex items-center space-x-1 transition-colors"
                    >
                      <span>{ip}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-rose-400" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* MITRE ATT&CK Matrix */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>MITRE ATT&CK Tactics & Techniques</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {campaign.mitre_tactics.length === 0 ? (
                    <span className="text-slate-500 text-[11px]">No tactics mapped</span>
                  ) : (
                    campaign.mitre_tactics.map((tac) => (
                      <span
                        key={tac}
                        className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300 font-mono text-[11px]"
                      >
                        {tac}
                      </span>
                    ))
                  )}
                </div>
                {campaign.mitre_techniques.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/60 font-mono text-[11px]">
                    {campaign.mitre_techniques.map((tech) => (
                      <span key={tech} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Deception & Threat Intelligence Artifacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Canary Tokens */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Canary Honeytokens ({campaign.canary_ids.length})</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                  {campaign.canary_ids.length === 0 ? (
                    <span className="text-slate-500 font-sans">No honeytoken triggers</span>
                  ) : (
                    campaign.canary_ids.map((cid) => (
                      <div key={cid} className="text-emerald-300 truncate">
                        &bull; {cid}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Threat IOCs */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Threat Intelligence IOCs ({campaign.ioc_ids.length})</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                  {campaign.ioc_ids.length === 0 ? (
                    <span className="text-slate-500 font-sans">No linked indicators</span>
                  ) : (
                    campaign.ioc_ids.map((ioc) => (
                      <div key={ioc} className="text-orange-300 truncate">
                        &bull; {ioc}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Linked Incident Cases */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                  <Link className="w-4 h-4 text-indigo-400" />
                  <span>Linked Incident Cases ({campaign.case_ids.length})</span>
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {campaign.case_ids.length === 0 ? (
                    <span className="text-slate-500 text-[11px]">No cases linked yet</span>
                  ) : (
                    campaign.case_ids.map((cid) => (
                      <div
                        key={cid}
                        className="px-2 py-1 rounded bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 text-xs font-mono flex items-center space-x-2"
                      >
                        <span>Case #{cid}</span>
                        <button
                          onClick={() => handleUnlinkCase(cid)}
                          className="text-slate-400 hover:text-rose-400 font-bold"
                          title="Unlink Case"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {/* Link Case Input Form */}
                <form onSubmit={handleLinkCase} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    placeholder="Enter Case ID to link..."
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs font-mono flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newCaseId.trim() || linkCaseMutation.isPending}
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    Link Case
                  </button>
                </form>
              </div>
            </div>

            {/* Analyst Notes */}
            {campaign.notes && (
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-200 block">Analyst Notes & Assessment</span>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-300 font-mono text-xs whitespace-pre-wrap">
                  {campaign.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Correlation Graph Tab */}
        {activeTab === 'graph' && (
          <div className="h-full">
            {isGraphLoading && (
              <div className="py-20 text-center text-slate-400">Computing derived multi-entity DAG...</div>
            )}
            {graphData && <CampaignGraphView graph={graphData} />}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {isTimelineLoading && (
              <div className="py-20 text-center text-slate-400">Loading chronological timeline...</div>
            )}
            {timelineData && timelineData.events.length === 0 && (
              <div className="py-20 text-center text-slate-500">No events found in campaign timeline.</div>
            )}
            {timelineData && (
              <div className="relative border-l border-slate-800 ml-4 space-y-4">
                {timelineData.events.map((evt) => (
                  <div key={evt.id} className="relative pl-6">
                    <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-sky-500 border-2 border-slate-900" />
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-400">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                        <span className="font-mono uppercase text-sky-400 text-[10px]">{evt.event_type}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white">{evt.title}</h4>
                      {evt.source_ip && (
                        <div className="text-[11px] font-mono text-rose-300">Source: {evt.source_ip}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
