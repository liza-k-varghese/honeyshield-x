import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { KpiRibbon } from './components/KpiRibbon';
import { AlertTable } from './components/AlertTable';
import { AlertDetailDrawer } from './components/AlertDetailDrawer';
import { useAlerts, useDashboardStats } from './hooks/useDashboard';
import { Alert } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 3000,
    },
  },
});

function DashboardContent() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

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

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col text-slate-100">
      {/* Header */}
      <Header health={stats?.system_health} isFetching={isFetching} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
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
      </main>

      {/* Alert Detail & Incident Triage Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        HoneyShield-X System 1 SOC Operator Workspace &bull; Phase 3 Module 3.1 &bull; Local Security Console
      </footer>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

export default App;
