import { Configuration } from '@/api/helpdesk-client';
import { ObservabilityProvider } from '@/observability';
import {
  authorizedAxios,
  configureContextTokenRefresh,
} from '@/state/authorizedAxios';
import { getAppConfig, requireHelpdeskApiBaseUrl } from '@/state/config';
import {
  type IWorkflowApiClient,
  WorkflowApiProvider,
  buildWorkflowApiClient,
} from '@/workflow-editor';
import { ErrorBoundary } from '@brainforgeau/components';
import { ScopeVisibilityProvider } from '@brainforgeau/components/scope-visibility';
import { PlatformPermissions, usePermissions } from '@brainforgeau/security';
import type React from 'react';
import { useEffect } from 'react';
import { AuthProvider } from './AuthProvider';
import { HeroProvider } from './HeroProvider';
import QueryProvider from './QueryProvider';

// Resolves the viewer's real platform permissions once, under `AuthProvider`
// (where `usePermissions()` has a context to read from), and feeds them to
// `ScopeVisibilityProvider` as the ambient default for every scope-aware
// component in `@brainforgeau/components` (`ScopeBadge`, `ContextScopeStrip`,
// `ListScopeStrip`, `useScopeList`, `MetadataPanel`, `BaseTable`'s row
// marker). Explicit `canViewScope`/`canManageScope`/`canViewMetadata` props
// passed directly to those components still override this context.
function ScopeVisibilityMount({ children }: { children: React.ReactNode }) {
  const { hasPlatformPermission } = usePermissions();

  return (
    <ScopeVisibilityProvider
      canViewScope={hasPlatformPermission(PlatformPermissions.Scope.Read)}
      canManageScope={hasPlatformPermission(PlatformPermissions.Scope.Manage)}
      canViewMetadata={hasPlatformPermission(PlatformPermissions.Metadata.Read)}
    >
      {children}
    </ScopeVisibilityProvider>
  );
}

// Lazily-built, memoized singleton — persists across renders, survives HMR
// navigation. Real WorkflowsApi backed by authorizedAxios, on helpdesk-backend's
// own named key (`helpdeskApiBaseUrl`).
//
// It must NOT be built at MODULE LOAD: the generated `WorkflowsApi` constructor
// copies `configuration.basePath` eagerly, so building it at import time would
// call `requireHelpdeskApiBaseUrl()` at import time, and a throw there takes
// down the whole shell (every embedded app) — the failure mode the contract's
// two-stage design exists to avoid. Instead it is built on first render (past
// module load), so `requireHelpdeskApiBaseUrl()` throws — loudly, by name — at
// client construction, localised to helpdesk, exactly as the contract specifies.
let _workflowApiClient: IWorkflowApiClient | null = null;
function getWorkflowApiClient(): IWorkflowApiClient {
  if (!_workflowApiClient) {
    _workflowApiClient = buildWorkflowApiClient({
      configuration: new Configuration({
        basePath: requireHelpdeskApiBaseUrl(),
      }),
      axios: authorizedAxios,
    });
  }
  return _workflowApiClient;
}

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const appConfig = getAppConfig();
  // identity-management's own named key, resolved `rc ?? baked` in
  // src/state/config (which console.errors by name if it is missing).
  const identityBaseUrl = appConfig.identityApiBaseUrl;

  // Configure context token refresh for automatic 403 retry.
  //
  // pilot(shell-host): skip this when embedded in the app shell.
  // `configureContextTokenRefresh` mutates a MODULE-GLOBAL config on the
  // shared `authorizedAxios` instance (last-writer-wins) — the host already
  // called this for app='app'. Calling it again here for app='helpdesk'
  // would silently steal 403-retry handling away from the host's own API
  // calls (see the P2 per-app-context-token limitation noted in
  // export-app.tsx — this refresh config is a SINGLE shared instance
  // today, so the host must stay the sole owner while embedded).
  useEffect(() => {
    if (
      identityBaseUrl &&
      !(
        typeof window !== 'undefined' &&
        (window as any).__BF_SHELL_HOST__ === true
      )
    ) {
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
          <ScopeVisibilityMount>
            <HeroProvider>
              <QueryProvider>
                <WorkflowApiProvider client={getWorkflowApiClient()}>
                  {children}
                </WorkflowApiProvider>
              </QueryProvider>
            </HeroProvider>
          </ScopeVisibilityMount>
        </AuthProvider>
      </ErrorBoundary>
    </ObservabilityProvider>
  );
}
