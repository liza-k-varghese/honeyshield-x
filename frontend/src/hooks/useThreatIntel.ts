import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchThreatIndicators,
  fetchThreatIndicator,
  fetchIndicatorContext,
  fetchThreatCampaigns,
  createThreatIndicator,
  updateThreatIndicator,
  revokeThreatIndicator,
  whitelistThreatIndicator,
  promoteCaseObservable,
} from '../api/client';
import {
  ThreatIndicatorCreatePayload,
  ThreatIndicatorUpdatePayload,
  PromoteCaseObservablePayload,
} from '../types';

export function useThreatIndicators(params?: {
  status?: string;
  type?: string;
  threat_level?: string;
  campaign?: string;
  search?: string;
  min_confidence?: number;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['threat-indicators', params],
    queryFn: () => fetchThreatIndicators(params),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useThreatIndicator(id: number | null) {
  return useQuery({
    queryKey: ['threat-indicator', id],
    queryFn: () => (id ? fetchThreatIndicator(id) : Promise.reject(new Error('No indicator ID'))),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useIndicatorContext(id: number | null) {
  return useQuery({
    queryKey: ['threat-indicator-context', id],
    queryFn: () => (id ? fetchIndicatorContext(id) : Promise.reject(new Error('No indicator ID'))),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useThreatCampaigns() {
  return useQuery({
    queryKey: ['threat-campaigns'],
    queryFn: () => fetchThreatCampaigns(),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ThreatIndicatorCreatePayload) => createThreatIndicator(payload),
    onSuccess: (newIndicator) => {
      queryClient.invalidateQueries({ queryKey: ['threat-indicators'] });
      queryClient.invalidateQueries({ queryKey: ['threat-campaigns'] });
      queryClient.setQueryData(['threat-indicator', newIndicator.id], newIndicator);
    },
  });
}

export function useUpdateIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ThreatIndicatorUpdatePayload }) =>
      updateThreatIndicator(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['threat-indicators'] });
      queryClient.invalidateQueries({ queryKey: ['threat-campaigns'] });
      queryClient.setQueryData(['threat-indicator', updated.id], updated);
    },
  });
}

export function useRevokeIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      revokeThreatIndicator(id, reason),
    onSuccess: (revoked) => {
      queryClient.invalidateQueries({ queryKey: ['threat-indicators'] });
      queryClient.invalidateQueries({ queryKey: ['threat-campaigns'] });
      queryClient.setQueryData(['threat-indicator', revoked.id], revoked);
    },
  });
}

export function useWhitelistIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      whitelistThreatIndicator(id, reason),
    onSuccess: (whitelisted) => {
      queryClient.invalidateQueries({ queryKey: ['threat-indicators'] });
      queryClient.invalidateQueries({ queryKey: ['threat-campaigns'] });
      queryClient.setQueryData(['threat-indicator', whitelisted.id], whitelisted);
    },
  });
}

export function usePromoteCaseObservable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PromoteCaseObservablePayload) => promoteCaseObservable(payload),
    onSuccess: (promoted) => {
      queryClient.invalidateQueries({ queryKey: ['threat-indicators'] });
      queryClient.invalidateQueries({ queryKey: ['threat-campaigns'] });
      queryClient.setQueryData(['threat-indicator', promoted.id], promoted);
    },
  });
}
