import { WorkflowListPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowsListRoute() {
  return <WorkflowListPage />;
}

export default withAuthenticationRequired(WorkflowsListRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
