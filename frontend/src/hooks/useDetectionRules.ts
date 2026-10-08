import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRuleCatalog,
  fetchRuleDetail,
  fetchRuleEfficacy,
  replayAttack,
  replayIp,
  simulateCandidateRule,
  fetchAuditEvents,
} from '../api/client';
import {
  RuleCatalogResponse,
  DetectionRuleSummary,
  RuleEfficacyResponse,
  ReplayExecutionResponse,
  ReplayRequest,
  SimulationExecutionResponse,
  SimulationRequest,
  AuditEventsResponse,
} from '../types';

export function useDetectionRules(vector?: string, ruleType?: string) {
  return useQuery<RuleCatalogResponse>({
    queryKey: ['detection-rules', vector || 'all', ruleType || 'all'],
    queryFn: () => fetchRuleCatalog(vector, ruleType),
    staleTime: 10000,
  });
}

export function useRuleDetail(ruleId: string, enabled: boolean = true) {
  return useQuery<DetectionRuleSummary>({
    queryKey: ['detection-rule-detail', ruleId],
    queryFn: () => fetchRuleDetail(ruleId),
    enabled: Boolean(ruleId) && enabled,
    staleTime: 10000,
  });
}

export function useRuleEfficacy(ruleId: string, hours: number = 24, enabled: boolean = true) {
  return useQuery<RuleEfficacyResponse>({
    queryKey: ['detection-rule-efficacy', ruleId, hours],
    queryFn: () => fetchRuleEfficacy(ruleId, hours),
    enabled: Boolean(ruleId) && enabled,
    staleTime: 10000,
  });
}

export function useReplayAttack() {
  const queryClient = useQueryClient();
  return useMutation<ReplayExecutionResponse, Error, { attackId: number; req?: ReplayRequest }>({
    mutationFn: ({ attackId, req }) => replayAttack(attackId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}

export function useReplayIp() {
  const queryClient = useQueryClient();
  return useMutation<ReplayExecutionResponse, Error, { sourceIp: string; req?: ReplayRequest }>({
    mutationFn: ({ sourceIp, req }) => replayIp(sourceIp, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}

export function useSimulateRule() {
  const queryClient = useQueryClient();
  return useMutation<SimulationExecutionResponse, Error, SimulationRequest>({
    mutationFn: (req) => simulateCandidateRule(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}

export function useAuditEvents(limit: number = 50, source?: string, eventType?: string) {
  return useQuery<AuditEventsResponse>({
    queryKey: ['audit-events', limit, source || 'all', eventType || 'all'],
    queryFn: () => fetchAuditEvents(limit, source, eventType),
    staleTime: 5000,
  });
}
