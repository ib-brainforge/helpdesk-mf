import { PrincipalAutomationProjectsListPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationListRoute() {
  return <PrincipalAutomationProjectsListPage />;
}

export default withAuthenticationRequired(PrincipalAutomationListRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
