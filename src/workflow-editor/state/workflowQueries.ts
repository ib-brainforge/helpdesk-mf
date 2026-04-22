import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateDefinitionInput,
  PublishDraftInput,
  UpdateDraftInput,
} from '../types';
import { useWorkflowApi } from './useWorkflowApi';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: () => [...workflowKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
};

export function useWorkflowList() {
  const api = useWorkflowApi();
  return useQuery({
    queryKey: workflowKeys.list(),
    queryFn: () => api.listDefinitions(),
  });
}

export function useWorkflowDefinition(id: string | null) {
  const api = useWorkflowApi();
  return useQuery({
    queryKey: workflowKeys.detail(id ?? '__null__'),
    queryFn: () => api.getDefinition(id!),
    enabled: !!id,
  });
}

export function useCreateDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDefinitionInput) => api.createDefinition(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.list() }),
  });
}

export function useCreateDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (definitionId: string) => api.createDraft(definitionId),
    onSuccess: (_data, definitionId) =>
      qc.invalidateQueries({ queryKey: workflowKeys.detail(definitionId) }),
  });
}

export function useUpdateDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDraftInput) => api.updateDraft(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(input.definitionId),
      }),
  });
}

export function usePublishDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishDraftInput) => api.publishDraft(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(input.definitionId),
      }),
  });
}

// useDeleteDefinition removed — will re-add in Plan 4 for list-page UX (delete confirmation modal)

export function useValidateVersion() {
  const api = useWorkflowApi();
  return useMutation({
    mutationFn: ({
      definitionId,
      versionId,
    }: { definitionId: string; versionId: string }) =>
      api.validateVersion(definitionId, versionId),
  });
}
