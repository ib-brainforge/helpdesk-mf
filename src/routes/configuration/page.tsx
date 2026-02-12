import React from 'react';
import { PageSpinner } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { TEST_IDS } from '@/constants/testIds';
import { Link } from '@modern-js/runtime/router';

function ConfigurationPage() {
  return (
    <div data-testid={TEST_IDS.configuration.page}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Configuration', href: '/configuration', isCurrent: true },
        ]}
      />
      <div className="mt-4">
        <h1 className="text-2xl font-bold mb-4">Configuration</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/configuration/app-settings"
            className="p-4 border rounded-lg hover:bg-default-100 transition-colors"
          >
            <h2 className="text-lg font-semibold">App Settings</h2>
            <p className="text-default-500 text-sm">Manage application settings and configuration</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(ConfigurationPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
