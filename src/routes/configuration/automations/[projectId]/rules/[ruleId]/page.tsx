import { AutomationDetailPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationDetailRoute() {
  return <AutomationDetailPage />;
}

export default withAuthenticationRequired(AutomationDetailRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
