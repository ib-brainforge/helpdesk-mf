/**
 * Principal workflow list route — /principal/[principalId]/workflows
 *
 * W1-P6: Adds breadcrumbs via PageHeader wrapper around the editor-owned
 * PrincipalWorkflowListPage. The editor component owns its own h1 and table;
 * full ListPage migration is deferred to W1-P10 (workflow/automation editor
 * wrappers).
 *
 * REVIEW: PrincipalWorkflowListPage renders its own <h1>. W1-P10 should
 * suppress the internal h1 and let PageHeader own it, eliminating the
 * duplicate heading.
 */

import { PrincipalWorkflowListPage } from '@/workflow-editor';
import { PageHeader, PendingCrumb } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalWorkflowListRoute() {
  const { principalId } = useParams<{ principalId: string }>();

  return (
    <>
      <PageHeader
        title="Workflows"
        breadcrumbsKey="principal.workflows.list"
        breadcrumbsParams={{
          principalId: principalId!,
          // REVIEW: principalName requires a lookup API (no usePrincipal hook yet).
          // Permanently uses PendingCrumb skeleton until plan-7 wires the hook.
          principalName: PendingCrumb,
        }}
        documentTitle={false}
      />
      <PrincipalWorkflowListPage />
    </>
  );
}

export default withAuthenticationRequired(PrincipalWorkflowListRoute, {
  OnRedirecting: () => null,
});
