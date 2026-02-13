// REVIEW: Types for approval workflows matching backend DTOs

export enum ApprovalState {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3,
}

export enum ApprovalMode {
  Sequential = 0,
  Parallel = 1,
  AnyOne = 2,
}

export enum ApprovalDecisionType {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Skipped = 3,
}

export interface ApprovalWorkflowStepDto {
  id?: string;
  stepOrder: number;
  name: string;
  approverUserId?: string;
  approverRoleId?: string;
  isRequired: boolean;
  timeoutHours?: number;
  escalateToUserId?: string;
}

export interface ApprovalWorkflowDto {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  approvalMode: ApprovalMode;
  isActive: boolean;
  triggerOnCreation: boolean;
  triggerOnStatusChange: boolean;
  triggerStatusId?: number;
  steps: ApprovalWorkflowStepDto[];
  createdAt?: string;
  modifiedAt?: string;
}

export interface ApprovalWorkflowListDto {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  approvalMode: ApprovalMode;
  isActive: boolean;
  stepsCount: number;
}

export interface ApprovalDecisionDto {
  id: string;
  stepId: string;
  stepOrder: number;
  stepName: string;
  approverUserId?: string;
  approverUserName?: string;
  decision: ApprovalDecisionType;
  comment?: string;
  decidedAt?: string;
}

export interface TicketApprovalDto {
  id: string;
  ticketId: string;
  workflowId: string;
  workflowName: string;
  overallState: ApprovalState;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedAt: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByUserName?: string;
  decisions: ApprovalDecisionDto[];
}

export interface PendingApprovalDto {
  approvalId: string;
  ticketId: string;
  ticketSubject: string;
  stepId: string;
  stepName: string;
  workflowName: string;
  requestedAt: string;
  requestedByUserName: string;
}

export interface CreateApprovalWorkflowCommand {
  name: string;
  description?: string;
  categoryId?: string;
  approvalMode: ApprovalMode;
  isActive: boolean;
  triggerOnCreation: boolean;
  steps: ApprovalWorkflowStepDto[];
}

export interface UpdateApprovalWorkflowCommand {
  name: string;
  description?: string;
  approvalMode: ApprovalMode;
  isActive: boolean;
  triggerOnCreation: boolean;
  steps: ApprovalWorkflowStepDto[];
}

export interface RequestApprovalCommand {
  ticketId: string;
  workflowId?: string;
}

export interface MakeApprovalDecisionCommand {
  approvalId: string;
  stepId: string;
  decision: ApprovalDecisionType;
  comment?: string;
}
