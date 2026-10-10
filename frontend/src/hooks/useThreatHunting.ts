import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '../api/client';
import {
  HuntCreatePayload,
  HuntDossier,
  HuntExecutionResponse,
  HuntMetrics,
  HuntPromotionResponse,
  HuntUpdatePayload,
  ListHuntResponse,
} from '../types';

const API_BASE = '/api/v1/hunts';

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
  if (!res.ok) {
    const errorText = await res.text();
    let detail = `Request failed with status ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) {
        detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHunts(params?: {
  status?: string;
  severity?: string;
  mitre_tactic?: string;
  limit?: number;
  offset?: number;
}): Promise<ListHuntResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.mitre_tactic) query.set('mitre_tactic', params.mitre_tactic);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const url = `${API_BASE}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<ListHuntResponse>(res);
}

export async function fetchHuntDossier(huntId: string): Promise<HuntDossier> {
  const res = await fetch(`${API_BASE}/${huntId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<HuntDossier>(res);
}

export async function fetchHuntMetrics(): Promise<HuntMetrics> {
  const res = await fetch(`${API_BASE}/metrics/summary`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<HuntMetrics>(res);
}

export async function createHunt(payload: HuntCreatePayload): Promise<HuntDossier> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<HuntDossier>(res);
}

export async function updateHunt(huntId: string, payload: HuntUpdatePayload): Promise<HuntDossier> {
  const res = await fetch(`${API_BASE}/${huntId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<HuntDossier>(res);
}

export async function executeHunt(huntId: string): Promise<HuntExecutionResponse> {
  const res = await fetch(`${API_BASE}/${huntId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<HuntExecutionResponse>(res);
}

export async function promoteHuntToRule(huntId: string, justification: string): Promise<HuntPromotionResponse> {
  const res = await fetch(`${API_BASE}/${huntId}/promote/rule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ justification }),
  });
  return handleResponse<HuntPromotionResponse>(res);
}

export async function promoteHuntToCase(huntId: string, justification: string): Promise<HuntPromotionResponse> {
  const res = await fetch(`${API_BASE}/${huntId}/promote/case`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ justification }),
  });
  return handleResponse<HuntPromotionResponse>(res);
}

export async function archiveHunt(huntId: string): Promise<HuntDossier> {
  const res = await fetch(`${API_BASE}/${huntId}/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse<HuntDossier>(res);
}

// React Query Hooks

export function useHunts(params?: {
  status?: string;
  severity?: string;
  mitre_tactic?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['hunts', params],
    queryFn: () => fetchHunts(params),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useHuntDossier(huntId: string | null) {
  return useQuery({
    queryKey: ['hunt', huntId],
    queryFn: () => (huntId ? fetchHuntDossier(huntId) : Promise.reject(new Error('No hunt ID provided'))),
    enabled: !!huntId,
    refetchInterval: 5000,
  });
}

export function useHuntMetrics() {
  return useQuery({
    queryKey: ['hunt-metrics'],
    queryFn: fetchHuntMetrics,
    refetchInterval: 5000,
  });
}

export function useCreateHunt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHunt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
    },
  });
}

export function useUpdateHunt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huntId, payload }: { huntId: string; payload: HuntUpdatePayload }) =>
      updateHunt(huntId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hunt', variables.huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
    },
  });
}

export function useExecuteHunt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (huntId: string) => executeHunt(huntId),
    onSuccess: (_, huntId) => {
      queryClient.invalidateQueries({ queryKey: ['hunt', huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
    },
  });
}

export function usePromoteHuntToRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huntId, justification }: { huntId: string; justification: string }) =>
      promoteHuntToRule(huntId, justification),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hunt', variables.huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['detection-rules'] });
    },
  });
}

export function usePromoteHuntToCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huntId, justification }: { huntId: string; justification: string }) =>
      promoteHuntToCase(huntId, justification),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hunt', variables.huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useArchiveHunt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (huntId: string) => archiveHunt(huntId),
    onSuccess: (_, huntId) => {
      queryClient.invalidateQueries({ queryKey: ['hunt', huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['hunt-metrics'] });
    },
  });
}
