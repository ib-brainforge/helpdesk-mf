// Re-export types from generated client.
//
// REVIEW: previously this file held hand-rolled placeholder types (numeric
// ApprovalMode/ApprovalState/ApprovalDecisionType enums, a local
// ApprovalWorkflowListDto, etc.) for a backend client that didn't yet exist.
// The real generated client ships string-backed enums and DTOs that differ
// from those placeholders — consumers now import directly from
// '@brainforgeau/helpdesk-client' (see src/components/approvals/,
// src/hooks/usePrincipalApprovalWorkflows.ts, src/constants/approvalLabels.ts).
export {
  HelpdeskDomainApprovalsEnumsApprovalMode,
  HelpdeskDomainApprovalsEnumsApprovalState,
  HelpdeskDomainApprovalsEnumsApprovalDecisionType,
  type HelpdeskApplicationApprovalsDTOsApprovalWorkflowStepDto,
  type HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto,
  type HelpdeskApplicationApprovalsDTOsApprovalWorkflowDetailDto,
  type HelpdeskApplicationApprovalsDTOsApprovalDecisionDto,
  type HelpdeskApplicationApprovalsDTOsTicketApprovalDto,
  type HelpdeskApplicationApprovalsDTOsPendingApprovalDto,
  type HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand,
  type HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowCommand,
  type HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand,
  type HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand,
} from '@brainforgeau/helpdesk-client';
