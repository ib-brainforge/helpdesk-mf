import { AutomationProjectsListPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationsListRoute() {
  return <AutomationProjectsListPage />;
}

export default withAuthenticationRequired(AutomationsListRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
