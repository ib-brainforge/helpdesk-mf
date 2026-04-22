/**
 * Helpdesk output-field catalog for the OutputNode tooltip in the rules editor.
 *
 * Describes what a matched rule graph can produce — the shapes surfaced in the
 * OutputNode info panel so rule authors understand what fields they can expect
 * the action executor to receive after a rule evaluates.
 */
import type { OutputFieldEntry } from '@brainforgeau/rules-ui';

export const HELPDESK_OUTPUT_FIELDS: OutputFieldEntry[] = [
  { field: 'matched', desc: 'Boolean — true when the rule evaluated to a match' },
  { field: 'actionType', desc: 'The action type key dispatched to the executor registry' },
  { field: 'priority', desc: '"critical" | "high" | "medium" | "low" (when action sets priority)' },
  { field: 'description', desc: 'Human-readable description emitted by the action' },
  { field: 'ruleKey', desc: 'Stable rule identifier for grouping and idempotency' },
  { field: 'webhookUrl', desc: 'Webhook URL when actionType is "Webhook"' },
];
