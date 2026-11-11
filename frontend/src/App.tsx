import { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { Sidebar, SidebarNavId } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { BottomStatusBar } from './components/command-center/BottomStatusBar';
import { KpiRibbon } from './components/KpiRibbon';
import { AlertTable } from './components/AlertTable';
import { AlertDetailDrawer } from './components/AlertDetailDrawer';
import { IpDossierView } from './components/IpDossierView';
import { RuleCatalogView } from './components/RuleCatalogView';
import { RuleDetailDrawer } from './components/RuleDetailDrawer';
import { ReplayStudioView } from './components/ReplayStudioView';
import { SimulationSandboxView } from './components/SimulationSandboxView';
import { AuditTrailView } from './components/AuditTrailView';
import { LiveCommandCenterView } from './components/LiveCommandCenterView';
import { CaseManagementView } from './components/CaseManagementView';
import { CasePromotionModal } from './components/CasePromotionModal';
import { DeceptionGridView } from './components/DeceptionGridView';
import { ThreatIntelView } from './components/ThreatIntelView';
import { IntegrationsView } from './components/IntegrationsView';
import { CampaignsView } from './components/CampaignsView';
import { ThreatHuntingView } from './components/ThreatHuntingView';
import { LoginModal } from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAlerts, useDashboardStats, useAttacks } from './hooks/useDashboard';
import { Alert, DetectionRuleSummary } from './types';
import { Search, Network, ArrowRight, Shield, History, Sliders, FileText, BrainCircuit, Target } from 'lucide-react';
import {
  useDigitalAgentUniverse,
  NexusAssistantModal,
} from './digital-agents';

import { CurtainTransition } from './components/CyberMotion';
import { HoneyShieldLanding } from './components/HoneyShieldLanding';
import { UniverseCommandCenter } from './components/UniverseCommandCenter';
import { SecurityOverview } from './components/SecurityOverview';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 3000,
    },
  },
});

type HSXView =
  | 'overview'
  | 'landing'
  | 'universe'
  | 'analytics'
  | 'alerts'
  | 'dashboard'
  | 'command'
  | 'cases'
  | 'deception'
  | 'intel'
  | 'integrations'
  | 'campaigns'
  | 'hunts'
  | 'investigation'
  | 'rules';

function DashboardContent() {
  const [activeView, setActiveView] = useState<HSXView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const hashParam = window.location.hash.replace('#', '');
      const candidate = (viewParam || hashParam) as HSXView;
      const validViews: HSXView[] = [
        'overview',
        'landing',
        'universe',
        'analytics',
        'alerts',
        'dashboard',
        'command',
        'cases',
        'deception',
        'intel',
        'integrations',
        'campaigns',
        'hunts',
        'investigation',
        'rules',
      ];
      if (candidate && validViews.includes(candidate)) {
        return candidate;
      }
    }
    return 'overview';
  });
  const [isCurtainActive, setIsCurtainActive] = useState(false);
  const [rulesSubTab, setRulesSubTab] = useState<'catalog' | 'replay' | 'simulation' | 'audit'>('catalog');
  const [aiSubTab, setAiSubTab] = useState<'campaigns' | 'hunting'>('campaigns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [investigationIp, setInvestigationIp] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [promotedAlert, setPromotedAlert] = useState<Alert | null>(null);

  const { sessionExpired } = useAuth();

  // Digital Agent Universe State & Real-Time Sync
  const {
    isDemoMode,
    toggleDemoMode,
    runtimeStatuses,
    activePackets,
    completedPackets,
    failedPackets,
    journeys,
    streamConnectionState,
    streamMetrics,
  } = useDigitalAgentUniverse();
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

  // Module 3.3 state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [simulationRule, setSimulationRule] = useState<DetectionRuleSummary | null>(null);
  const [replayTarget, setReplayTarget] = useState<string>('');
  const [replayScope, setReplayScope] = useState<'attack' | 'ip'>('attack');

  const {
    data: stats,
    isLoading: isStatsLoading,
    isFetching: isStatsFetching,
    isError: isStatsError,
  } = useDashboardStats();

  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    isFetching: isAlertsFetching,
    isError: isAlertsError,
  } = useAlerts(statusFilter);

  const {
    data: attacks = [],
  } = useAttacks(0, 50);

  const isFetching = isStatsFetching || isAlertsFetching;

  // Extract unique attacker IPs from alerts or fallback
  const suggestedIps = useMemo(() => {
    const ips = new Set<string>();
    alerts.forEach((a) => {
      const ipMatch = a.message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      if (ipMatch) ips.add(ipMatch[0]);
    });
    return Array.from(ips);
  }, [alerts]);

  const handleDeepLinkInvestigate = (sourceIp: string) => {
    setInvestigationIp(sourceIp);
    setSearchInput(sourceIp);
    setActiveView('investigation');
    setSelectedAlert(null);
  };

  const handleDeepLinkReplayAttack = (attackId: number) => {
    setReplayTarget(String(attackId));
    setReplayScope('attack');
    setRulesSubTab('replay');
    setActiveView('rules');
    setSelectedAlert(null);
  };

  const handleDeepLinkReplayIp = (sourceIp: string) => {
    setReplayTarget(sourceIp);
    setReplayScope('ip');
    setRulesSubTab('replay');
    setActiveView('rules');
  };

  const handleOpenSimulation = (rule?: DetectionRuleSummary) => {
    if (rule) setSimulationRule(rule);
    setRulesSubTab('simulation');
    setActiveView('rules');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setInvestigationIp(searchInput.trim());
    }
  };

  // Map activeView to Sidebar active ID
  const sidebarActiveId = useMemo<SidebarNavId>(() => {
    if (activeView === 'overview') return 'overview';
    if (activeView === 'landing') return 'landing';
    if (activeView === 'universe') return 'universe';
    if (activeView === 'analytics' || activeView === 'dashboard') return 'analytics';
    if (activeView === 'rules') return rulesSubTab === 'audit' ? 'config' : 'detection';
    if (activeView === 'command') return 'network';
    if (activeView === 'deception') return 'honeypots';
    if (activeView === 'intel') return 'intel';
    if (activeView === 'campaigns' || activeView === 'hunts') return 'ai';
    if (activeView === 'alerts') return 'alerts';
    if (activeView === 'investigation') return 'forensics';
    if (activeView === 'integrations') return 'systems';
    return 'overview';
  }, [activeView, rulesSubTab]);

  // Handle Sidebar item selection
  const handleSidebarSelect = (id: SidebarNavId) => {
    switch (id) {
      case 'overview':
        setActiveView('overview');
        break;
      case 'landing':
        setActiveView('landing');
        break;
      case 'universe':
        setActiveView('universe');
        break;
      case 'analytics':
        setActiveView('analytics');
        break;
      case 'detection':
        setRulesSubTab('catalog');
        setActiveView('rules');
        break;
      case 'network':
        setActiveView('command');
        break;
      case 'honeypots':
        setActiveView('deception');
        break;
      case 'intel':
        setActiveView('intel');
        break;
      case 'ai':
        setAiSubTab('campaigns');
        setActiveView('campaigns');
        break;
      case 'alerts':
        setActiveView('alerts');
        break;
      case 'forensics':
        setActiveView('investigation');
        break;
      case 'systems':
        setActiveView('integrations');
        break;
      case 'config':
        setRulesSubTab('audit');
        setActiveView('rules');
        break;
    }
  };

  // Handle TopNav change
  const handleTopNavChange = (view: string) => {
    if (view === 'overview' || view === 'dashboard') {
      setActiveView('overview');
    } else if (view === 'analytics') {
      setActiveView('analytics');
    } else if (view === 'systems') {
      setActiveView('integrations');
    } else if (view === 'network') {
      setActiveView('command');
    } else if (view === 'config') {
      setRulesSubTab('catalog');
      setActiveView('rules');
    } else {
      setActiveView(view as HSXView);
    }
  };

  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-[#03050a] text-slate-100">
        <CurtainTransition isActive={isCurtainActive} />
        <HoneyShieldLanding
          onNavigate={(view) => {
            setIsCurtainActive(true);
            setTimeout(() => {
              setActiveView(view as HSXView);
              setIsCurtainActive(false);
            }, 180);
          }}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080D14] flex flex-col text-[#F0F5F8]">
      <CurtainTransition isActive={isCurtainActive} />
      {/* Top Navigation */}
      <Header
        health={stats?.system_health}
        isFetching={isFetching}
        activeView={activeView}
        onViewChange={handleTopNavChange}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        alerts={alerts}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onSearchSubmit={handleDeepLinkInvestigate}
      />

      {/* Main Workspace with Left Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop lg: only) */}
        <Sidebar
          activeId={sidebarActiveId}
          onSelect={handleSidebarSelect}
          alertCount={stats?.active_alerts ?? alerts.filter((a) => a.status === 'open').length}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 max-w-7xl w-full mx-auto pb-20 lg:pb-6">
          {activeView === 'overview' ? (
            /* Minimal, Premium Security Overview (Milestone 20 Flagship Experience) */
            <SecurityOverview
              stats={stats}
              alerts={alerts}
              attacks={attacks}
              isStatsLoading={isStatsLoading}
              isAlertsLoading={isAlertsLoading}
              isStatsError={isStatsError}
              isAlertsError={isAlertsError}
              onInvestigateIp={handleDeepLinkInvestigate}
              onNavigateView={(view) => setActiveView(view as HSXView)}
              onSelectAlert={(alert) => setSelectedAlert(alert)}
              streamConnectionState={streamConnectionState}
              streamMetrics={streamMetrics}
            />
          ) : activeView === 'universe' ? (
            /* Dedicated Immersive Digital Agent Universe (Universe 2.0 Command Center) */
            <div className="space-y-4">
              <UniverseCommandCenter
                stats={stats}
                alerts={alerts}
                attacks={attacks}
                runtimeStatuses={runtimeStatuses}
                activePackets={activePackets}
                completedPackets={completedPackets}
                failedPackets={failedPackets}
                journeys={journeys}
                isDemoMode={isDemoMode}
                onToggleDemoMode={toggleDemoMode}
                onInvestigateIp={handleDeepLinkInvestigate}
                onNavigateView={(view) => setActiveView(view as HSXView)}
                streamConnectionState={streamConnectionState}
                streamMetrics={streamMetrics}
                onOpenNexusAssistant={() => setIsAssistantModalOpen(true)}
              />
            </div>
          ) : activeView === 'analytics' || activeView === 'dashboard' ? (
            /* Module 3.1 & Analytics Overview */
            <div className="space-y-6">
              <KpiRibbon stats={stats} isLoading={isStatsLoading} />
              <AlertTable
                alerts={alerts}
                isLoading={isAlertsLoading}
                onSelectAlert={(alert) => setSelectedAlert(alert)}
                statusFilter={statusFilter}
                onStatusFilterChange={(status) => setStatusFilter(status)}
              />
            </div>
          ) : activeView === 'alerts' ? (
            /* Dedicated Alerts Feed */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] flex items-center justify-between shadow-soc-sm">
                <div>
                  <h2 className="text-sm font-bold text-[#F0F5F8] uppercase font-mono tracking-wider">
                    Full Alerts Console
                  </h2>
                  <p className="text-xs text-[#94A6B8] font-mono">
                    Multi-Vector Correlated Detections & Incident Prioritization
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#00D6C9]/15 text-[#00D6C9] border border-[#00D6C9]/35 font-semibold">
                  {alerts.length} Total Alerts
                </span>
              </div>
              <AlertTable
                alerts={alerts}
                isLoading={isAlertsLoading}
                onSelectAlert={(alert) => setSelectedAlert(alert)}
                statusFilter={statusFilter}
                onStatusFilterChange={(status) => setStatusFilter(status)}
              />
            </div>
          ) : activeView === 'command' ? (
            /* Module 3.4 Live Incident Command Workspace */
            <div>
              <LiveCommandCenterView
                onInvestigateIp={handleDeepLinkInvestigate}
                onReplayAttack={handleDeepLinkReplayAttack}
              />
            </div>
          ) : activeView === 'cases' ? (
            /* Module 3.6 Incident Case Management & Playbooks */
            <div>
              <CaseManagementView
                onInvestigateIp={handleDeepLinkInvestigate}
              />
            </div>
          ) : activeView === 'deception' ? (
            /* Module 3.7 Active Deception Grid & Canary Orchestrator (System 2) */
            <div>
              <DeceptionGridView
                onInvestigateIp={handleDeepLinkInvestigate}
                onStageContainment={(ip) => {
                  handleDeepLinkInvestigate(ip);
                }}
              />
            </div>
          ) : activeView === 'intel' ? (
            /* Module 3.8 Threat Intelligence & IOC Fusion (System 3) */
            <div>
              <ThreatIntelView
                onInvestigateIp={handleDeepLinkInvestigate}
                onStageContainment={(ip) => {
                  handleDeepLinkInvestigate(ip);
                }}
              />
            </div>
          ) : activeView === 'integrations' ? (
            /* Module 3.9 Enterprise Defensive Integration & SIEM-SOAR Gateway */
            <div>
              <IntegrationsView />
            </div>
          ) : activeView === 'campaigns' || activeView === 'hunts' ? (
            /* AI Analysis Workspace: Campaigns & Threat Hunting */
            <div className="space-y-6">
              <div className="flex items-center space-x-2 border-b border-[#1E2D3D] pb-3 text-xs font-mono font-medium">
                <button
                  onClick={() => setAiSubTab('campaigns')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border ${
                    aiSubTab === 'campaigns'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Attack Campaign Intelligence (Module 3.10)</span>
                </button>
                <button
                  onClick={() => setAiSubTab('hunting')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border ${
                    aiSubTab === 'hunting'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Retrospective Threat Hunting (Module 3.11)</span>
                </button>
              </div>

              {aiSubTab === 'campaigns' ? (
                <CampaignsView onInvestigateIp={handleDeepLinkInvestigate} />
              ) : (
                <ThreatHuntingView onInvestigateIp={handleDeepLinkInvestigate} />
              )}
            </div>
          ) : activeView === 'investigation' ? (
            <div className="space-y-6">
              {/* IP Search / Query Ribbon */}
              <div className="p-4 rounded-xl bg-[#111C29] border border-[#1E2D3D] space-y-3 shadow-soc-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#00D6C9]/10 border border-[#00D6C9]/25 flex items-center justify-center">
                      <Network className="w-4 h-4 text-[#00D6C9]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#F0F5F8] font-mono tracking-tight">Attacker Entity Deep-Dive Search</h3>
                  </div>

                  {/* Search Form */}
                  <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#94A6B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Enter IPv4 or IPv6..."
                        className="bg-[#080D14] border border-[#1E2D3D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F0F5F8] placeholder-[#94A6B8] focus:outline-none focus:border-[#00D6C9] focus:ring-1 focus:ring-[#00D6C9] font-mono w-64"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00D6C9] hover:bg-[#00D6C9]/90 text-[#080D14] transition-colors flex items-center space-x-1.5 shadow-soc-sm"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Quick Suggestions / Recent Attacker IPs */}
                {suggestedIps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E2D3D] text-xs font-mono">
                    <span className="text-[#94A6B8]">Recent Attackers:</span>
                    {suggestedIps.slice(0, 5).map((ip) => (
                      <button
                        key={ip}
                        onClick={() => {
                          setSearchInput(ip);
                          setInvestigationIp(ip);
                        }}
                        className={`px-2 py-0.5 rounded border transition-colors ${
                          investigationIp === ip
                            ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40'
                            : 'bg-[#192737] text-[#94A6B8] border-[#1E2D3D] hover:border-[#00D6C9]/40 hover:text-[#F0F5F8]'
                        }`}
                      >
                        {ip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dossier & Visualizer Workspace */}
              {investigationIp ? (
                <IpDossierView
                  sourceIp={investigationIp}
                  onSelectAlert={(alert) => setSelectedAlert(alert)}
                  onReplayIp={handleDeepLinkReplayIp}
                />
              ) : (
                <div className="py-20 text-center space-y-3 bg-[#111C29] border border-[#1E2D3D] rounded-xl">
                  <Network className="w-10 h-10 text-[#94A6B8]/50 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#F0F5F8]">No Attacker Entity Selected</h4>
                  <p className="text-xs text-[#94A6B8] max-w-md mx-auto">
                    Enter an IP address above or click &ldquo;Investigate Attacker Entity&rdquo; from any active alert in the SOC overview to inspect threat intelligence, MITRE tactics, and progression graphs.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Module 3.3 Detection & Replay Workspace */
            <div className="space-y-6">
              {/* Sub-navigation tabs */}
              <div className="flex items-center space-x-2 border-b border-[#1E2D3D] pb-3 text-xs font-mono font-medium overflow-x-auto">
                <button
                  onClick={() => setRulesSubTab('catalog')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border whitespace-nowrap ${
                    rulesSubTab === 'catalog'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Detection Rules Catalog</span>
                </button>

                <button
                  onClick={() => setRulesSubTab('replay')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border whitespace-nowrap ${
                    rulesSubTab === 'replay'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Historical Replay Studio</span>
                </button>

                <button
                  onClick={() => setRulesSubTab('simulation')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border whitespace-nowrap ${
                    rulesSubTab === 'simulation'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Candidate Rule Simulation</span>
                </button>

                <button
                  onClick={() => setRulesSubTab('audit')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors border whitespace-nowrap ${
                    rulesSubTab === 'audit'
                      ? 'bg-[#00D6C9]/15 text-[#00D6C9] border-[#00D6C9]/40 font-semibold'
                      : 'border-transparent text-[#94A6B8] hover:text-[#F0F5F8] hover:bg-[#192737]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Operator Audit Trail</span>
                </button>
              </div>

              {/* Active Sub-tab View */}
              {rulesSubTab === 'catalog' && (
                <RuleCatalogView
                  onSelectRule={(id) => setSelectedRuleId(id)}
                  onOpenSimulation={handleOpenSimulation}
                />
              )}

              {rulesSubTab === 'replay' && (
                <ReplayStudioView
                  initialTarget={replayTarget}
                  initialScope={replayScope}
                  onSimulateCandidate={(target, scope) => {
                    setReplayTarget(target);
                    setReplayScope(scope);
                    setRulesSubTab('simulation');
                  }}
                />
              )}

              {rulesSubTab === 'simulation' && (
                <SimulationSandboxView
                  initialRule={simulationRule}
                  initialTarget={replayTarget}
                  initialScope={replayScope}
                />
              )}

              {rulesSubTab === 'audit' && <AuditTrailView />}
            </div>
          )}
        </main>
      </div>

      {/* Panel 8: Bottom Status Bar (Desktop lg: only) */}
      <BottomStatusBar />

      {/* Mobile Bottom Navigation (screens < lg) */}
      <MobileBottomNav
        activeId={sidebarActiveId}
        onSelect={handleSidebarSelect}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        alertCount={stats?.active_alerts ?? alerts.filter((a) => a.status === 'open').length}
      />

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeId={sidebarActiveId}
        onSelect={handleSidebarSelect}
        alertCount={stats?.active_alerts ?? alerts.filter((a) => a.status === 'open').length}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Alert Detail & Incident Triage Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onInvestigateIp={handleDeepLinkInvestigate}
        onReplayAttack={handleDeepLinkReplayAttack}
        onPromoteToCase={(alert) => {
          setSelectedAlert(null);
          setPromotedAlert(alert);
        }}
      />

      {/* Case Promotion Modal */}
      {promotedAlert && (
        <CasePromotionModal
          isOpen={!!promotedAlert}
          onClose={() => setPromotedAlert(null)}
          initialAlertIds={[promotedAlert.id]}
          initialSeverity={promotedAlert.severity}
          initialTargetId={promotedAlert.attack_id || undefined}
          onCaseCreated={() => {
            setPromotedAlert(null);
            setActiveView('cases');
          }}
        />
      )}

      {/* Detection Rule Detail Drawer */}
      <RuleDetailDrawer
        ruleId={selectedRuleId}
        onClose={() => setSelectedRuleId(null)}
        onSimulateCandidate={(_rId) => {
          setSelectedRuleId(null);
          setRulesSubTab('simulation');
        }}
      />

      {/* Login / Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isSessionExpired={sessionExpired}
      />

      {/* NEXUS Grounded Assistant Modal */}
      <NexusAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        activePackets={activePackets}
        completedPackets={completedPackets}
        failedPackets={failedPackets}
        runtimeAgentStates={{
          scout: runtimeStatuses.scout.currentState,
          nexus: runtimeStatuses.nexus.currentState,
          oracle: runtimeStatuses.oracle.currentState,
          sentinel: runtimeStatuses.sentinel.currentState,
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DashboardContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
