/**
 * Helpdesk input-field catalog for the InputNode tooltip in the rules editor.
 *
 * Groups mirror the conceptual sections of a helpdesk ticket context object
 * as built by the `IActionExecutor` evaluation pipeline on the backend.
 *
 * Fields ending in `[]` denote arrays (e.g. tags, watchers).
 */
import type { InputFieldGroup } from '@brainforgeau/rules-ui';

export const HELPDESK_INPUT_FIELDS: InputFieldGroup[] = [
  {
    group: 'Ticket',
    fields: [
      'status',
      'priority',
      'type',
      'category',
      'assigneeId',
      'requesterId',
      'subject',
      'description',
      'tags[]',
      'watchers[]',
      'createdAt',
      'slaDue',
      'customFields',
    ],
  },
  {
    group: 'Workflow Event',
    fields: [
      'triggerType',
      'workflowState',
      'workflowPrevState',
      'transitionName',
      'timeInState',
    ],
  },
  {
    group: 'Custom Fields',
    fields: ['customFields.{key}'],
  },
];
