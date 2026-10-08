import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCaseNote,
  completeCaseTask,
  createCase,
  fetchCase,
  fetchCaseReport,
  fetchCases,
  updateCase,
} from '../api/client';
import {
  CaseCreatePayload,
  CaseTaskCompletePayload,
  CaseUpdatePayload,
} from '../types';

export function useCases(params?: {
  status?: string;
  severity?: string;
  handler_id?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['incident-cases', params?.status, params?.severity, params?.handler_id, params?.limit, params?.offset],
    queryFn: () => fetchCases(params),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useCase(caseId: string | null) {
  return useQuery({
    queryKey: ['incident-case', caseId],
    queryFn: () => (caseId ? fetchCase(caseId) : Promise.reject(new Error('No case ID provided'))),
    enabled: !!caseId,
    refetchInterval: 5000,
  });
}

export function useCaseReport(caseId: string | null, enabled: boolean = false) {
  return useQuery({
    queryKey: ['incident-case-report', caseId],
    queryFn: () => (caseId ? fetchCaseReport(caseId) : Promise.reject(new Error('No case ID provided'))),
    enabled: !!caseId && enabled,
    staleTime: 30000,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CaseCreatePayload) => createCase(payload),
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['incident-cases'] });
      queryClient.setQueryData(['incident-case', newCase.case_id], newCase);
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: CaseUpdatePayload }) =>
      updateCase(caseId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incident-cases'] });
      queryClient.setQueryData(['incident-case', updated.case_id], updated);
    },
  });
}

export function useCompleteCaseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      taskId,
      payload,
    }: {
      caseId: string;
      taskId: string;
      payload: CaseTaskCompletePayload;
    }) => completeCaseTask(caseId, taskId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incident-cases'] });
      queryClient.setQueryData(['incident-case', updated.case_id], updated);
    },
  });
}

export function useAddCaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, message }: { caseId: string; message: string }) =>
      addCaseNote(caseId, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-cases'] });
      queryClient.invalidateQueries({ queryKey: ['incident-case', variables.caseId] });
    },
  });
}
