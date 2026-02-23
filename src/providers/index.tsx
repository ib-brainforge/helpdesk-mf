import React, { useEffect } from 'react';
import { ErrorBoundary } from '@brainforgeau/components';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ObservabilityProvider } from '@/observability';
import { configureContextTokenRefresh } from '@/state/authorizedAxios';

declare const __IDENTITY_BASE_URL__: string | undefined;

export function Providers({
  children
}: {
  children: React.ReactNode;
}) {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).__RUNTIME_CONFIG__ : null;
  const identityBaseUrl = runtimeConfig?.identityBaseUrl || __IDENTITY_BASE_URL__ || '';

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
