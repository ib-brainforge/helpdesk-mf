import { RuleGraphsListPage } from '@/automations-editor';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import React from 'react';

function PrincipalAutomationRuleGraphsRoute() {
  return <RuleGraphsListPage />;
}

export default withAuthenticationRequired(PrincipalAutomationRuleGraphsRoute, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
