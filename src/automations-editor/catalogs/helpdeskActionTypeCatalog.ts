/**
 * Helpdesk action-type catalog for the ActionNode picker in the rules editor.
 *
 * Each entry maps a backend `ActionType` enum value to a display label and
 * optional UI hints. The `value` must match the string the backend
 * `IActionExecutor` registry uses to route compiled action configs.
 *
 * Source: Helpdesk.Domain/Automation/Enums/ActionType.cs
 */
import { APPROVALS_ENABLED } from '@/constants/features';
import type { ActionTypeOption } from '@brainforgeau/rules-ui';

export const HELPDESK_ACTION_TYPES: ActionTypeOption[] = [
  // ── Ticket status / assignment ──────────────────────────────────────────────
  { value: 'SetStatus', label: 'Set Status' },
  { value: 'Assign', label: 'Assign Ticket' },
  { value: 'SetPriority', label: 'Set Priority', showPriority: true },
  { value: 'SetType', label: 'Set Type' },
  { value: 'SetCategory', label: 'Set Category' },

  // ── Tagging / watchers ──────────────────────────────────────────────────────
  { value: 'AddTag', label: 'Add Tag' },
  { value: 'RemoveTag', label: 'Remove Tag' },
  { value: 'AddWatcher', label: 'Add Watcher' },

  // ── Notifications ───────────────────────────────────────────────────────────
  { value: 'SendNotification', label: 'Send Notification' },
  { value: 'SendEmail', label: 'Send Email' },

  // ── Workflow ────────────────────────────────────────────────────────────────
  // CreateSubtask is switched off with the rest of subtasks (SUBTASKS_ENABLED).
  // { value: 'CreateSubtask', label: 'Create Subtask' },
  { value: 'InvokeWorkflowTransition', label: 'Invoke Workflow Transition' },
  // RequestApproval is offered only while approvals are on (APPROVALS_ENABLED).
  ...(APPROVALS_ENABLED
    ? [{ value: 'RequestApproval', label: 'Request Approval' }]
    : []),

  // No SLA actions: the backend ActionType enum has none, and deadlines come
  // from the company's policy, with a clock that never pauses.

  // ── Knowledge base / canned responses ───────────────────────────────────────
  { value: 'AttachCannedResponse', label: 'Attach Canned Response' },
  { value: 'AttachKnowledgeArticle', label: 'Attach Knowledge Article' },

  // ── Custom fields ───────────────────────────────────────────────────────────
  { value: 'SetCustomField', label: 'Set Custom Field' },
  { value: 'ClearCustomField', label: 'Clear Custom Field' },

  // ── Escalation / close ───────────────────────────────────────────────────────
  { value: 'Escalate', label: 'Escalate Ticket' },
  { value: 'CloseTicket', label: 'Close Ticket' },
  { value: 'ReopenTicket', label: 'Reopen Ticket' },

  // ── Webhook / integration ────────────────────────────────────────────────────
  { value: 'Webhook', label: 'Webhook', showWebhookUrl: true },
];
