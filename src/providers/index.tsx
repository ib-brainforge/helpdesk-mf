import { ObservabilityProvider } from '@/observability';
import { configureContextTokenRefresh } from '@/state/authorizedAxios';
import { getAppConfig } from '@/state/config';
import { WorkflowApiProvider } from '@/workflow-editor';
import { createMockWorkflowApiClient } from '@/workflow-editor/testing';
import { ErrorBoundary } from '@brainforgeau/components';
import React, { useEffect } from 'react';
import { AuthProvider } from './AuthProvider';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';

// Module-scoped mock client — persists across renders, survives HMR navigation
// REVIEW: Using MockWorkflowApiClient here. Plan 4 will swap to RealWorkflowApiClient
// once @brainforgeau/helpdesk-client regenerates with workflow endpoints.
const workflowApiClient = createMockWorkflowApiClient();

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
