import { AppAuthSplash } from '@/components/AppSplash';
import { RuleMigrationReportPage } from '@/workflow-editor';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function RuleMigrationReportRoute() {
  usePageTitle('Rule Migration Report');
  return <RuleMigrationReportPage />;
}

export default withAuthenticationRequired(RuleMigrationReportRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
