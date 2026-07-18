import { TEST_IDS } from '@/constants/testIds';
import { AuthSplash } from '@brainforgeau/components';
import { PageBody, PageHeader } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Link } from '@modern-js/runtime/router';
import React from 'react';

function ConfigurationPage() {
  return (
    <PageBody data-testid={TEST_IDS.configuration.page}>
      <PageHeader title="Configuration" breadcrumbsKey="configuration.hub" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/configuration/app-settings"
          className="p-4 border rounded-lg hover:bg-default-100 transition-colors"
        >
          <h2 className="text-lg font-semibold">App Settings</h2>
          <p className="text-default-500 text-sm">
            Manage application settings and configuration
          </p>
        </Link>
        <Link
          to="/configuration/workflows"
          className="p-4 border rounded-lg hover:bg-default-100 transition-colors"
        >
          <h2 className="text-lg font-semibold">Workflows</h2>
          <p className="text-default-500 text-sm">
            Design and manage ticket workflow definitions
          </p>
        </Link>
      </div>
    </PageBody>
  );
}

export default withAuthenticationRequired(ConfigurationPage, {
  OnRedirecting: () => <AuthSplash />,
});
