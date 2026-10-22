// RealWorkflowApiClient — full implementation against the vendored helpdesk client.
//
// Backend serializes enums as strings (JsonStringEnumConverter). Frontend enums are
// now string-backed (Task 1) so round-trips match directly.

import type { Configuration } from '@/api/helpdesk-client';
import { PrincipalWorkflowsApi, WorkflowsApi } from '@/api/helpdesk-client';
import type {
  HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowDefinitionDto as BackendWorkflowDefinitionDto,
  HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowStateDto as BackendWorkflowStateDto,
  HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionsWorkflowDefinitionSummaryDto as BackendWorkflowSummaryDto,
  HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowTransitionDto as BackendWorkflowTransitionDto,
  HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowVersionDto as BackendWorkflowVersionDto,
  HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftStateInput as UpdateWorkflowDraftStateInput,
  HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftTransitionInput as UpdateWorkflowDraftTransitionInput,
} from '@/api/helpdesk-client';
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
    id: s.id ?? '',
    name: s.name ?? '',
    slug: s.slug ?? '',
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
  // Backend stores guard expression in guards[0].expression (CEL).
  // REVIEW: the generated GuardSpecDto models `guardType`/`parameters`/`failureMessage`
  // (no `expression` field) — the CEL-expression guard shape predates the current
  // generated contract. Falling back to `parameters.expression` (if present) keeps
  // existing behaviour without inventing a field that doesn't exist on the DTO.
  const guardExpression =
    (t.guards?.[0]?.parameters?.expression as string | undefined) ?? null;
  const meta = t.displayMetadata ?? {};

  return {
    id: t.id ?? '',
    fromStateId: t.fromStateId ?? '',
    toStateId: t.toStateId ?? '',
    triggerType: (t.trigger as TriggerType) ?? TriggerType.Manual,
    // Backend stores trigger details in displayMetadata or eventName field
    triggerSpec: t.eventName ? { eventName: t.eventName } : null,
    guardExpression: guardExpression || null,
    actions: [],
    sourceHandleId: meta['ui.sourceHandle'] ?? null,
    // REVIEW: approvalSpec — backend stores approvals in a separate aggregate;
    // not embedded in transition row. Leaving undefined here; future iteration
    // can compose from a separate GET /v1/workflows/{id}/approvals endpoint.
    approvalSpec: undefined,
  };
}

function toVersionSummaryDto(
  v: BackendWorkflowVersionDto,
): WorkflowDefinitionVersionSummaryDto {
  return {
    id: v.id ?? '',
    versionNumber: v.versionNumber ?? 0,
    status: (v.status as VersionStatus) ?? VersionStatus.Draft,
    publishedAt: v.publishedAt ?? null,
    publishedBy: v.publishedByUserId ?? null,
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
  const versions = d.versions ?? [];
  // Derive split: latest published (highest versionNumber with Published status)
  // and draft (should be at most one per definition per backend invariant).
  const publishedVersions = versions.filter(v => v.status === 'Published');
  const latestVersion =
    publishedVersions.length > 0
      ? publishedVersions.reduce((a, b) =>
          (a.versionNumber ?? 0) > (b.versionNumber ?? 0) ? a : b,
        )
      : null;
  const draftVersion = versions.find(v => v.status === 'Draft') ?? null;
  return {
    id: d.id ?? '',
    name: d.name ?? '',
    description: d.description ?? null,
    ownerScope: d.ownerScope as WorkflowDefinitionDto['ownerScope'],
    latestVersion: latestVersion ? toVersionDto(latestVersion) : null,
    draftVersion: draftVersion ? toVersionDto(draftVersion) : null,
    versions: versions.map(toVersionSummaryDto),
  };
}

/** Maps a slim list-endpoint summary to the frontend WorkflowDefinitionDto. */
function toDefinitionDtoFromSummary(
  s: BackendWorkflowSummaryDto,
): WorkflowDefinitionDto {
  const status = s.latestVersionStatus as VersionStatus | null | undefined;
  const isPublished = status === VersionStatus.Published;

  // Build a synthetic latestVersion when a published version exists
  const latestVersion: WorkflowDefinitionVersionDto | null = isPublished
    ? {
        id: s.publishedVersionId ?? '',
        versionNumber: s.publishedVersionNumber ?? 1,
        status: VersionStatus.Published,
        publishedAt: s.publishedAt ?? null,
        publishedBy: null,
        startStateId: null,
        states: [],
        transitions: [],
      }
    : null;

  // Build a synthetic draftVersion when a draft exists
  const draftVersion: WorkflowDefinitionVersionDto | null = s.hasDraft
    ? {
        id: '',
        versionNumber: 0,
        status: VersionStatus.Draft,
        publishedAt: null,
        publishedBy: null,
        startStateId: null,
        states: [],
        transitions: [],
      }
    : null;

  return {
    id: s.id ?? '',
    name: s.name ?? '',
    description: s.description ?? null,
    ownerScope: s.ownerScope as WorkflowDefinitionDto['ownerScope'],
    latestVersion,
    draftVersion,
    versions: [],
  };
}

// ── Adapters: frontend DTO → backend command DTO ────────────────────────────────

function fromStateDto(s: WorkflowStateDto): UpdateWorkflowDraftStateInput {
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
    requiredFieldIds: [],
    allowedHolderRoles: [],
    slaPolicyOverrideId: null,
    entryTimer: undefined,
    displayMetadata,
    parallel: s.parallelSpec
      ? {
          branchStartStateIds: s.parallelSpec.branchStartStateIds,
          joinStateId: s.parallelSpec.joinStateId,
          mode: s.parallelSpec.joinMode,
        }
      : undefined,
  };
}

function fromTransitionDto(
  t: WorkflowTransitionDto,
): UpdateWorkflowDraftTransitionInput {
  // REVIEW: see toTransitionDto — GuardSpecDto has no `expression` field on the
  // generated contract; round-tripping the CEL expression via `parameters.expression`
  // keeps the existing guard-editing UX working until the backend guard model gains
  // a first-class expression field.
  const guards = t.guardExpression
    ? [
        {
          guardType: 'expression',
          parameters: { expression: t.guardExpression },
        },
      ]
    : [];

  const displayMetadata: Record<string, string> = {};
  if (t.sourceHandleId) {
    displayMetadata['ui.sourceHandle'] = t.sourceHandleId;
  }

  return {
    id: t.id,
    slug: `transition-${t.id}`,
    name: `Transition ${t.id.slice(0, 8)}`,
    fromStateId: t.fromStateId,
    toStateId: t.toStateId,
    trigger: t.triggerType,
    eventName:
      (t.triggerSpec as { eventName?: string } | null)?.eventName ?? null,
    guards,
    allowedInvokerRoles: [],
    requiresApprovalSpecId: null,
    autoApplyOnApproval: false,
    cancelsOnOtherTransition: false,
    requiredContextKeys: [],
    sortOrder: 0,
    isPrimary: false,
    isBulkEligible: false,
    displayMetadata,
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
      return (res.data.items ?? []).map(toDefinitionDtoFromSummary);
    },

    async getDefinition(id: string): Promise<WorkflowDefinitionDto> {
      const res = await workflows.v1WorkflowsIdGet(id);
      return toDefinitionDto(res.data);
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
          startStateId: input.startStateId as string | undefined,
          states: input.states.map(fromStateDto),
          transitions: input.transitions.map(fromTransitionDto),
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
      return (res.data ?? []).map(toDefinitionDtoFromSummary);
    },

    async getPrincipalDefinition(
      principalId: string,
      id: string,
    ): Promise<WorkflowDefinitionDto> {
      const res = await principal.v1PrincipalsPrincipalIdWorkflowsIdGet(
        principalId,
        id,
      );
      return toDefinitionDto(res.data);
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
          startStateId: input.startStateId as string | undefined,
          states: input.states.map(fromStateDto),
          transitions: input.transitions.map(fromTransitionDto),
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

    // ── Clone (frontend-composed — no dedicated backend clone endpoint yet) ───────
    //
    // REVIEW: No POST /v1/workflows/{id}/clone endpoint exists in the backend yet.
    // Implemented as: createDefinition → createDraft → updateDraft (copy states+transitions).
    // The initial draft from createDefinition is empty; we overwrite it with the
    // source version's states/transitions via updateDraft.
    //
    // When backend Plan 9 lands and adds a clone endpoint returning
    // { definitionId, initialDraftVersionId }, this method should be updated to:
    //   const res = await workflows.v1WorkflowsIdClonePost(input.sourceDefinitionId, ...);
    //   const responseAny = res.data as any;
    //   // Handle either old shape (full DTO) or new shape ({ definitionId, ... })
    //   if ('definitionId' in responseAny && !responseAny.id) {
    //     return this.getDefinition(responseAny.definitionId);
    //   }
    //   return toDefinitionDto(res.data);
    // Until then, the compose approach below is used and the build remains clean.

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

      // 3. Use the initial draft created by the backend, or create one if missing
      let draftVersion: WorkflowDefinitionVersionDto;
      if (newDef.draftVersion) {
        draftVersion = newDef.draftVersion;
      } else if (input.principalId) {
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
      try {
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
      } catch (copyErr) {
        // Definition was created but content copy failed.
        // Return the empty definition so the caller can still navigate to it.
        const partial = input.principalId
          ? await this.getPrincipalDefinition(input.principalId, newDef.id)
          : await this.getDefinition(newDef.id);
        const msg =
          copyErr instanceof Error ? copyErr.message : String(copyErr);
        const err = new Error(
          `Definition created but content copy failed: ${msg}`,
        ) as Error & { partialResult?: WorkflowDefinitionDto };
        err.partialResult = partial;
        throw err;
      }

      // 6. Return the final definition with draft
      return input.principalId
        ? this.getPrincipalDefinition(input.principalId, newDef.id)
        : this.getDefinition(newDef.id);
    },
  };
}
