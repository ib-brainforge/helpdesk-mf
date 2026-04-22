import { WorkflowEditorPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function WorkflowEditorRoute() {
  return <WorkflowEditorPage />;
}

export default withAuthenticationRequired(WorkflowEditorRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
