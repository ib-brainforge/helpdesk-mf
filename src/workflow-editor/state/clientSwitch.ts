// clientSwitch.ts — builds the real API client.
// REVIEW: mock branch (MockWorkflowApiClient) removed as dead code during the
// 2026-07-06 dead-dependency sweep — USE_REAL_CLIENT was a hardcoded `true` const
// with no caller ever flipping it, so the mock path was unreachable.

// REVIEW: AxiosInstance type sourced from @brainforgeau/security (which re-exports from axios)
// to avoid a direct `import from 'axios'` that is not in project dependencies.
import type { authorizedAxios as _AuthorizedAxios } from '@/security';
import type { Configuration } from '@brainforgeau/helpdesk-client';
type AxiosInstance = typeof _AuthorizedAxios;
import { createRealWorkflowApiClient } from '../api/RealWorkflowApiClient';
import type { IWorkflowApiClient } from '../types';

export interface RealClientDeps {
  configuration: Configuration;
  axios?: AxiosInstance;
}

/**
 * Factory that returns the real WorkflowsApi-backed client implementation.
 */
export function buildWorkflowApiClient(
  realClientDeps: RealClientDeps,
): IWorkflowApiClient {
  return createRealWorkflowApiClient(
    realClientDeps.configuration,
    realClientDeps.axios,
  );
}
