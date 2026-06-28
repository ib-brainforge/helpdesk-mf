import { contextQueryKeyAtom } from '@/state/context-query-key';
import { useWorkflowApi } from '@brainforgeau/workflow-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import type {
  CloneDefinitionInput,
  CreateDefinitionInput,
  CreatePrincipalDefinitionInput,
  PublishDraftInput,
  PublishPrincipalDraftInput,
  UpdateDraftInput,
  UpdatePrincipalDraftInput,
} from '../types';

export const workflowKeys = {
  all: (contextKey: string) => ['workflows', contextKey] as const,
  list: (contextKey: string) =>
    [...workflowKeys.all(contextKey), 'list'] as const,
  detail: (contextKey: string, id: string) =>
    [...workflowKeys.all(contextKey), 'detail', id] as const,
  // Principal-scoped
  principalAll: (contextKey: string) =>
    ['workflows', contextKey, 'principal'] as const,
  principalList: (contextKey: string, principalId: string) =>
    [...workflowKeys.principalAll(contextKey), principalId, 'list'] as const,
  principalDetail: (contextKey: string, principalId: string, id: string) =>
    [
      ...workflowKeys.principalAll(contextKey),
      principalId,
      'detail',
      id,
    ] as const,
  // Admin
  ruleMigrationReport: (contextKey: string) =>
    ['workflows', contextKey, 'admin', 'rule-migration-report'] as const,
};

// ── Tenant-scoped hooks ────────────────────────────────────────────────────────

export function useWorkflowList() {
  const api = useWorkflowApi();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: workflowKeys.list(contextKey),
    queryFn: () => api.listDefinitions(),
  });
}

export function useWorkflowDefinition(id: string | null) {
  const api = useWorkflowApi();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: workflowKeys.detail(contextKey, id ?? '__null__'),
    queryFn: () => api.getDefinition(id!),
    enabled: !!id,
  });
}

export function useCreateDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: CreateDefinitionInput) => api.createDefinition(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workflowKeys.list(contextKey) }),
  });
}

export function useDeleteDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (id: string) => api.deleteDefinition(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workflowKeys.list(contextKey) }),
  });
}

export function useCloneDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: CloneDefinitionInput) => api.cloneDefinition(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workflowKeys.all(contextKey) }),
  });
}

export function useCreateDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (definitionId: string) => api.createDraft(definitionId),
    onSuccess: (_data, definitionId) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(contextKey, definitionId),
      }),
  });
}

export function useUpdateDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: UpdateDraftInput) => api.updateDraft(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(contextKey, input.definitionId),
      }),
  });
}

export function usePublishDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: PublishDraftInput) => api.publishDraft(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(contextKey, input.definitionId),
      });
      qc.invalidateQueries({ queryKey: workflowKeys.list(contextKey) });
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
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: workflowKeys.principalList(contextKey, principalId),
    queryFn: () => api.listPrincipalDefinitions(principalId),
    enabled: !!principalId,
  });
}

export function usePrincipalWorkflowDefinition(
  principalId: string,
  id: string | null,
) {
  const api = useWorkflowApi();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: workflowKeys.principalDetail(
      contextKey,
      principalId,
      id ?? '__null__',
    ),
    queryFn: () => api.getPrincipalDefinition(principalId, id!),
    enabled: !!principalId && !!id,
  });
}

export function useCreatePrincipalDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: CreatePrincipalDefinitionInput) =>
      api.createPrincipalDefinition(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(contextKey, input.principalId),
      }),
  });
}

export function useDeletePrincipalDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({ principalId, id }: { principalId: string; id: string }) =>
      api.deletePrincipalDefinition(principalId, id),
    onSuccess: (_data, { principalId }) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(contextKey, principalId),
      }),
  });
}

export function useCreatePrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      principalId,
      definitionId,
    }: { principalId: string; definitionId: string }) =>
      api.createPrincipalDraft(principalId, definitionId),
    onSuccess: (_data, { principalId, definitionId }) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(
          contextKey,
          principalId,
          definitionId,
        ),
      }),
  });
}

export function useUpdatePrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: UpdatePrincipalDraftInput) =>
      api.updatePrincipalDraft(input),
    onSuccess: (_data, input) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(
          contextKey,
          input.principalId,
          input.definitionId,
        ),
      }),
  });
}

export function usePublishPrincipalDraft() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (input: PublishPrincipalDraftInput) =>
      api.publishPrincipalDraft(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: workflowKeys.principalDetail(
          contextKey,
          input.principalId,
          input.definitionId,
        ),
      });
      qc.invalidateQueries({
        queryKey: workflowKeys.principalList(contextKey, input.principalId),
      });
    },
  });
}

// ── Admin — rule migration ────────────────────────────────────────────────────

export function useRuleMigrationReport() {
  const api = useWorkflowApi();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: workflowKeys.ruleMigrationReport(contextKey),
    queryFn: () => api.getRuleMigrationReport(),
  });
}

export function useApplyRuleMigration() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (dryRun: boolean) => api.applyRuleMigration(dryRun),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: workflowKeys.ruleMigrationReport(contextKey),
      }),
  });
}
