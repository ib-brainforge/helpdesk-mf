import type {
  ServicesCoreRulesApplicationModelsRuleGraphDto as GenRuleGraphDto,
  ServicesCoreRulesApplicationModelsRuleGraphVersionDto as GenRuleGraphVersionDto,
  ServicesCoreRulesApplicationModelsRuleProjectDto as GenRuleProjectDto,
} from '@/api/helpdesk-client';
import { RuleGraphsApi } from '@/api/helpdesk-client/api/rule-graphs-api';
import { RuleProjectsApi } from '@/api/helpdesk-client/api/rule-projects-api';
/**
 * TanStack Query hooks for rule projects and rule graphs in helpdesk-mf.
 *
 * Mirrors the pattern in src/workflow-editor/state/workflowQueries.ts —
 * all query keys include `contextKey` so data refreshes automatically when
 * the tenant context changes.
 *
 * Uses generated `RuleProjectsApi` + `RuleGraphsApi` from
 * the vendored helpdesk client (`src/api/helpdesk-client`) via `createHelpdeskApiClient`.
 */
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { RuleGraphContent } from '@brainforgeau/rules-ui';
import type {
  RuleGraphDto,
  RuleGraphVersionDto,
  RuleProjectDto,
  ScheduleConfigDto,
} from '@brainforgeau/rules-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// ── Content normaliser ────────────────────────────────────────────────────────
//
// Migrated legacy rules store contentSnapshot in ReactFlow-native format
// (position.x/y, data.conditions, etc.) instead of the RuleNodeDto format
// expected by @brainforgeau/rules-ui (positionX/Y, switchConditions, etc.).
// This normaliser detects the legacy shape and converts it so GraphEditor can
// render the content correctly.

function isReactFlowNode(n: Record<string, unknown>): boolean {
  return (
    typeof n.position === 'object' &&
    n.position !== null &&
    'x' in (n.position as Record<string, unknown>)
  );
}

function normaliseContentSnapshot(raw: unknown): RuleGraphContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const content = raw as Record<string, unknown>;
  const rawNodes = content.nodes as Record<string, unknown>[] | undefined;
  const rawEdges = content.edges as Record<string, unknown>[] | undefined;
  if (!Array.isArray(rawNodes)) return raw as RuleGraphContent;

  // If the first node already has positionX, the content is in RuleNodeDto
  // format — no normalisation needed.
  if (rawNodes.length > 0 && 'positionX' in rawNodes[0]) {
    return raw as RuleGraphContent;
  }

  // Convert ReactFlow-native nodes → RuleNodeDto
  const nodes = rawNodes.map(n => {
    if (!isReactFlowNode(n)) return n;
    const pos = n.position as { x: number; y: number };
    const data = (n.data ?? {}) as Record<string, unknown>;
    const conditions = data.conditions as
      | { id: string; expression: string; sortOrder: number }[]
      | undefined;
    const actionContent = data.content as
      | { actionType: string; description?: string; webhookUrl?: string }
      | undefined;

    return {
      id: n.id,
      type: n.type,
      name:
        (data.label as string) ??
        (n.type === 'inputNode'
          ? 'Request'
          : n.type === 'outputNode'
            ? 'Response'
            : n.type === 'switchNode'
              ? 'Switch'
              : n.type === 'actionNode'
                ? 'Action'
                : 'Node'),
      positionX: pos.x ?? 0,
      positionY: pos.y ?? 0,
      hitPolicy: (data.hitPolicy as string) ?? null,
      switchConditions: conditions
        ? conditions.map(c => ({
            conditionId: c.id,
            expression: c.expression,
            sortOrder: c.sortOrder,
          }))
        : null,
      decisionTable: (data.decisionTable as Record<string, unknown>) ?? null,
      notifyConfig: (data.notifyConfig as Record<string, unknown>) ?? null,
      actionConfig: actionContent
        ? {
            actionType: actionContent.actionType,
            priority: null,
            description: actionContent.description ?? null,
            webhookUrl: actionContent.webhookUrl ?? null,
          }
        : null,
      alertConfig: (data.alertConfig as Record<string, unknown>) ?? null,
    };
  });

  return { nodes, edges: rawEdges ?? [] } as unknown as RuleGraphContent;
}

// ── DTO mappers ────────────────────────────────────────────────────────────────

function toRuleGraphVersionDto(v: GenRuleGraphVersionDto): RuleGraphVersionDto {
  return {
    id: v.id ?? '',
    versionNumber: v.versionNumber ?? 0,
    name: v.name ?? null,
    contentSnapshot: normaliseContentSnapshot(v.contentSnapshot),
    createdAt: v.createdAt ?? '',
  };
}

function toRuleProjectDto(p: GenRuleProjectDto): RuleProjectDto {
  return {
    id: p.id ?? '',
    name: p.name ?? '',
    key: p.key ?? '',
    description: p.description ?? null,
    isEnabled: p.isEnabled ?? true,
    status: p.status ?? 'Draft',
    graphCount: p.graphCount,
    createdAt: p.createdAt ?? '',
    modifiedAt: p.modifiedAt,
  };
}

function toRuleGraphDto(g: GenRuleGraphDto): RuleGraphDto {
  const versions = (g.versions ?? []).map(toRuleGraphVersionDto);
  const publishedVersion = g.publishedVersion
    ? toRuleGraphVersionDto(g.publishedVersion)
    : null;

  return {
    id: g.id ?? '',
    projectId: g.projectId ?? '',
    name: g.name ?? '',
    key: g.key ?? '',
    description: g.description ?? null,
    category: g.category ?? null,
    isPublished: g.isPublished ?? false,
    publishedAt: g.publishedAt ?? null,
    publishedVersion,
    versions,
    createdAt: g.createdAt ?? '',
    modifiedAt: g.modifiedAt ?? '',
    isEnabled: g.isEnabled ?? true,
    cooldownMinutes: g.cooldownMinutes ?? 0,
    consecutivePacketsRequired: g.consecutivePacketsRequired ?? 1,
    schedule: (g.schedule as ScheduleConfigDto | undefined) ?? null,
    assets: [],
    assetGroups: [],
    linkedGeofences: [],
    assetIds: [],
    assetGroupIds: [],
    linkedGeofenceIds: [],
    mapColor: null,
    mapLabel: null,
  };
}

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
    queryFn: async () => {
      const client = await createHelpdeskApiClient(RuleProjectsApi);
      const res = await client.v1RuleProjectsGet();
      return (res.data ?? []).map(toRuleProjectDto);
    },
  });
}

export function useRuleProject(id: string | null) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.detail(contextKey, id ?? '__null__'),
    queryFn: async () => {
      const client = await createHelpdeskApiClient(RuleProjectsApi);
      const res = await client.v1RuleProjectsGet();
      const list = (res.data ?? []).map(toRuleProjectDto);
      return list.find(p => p.id === id) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: async ({
      name,
      key,
      description,
    }: {
      name: string;
      key: string;
      description?: string;
    }) => {
      const client = await createHelpdeskApiClient(RuleProjectsApi);
      const res = await client.v1RuleProjectsPost({ name, key, description });
      return toRuleProjectDto(res.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}

export function useDeleteRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(RuleProjectsApi);
      await client.v1RuleProjectsIdDelete(id);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}

export function useUpdateRuleProject() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: async ({
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
    }) => {
      const client = await createHelpdeskApiClient(RuleProjectsApi);
      const res = await client.v1RuleProjectsIdPut(id, {
        id,
        name: payload.name,
        description: payload.description,
        isEnabled: payload.isEnabled,
        status: payload.status,
      });
      return toRuleProjectDto(res.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ruleProjectKeys.list(contextKey) }),
  });
}

// ── Rule graph hooks ───────────────────────────────────────────────────────────

export function useRuleGraphs(projectId: string | null) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.graphs(contextKey, projectId ?? '__null__'),
    queryFn: async () => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res = await client.v1RuleProjectsProjectIdRulesGet(projectId!);
      return (res.data ?? []).map(toRuleGraphDto);
    },
    enabled: !!projectId,
  });
}

export function useRuleGraph(projectId: string | null, ruleId: string | null) {
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useQuery({
    queryKey: ruleProjectKeys.graph(
      contextKey,
      projectId ?? '__null__',
      ruleId ?? '__null__',
    ),
    queryFn: async () => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res = await client.v1RuleProjectsProjectIdRulesIdGet(
        projectId!,
        ruleId!,
      );
      return toRuleGraphDto(res.data);
    },
    enabled: !!projectId && !!ruleId,
  });
}

export function useCreateRuleGraph() {
  const qc = useQueryClient();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  return useMutation({
    mutationFn: async ({
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
    }) => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res = await client.v1RuleProjectsProjectIdRulesPost(projectId, {
        name,
        key,
        description,
        category,
      });
      return toRuleGraphDto(res.data);
    },
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
    mutationFn: async ({
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
    }) => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res = await client.v1RuleProjectsProjectIdRulesIdPut(
        projectId,
        ruleId,
        {
          id: ruleId,
          projectId,
          name: request.name,
          description: request.description,
          category: request.category,
          isEnabled: request.isEnabled,
          cooldownMinutes: request.cooldownMinutes,
          consecutivePacketsRequired: request.consecutivePacketsRequired,
          schedule: request.schedule as never,
        },
      );
      return toRuleGraphDto(res.data);
    },
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
    mutationFn: async ({
      projectId,
      ruleId,
    }: {
      projectId: string;
      ruleId: string;
    }) => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      await client.v1RuleProjectsProjectIdRulesIdDelete(projectId, ruleId);
    },
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
    mutationFn: async ({
      projectId,
      ruleId,
      content,
      versionName,
    }: {
      projectId: string;
      ruleId: string;
      content: RuleGraphContent;
      versionName?: string;
    }) => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res = await client.v1RuleProjectsProjectIdRulesIdVersionsPost(
        projectId,
        ruleId,
        {
          name: versionName ?? null,
          contentSnapshot: content,
        },
      );
      return toRuleGraphVersionDto(res.data);
    },
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
    mutationFn: async ({
      projectId,
      ruleId,
      versionId,
    }: {
      projectId: string;
      ruleId: string;
      versionId: string;
    }) => {
      const client = await createHelpdeskApiClient(RuleGraphsApi);
      const res =
        await client.v1RuleProjectsProjectIdRulesIdVersionsVersionIdPublishPost(
          projectId,
          ruleId,
          versionId,
        );
      return toRuleGraphDto(res.data);
    },
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
