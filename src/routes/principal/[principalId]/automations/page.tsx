/**
 * Principal automation projects list route — /principal/[principalId]/automations
 *
 * W1-P6: Adds breadcrumbs via PageHeader wrapper around the editor-owned
 * PrincipalAutomationProjectsListPage.
 *
 * W1-review-fixes:
 *   - usePrincipal() wired; principalName resolves from identity-management.
 *   - PrincipalAutomationProjectsListPage receives showTitle={false} to suppress
 *     its internal <h1>, eliminating the duplicate heading.
 */

import { PrincipalAutomationProjectsListPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { usePrincipal } from '@/hooks/usePrincipal';
import { PageHeader, PendingCrumb } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalAutomationListRoute() {
  const { principalId } = useParams<{ principalId: string }>();
  const { data: principal } = usePrincipal(principalId);

  return (
    <>
      <PageHeader
        title="Automations"
        breadcrumbsKey="principal.automations.list"
        breadcrumbsParams={{
          principalId: principalId!,
          principalName: principal?.name ?? PendingCrumb,
        }}
        documentTitle={false}
      />
      <PrincipalAutomationProjectsListPage showTitle={false} />
    </>
  );
}

export default withAuthenticationRequired(PrincipalAutomationListRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
