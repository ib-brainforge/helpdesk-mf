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
import { AppAuthSplash } from '@/components/AppSplash';
import { WorkflowDetailPage } from '@/workflow-editor';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowDetailRoute() {
  usePageTitle('Workflow');
  return <WorkflowDetailPage />;
}

export default withAuthenticationRequired(WorkflowDetailRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
