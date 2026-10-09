import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCampaigns,
  fetchCampaign,
  updateCampaign,
  fetchCampaignGraph,
  fetchCampaignTimeline,
  fetchCampaignMetrics,
  triggerCampaignClustering,
  mergeCampaigns,
  containCampaign,
  linkCampaignCase,
  unlinkCampaignCase,
} from '../api/client';
import {
  CampaignClusterRequest,
  CampaignContainmentRequest,
  CampaignMergeRequest,
  CampaignUpdateRequest,
} from '../types';

export function useCampaigns(params?: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => fetchCampaigns(params),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => (id ? fetchCampaign(id) : Promise.reject(new Error('No campaign ID'))),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCampaignGraph(id: string | null) {
  return useQuery({
    queryKey: ['campaign-graph', id],
    queryFn: () => (id ? fetchCampaignGraph(id) : Promise.reject(new Error('No campaign ID'))),
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export function useCampaignTimeline(id: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['campaign-timeline', id, limit],
    queryFn: () => (id ? fetchCampaignTimeline(id, limit) : Promise.reject(new Error('No campaign ID'))),
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export function useCampaignMetrics() {
  return useQuery({
    queryKey: ['campaign-metrics'],
    queryFn: () => fetchCampaignMetrics(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useTriggerClustering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: CampaignClusterRequest) => triggerCampaignClustering(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics'] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CampaignUpdateRequest }) =>
      updateCampaign(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', updated.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics'] });
    },
  });
}

export function useMergeCampaigns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CampaignMergeRequest) => mergeCampaigns(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics'] });
    },
  });
}

export function useContainCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
      idempotencyKey,
    }: {
      id: string;
      payload: CampaignContainmentRequest;
      idempotencyKey?: string;
    }) => containCampaign(id, payload, idempotencyKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics'] });
    },
  });
}

export function useLinkCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      linkCampaignCase(id, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUnlinkCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      unlinkCampaignCase(id, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
