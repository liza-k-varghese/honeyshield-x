import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllowlistedActions,
  fetchGovernorStatus,
  fetchVirtualIncidents,
  executeIncidentCommand,
  toggleGovernorLockout,
} from '../api/client';
import { IncidentCommandRequest } from '../types';

export function useGovernorStatus(operatorId: string = 'soc_operator') {
  return useQuery({
    queryKey: ['governor-status', operatorId],
    queryFn: () => fetchGovernorStatus(operatorId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useVirtualIncidents(statusFilter: string = 'all') {
  return useQuery({
    queryKey: ['virtual-incidents', statusFilter],
    queryFn: () => fetchVirtualIncidents(statusFilter),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useAllowlistedActions() {
  return useQuery({
    queryKey: ['allowlisted-actions'],
    queryFn: fetchAllowlistedActions,
    staleTime: 60000,
  });
}

export function useExecuteIncidentCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      req,
      idempotencyKey,
      operatorId,
    }: {
      req: IncidentCommandRequest;
      idempotencyKey?: string;
      operatorId?: string;
    }) => executeIncidentCommand(req, idempotencyKey, operatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['governor-status'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}

export function useToggleGovernorLockout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      engaged,
      justification,
      operatorId,
    }: {
      engaged: boolean;
      justification: string;
      operatorId?: string;
    }) => toggleGovernorLockout(engaged, justification, operatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governor-status'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}
