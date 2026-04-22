/**
 * TanStack Query hooks for rule projects and rule graphs in helpdesk-mf.
 *
 * Mirrors the pattern in src/workflow-editor/state/workflowQueries.ts —
 * all query keys include `contextKey` so data refreshes automatically when
 * the tenant context changes.
 */
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
  listRuleProjects,
  createRuleProject,
  updateRuleProject,
  deleteRuleProject,
  listRuleGraphs,
  getRuleGraph,
  createRuleGraph,
  updateRuleGraph,
  deleteRuleGraph,
  createRuleGraphVersion,
  publishRuleGraphVersion,
} from '../api/ruleProjectsApi';
import type { RuleGraphContent } from '@brainforgeau/rules-ui';

// ── Query key factory ──────────────────────────────────────────────────────────

export const ruleProjectKeys = {
  all: (contextKey: string) => ['rule-projects', contextKey] as const,
  list: (contextKey: string) =>
    [...ruleProjectKeys.all(contextKey), 'list'] as const,
  detail: (contextKey: string, id: string) =>
    [...ruleProjectKeys.all(contextKey), 'detail', id] as const,
  graphs: (contextKey: string, projectId: string) =>
    [...ruleProjectKeys.all(contextKey), projectId, 'graphs'] as const,
  graph: (contextKey: string, projectId: string, ruleId: string) =>
    [...ruleProjectKeys.graphs(contextKey, projectId), ruleId] as const,
};

// ── Rule project hooks ─────────────────────────────────────────────────────────

export function useRuleProjects() {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.list(contextKey),
    queryFn: () => listRuleProjects(),
  });
}

export function useRuleProject(id: string | null) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  // We load the project detail from the list cache — individual project GET
  // isn't strictly needed for the list page; load graphs separately.
  return useQuery({
    queryKey: ruleProjectKeys.detail(contextKey, id ?? '__null__'),
    queryFn: () => listRuleProjects().then(list => list.find(p => p.id === id) ?? null),
    enabled: !!id,
  });
}

export function useCreateRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      name,
      key,
      description,
    }: {
      name: string;
      key: string;
      description?: string;
    }) => createRuleProject(name, key, description),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}

export function useDeleteRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: (id: string) => deleteRuleProject(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}

// ── Rule graph hooks ───────────────────────────────────────────────────────────

export function useRuleGraphs(projectId: string | null) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.graphs(contextKey, projectId ?? '__null__'),
    queryFn: () => listRuleGraphs(projectId!),
    enabled: !!projectId,
  });
}

export function useRuleGraph(
  projectId: string | null,
  ruleId: string | null,
) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.graph(
      contextKey,
      projectId ?? '__null__',
      ruleId ?? '__null__',
    ),
    queryFn: () => getRuleGraph(projectId!, ruleId!),
    enabled: !!projectId && !!ruleId,
  });
}

export function useCreateRuleGraph() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      projectId,
      name,
      key,
      description,
      category,
    }: {
      projectId: string;
      name: string;
      key: string;
      description?: string;
      category?: string | null;
    }) => createRuleGraph(projectId, name, key, description, category),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graphs(contextKey, variables.projectId),
      }),
  });
}

export function useUpdateRuleGraph() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      projectId,
      ruleId,
      request,
    }: {
      projectId: string;
      ruleId: string;
      request: {
        name: string;
        description: string | null;
        category?: string | null;
        isEnabled?: boolean;
        cooldownMinutes?: number;
        consecutivePacketsRequired?: number;
        schedule?: unknown;
        assetIds?: string[];
        assetGroupIds?: string[];
        mapColor?: string | null;
        mapLabel?: string | null;
        linkedGeofenceIds?: string[];
      };
    }) => updateRuleGraph(projectId, ruleId, request),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graph(
          contextKey,
          variables.projectId,
          variables.ruleId,
        ),
      }),
  });
}

export function useDeleteRuleGraph() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      projectId,
      ruleId,
    }: {
      projectId: string;
      ruleId: string;
    }) => deleteRuleGraph(projectId, ruleId),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graphs(contextKey, variables.projectId),
      }),
  });
}

export function useCreateRuleGraphVersion() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      projectId,
      ruleId,
      content,
      versionName,
    }: {
      projectId: string;
      ruleId: string;
      content: RuleGraphContent;
      versionName?: string;
    }) => createRuleGraphVersion(projectId, ruleId, content, versionName),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graph(
          contextKey,
          variables.projectId,
          variables.ruleId,
        ),
      }),
  });
}

export function usePublishRuleGraphVersion() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      projectId,
      ruleId,
      versionId,
    }: {
      projectId: string;
      ruleId: string;
      versionId: string;
    }) => publishRuleGraphVersion(projectId, ruleId, versionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graph(
          contextKey,
          variables.projectId,
          variables.ruleId,
        ),
      });
      qc.invalidateQueries({
        queryKey: ruleProjectKeys.graphs(contextKey, variables.projectId),
      });
    },
  });
}

export function useUpdateRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        name: string;
        description?: string | null;
        isEnabled: boolean;
        status: string;
      };
    }) => updateRuleProject(id, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}
