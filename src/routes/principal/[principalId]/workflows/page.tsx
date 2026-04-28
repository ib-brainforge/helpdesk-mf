import { PrincipalWorkflowListPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalWorkflowListRoute() {
  return <PrincipalWorkflowListPage />;
}

export default withAuthenticationRequired(PrincipalWorkflowListRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
