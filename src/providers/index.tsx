import { ObservabilityProvider } from '@/observability';
import {
  authorizedAxios,
  configureContextTokenRefresh,
} from '@/state/authorizedAxios';
import { configAtom, getAppConfig } from '@/state/config';
import { WorkflowApiProvider, buildWorkflowApiClient } from '@/workflow-editor';
import { ErrorBoundary } from '@brainforgeau/components';
import { Configuration } from '@brainforgeau/helpdesk-client';
import type { RuntimeConfig } from '@brainforgeau/security';
import { getDefaultStore } from 'jotai';
import type React from 'react';
import { useEffect } from 'react';
import { AuthProvider } from './AuthProvider';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';

// Resolve the helpdesk API base URL at module load time (same pattern as
// createHelpdeskApiClient in helpdeskApiClient.ts).
const store = getDefaultStore();
const runtimeConfig = store.get(configAtom) as RuntimeConfig | undefined;
const helpdeskBaseUrl = runtimeConfig?.api?.baseUrl ?? '';

// Module-scoped client — persists across renders, survives HMR navigation.
// Real WorkflowsApi backed by authorizedAxios; basePath defaults to '' when the
// runtime config hasn't resolved yet (matches other API clients in this app).
const workflowApiClient = buildWorkflowApiClient({
  configuration: new Configuration({ basePath: helpdeskBaseUrl }),
  axios: authorizedAxios,
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const appConfig = getAppConfig();
  const identityBaseUrl = appConfig?.identityBaseUrl || '';

  // Configure context token refresh for automatic 403 retry
  useEffect(() => {
    if (identityBaseUrl) {
      configureContextTokenRefresh({
        identityBaseUrl,
        app: 'helpdesk',
      });
    }
  }, [identityBaseUrl]);

  return (
    <ObservabilityProvider>
      <ErrorBoundary>
        <AuthProvider>
          <HeroProvider>
            <QueryProvider>
              <WorkflowApiProvider client={workflowApiClient}>
                {children}
              </WorkflowApiProvider>
            </QueryProvider>
          </HeroProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ObservabilityProvider>
  );
}
