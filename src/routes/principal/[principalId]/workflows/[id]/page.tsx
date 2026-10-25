/**
 * Principal workflow editor route — wraps PrincipalWorkflowDetailPage with auth.
 *
 * NOTE: PrincipalWorkflowDetailPage owns its own full-viewport canvas layout (explicit shell-offset height)
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor needs to fill the viewport without page padding — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { PrincipalWorkflowDetailPage } from '@/workflow-editor';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalWorkflowDetailRoute() {
  usePageTitle('Workflow');
  return <PrincipalWorkflowDetailPage />;
}

export default withAuthenticationRequired(PrincipalWorkflowDetailRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
