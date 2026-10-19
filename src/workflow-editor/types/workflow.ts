// The generic workflow DTOs + owner-scope helpers now live in the shared
// @brainforgeau/workflow-ui package. Re-exported here so existing helpdesk
// imports from '../types/workflow' keep working.
export {
  isPrincipalOwned,
  isSystemOwned,
  isTenantOwned,
} from '@brainforgeau/workflow-ui';
export type {
  ApprovalSpecDto,
  MigrationResult,
  ParallelSpecDto,
  PrincipalOwnerScope,
  RuleMigrationReportItem,
  SystemOwnerScope,
  TenantOwnerScope,
  TimerTriggerSpecDto,
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
  WorkflowDefinitionVersionSummaryDto,
  WorkflowOwnerScope,
  WorkflowStateDto,
  WorkflowTransitionActionDto,
  WorkflowTransitionDto,
} from '@brainforgeau/workflow-ui';
