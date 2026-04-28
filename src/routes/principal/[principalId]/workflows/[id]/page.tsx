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
