import { PrincipalWorkflowEditorPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalWorkflowEditorRoute() {
  return <PrincipalWorkflowEditorPage />;
}

export default withAuthenticationRequired(PrincipalWorkflowEditorRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
