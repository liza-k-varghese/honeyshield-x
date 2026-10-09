import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCanaries,
  fetchCanary,
  fetchCanaryHits,
  fetchCanaryContext,
  mintCanary,
  updateCanary,
  revokeCanary,
} from '../api/client';
import {
  CanaryCreatePayload,
  CanaryUpdatePayload,
} from '../types';

export function useCanaries(statusFilter?: string, typeFilter?: string) {
  return useQuery({
    queryKey: ['deception-canaries', statusFilter, typeFilter],
    queryFn: () => fetchCanaries(statusFilter, typeFilter),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useCanary(tokenId: string | null) {
  return useQuery({
    queryKey: ['deception-canary', tokenId],
    queryFn: () => (tokenId ? fetchCanary(tokenId) : Promise.reject(new Error('No token ID'))),
    enabled: !!tokenId,
    refetchInterval: 5000,
  });
}

export function useCanaryHits(tokenId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['deception-canary-hits', tokenId, limit],
    queryFn: () => (tokenId ? fetchCanaryHits(tokenId, limit) : Promise.reject(new Error('No token ID'))),
    enabled: !!tokenId,
    refetchInterval: 5000,
  });
}

export function useCanaryContext(tokenId: string | null) {
  return useQuery({
    queryKey: ['deception-canary-context', tokenId],
    queryFn: () => (tokenId ? fetchCanaryContext(tokenId) : Promise.reject(new Error('No token ID'))),
    enabled: !!tokenId,
    refetchInterval: 5000,
  });
}

export function useMintCanary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CanaryCreatePayload) => mintCanary(payload),
    onSuccess: (newCanary) => {
      queryClient.invalidateQueries({ queryKey: ['deception-canaries'] });
      queryClient.setQueryData(['deception-canary', newCanary.token_id], newCanary);
    },
  });
}

export function useUpdateCanary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tokenId, payload }: { tokenId: string; payload: CanaryUpdatePayload }) =>
      updateCanary(tokenId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['deception-canaries'] });
      queryClient.setQueryData(['deception-canary', updated.token_id], updated);
      queryClient.invalidateQueries({ queryKey: ['deception-canary-context', updated.token_id] });
    },
  });
}

export function useRevokeCanary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => revokeCanary(tokenId),
    onSuccess: (revoked) => {
      queryClient.invalidateQueries({ queryKey: ['deception-canaries'] });
      queryClient.setQueryData(['deception-canary', revoked.token_id], revoked);
      queryClient.invalidateQueries({ queryKey: ['deception-canary-context', revoked.token_id] });
    },
  });
}
