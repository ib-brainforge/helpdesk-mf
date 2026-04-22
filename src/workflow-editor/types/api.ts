import type {
  MigrationResult,
  RuleMigrationReportItem,
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from './workflow';

export interface IWorkflowApiClient {
  // Tenant-scoped
  listDefinitions(): Promise<WorkflowDefinitionDto[]>;
  getDefinition(id: string): Promise<WorkflowDefinitionDto>;
  createDefinition(
    input: CreateDefinitionInput,
  ): Promise<WorkflowDefinitionDto>;
  deleteDefinition(id: string): Promise<void>;

  createDraft(definitionId: string): Promise<WorkflowDefinitionVersionDto>;
  updateDraft(input: UpdateDraftInput): Promise<WorkflowDefinitionVersionDto>;
  publishDraft(input: PublishDraftInput): Promise<WorkflowDefinitionVersionDto>;
  validateVersion(
    definitionId: string,
    versionId: string,
  ): Promise<ValidationResult>;

  // Principal-scoped (caller's principalId must match ownership)
  listPrincipalDefinitions(
    principalId: string,
  ): Promise<WorkflowDefinitionDto[]>;
  getPrincipalDefinition(
    principalId: string,
    id: string,
  ): Promise<WorkflowDefinitionDto>;
  createPrincipalDefinition(
    input: CreatePrincipalDefinitionInput,
  ): Promise<WorkflowDefinitionDto>;
  deletePrincipalDefinition(principalId: string, id: string): Promise<void>;
  createPrincipalDraft(
    principalId: string,
    definitionId: string,
  ): Promise<WorkflowDefinitionVersionDto>;
  updatePrincipalDraft(
    input: UpdatePrincipalDraftInput,
  ): Promise<WorkflowDefinitionVersionDto>;
  publishPrincipalDraft(
    input: PublishPrincipalDraftInput,
  ): Promise<WorkflowDefinitionVersionDto>;

  // Admin — rule migration
  getRuleMigrationReport(): Promise<RuleMigrationReportItem[]>;
  applyRuleMigration(dryRun: boolean): Promise<MigrationResult>;
}

export interface CreateDefinitionInput {
  name: string;
  description?: string;
}

export interface UpdateDraftInput {
  definitionId: string;
  versionId: string;
  states: WorkflowStateDto[];
  transitions: WorkflowTransitionDto[];
  startStateId: string | null;
}

export interface PublishDraftInput {
  definitionId: string;
  versionId: string;
  publishNote?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  stateId?: string;
  transitionId?: string;
}

// ── Plan 4 additions ──────────────────────────────────────────────────────────

export interface CreatePrincipalDefinitionInput {
  principalId: string;
  name: string;
  description?: string;
}

export interface UpdatePrincipalDraftInput extends UpdateDraftInput {
  principalId: string;
}

export interface PublishPrincipalDraftInput extends PublishDraftInput {
  principalId: string;
}
