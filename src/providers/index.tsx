import React, { useEffect } from 'react';
import { ErrorBoundary } from '@brainforgeau/components';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ObservabilityProvider } from '@/observability';
import { configureContextTokenRefresh } from '@/state/authorizedAxios';
import { getAppConfig } from '@/state/config';

export function Providers({
  children
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
              {children}
            </QueryProvider>
          </HeroProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ObservabilityProvider>
  );
}
