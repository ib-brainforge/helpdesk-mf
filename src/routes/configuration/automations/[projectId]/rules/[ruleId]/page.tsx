/**
 * Automation rule-graph editor route — wraps AutomationDetailPage with auth.
 *
 * NOTE: AutomationDetailPage owns its own full-bleed canvas layout
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor is a full-height canvas — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { AutomationDetailPage } from '@/automations-editor';
import { AppAuthSplash } from '@/components/AppSplash';
import { withAuthenticationRequired } from '@/security';
import React from 'react';

function AutomationDetailRoute() {
  return <AutomationDetailPage />;
}

export default withAuthenticationRequired(AutomationDetailRoute, {
  OnRedirecting: () => <AppAuthSplash />,
});
