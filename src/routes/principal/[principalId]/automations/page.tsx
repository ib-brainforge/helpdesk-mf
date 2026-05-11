/**
 * Principal automation projects list route — /principal/[principalId]/automations
 *
 * W1-P6: Adds breadcrumbs via PageHeader wrapper around the editor-owned
 * PrincipalAutomationProjectsListPage. The editor component owns its own h1
 * and table; full ListPage migration is deferred to W1-P10 (workflow/automation
 * editor wrappers).
 *
 * REVIEW: PrincipalAutomationProjectsListPage renders its own <h1>. W1-P10
 * should suppress the internal h1 and let PageHeader own it, eliminating the
 * duplicate heading.
 */

import { PrincipalAutomationProjectsListPage } from '@/automations-editor';
import { PageHeader, PendingCrumb } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useParams } from '@modern-js/runtime/router';

function PrincipalAutomationListRoute() {
  const { principalId } = useParams<{ principalId: string }>();

  return (
    <>
      <PageHeader
        title="Automations"
        breadcrumbsKey="principal.automations.list"
        breadcrumbsParams={{
          principalId: principalId!,
          // REVIEW: principalName requires a lookup API (no usePrincipal hook yet).
          // Permanently uses PendingCrumb skeleton until plan-7 wires the hook.
          principalName: PendingCrumb,
        }}
        documentTitle={false}
      />
      <PrincipalAutomationProjectsListPage />
    </>
  );
}

export default withAuthenticationRequired(PrincipalAutomationListRoute, {
  OnRedirecting: () => null,
});
