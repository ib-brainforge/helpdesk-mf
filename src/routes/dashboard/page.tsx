import React from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { TEST_IDS } from '@/constants/testIds';

function DashboardPage() {
  return (
    <div data-testid={TEST_IDS.dashboard.page}>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-default-500">Welcome to the Helpdesk module dashboard.</p>
    </div>
  );
}

export default withAuthenticationRequired(DashboardPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
