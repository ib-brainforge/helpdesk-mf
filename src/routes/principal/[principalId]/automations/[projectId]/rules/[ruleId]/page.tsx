/**
 * Principal automation rule-graph editor route — wraps PrincipalAutomationDetailPage with auth.
 *
 * NOTE: PrincipalAutomationDetailPage owns its own full-viewport canvas layout (explicit shell-offset height)
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor needs to fill the viewport without page padding — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { PrincipalAutomationDetailPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { usePageTitle } from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationDetailRoute() {
  usePageTitle('Automation Rule');
  return <PrincipalAutomationDetailPage />;
}

export default withAuthenticationRequired(PrincipalAutomationDetailRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
