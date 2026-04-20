/**
 * Centralised label maps for automation enums.
 * Import from here; do not re-define locally in pages.
 *
 * Two label sets exist because the tenant (sidebar) automation pages use the legacy
 * local numeric enums from @/types/automation, while the principal automation form
 * uses the generated string enums from @brainforgeau/helpdesk-client. These are
 * intentionally separate exports — do NOT merge them.
 */

import {
  HelpdeskDomainAutomationEnumsAutomationTriggerType,
  HelpdeskDomainAutomationEnumsConditionMatchType,
  HelpdeskDomainAutomationEnumsConditionType,
  HelpdeskDomainAutomationEnumsActionType,
} from '@brainforgeau/helpdesk-client';
import {
  ConditionType as TenantConditionType,
  ActionType as TenantActionType,
} from '@/types/automation';

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

/**
 * Principal automation form uses the generated string enum from helpdesk-client.
 * Keys match HelpdeskDomainAutomationEnumsConditionType string values.
 */
export const PRINCIPAL_CONDITION_TYPE_LABELS: Record<
  HelpdeskDomainAutomationEnumsConditionType,
  string
> = {
  [HelpdeskDomainAutomationEnumsConditionType.Status]: 'Status',
  [HelpdeskDomainAutomationEnumsConditionType.Priority]: 'Priority',
  [HelpdeskDomainAutomationEnumsConditionType.Category]: 'Category',
  [HelpdeskDomainAutomationEnumsConditionType.SubjectContains]: 'Subject contains',
  [HelpdeskDomainAutomationEnumsConditionType.BodyContains]: 'Body contains',
  [HelpdeskDomainAutomationEnumsConditionType.EmailContains]: 'Email contains',
  [HelpdeskDomainAutomationEnumsConditionType.Company]: 'Company',
  [HelpdeskDomainAutomationEnumsConditionType.Department]: 'Department',
  [HelpdeskDomainAutomationEnumsConditionType.AssignedTo]: 'Assigned to',
  [HelpdeskDomainAutomationEnumsConditionType.Tag]: 'Tag',
  [HelpdeskDomainAutomationEnumsConditionType.CustomField]: 'Custom field',
  [HelpdeskDomainAutomationEnumsConditionType.Overdue]: 'Is overdue',
  [HelpdeskDomainAutomationEnumsConditionType.BeforeOverdue]: 'Before overdue (hours)',
  [HelpdeskDomainAutomationEnumsConditionType.DueDate]: 'Due date',
  [HelpdeskDomainAutomationEnumsConditionType.NotUpdated]: 'Not updated (hours)',
  [HelpdeskDomainAutomationEnumsConditionType.TicketUnanswered]: 'Ticket unanswered',
  [HelpdeskDomainAutomationEnumsConditionType.TicketUnassigned]: 'Ticket unassigned',
  [HelpdeskDomainAutomationEnumsConditionType.TicketUpdatedByCustomer]: 'Updated by customer',
  [HelpdeskDomainAutomationEnumsConditionType.TicketUpdatedByTech]: 'Updated by tech',
  [HelpdeskDomainAutomationEnumsConditionType.ToEmailContains]: 'To email contains',
  [HelpdeskDomainAutomationEnumsConditionType.CurrentTimeBetween]: 'Current time between',
  [HelpdeskDomainAutomationEnumsConditionType.DayOfWeek]: 'Day of week',
  [HelpdeskDomainAutomationEnumsConditionType.Location]: 'Location',
  [HelpdeskDomainAutomationEnumsConditionType.LoggedBy]: 'Logged by',
  [HelpdeskDomainAutomationEnumsConditionType.LatestResponderEmailContains]: 'Latest responder email contains',
  [HelpdeskDomainAutomationEnumsConditionType.LatestCommentContains]: 'Latest comment contains',
  [HelpdeskDomainAutomationEnumsConditionType.UpdatedCustomField]: 'Updated custom field',
  [HelpdeskDomainAutomationEnumsConditionType.ApprovalState]: 'Approval state',
};

/**
 * Principal automation form uses the generated string enum from helpdesk-client.
 * Keys match HelpdeskDomainAutomationEnumsActionType string values.
 */
export const PRINCIPAL_ACTION_TYPE_LABELS: Record<
  HelpdeskDomainAutomationEnumsActionType,
  string
> = {
  [HelpdeskDomainAutomationEnumsActionType.SetStatus]: 'Set status',
  [HelpdeskDomainAutomationEnumsActionType.Assign]: 'Assign to agent',
  [HelpdeskDomainAutomationEnumsActionType.SetPriority]: 'Set priority',
  [HelpdeskDomainAutomationEnumsActionType.SetCategory]: 'Set category',
  [HelpdeskDomainAutomationEnumsActionType.AddTag]: 'Add tag',
  [HelpdeskDomainAutomationEnumsActionType.SetDueDate]: 'Set due date',
  [HelpdeskDomainAutomationEnumsActionType.CloseTicket]: 'Close ticket',
  [HelpdeskDomainAutomationEnumsActionType.ReopenTicket]: 'Reopen ticket',
  [HelpdeskDomainAutomationEnumsActionType.DeleteTicket]: 'Delete ticket',
  [HelpdeskDomainAutomationEnumsActionType.MarkUnanswered]: 'Mark unanswered',
  [HelpdeskDomainAutomationEnumsActionType.MarkAnswered]: 'Mark answered',
  [HelpdeskDomainAutomationEnumsActionType.MarkSpam]: 'Mark as spam',
  [HelpdeskDomainAutomationEnumsActionType.AddReply]: 'Add reply',
  [HelpdeskDomainAutomationEnumsActionType.NotifyAdmins]: 'Notify admins',
  [HelpdeskDomainAutomationEnumsActionType.NotifyTechs]: 'Notify technicians',
  [HelpdeskDomainAutomationEnumsActionType.NotifyAssignee]: 'Notify assignee',
  [HelpdeskDomainAutomationEnumsActionType.NotifySubmitter]: 'Notify submitter',
  [HelpdeskDomainAutomationEnumsActionType.SendEmailToUser]: 'Send email to user',
  [HelpdeskDomainAutomationEnumsActionType.AddSubscriber]: 'Add subscriber',
  [HelpdeskDomainAutomationEnumsActionType.CustomField]: 'Set custom field',
  [HelpdeskDomainAutomationEnumsActionType.AddTimeSpent]: 'Add time spent',
  [HelpdeskDomainAutomationEnumsActionType.SetSubmitter]: 'Set submitter',
  [HelpdeskDomainAutomationEnumsActionType.TriggerAnotherRule]: 'Trigger another rule',
  [HelpdeskDomainAutomationEnumsActionType.HttpRequest]: 'HTTP request',
  [HelpdeskDomainAutomationEnumsActionType.RequestApproval]: 'Request approval',
};

/**
 * Tenant (sidebar) automation pages use legacy local numeric enums from @/types/automation.
 * These differ from the principal labels above — intentionally kept separate.
 */
export const TENANT_CONDITION_TYPE_LABELS: Record<TenantConditionType, string> = {
  [TenantConditionType.StatusIs]: 'Status is',
  [TenantConditionType.StatusIsNot]: 'Status is not',
  [TenantConditionType.PriorityIs]: 'Priority is',
  [TenantConditionType.PriorityIsNot]: 'Priority is not',
  [TenantConditionType.CategoryIs]: 'Category is',
  [TenantConditionType.CategoryIsNot]: 'Category is not',
  [TenantConditionType.AssigneeIs]: 'Assignee is',
  [TenantConditionType.AssigneeIsNot]: 'Assignee is not',
  [TenantConditionType.RequesterIs]: 'Requester is',
  [TenantConditionType.RequesterIsNot]: 'Requester is not',
  [TenantConditionType.SubjectContains]: 'Subject contains',
  [TenantConditionType.SubjectNotContains]: 'Subject does not contain',
  [TenantConditionType.DescriptionContains]: 'Description contains',
  [TenantConditionType.DescriptionNotContains]: 'Description does not contain',
  [TenantConditionType.TagsContain]: 'Tags contain',
  [TenantConditionType.TagsNotContain]: 'Tags do not contain',
  [TenantConditionType.CreatedBefore]: 'Created before',
  [TenantConditionType.CreatedAfter]: 'Created after',
  [TenantConditionType.UpdatedBefore]: 'Updated before',
  [TenantConditionType.UpdatedAfter]: 'Updated after',
  [TenantConditionType.DueDateBefore]: 'Due date before',
  [TenantConditionType.DueDateAfter]: 'Due date after',
  [TenantConditionType.CustomFieldEquals]: 'Custom field equals',
  [TenantConditionType.CustomFieldNotEquals]: 'Custom field does not equal',
  [TenantConditionType.CustomFieldContains]: 'Custom field contains',
  [TenantConditionType.CustomFieldNotContains]: 'Custom field does not contain',
  [TenantConditionType.HasAttachments]: 'Has attachments',
};

export const TENANT_ACTION_TYPE_LABELS: Record<TenantActionType, string> = {
  [TenantActionType.SetStatus]: 'Set status',
  [TenantActionType.SetPriority]: 'Set priority',
  [TenantActionType.SetCategory]: 'Set category',
  [TenantActionType.AssignToAgent]: 'Assign to agent',
  [TenantActionType.AssignToGroup]: 'Assign to group',
  [TenantActionType.AddTag]: 'Add tag',
  [TenantActionType.RemoveTag]: 'Remove tag',
  [TenantActionType.SendEmail]: 'Send email',
  [TenantActionType.SendWebhook]: 'Send webhook',
  [TenantActionType.AddComment]: 'Add comment',
  [TenantActionType.AddInternalNote]: 'Add internal note',
  [TenantActionType.SetCustomField]: 'Set custom field',
  [TenantActionType.SetDueDate]: 'Set due date',
  [TenantActionType.AddSubscriber]: 'Add subscriber',
  [TenantActionType.RemoveSubscriber]: 'Remove subscriber',
  [TenantActionType.CloseTicket]: 'Close ticket',
  [TenantActionType.ReopenTicket]: 'Reopen ticket',
  [TenantActionType.MergeTicket]: 'Merge ticket',
  [TenantActionType.SplitTicket]: 'Split ticket',
  [TenantActionType.SendSms]: 'Send SMS',
  [TenantActionType.CreateTask]: 'Create task',
  [TenantActionType.AssignToMe]: 'Assign to me',
  [TenantActionType.NotifyAssignee]: 'Notify assignee',
  [TenantActionType.NotifyRequester]: 'Notify requester',
  [TenantActionType.NotifySubscribers]: 'Notify subscribers',
};
