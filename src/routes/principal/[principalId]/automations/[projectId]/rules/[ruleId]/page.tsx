/**
 * Principal automation rule-graph editor route — wraps PrincipalAutomationDetailPage with auth.
 *
 * NOTE: PrincipalAutomationDetailPage owns its own full-bleed canvas layout (-m-5 override)
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor needs to escape the outer padding — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { PrincipalAutomationDetailPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationDetailRoute() {
  return <PrincipalAutomationDetailPage />;
}

export default withAuthenticationRequired(PrincipalAutomationDetailRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
