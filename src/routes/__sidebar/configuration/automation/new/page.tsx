import { Helmet } from '@modern-js/runtime/head';

/**
 * Automation routes are temporarily disabled while we migrate from
 * AutomationRulesApi to the new WorkflowsApi/RuleGraphsApi surface.
 */
function NewAutomationRulePage() {
  return (
    <>
      <Helmet>
        <title>Automation</title>
      </Helmet>
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">Feature temporarily unavailable</h2>
        <p className="text-sm text-default-500 max-w-md">
          Automation rules are being migrated to a new engine and will return shortly.
        </p>
      </div>
    </>
  );
}

export default NewAutomationRulePage;
