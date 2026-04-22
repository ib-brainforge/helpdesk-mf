import type {
  StateCategory,
  StateType,
  TriggerType,
  VersionStatus,
} from './enums';

// ── Owner scope template-literal types ───────────────────────────────────────
export type SystemOwnerScope = `system:${string}`;
export type TenantOwnerScope = `tenant:${string}`;
export type PrincipalOwnerScope = `principal:${string}`;
export type WorkflowOwnerScope =
  | SystemOwnerScope
  | TenantOwnerScope
  | PrincipalOwnerScope;

export interface WorkflowDefinitionDto {
  id: string;
  name: string;
  description: string | null;
  ownerScope: WorkflowOwnerScope;
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
  /** For transitions leaving a Parallel state node, identifies which branch handle (e.g. "branch-a") */
  sourceHandleId?: string | null;
  // PLAN-7: Backend stores approvals in WorkflowApproval aggregate keyed by transition; not a transition-row field.
  // Mock-only here; real adapter must compose from a separate query OR backend embeds it server-side.
  approvalSpec?: ApprovalSpecDto | null;
}

// ── Approval spec (Task 7) ───────────────────────────────────────────────────
export interface ApprovalSpecDto {
  required: boolean;
  /** Role names that can approve (OR logic with approverUserIds) */
  approverRoles?: string[];
  /** Specific user IDs that can approve (OR logic with approverRoles) */
  approverUserIds?: string[];
  description?: string;
}

// ── Timer trigger spec (Task 8) ──────────────────────────────────────────────
export interface TimerTriggerSpecDto {
  duration: string; // ISO-8601 duration e.g. "PT1H30M"
  useBusinessHours?: boolean;
  businessHoursScheduleId?: string; // PLAN-7: backend BusinessHoursSchedule lookup wires real value here.
}

export interface WorkflowTransitionActionDto {
  type: string;
  parameters: Record<string, unknown>;
}

// ── Plan 4 additions ──────────────────────────────────────────────────────────

export interface RuleMigrationReportItem {
  ruleId: string;
  name: string;
  isEnabled: boolean;
  statusConditionCount: number;
  statusMutatingActionCount: number;
  mutatingActionTypes: string[];
  categoryId: string | null;
  categoryName: string | null;
}

export interface MigrationResult {
  rulesScanned: number;
  conditionsMigrated: number;
  actionsMigrated: number;
  warnings: string[];
}
