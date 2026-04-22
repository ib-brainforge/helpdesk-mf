import type {
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from './workflow';

export interface IWorkflowApiClient {
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
