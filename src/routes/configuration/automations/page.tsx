/**
 * Automations list route — wraps AutomationProjectsListPage with auth + PageBody.
 *
 * NOTE: AutomationProjectsListPage owns its own h1 title and is inside automations-editor
 * (out of scope for page-template migration). PageBody provides the correct
 * main-area semantics.
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { AutomationProjectsListPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { PageBreadcrumbs } from '@/components/Breadcrumbs';
import { PageBody, usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationsListRoute() {
  usePageTitle('Automations');
  return (
    <PageBody>
      <PageBreadcrumbs breadcrumbsKey="configuration.automations.list" />
      <AutomationProjectsListPage />
    </PageBody>
  );
}

export default withAuthenticationRequired(AutomationsListRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
