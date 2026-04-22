import type {
  StateCategory,
  StateType,
  TriggerType,
  VersionStatus,
} from './enums';

export interface WorkflowDefinitionDto {
  id: string;
  name: string;
  description: string | null;
  ownerScope: string; // "tenant:{guid:N}" | "system:helpdesk" | "principal:{guid:N}"
  latestVersion: WorkflowDefinitionVersionDto | null;
  draftVersion: WorkflowDefinitionVersionDto | null;
  versions: WorkflowDefinitionVersionSummaryDto[];
}

export interface WorkflowDefinitionVersionSummaryDto {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  publishedAt: string | null;
  publishedBy: string | null;
}

export interface WorkflowDefinitionVersionDto
  extends WorkflowDefinitionVersionSummaryDto {
  states: WorkflowStateDto[];
  transitions: WorkflowTransitionDto[];
  startStateId: string | null;
}

export interface WorkflowStateDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: StateCategory;
  type: StateType;
  sortOrder: number;
  positionX: number;
  positionY: number;
  metadata: Record<string, string>;
  parallelSpec: ParallelSpecDto | null;
}

export interface ParallelSpecDto {
  branchStartStateIds: string[];
  joinStateId: string;
  joinMode: 'AllMustComplete' | 'AnyBranch';
}

export interface WorkflowTransitionDto {
  id: string;
  fromStateId: string;
  toStateId: string;
  triggerType: TriggerType;
  triggerSpec: Record<string, unknown> | null;
  guardExpression: string | null;
  actions: WorkflowTransitionActionDto[];
}

export interface WorkflowTransitionActionDto {
  type: string;
  parameters: Record<string, unknown>;
}
