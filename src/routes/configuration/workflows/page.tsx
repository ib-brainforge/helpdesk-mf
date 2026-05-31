/**
 * Workflows list route — wraps WorkflowListPage with auth + PageBody.
 *
 * NOTE: WorkflowListPage owns its own h1 title and is inside workflow-editor
 * (out of scope for page-template migration). PageBody provides the correct
 * main-area semantics.
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { WorkflowListPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { PageBody } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowsListRoute() {
  return (
    <PageBody>
      <WorkflowListPage />
    </PageBody>
  );
}

export default withAuthenticationRequired(WorkflowsListRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
