/**
 * Workflows list route — wraps WorkflowListPage with auth + PageBody.
 *
 * NOTE: WorkflowListPage owns its own h1 title and is inside workflow-editor
 * (out of scope for page-template migration). PageBody provides the correct
 * main-area semantics.
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { PageBreadcrumbs } from '@/components/Breadcrumbs';
import { WorkflowListPage } from '@/workflow-editor';
import { PageBody } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowsListRoute() {
  return (
    <PageBody>
      <PageBreadcrumbs breadcrumbsKey="configuration.workflows.list" />
      <WorkflowListPage />
    </PageBody>
  );
}

export default withAuthenticationRequired(WorkflowsListRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
