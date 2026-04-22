import { WorkflowDetailPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowDetailRoute() {
  return <WorkflowDetailPage />;
}

export default withAuthenticationRequired(WorkflowDetailRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
