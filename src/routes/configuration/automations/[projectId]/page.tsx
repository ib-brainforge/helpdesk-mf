/**
 * Automation rule-graphs list route -- wraps RuleGraphsListPage with auth.
 * The list renders its own page body, header and breadcrumbs.
 */
import { RuleGraphsListPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

export default withAuthenticationRequired(RuleGraphsListPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
