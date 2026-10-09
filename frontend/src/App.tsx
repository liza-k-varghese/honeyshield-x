import { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
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
import { LoginModal } from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAlerts, useDashboardStats } from './hooks/useDashboard';
import { Alert, DetectionRuleSummary } from './types';
import { Search, Network, ArrowRight, Shield, History, Sliders, FileText } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 3000,
    },
  },
});

function DashboardContent() {
  const [activeView, setActiveView] = useState<'dashboard' | 'command' | 'cases' | 'deception' | 'investigation' | 'rules'>('dashboard');
  const [rulesSubTab, setRulesSubTab] = useState<'catalog' | 'replay' | 'simulation' | 'audit'>('catalog');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [investigationIp, setInvestigationIp] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [promotedAlert, setPromotedAlert] = useState<Alert | null>(null);

  const { sessionExpired } = useAuth();

  // Module 3.3 state
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [simulationRule, setSimulationRule] = useState<DetectionRuleSummary | null>(null);
  const [replayTarget, setReplayTarget] = useState<string>('');
  const [replayScope, setReplayScope] = useState<'attack' | 'ip'>('attack');

  const {
    data: stats,
    isLoading: isStatsLoading,
    isFetching: isStatsFetching,
  } = useDashboardStats();

  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    isFetching: isAlertsFetching,
  } = useAlerts(statusFilter);

  const isFetching = isStatsFetching || isAlertsFetching;

  // Extract unique attacker IPs from alerts or fallback
  const suggestedIps = useMemo(() => {
    const ips = new Set<string>();
    alerts.forEach((a) => {
      const ipMatch = a.message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
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

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col text-slate-100">
      {/* Header */}
      <Header
        health={stats?.system_health}
        isFetching={isFetching}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeView === 'dashboard' ? (
          <>
            {/* KPI Ribbon */}
            <KpiRibbon stats={stats} isLoading={isStatsLoading} />

            {/* Alerts Feed Workspace */}
            <AlertTable
              alerts={alerts}
              isLoading={isAlertsLoading}
              onSelectAlert={(alert) => setSelectedAlert(alert)}
              statusFilter={statusFilter}
              onStatusFilterChange={(status) => setStatusFilter(status)}
            />
          </>
        ) : activeView === 'command' ? (
          /* Module 3.4 Live Incident Command Workspace */
          <LiveCommandCenterView
            onInvestigateIp={handleDeepLinkInvestigate}
            onReplayAttack={handleDeepLinkReplayAttack}
          />
        ) : activeView === 'cases' ? (
          /* Module 3.6 Incident Case Management & Playbooks */
          <CaseManagementView
            onInvestigateIp={handleDeepLinkInvestigate}
          />
        ) : activeView === 'deception' ? (
          /* Module 3.7 Active Deception Grid & Canary Orchestrator */
          <DeceptionGridView
            onInvestigateIp={handleDeepLinkInvestigate}
            onStageContainment={(ip) => {
              handleDeepLinkInvestigate(ip);
            }}
          />
        ) : activeView === 'investigation' ? (
          <div className="space-y-6">
            {/* IP Search / Query Ribbon */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Network className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">Attacker Entity Deep-Dive Search</h3>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Enter IPv4 or IPv6..."
                      className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono w-64"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center space-x-1"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Quick Suggestions / Recent Attacker IPs */}
              {suggestedIps.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <span className="text-slate-500">Recent Attackers:</span>
                  {suggestedIps.slice(0, 5).map((ip) => (
                    <button
                      key={ip}
                      onClick={() => {
                        setSearchInput(ip);
                        setInvestigationIp(ip);
                      }}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        investigationIp === ip
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
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
              <div className="py-20 text-center space-y-3 bg-slate-900/30 border border-slate-800 rounded-lg">
                <Network className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No Attacker Entity Selected</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Enter an IP address above or click &ldquo;Investigate Attacker Entity&rdquo; from any active alert in the SOC overview to inspect threat intelligence, MITRE tactics, and progression graphs.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Module 3.3 Detection & Replay Workspace */
          <div className="space-y-6">
            {/* Sub-navigation tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-xs font-medium">
              <button
                onClick={() => setRulesSubTab('catalog')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                  rulesSubTab === 'catalog'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Detection Rules Catalog</span>
              </button>

              <button
                onClick={() => setRulesSubTab('replay')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                  rulesSubTab === 'replay'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Historical Replay Studio</span>
              </button>

              <button
                onClick={() => setRulesSubTab('simulation')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                  rulesSubTab === 'simulation'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Candidate Rule Simulation</span>
              </button>

              <button
                onClick={() => setRulesSubTab('audit')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                  rulesSubTab === 'audit'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
        onSimulateCandidate={(rId) => {
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

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        HoneyShield-X System 1 SOC Operator Workspace &bull; Phase 3 Modules 3.1, 3.2, 3.3, 3.4 & 3.5 &bull; Clean-Room Security Console
      </footer>
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
