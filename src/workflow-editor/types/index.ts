// Generic workflow types/enums/api-contract now live in the shared
// @brainforgeau/workflow-ui package. This barrel re-exports them so existing
// helpdesk imports from '../types' keep working, and adds helpdesk's
// domain-only StateCategory enum.
export * from '@brainforgeau/workflow-ui';
export { StateCategory } from './enums';
