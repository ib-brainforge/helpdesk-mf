import { PrincipalAutomationDetailPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationDetailRoute() {
  return <PrincipalAutomationDetailPage />;
}

export default withAuthenticationRequired(PrincipalAutomationDetailRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
