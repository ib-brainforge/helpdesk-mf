/**
 * Workflow editor route — wraps WorkflowDetailPage with auth.
 *
 * NOTE: WorkflowDetailPage owns its own full-bleed canvas layout
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor is a full-height canvas — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { WorkflowDetailPage } from '@/workflow-editor';
import { AuthSplash } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowDetailRoute() {
  return <WorkflowDetailPage />;
}

export default withAuthenticationRequired(WorkflowDetailRoute, {
  OnRedirecting: () => <AuthSplash />,
});
