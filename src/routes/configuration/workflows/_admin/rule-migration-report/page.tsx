import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@/security';
import { RuleMigrationReportPage } from '@/workflow-editor';
import React from 'react';

function RuleMigrationReportRoute() {
  return <RuleMigrationReportPage />;
}

export default withAuthenticationRequired(RuleMigrationReportRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
