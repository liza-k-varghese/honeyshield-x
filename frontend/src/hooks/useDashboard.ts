import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAlert,
  fetchAlerts,
  fetchAttack,
  fetchAttackEvents,
  fetchDashboardStats,
  updateAlertStatus,
} from '../api/client';
import { AlertLifecycleStatus } from '../types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useAlerts(statusFilter: string = 'all') {
  return useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => fetchAlerts(statusFilter),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useAlertDetail(alertId: number | null) {
  return useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => (alertId ? fetchAlert(alertId) : null),
    enabled: alertId !== null,
  });
}

export function useAttackDetail(attackId: number | null) {
  return useQuery({
    queryKey: ['attack', attackId],
    queryFn: () => (attackId ? fetchAttack(attackId) : null),
    enabled: attackId !== null,
  });
}

export function useAttackEvents(attackId: number | null) {
  return useQuery({
    queryKey: ['attack-events', attackId],
    queryFn: () => (attackId ? fetchAttackEvents(attackId) : []),
    enabled: attackId !== null,
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      alertId,
      status,
    }: {
      alertId: number;
      status: AlertLifecycleStatus;
    }) => updateAlertStatus(alertId, status),
    onSuccess: (_, variables) => {
      // Invalidate alerts list and stats immediately so UI reflects updated state
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['alert', variables.alertId] });
    },
  });
}
