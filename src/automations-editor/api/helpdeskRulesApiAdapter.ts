import type {
  ServicesCoreRulesApplicationModelsRuleGraphDto as GenRuleGraphDto,
  ServicesCoreRulesApplicationModelsRuleGraphVersionDto as GenRuleGraphVersionDto,
  ServicesCoreRulesApplicationModelsRuleProjectDto as GenRuleProjectDto,
} from '@/api/helpdesk-client';
import { Configuration } from '@/api/helpdesk-client';
import { RuleGraphsApi } from '@/api/helpdesk-client/api/rule-graphs-api';
import { RuleProjectsApi } from '@/api/helpdesk-client/api/rule-projects-api';
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
/**
 * Adapter that exposes helpdesk-mf's rule API functions as the structural
 * `RulesApiClient` interface expected by `@brainforgeau/rules-ui`.
 *
 * Uses generated `RuleProjectsApi` + `RuleGraphsApi` from
 * `@brainforgeau/helpdesk-client` (v0.1.80-develop.f275df9+).
 *
 * DTO mapping: the generated client marks all fields optional (OpenAPI generator
 * quirk). We coerce them to the required shapes expected by rules-ui, falling
 * back to safe defaults for any missing fields.
 */
import type {
  RulesApiClient,
  UpdateRuleGraphRequest,
  UpdateRuleProjectRequest,
} from '@brainforgeau/rules-ui';
import type {
  RuleGraphContent,
  RuleGraphDto,
  RuleGraphVersionDto,
  RuleProjectDto,
  ScheduleConfigDto,
} from '@brainforgeau/rules-ui';

// ── Content normaliser ────────────────────────────────────────────────────────
//
// Migrated legacy rules store contentSnapshot in ReactFlow-native format
// (position.x/y, data.conditions, etc.) instead of the RuleNodeDto format
// expected by @brainforgeau/rules-ui (positionX/Y, switchConditions, etc.).

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

  if (rawNodes.length > 0 && 'positionX' in rawNodes[0]) {
    return raw as RuleGraphContent;
  }

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
    // The backend stores asset/geofence targeting as flat ID arrays;
    // the rules-ui NamedRef arrays are not populated by the list endpoint
    // (no joined data). Consumers use assetIds/assetGroupIds/linkedGeofenceIds
    // for mutations and display independently.
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

// ── Lazy-initialised API instances ────────────────────────────────────────────
//
// We construct the API instances once per module using the base URL from the
// runtime config store — the same approach used for other helpdesk API clients.

function buildApiInstances() {
  // helpdesk-backend's own named key. Throws by name when
  // HELPDESK_API_BASE_URL was never configured (stage 2 of failing loudly).
  const configuration = new Configuration({
    basePath: requireHelpdeskApiBaseUrl(),
  });
  return {
    ruleProjects: new RuleProjectsApi(
      configuration,
      undefined,
      authorizedAxios,
    ),
    ruleGraphs: new RuleGraphsApi(configuration, undefined, authorizedAxios),
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createHelpdeskRulesApiClient(): RulesApiClient {
  const { ruleProjects, ruleGraphs } = buildApiInstances();

  return {
    // ── Rule Projects ──────────────────────────────────────────────────────────

    async listRuleProjects(): Promise<RuleProjectDto[]> {
      const res = await ruleProjects.v1RuleProjectsGet();
      return (res.data ?? []).map(toRuleProjectDto);
    },

    async createRuleProject(
      name: string,
      key: string,
      description?: string,
    ): Promise<RuleProjectDto> {
      const res = await ruleProjects.v1RuleProjectsPost({
        name,
        key,
        description,
      });
      return toRuleProjectDto(res.data);
    },

    async updateRuleProject(
      id: string,
      data: UpdateRuleProjectRequest,
    ): Promise<RuleProjectDto> {
      const res = await ruleProjects.v1RuleProjectsIdPut(id, {
        id,
        name: data.name,
        description: data.description,
        isEnabled: data.isEnabled,
        status: data.status,
      });
      return toRuleProjectDto(res.data);
    },

    async deleteRuleProject(projectId: string): Promise<void> {
      await ruleProjects.v1RuleProjectsIdDelete(projectId);
    },

    // ── Rule Graphs ────────────────────────────────────────────────────────────

    async listRuleGraphs(projectId: string): Promise<RuleGraphDto[]> {
      const res = await ruleGraphs.v1RuleProjectsProjectIdRulesGet(projectId);
      return (res.data ?? []).map(toRuleGraphDto);
    },

    async getRuleGraph(
      projectId: string,
      ruleId: string,
    ): Promise<RuleGraphDto> {
      const res = await ruleGraphs.v1RuleProjectsProjectIdRulesIdGet(
        projectId,
        ruleId,
      );
      return toRuleGraphDto(res.data);
    },

    async createRuleGraph(
      projectId: string,
      name: string,
      key: string,
      description?: string,
      category?: string | null,
    ): Promise<RuleGraphDto> {
      const res = await ruleGraphs.v1RuleProjectsProjectIdRulesPost(projectId, {
        name,
        key,
        description,
        category,
      });
      return toRuleGraphDto(res.data);
    },

    async updateRuleGraph(
      projectId: string,
      ruleId: string,
      request: UpdateRuleGraphRequest,
    ): Promise<RuleGraphDto> {
      const res = await ruleGraphs.v1RuleProjectsProjectIdRulesIdPut(
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
          // ScheduleConfigDto shape is structurally compatible with the generated
          // ServicesCoreRulesApplicationModelsScheduleConfigDto
          schedule: request.schedule as never,
        },
      );
      return toRuleGraphDto(res.data);
    },

    async deleteRuleGraph(projectId: string, ruleId: string): Promise<void> {
      await ruleGraphs.v1RuleProjectsProjectIdRulesIdDelete(projectId, ruleId);
    },

    // ── Versions / Publishing ──────────────────────────────────────────────────

    async createRuleGraphVersion(
      projectId: string,
      ruleId: string,
      content: RuleGraphContent,
      versionName?: string,
    ): Promise<RuleGraphVersionDto> {
      const res = await ruleGraphs.v1RuleProjectsProjectIdRulesIdVersionsPost(
        projectId,
        ruleId,
        {
          name: versionName ?? null,
          contentSnapshot: content,
        },
      );
      return toRuleGraphVersionDto(res.data);
    },

    async publishRuleGraphVersion(
      projectId: string,
      ruleId: string,
      versionId: string,
    ): Promise<RuleGraphDto> {
      const res =
        await ruleGraphs.v1RuleProjectsProjectIdRulesIdVersionsVersionIdPublishPost(
          projectId,
          ruleId,
          versionId,
        );
      return toRuleGraphDto(res.data);
    },
  };
}
