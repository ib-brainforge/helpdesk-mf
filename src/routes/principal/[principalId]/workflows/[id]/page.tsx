/**
 * Principal workflow editor route — wraps PrincipalWorkflowDetailPage with auth.
 *
 * NOTE: PrincipalWorkflowDetailPage owns its own full-bleed canvas layout (-m-5 override)
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor needs to escape the outer padding — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { PrincipalWorkflowDetailPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalWorkflowDetailRoute() {
  return <PrincipalWorkflowDetailPage />;
}

export default withAuthenticationRequired(PrincipalWorkflowDetailRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
