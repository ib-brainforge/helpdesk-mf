// RealWorkflowApiClient — full implementation against @brainforgeau/helpdesk-client.
//
// STATUS: PLAN-4-PENDING-CLIENT-REGEN
// The @brainforgeau/helpdesk-client package does not yet include workflow endpoints.
// Backend PR stack #31–#37 is stacked-draft and has not merged yet.
//
// When the client regenerates, the expected import is:
//   import { WorkflowsApi, PrincipalWorkflowsApi, WorkflowAdminApi } from '@brainforgeau/helpdesk-client';
//
// Each method body shows the expected call signature. Once the client regenerates:
//   1. Replace the `// PLAN-4-PENDING-CLIENT-REGEN` line with the real call shown in the comment.
//   2. Update buildWorkflowApiClient() in clientSwitch.ts to pass real WorkflowsApi instances.
//   3. Flip USE_REAL_CLIENT = true in clientSwitch.ts.
//
// Expected backend endpoints (from Plans 2d/2e/2f):
//   GET    /v1/workflows                                         → listDefinitions()
//   GET    /v1/workflows/{id}                                    → getDefinition(id)
//   POST   /v1/workflows                                         → createDefinition(input)
//   DELETE /v1/workflows/{id}                                    → deleteDefinition(id)
//   POST   /v1/workflows/{id}/drafts                            → createDraft(definitionId)
//   PUT    /v1/workflows/{id}/drafts/{versionId}                 → updateDraft(input)
//   POST   /v1/workflows/{id}/drafts/{versionId}/publish         → publishDraft(input)
//   POST   /v1/workflows/{id}/versions/{versionId}/validate      → validateVersion(definitionId, versionId)
//   GET    /v1/principals/{principalId}/workflows                → listPrincipalDefinitions(principalId)
//   GET    /v1/principals/{principalId}/workflows/{id}           → getPrincipalDefinition(principalId, id)
//   POST   /v1/principals/{principalId}/workflows                → createPrincipalDefinition(input)
//   DELETE /v1/principals/{principalId}/workflows/{id}           → deletePrincipalDefinition(principalId, id)
//   POST   /v1/principals/{principalId}/workflows/{id}/drafts    → createPrincipalDraft(principalId, definitionId)
//   PUT    /v1/principals/{principalId}/workflows/{id}/drafts/{versionId} → updatePrincipalDraft(input)
//   POST   /v1/principals/{principalId}/workflows/{id}/drafts/{versionId}/publish → publishPrincipalDraft(input)
//   GET    /v1/admin/workflows/rule-migration-report             → getRuleMigrationReport()
//   POST   /v1/admin/workflows/rule-migration?dryRun={bool}      → applyRuleMigration(dryRun)

import type {
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
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWorkflowsApi = any;

export function createRealWorkflowApiClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client: unknown,
): IWorkflowApiClient {
  // Cast to any so the call shapes are preserved as comments; type-checked when client regenerates.
  const api = _client as AnyWorkflowsApi;

  /** Builds a stub that throws with a clear pending-regen message */
  const pendingRegen =
    (method: string, expectedCall: string) =>
    async (..._args: unknown[]): Promise<never> => {
      throw new Error(
        `[RealWorkflowApiClient] ${method} is pending client regeneration.\n` +
          `Expected call when available: ${expectedCall}`,
      );
    };

  // Suppress unused-variable warning — api is used in the expected call comments
  void api;

  return {
    // ── Tenant-scoped ──────────────────────────────────────────────────────────

    listDefinitions: async (): Promise<WorkflowDefinitionDto[]> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsListDefinitions(); return res.data.map(toDefinitionDto);
      return pendingRegen(
        'listDefinitions',
        'api.workflowsListDefinitions()',
      )();
    },

    getDefinition: async (id: string): Promise<WorkflowDefinitionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsGetDefinition({ id }); return toDefinitionDto(res.data);
      return pendingRegen(
        'getDefinition',
        'api.workflowsGetDefinition({ id })',
      )(id);
    },

    createDefinition: async (
      input: CreateDefinitionInput,
    ): Promise<WorkflowDefinitionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsCreateDefinition({ requestBody: input }); return toDefinitionDto(res.data);
      return pendingRegen(
        'createDefinition',
        'api.workflowsCreateDefinition({ requestBody: input })',
      )(input);
    },

    deleteDefinition: async (id: string): Promise<void> => {
      // PLAN-4-PENDING-CLIENT-REGEN: await api.workflowsDeleteDefinition({ id });
      return pendingRegen(
        'deleteDefinition',
        'api.workflowsDeleteDefinition({ id })',
      )(id);
    },

    createDraft: async (
      definitionId: string,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsCreateDraft({ definitionId }); return toVersionDto(res.data);
      return pendingRegen(
        'createDraft',
        'api.workflowsCreateDraft({ definitionId })',
      )(definitionId);
    },

    updateDraft: async (
      input: UpdateDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsUpdateDraft({ definitionId: input.definitionId, versionId: input.versionId, requestBody: input }); return toVersionDto(res.data);
      return pendingRegen(
        'updateDraft',
        'api.workflowsUpdateDraft({ definitionId, versionId, requestBody: input })',
      )(input);
    },

    publishDraft: async (
      input: PublishDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsPublishDraft({ definitionId: input.definitionId, versionId: input.versionId, requestBody: { publishNote: input.publishNote } }); return toVersionDto(res.data);
      return pendingRegen(
        'publishDraft',
        'api.workflowsPublishDraft({ definitionId, versionId, requestBody })',
      )(input);
    },

    validateVersion: async (
      definitionId: string,
      versionId: string,
    ): Promise<ValidationResult> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowsValidateVersion({ definitionId, versionId }); return res.data;
      return pendingRegen(
        'validateVersion',
        'api.workflowsValidateVersion({ definitionId, versionId })',
      )(definitionId, versionId);
    },

    // ── Principal-scoped ──────────────────────────────────────────────────────

    listPrincipalDefinitions: async (
      principalId: string,
    ): Promise<WorkflowDefinitionDto[]> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsListDefinitions({ principalId }); return res.data.map(toDefinitionDto);
      return pendingRegen(
        'listPrincipalDefinitions',
        'api.principalWorkflowsListDefinitions({ principalId })',
      )(principalId);
    },

    getPrincipalDefinition: async (
      principalId: string,
      id: string,
    ): Promise<WorkflowDefinitionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsGetDefinition({ principalId, id }); return toDefinitionDto(res.data);
      return pendingRegen(
        'getPrincipalDefinition',
        'api.principalWorkflowsGetDefinition({ principalId, id })',
      )(principalId, id);
    },

    createPrincipalDefinition: async (
      input: CreatePrincipalDefinitionInput,
    ): Promise<WorkflowDefinitionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsCreateDefinition({ principalId: input.principalId, requestBody: { name: input.name, description: input.description } }); return toDefinitionDto(res.data);
      return pendingRegen(
        'createPrincipalDefinition',
        'api.principalWorkflowsCreateDefinition({ principalId, requestBody })',
      )(input);
    },

    deletePrincipalDefinition: async (
      principalId: string,
      id: string,
    ): Promise<void> => {
      // PLAN-4-PENDING-CLIENT-REGEN: await api.principalWorkflowsDeleteDefinition({ principalId, id });
      return pendingRegen(
        'deletePrincipalDefinition',
        'api.principalWorkflowsDeleteDefinition({ principalId, id })',
      )(principalId, id);
    },

    createPrincipalDraft: async (
      principalId: string,
      definitionId: string,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsCreateDraft({ principalId, definitionId }); return toVersionDto(res.data);
      return pendingRegen(
        'createPrincipalDraft',
        'api.principalWorkflowsCreateDraft({ principalId, definitionId })',
      )(principalId, definitionId);
    },

    updatePrincipalDraft: async (
      input: UpdatePrincipalDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsUpdateDraft({ principalId: input.principalId, definitionId: input.definitionId, versionId: input.versionId, requestBody: input }); return toVersionDto(res.data);
      return pendingRegen(
        'updatePrincipalDraft',
        'api.principalWorkflowsUpdateDraft({ principalId, definitionId, versionId, requestBody })',
      )(input);
    },

    publishPrincipalDraft: async (
      input: PublishPrincipalDraftInput,
    ): Promise<WorkflowDefinitionVersionDto> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.principalWorkflowsPublishDraft({ principalId: input.principalId, definitionId: input.definitionId, versionId: input.versionId, requestBody: { publishNote: input.publishNote } }); return toVersionDto(res.data);
      return pendingRegen(
        'publishPrincipalDraft',
        'api.principalWorkflowsPublishDraft({ principalId, definitionId, versionId, requestBody })',
      )(input);
    },

    // ── Admin — rule migration ────────────────────────────────────────────────

    getRuleMigrationReport: async (): Promise<RuleMigrationReportItem[]> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowAdminGetRuleMigrationReport(); return res.data;
      return pendingRegen(
        'getRuleMigrationReport',
        'api.workflowAdminGetRuleMigrationReport()',
      )();
    },

    applyRuleMigration: async (dryRun: boolean): Promise<MigrationResult> => {
      // PLAN-4-PENDING-CLIENT-REGEN: const res = await api.workflowAdminApplyRuleMigration({ dryRun }); return res.data;
      return pendingRegen(
        'applyRuleMigration',
        'api.workflowAdminApplyRuleMigration({ dryRun })',
      )(dryRun);
    },
  };
}
