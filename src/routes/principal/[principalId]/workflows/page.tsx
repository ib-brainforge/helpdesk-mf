/**
 * Principal workflow list route — /principal/[principalId]/workflows
 *
 * W1-P6: Adds breadcrumbs via PageHeader wrapper around the editor-owned
 * PrincipalWorkflowListPage.
 *
 * W1-review-fixes:
 *   - usePrincipal() wired; principalName resolves from identity-management.
 *   - PrincipalWorkflowListPage receives showTitle={false} to suppress its
 *     internal <h1>, eliminating the duplicate heading.
 */

import { usePrincipal } from '@/hooks/usePrincipal';
import { PrincipalWorkflowListPage } from '@/workflow-editor';
import { PageHeader, PendingCrumb } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalWorkflowListRoute() {
  const { principalId } = useParams<{ principalId: string }>();
  const { data: principal } = usePrincipal(principalId);

  return (
    <>
      <PageHeader
        title="Workflows"
        breadcrumbsKey="principal.workflows.list"
        breadcrumbsParams={{
          principalId: principalId!,
          principalName: principal?.name ?? PendingCrumb,
        }}
        documentTitle={false}
      />
      <PrincipalWorkflowListPage showTitle={false} />
    </>
  );
}

export default withAuthenticationRequired(PrincipalWorkflowListRoute, {
  OnRedirecting: () => null,
});
