import { RuleGraphsListPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function AutomationRuleGraphsRoute() {
  return <RuleGraphsListPage />;
}

export default withAuthenticationRequired(AutomationRuleGraphsRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
