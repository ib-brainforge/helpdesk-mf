import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CloneDefinitionInput,
  CreateDefinitionInput,
  CreatePrincipalDefinitionInput,
  PublishDraftInput,
  PublishPrincipalDraftInput,
  UpdateDraftInput,
  UpdatePrincipalDraftInput,
} from '../types';
import { useWorkflowApi } from './useWorkflowApi';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: () => [...workflowKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
  // Principal-scoped
  principalAll: ['workflows', 'principal'] as const,
  principalList: (principalId: string) =>
    [...workflowKeys.principalAll, principalId, 'list'] as const,
  principalDetail: (principalId: string, id: string) =>
    [...workflowKeys.principalAll, principalId, 'detail', id] as const,
  // Admin
  ruleMigrationReport: () =>
    ['workflows', 'admin', 'rule-migration-report'] as const,
};

// ── Tenant-scoped hooks ────────────────────────────────────────────────────────

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

export function useDeleteDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.list() }),
  });
}

export function useCloneDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CloneDefinitionInput) => api.cloneDefinition(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
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
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(input.definitionId),
      });
      qc.invalidateQueries({ queryKey: workflowKeys.list() });
    },
  });
}

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

// ── Principal-scoped hooks ─────────────────────────────────────────────────────

export function usePrincipalWorkflowList(principalId: string) {
  const api = useWorkflowApi();
  return useQuery({
    queryKey: workflowKeys.principalList(principalId),
    queryFn: () => api.listPrincipalDefinitions(principalId),
    enabled: !!principalId,
  });
}

export function usePrincipalWorkflowDefinition(
  principalId: string,
  id: string | null,
) {
  const api = useWorkflowApi();
  return useQuery({
    queryKey: workflowKeys.principalDetail(principalId, id ?? '__null__'),
    queryFn: () => api.getPrincipalDefinition(principalId, id!),
    enabled: !!principalId && !!id,
  });
}

export function useCreatePrincipalDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePrincipalDefinitionInput) =>
      api.createPrincipalDefinition(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(input.principalId),
      }),
  });
}

export function useDeletePrincipalDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ principalId, id }: { principalId: string; id: string }) =>
      api.deletePrincipalDefinition(principalId, id),
    onSuccess: (_data, { principalId }) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(principalId),
      }),
  });
}

export function useCreatePrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      principalId,
      definitionId,
    }: { principalId: string; definitionId: string }) =>
      api.createPrincipalDraft(principalId, definitionId),
    onSuccess: (_data, { principalId, definitionId }) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(principalId, definitionId),
      }),
  });
}

export function useUpdatePrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePrincipalDraftInput) =>
      api.updatePrincipalDraft(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(
          input.principalId,
          input.definitionId,
        ),
      }),
  });
}

export function usePublishPrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishPrincipalDraftInput) =>
      api.publishPrincipalDraft(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(
          input.principalId,
          input.definitionId,
        ),
      });
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(input.principalId),
      });
    },
  });
}

// ── Admin — rule migration ────────────────────────────────────────────────────

export function useRuleMigrationReport() {
  const api = useWorkflowApi();
  return useQuery({
    queryKey: workflowKeys.ruleMigrationReport(),
    queryFn: () => api.getRuleMigrationReport(),
  });
}

export function useApplyRuleMigration() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dryRun: boolean) => api.applyRuleMigration(dryRun),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: workflowKeys.ruleMigrationReport(),
      }),
  });
}
