// Generic workflow enums (StateType / TriggerType / VersionStatus) now live in
// the shared @brainforgeau/workflow-ui package. Re-exported here so existing
// helpdesk imports from '../types/enums' keep working.
export {
  StateType,
  TriggerType,
  VersionStatus,
} from '@brainforgeau/workflow-ui';

/**
 * Helpdesk-domain ticket-lifecycle category. This is the consuming app's
 * vocabulary — the package models a state's `category` as a plain string and
 * receives the allowed values via injected `categoryOptions`/`categoryColors`.
 */
export enum StateCategory {
  New = 'New',
  Open = 'Open',
  Pending = 'Pending',
  Resolved = 'Resolved',
  Closed = 'Closed',
}
