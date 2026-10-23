/**
 * Principal automation rule-graphs list route — wraps RuleGraphsListPage with auth.
 *
 * NOTE: RuleGraphsListPage owns its own header (h1 + breadcrumb nav).
 * PageBody wraps the page to provide the correct main-area semantics.
 * PageHeader is omitted because the inner component renders the title —
 * it is out of scope for page-template migration (automation-editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { RuleGraphsListPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { PageBody, usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationRuleGraphsRoute() {
  usePageTitle('Automation Rules');
  return (
    <PageBody>
      <RuleGraphsListPage />
    </PageBody>
  );
}

export default withAuthenticationRequired(PrincipalAutomationRuleGraphsRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
