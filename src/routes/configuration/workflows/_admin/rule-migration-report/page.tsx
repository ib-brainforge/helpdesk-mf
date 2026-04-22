import { RuleMigrationReportPage } from '@/workflow-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function RuleMigrationReportRoute() {
  return <RuleMigrationReportPage />;
}

export default withAuthenticationRequired(RuleMigrationReportRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
