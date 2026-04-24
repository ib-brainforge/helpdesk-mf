/**
 * REVIEW: AutomationRulesApi was removed from @brainforgeau/helpdesk-client in the
 * audience-refactor backend update. The legacy automation rules feature has been
 * superseded by the new workflow engine (WorkflowsApi / RuleGraphsApi).
 * These admin pages require a separate migration to the new workflow API.
 * For now, this stub keeps the build passing while the UI migration is planned.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notAvailable = (..._args: any[]): Promise<any> => {
  return Promise.reject(
    new Error('AutomationRulesApi is no longer available — migrate to WorkflowsApi.'),
  );
};

export class AutomationRulesApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  v1AutomationRulesGet = notAvailable;
  v1AutomationRulesPost = notAvailable;
  v1AutomationRulesIdGet = notAvailable;
  v1AutomationRulesIdPut = notAvailable;
  v1AutomationRulesIdDelete = notAvailable;
  v1AutomationRulesIdEnablePost = notAvailable;
  v1AutomationRulesIdDisablePost = notAvailable;
  v1AutomationRulesReorderPost = notAvailable;
}
