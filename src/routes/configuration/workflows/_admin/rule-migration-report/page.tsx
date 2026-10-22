import { AppAuthSplash } from '@/components/AppSplash';
import { RuleMigrationReportPage } from '@/workflow-editor';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function RuleMigrationReportRoute() {
  return <RuleMigrationReportPage />;
}

export default withAuthenticationRequired(RuleMigrationReportRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
