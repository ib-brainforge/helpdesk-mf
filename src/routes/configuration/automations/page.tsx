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
import { AuthSplash } from '@brainforgeau/components';
import { PageBody } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationsListRoute() {
  return (
    <PageBody>
      <AutomationProjectsListPage />
    </PageBody>
  );
}

export default withAuthenticationRequired(AutomationsListRoute, {
  OnRedirecting: () => <AuthSplash />,
});
