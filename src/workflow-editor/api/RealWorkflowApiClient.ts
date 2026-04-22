// RealWorkflowApiClient — full implementation against @brainforgeau/helpdesk-client.
//
// Backend serializes enums as strings (JsonStringEnumConverter). Frontend enums are
// now string-backed (Task 1) so round-trips match directly.
//
// NOTE: The generated client types v1WorkflowsGet / v1WorkflowsIdGet response bodies as
// `void` (the OpenAPI spec omits response schemas for those list/get endpoints).
// We cast via `unknown` where needed; the actual runtime payload is the full DTO.

import {
  PrincipalWorkflowsApi,
  WorkflowsApi,
} from '@brainforgeau/helpdesk-client';
import type { Configuration } from '@brainforgeau/helpdesk-client';
// REVIEW: AxiosInstance type sourced from @brainforgeau/security (which re-exports from axios)
// to avoid a direct `import from 'axios'` that is not in project dependencies.
import type { authorizedAxios as _AuthorizedAxios } from '@brainforgeau/security';
type AxiosInstance = typeof _AuthorizedAxios;
import type {
  CloneDefinitionInput,
  CreateDefinitionInput,
  CreatePrincipalDefinitionInput,
  IWorkflowApiClient,
  MigrationResult,
  PublishDraftInput,
  PublishPrincipalDraftInput,
  RuleMigrationReportItem,
  UpdateDraftInput,
  UpdatePrincipalDraftInput,
  ValidationResult,
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';
import {
  StateCategory,
  StateType,
  TriggerType,
  VersionStatus,
} from '../types/enums';
import type {
  ParallelSpecDto,
  WorkflowDefinitionVersionSummaryDto,
} from '../types/workflow';

// ── Inline backend DTO shapes (as returned by the API — typed void by generator) ──

interface BackendWorkflowStateDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  type: string;
  sortOrder: number;
  displayMetadata?: Record<string, string> | null;
  parallel?: {
    branchStartStateIds?: string[];
    joinStateId?: string;
    mode?: string;
  } | null;
}

interface BackendWorkflowTransitionDto {
  id: string;
  fromStateId: string;
  toStateId: string;
  trigger: string;
  eventName?: string | null;
  guards?: Array<{ expression?: string }> | null;
  displayMetadata?: Record<string, string> | null;
}

interface BackendVersionSummaryDto {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt: string | null;
  publishedBy: string | null;
}

interface BackendWorkflowVersionDto extends BackendVersionSummaryDto {
  startStateId: string | null;
  states: BackendWorkflowStateDto[];
  transitions: BackendWorkflowTransitionDto[];
}

interface BackendWorkflowDefinitionDto {
  id: string;
  name: string;
  description: string | null;
  ownerScope: string;
  latestVersion: BackendWorkflowVersionDto | null;
  draftVersion: BackendWorkflowVersionDto | null;
  versions: BackendVersionSummaryDto[];
}

interface BackendListResponse {
  items: BackendWorkflowDefinitionDto[];
  totalCount?: number;
}

// ── Adapters: backend DTO → frontend DTO ────────────────────────────────────────

function toStateDto(s: BackendWorkflowStateDto): WorkflowStateDto {
  const meta = s.displayMetadata ?? {};
  // Backend stores canvas positions in displayMetadata["ui.x"] / ["ui.y"]
  const positionX = meta['ui.x'] ? Number(meta['ui.x']) : 0;
  const positionY = meta['ui.y'] ? Number(meta['ui.y']) : 0;

  // Build clean metadata without ui.* keys
  const cleanMeta: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k !== 'ui.x' && k !== 'ui.y') {
      cleanMeta[k] = v;
    }
  }

  let parallelSpec: ParallelSpecDto | null = null;
  if (s.parallel) {
    parallelSpec = {
      branchStartStateIds: s.parallel.branchStartStateIds ?? [],
      joinStateId: s.parallel.joinStateId ?? '',
      joinMode:
        (s.parallel.mode as 'AllMustComplete' | 'AnyBranch') ??
        'AllMustComplete',
    };
  }

  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description ?? null,
    category: (s.category as StateCategory) ?? StateCategory.Open,
    type: (s.type as StateType) ?? StateType.Normal,
    sortOrder: s.sortOrder ?? 0,
    positionX,
    positionY,
    metadata: cleanMeta,
    parallelSpec,
  };
}

function toTransitionDto(
  t: BackendWorkflowTransitionDto,
): WorkflowTransitionDto {
  // Backend stores guard expression in guards[0].expression (CEL)
  const guardExpression = t.guards?.[0]?.expression ?? null;

  return {
    id: t.id,
    fromStateId: t.fromStateId,
    toStateId: t.toStateId,
    triggerType: (t.trigger as TriggerType) ?? TriggerType.Manual,
    // Backend stores trigger details in displayMetadata or eventName field
    triggerSpec: t.eventName ? { eventName: t.eventName } : null,
    guardExpression: guardExpression || null,
    actions: [],
    // REVIEW: approvalSpec — backend stores approvals in a separate aggregate;
    // not embedded in transition row. Leaving undefined here; future iteration
    // can compose from a separate GET /v1/workflows/{id}/approvals endpoint.
    approvalSpec: undefined,
  };
}

function toVersionSummaryDto(
  v: BackendVersionSummaryDto,
): WorkflowDefinitionVersionSummaryDto {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    status: (v.status as VersionStatus) ?? VersionStatus.Draft,
    publishedAt: v.publishedAt ?? null,
    publishedBy: v.publishedBy ?? null,
  };
}

function toVersionDto(
  v: BackendWorkflowVersionDto,
): WorkflowDefinitionVersionDto {
  return {
    ...toVersionSummaryDto(v),
    startStateId: v.startStateId ?? null,
    states: (v.states ?? []).map(toStateDto),
    transitions: (v.transitions ?? []).map(toTransitionDto),
  };
}

function toDefinitionDto(
  d: BackendWorkflowDefinitionDto,
): WorkflowDefinitionDto {
  return {
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    ownerScope: d.ownerScope as WorkflowDefinitionDto['ownerScope'],
    latestVersion: d.latestVersion ? toVersionDto(d.latestVersion) : null,
    draftVersion: d.draftVersion ? toVersionDto(d.draftVersion) : null,
    versions: (d.versions ?? []).map(toVersionSummaryDto),
  };
}

// ── Adapters: frontend DTO → backend command DTO ────────────────────────────────

function fromStateDto(s: WorkflowStateDto): Record<string, unknown> {
  // Store canvas positions in displayMetadata
  const displayMetadata: Record<string, string> = {
    ...s.metadata,
    'ui.x': String(s.positionX),
    'ui.y': String(s.positionY),
  };

  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description ?? null,
    sortOrder: s.sortOrder,
    category: s.category,
    type: s.type,
    displayMetadata,
    parallel: s.parallelSpec
      ? {
          branchStartStateIds: s.parallelSpec.branchStartStateIds,
          joinStateId: s.parallelSpec.joinStateId,
          mode: s.parallelSpec.joinMode,
        }
      : null,
  };
}

function fromTransitionDto(t: WorkflowTransitionDto): Record<string, unknown> {
  const guards = t.guardExpression ? [{ expression: t.guardExpression }] : [];

  return {
    id: t.id,
    fromStateId: t.fromStateId,
    toStateId: t.toStateId,
    trigger: t.triggerType,
    eventName:
      (t.triggerSpec as { eventName?: string } | null)?.eventName ?? null,
    guards,
  };
}

// ── Factory ──────────────────────────────────────────────────────────────────────

export function createRealWorkflowApiClient(
  configuration: Configuration,
  axios?: AxiosInstance,
): IWorkflowApiClient {
  const workflows = new WorkflowsApi(configuration, undefined, axios);
  const principal = new PrincipalWorkflowsApi(configuration, undefined, axios);

  return {
    // ── Tenant-scoped ────────────────────────────────────────────────────────────

    async listDefinitions(): Promise<WorkflowDefinitionDto[]> {
      const res = await workflows.v1WorkflowsGet();
      const data = res.data as unknown as BackendListResponse;
      return (data?.items ?? []).map(toDefinitionDto);
    },

    async getDefinition(id: string): Promise<WorkflowDefinitionDto> {
      const res = await workflows.v1WorkflowsIdGet(id);
      const data = res.data as unknown as BackendWorkflowDefinitionDto;
      return toDefinitionDto(data);
    },

    async createDefinition(
      input: CreateDefinitionInput,
    ): Promise<WorkflowDefinitionDto> {
      const createRes = await workflows.v1WorkflowsPost({
        name: input.name,
        description: input.description ?? null,
      });
      // Backend returns { definitionId, initialDraftVersionId }
      const definitionId = createRes.data.definitionId!;
      // Fetch the full definition to return it
      return this.getDefinition(definitionId);
    },

    async deleteDefinition(id: string): Promise<void> {
      await workflows.v1WorkflowsIdDelete(id);
    },

    async createDraft(
      definitionId: string,
    ): Promise<WorkflowDefinitionVersionDto> {
      // Backend returns the new draft versionId as a plain string
      await workflows.v1WorkflowsIdDraftsPost(definitionId);
      // Fetch the full definition to get the new draft version
      const def = await this.getDefinition(definitionId);
      if (!def.draftVersion) {
        throw new Error(
          `[RealWorkflowApiClient] createDraft: no draftVersion on definition ${definitionId} after create`,
        );
      }
      return def.draftVersion;
    },

    async updateDraft(
      input: UpdateDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> {
      await workflows.v1WorkflowsIdDraftsVersionIdPut(
        input.definitionId,
        input.versionId,
        {
          definitionId: input.definitionId,
          versionId: input.versionId,
          startStateId: input.startStateId ?? undefined,
          states: input.states.map(fromStateDto) as never,
          transitions: input.transitions.map(fromTransitionDto) as never,
        },
      );
      // Re-fetch to get the current draft state
      const def = await this.getDefinition(input.definitionId);
      if (!def.draftVersion) {
        throw new Error(
          `[RealWorkflowApiClient] updateDraft: no draftVersion on definition ${input.definitionId} after update`,
        );
      }
      return def.draftVersion;
    },

    async publishDraft(
      input: PublishDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> {
      await workflows.v1WorkflowsIdDraftsVersionIdPublishPost(
        input.definitionId,
        input.versionId,
        {
          definitionId: input.definitionId,
          versionId: input.versionId,
          publishNote: input.publishNote ?? null,
        },
      );
      // Re-fetch to get the newly published version
      const def = await this.getDefinition(input.definitionId);
      if (!def.latestVersion) {
        throw new Error(
          `[RealWorkflowApiClient] publishDraft: no latestVersion on definition ${input.definitionId} after publish`,
        );
      }
      return def.latestVersion;
    },

    async validateVersion(
      definitionId: string,
      versionId: string,
    ): Promise<ValidationResult> {
      const res = await workflows.v1WorkflowsIdVersionsVersionIdValidatePost(
        definitionId,
        versionId,
      );
      const data = res.data;
      return {
        isValid: data.isValid ?? true,
        errors: (data.errors ?? []).map(e => ({
          code: e.code ?? '',
          message: e.message ?? '',
          stateId: e.stateId ?? undefined,
          transitionId: e.transitionId ?? undefined,
        })),
      };
    },

    // ── Principal-scoped ─────────────────────────────────────────────────────────

    async listPrincipalDefinitions(
      principalId: string,
    ): Promise<WorkflowDefinitionDto[]> {
      const res =
        await principal.v1PrincipalsPrincipalIdWorkflowsGet(principalId);
      const data = res.data as unknown as BackendListResponse;
      return (data?.items ?? []).map(toDefinitionDto);
    },

    async getPrincipalDefinition(
      principalId: string,
      id: string,
    ): Promise<WorkflowDefinitionDto> {
      const res = await principal.v1PrincipalsPrincipalIdWorkflowsIdGet(
        principalId,
        id,
      );
      const data = res.data as unknown as BackendWorkflowDefinitionDto;
      return toDefinitionDto(data);
    },

    async createPrincipalDefinition(
      input: CreatePrincipalDefinitionInput,
    ): Promise<WorkflowDefinitionDto> {
      const createRes = await principal.v1PrincipalsPrincipalIdWorkflowsPost(
        input.principalId,
        {
          principalId: input.principalId,
          name: input.name,
          description: input.description ?? null,
        },
      );
      const definitionId = createRes.data.definitionId!;
      return this.getPrincipalDefinition(input.principalId, definitionId);
    },

    async deletePrincipalDefinition(
      principalId: string,
      id: string,
    ): Promise<void> {
      await principal.v1PrincipalsPrincipalIdWorkflowsIdDelete(principalId, id);
    },

    async createPrincipalDraft(
      principalId: string,
      definitionId: string,
    ): Promise<WorkflowDefinitionVersionDto> {
      await principal.v1PrincipalsPrincipalIdWorkflowsIdDraftsPost(
        principalId,
        definitionId,
      );
      const def = await this.getPrincipalDefinition(principalId, definitionId);
      if (!def.draftVersion) {
        throw new Error(
          `[RealWorkflowApiClient] createPrincipalDraft: no draftVersion on definition ${definitionId} after create`,
        );
      }
      return def.draftVersion;
    },

    async updatePrincipalDraft(
      input: UpdatePrincipalDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> {
      await principal.v1PrincipalsPrincipalIdWorkflowsIdDraftsVersionIdPut(
        input.principalId,
        input.definitionId,
        input.versionId,
        {
          principalId: input.principalId,
          definitionId: input.definitionId,
          versionId: input.versionId,
          startStateId: input.startStateId ?? undefined,
          states: input.states.map(fromStateDto) as never,
          transitions: input.transitions.map(fromTransitionDto) as never,
        },
      );
      const def = await this.getPrincipalDefinition(
        input.principalId,
        input.definitionId,
      );
      if (!def.draftVersion) {
        throw new Error(
          `[RealWorkflowApiClient] updatePrincipalDraft: no draftVersion on definition ${input.definitionId} after update`,
        );
      }
      return def.draftVersion;
    },

    async publishPrincipalDraft(
      input: PublishPrincipalDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> {
      await principal.v1PrincipalsPrincipalIdWorkflowsIdDraftsVersionIdPublishPost(
        input.principalId,
        input.definitionId,
        input.versionId,
        {
          principalId: input.principalId,
          definitionId: input.definitionId,
          versionId: input.versionId,
          publishNote: input.publishNote ?? null,
        },
      );
      const def = await this.getPrincipalDefinition(
        input.principalId,
        input.definitionId,
      );
      if (!def.latestVersion) {
        throw new Error(
          `[RealWorkflowApiClient] publishPrincipalDraft: no latestVersion on definition ${input.definitionId} after publish`,
        );
      }
      return def.latestVersion;
    },

    // ── Admin — rule migration ───────────────────────────────────────────────────

    async getRuleMigrationReport(): Promise<RuleMigrationReportItem[]> {
      const res = await workflows.v1WorkflowsAdminRuleMigrationReportGet();
      return (res.data ?? []).map(item => ({
        ruleId: item.ruleId ?? '',
        name: item.name ?? '',
        isEnabled: item.isEnabled ?? false,
        statusConditionCount: item.statusConditionCount ?? 0,
        statusMutatingActionCount: item.statusMutatingActionCount ?? 0,
        mutatingActionTypes: item.mutatingActionTypes ?? [],
        categoryId: item.categoryId ?? null,
        categoryName: item.categoryName ?? null,
      }));
    },

    async applyRuleMigration(dryRun: boolean): Promise<MigrationResult> {
      const res =
        await workflows.v1WorkflowsAdminMigrateLegacyRulesPost(dryRun);
      const data = res.data;
      return {
        rulesScanned: data.rulesScanned ?? 0,
        conditionsMigrated: data.conditionsMigrated ?? 0,
        actionsMigrated: data.actionsMigrated ?? 0,
        warnings: data.warnings ?? [],
      };
    },

    // ── Clone (no backend endpoint — implemented via compose) ────────────────────
    //
    // REVIEW: No POST /v1/workflows/{id}/clone endpoint exists in the backend.
    // Implemented as: createDefinition → createDraft → updateDraft (copy states+transitions).
    // The initial draft from createDefinition is empty; we overwrite it with the
    // source version's states/transitions via updateDraft.

    async cloneDefinition(
      input: CloneDefinitionInput,
    ): Promise<WorkflowDefinitionDto> {
      // 1. Get source to copy states and transitions
      const source = input.principalId
        ? await this.getPrincipalDefinition(
            input.principalId,
            input.sourceDefinitionId,
          )
        : await this.getDefinition(input.sourceDefinitionId);

      const sourceVersion = source.latestVersion ?? source.draftVersion;

      // 2. Create the new definition
      let newDef: WorkflowDefinitionDto;
      if (input.principalId) {
        newDef = await this.createPrincipalDefinition({
          principalId: input.principalId,
          name: input.newName,
          description: input.newDescription,
        });
      } else {
        newDef = await this.createDefinition({
          name: input.newName,
          description: input.newDescription,
        });
      }

      // 3. Create a draft on the new definition
      let draftVersion: WorkflowDefinitionVersionDto;
      if (input.principalId) {
        draftVersion = await this.createPrincipalDraft(
          input.principalId,
          newDef.id,
        );
      } else {
        draftVersion = await this.createDraft(newDef.id);
      }

      if (!sourceVersion) {
        // Source has no versions — return the empty new definition
        return this.getDefinition(newDef.id);
      }

      // 4. Re-ID states and rewrite transition references
      const clonedStates: WorkflowStateDto[] = sourceVersion.states.map(s => ({
        ...s,
        id: crypto.randomUUID(),
      }));
      const stateIdMap = new Map<string, string>();
      sourceVersion.states.forEach((s, i) => {
        stateIdMap.set(s.id, clonedStates[i].id);
      });
      const clonedTransitions: WorkflowTransitionDto[] =
        sourceVersion.transitions.map(t => ({
          ...t,
          id: crypto.randomUUID(),
          fromStateId: stateIdMap.get(t.fromStateId) ?? t.fromStateId,
          toStateId: stateIdMap.get(t.toStateId) ?? t.toStateId,
        }));
      const newStartStateId = sourceVersion.startStateId
        ? (stateIdMap.get(sourceVersion.startStateId) ?? null)
        : null;

      // 5. Update the draft with the cloned content
      if (input.principalId) {
        await this.updatePrincipalDraft({
          principalId: input.principalId,
          definitionId: newDef.id,
          versionId: draftVersion.id,
          states: clonedStates,
          transitions: clonedTransitions,
          startStateId: newStartStateId,
        });
      } else {
        await this.updateDraft({
          definitionId: newDef.id,
          versionId: draftVersion.id,
          states: clonedStates,
          transitions: clonedTransitions,
          startStateId: newStartStateId,
        });
      }

      // 6. Return the final definition with draft
      return input.principalId
        ? this.getPrincipalDefinition(input.principalId, newDef.id)
        : this.getDefinition(newDef.id);
    },
  };
}
