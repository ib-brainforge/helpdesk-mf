// clientSwitch.ts — selects between mock and real API client.
//
// To swap to the real client when @brainforgeau/helpdesk-client regenerates with workflow endpoints:
//   1. Set USE_REAL_CLIENT = true below.
//   2. Pass real WorkflowsApi/PrincipalWorkflowsApi instances to buildWorkflowApiClient().
//   3. Update Providers to instantiate those API classes with the authenticated axios instance.
//   4. Ship — the mock is never called when USE_REAL_CLIENT = true.

import { createMockWorkflowApiClient } from '../api/MockWorkflowApiClient';
import { createRealWorkflowApiClient } from '../api/RealWorkflowApiClient';
import type { IWorkflowApiClient } from '../types';

/**
 * Set to `true` when @brainforgeau/helpdesk-client has workflow endpoints regenerated.
 * @see src/workflow-editor/api/RealWorkflowApiClient.ts for expected call shapes.
 */
const USE_REAL_CLIENT = false;

/**
 * Factory that returns the appropriate API client implementation.
 *
 * @param realApi - The generated API client instance (e.g. WorkflowsApi).
 *   Ignored when USE_REAL_CLIENT = false.
 */
export function buildWorkflowApiClient(realApi: unknown): IWorkflowApiClient {
  if (USE_REAL_CLIENT) {
    return createRealWorkflowApiClient(realApi);
  }
  return createMockWorkflowApiClient();
}
