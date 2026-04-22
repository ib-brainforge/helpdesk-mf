import { ObservabilityProvider } from '@/observability';
import { configureContextTokenRefresh } from '@/state/authorizedAxios';
import { getAppConfig } from '@/state/config';
import { WorkflowApiProvider } from '@/workflow-editor';
import { buildWorkflowApiClient } from '@/workflow-editor/state/clientSwitch';
import { ErrorBoundary } from '@brainforgeau/components';
import React, { useEffect } from 'react';
import { AuthProvider } from './AuthProvider';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';

// Module-scoped client — persists across renders, survives HMR navigation.
// When USE_REAL_CLIENT = true in clientSwitch.ts, pass real API instances here
// e.g.: buildWorkflowApiClient(new WorkflowsApi(helpdeskAxios))
// USE_REAL_CLIENT=false → mock is built directly; pass real API instance here when flipping the flag.
const workflowApiClient = buildWorkflowApiClient(undefined);

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
