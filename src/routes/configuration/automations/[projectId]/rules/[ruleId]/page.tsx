/**
 * Automation rule-graph editor route — wraps AutomationDetailPage with auth.
 *
 * NOTE: AutomationDetailPage owns its own full-bleed canvas layout (-m-5 override)
 * and internal breadcrumb nav. PageBody is intentionally omitted here because
 * the editor needs to escape the outer padding — it is out of scope for the
 * page-template migration (editor internals).
 *
 * bf-template-migration: legacy / deadline: 2026-08-01
 */
import { AutomationDetailPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationDetailRoute() {
  return <AutomationDetailPage />;
}

export default withAuthenticationRequired(AutomationDetailRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
