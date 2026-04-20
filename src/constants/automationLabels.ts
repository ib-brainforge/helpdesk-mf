/**
 * Centralised label maps for automation enums.
 * Import from here; do not re-define locally in pages.
 */

import {
  HelpdeskDomainAutomationEnumsAutomationTriggerType,
  HelpdeskDomainAutomationEnumsConditionMatchType,
} from '@brainforgeau/helpdesk-client';

export const TRIGGER_LABELS: Record<
  HelpdeskDomainAutomationEnumsAutomationTriggerType,
  string
> = {
  TicketCreated: 'Ticket Created',
  TicketOverdue: 'Ticket Overdue',
  TicketNotUpdated: 'Ticket Not Updated',
  TicketClosed: 'Ticket Closed',
  TicketUpdated: 'Ticket Updated',
  TicketCategoryChanged: 'Category Changed',
  TicketAssigneeChanged: 'Assignee Changed',
  TicketStatusChanged: 'Status Changed',
  TicketPriorityChanged: 'Priority Changed',
  TicketUpdatedByCustomer: 'Updated By Customer',
  TicketReopened: 'Ticket Reopened',
  CustomFieldEdited: 'Custom Field Edited',
  DueDateChanged: 'Due Date Changed',
  TagAdded: 'Tag Added',
  ApprovalRequested: 'Approval Requested',
  ApprovalCompleted: 'Approval Completed',
  TriggerManually: 'Trigger Manually',
};

export const MATCH_TYPE_LABELS: Record<
  HelpdeskDomainAutomationEnumsConditionMatchType,
  string
> = {
  All: 'Match ALL conditions',
  Any: 'Match ANY condition',
  None: 'Match NONE of the conditions',
};
