// clientSwitch.ts — selects between mock and real API client.

import type { Configuration } from '@brainforgeau/helpdesk-client';
// REVIEW: AxiosInstance type sourced from @brainforgeau/security (which re-exports from axios)
// to avoid a direct `import from 'axios'` that is not in project dependencies.
import type { authorizedAxios as _AuthorizedAxios } from '@brainforgeau/security';
type AxiosInstance = typeof _AuthorizedAxios;
import { createMockWorkflowApiClient } from '../api/MockWorkflowApiClient';
import { createRealWorkflowApiClient } from '../api/RealWorkflowApiClient';
import type { IWorkflowApiClient } from '../types';

/**
 * When true, the real @brainforgeau/helpdesk-client WorkflowsApi is used.
 * Set to false to fall back to the in-memory mock (useful for offline dev / testing).
 */
export const USE_REAL_CLIENT = true;

export interface RealClientDeps {
  configuration: Configuration;
  axios?: AxiosInstance;
}

/**
 * Factory that returns the appropriate API client implementation.
 *
 * @param realClientDeps - Configuration + optional axios instance for the real client.
 *   Ignored when USE_REAL_CLIENT = false.
 */
export function buildWorkflowApiClient(
  realClientDeps: RealClientDeps | undefined,
): IWorkflowApiClient {
  if (USE_REAL_CLIENT && realClientDeps) {
    return createRealWorkflowApiClient(
      realClientDeps.configuration,
      realClientDeps.axios,
    );
  }
  return createMockWorkflowApiClient();
}
