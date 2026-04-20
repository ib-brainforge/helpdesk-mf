/**
 * Principal layout for /principal/[principalId]/* routes.
 *
 * - Reads principalId from route params.
 * - Calls usePrincipalAccess to resolve admin | agent | null.
 * - null → AccessDenied state.
 * - Otherwise renders PrincipalSidenav + Outlet with principalId/level context.
 * - Hides the tenant sidenav (top-level layout handles this via isPrincipalRoute).
 */

import { useMemo } from 'react';
import { ErrorBoundary, PageSpinner } from '@brainforgeau/components';
import { useAuth } from '@brainforgeau/security';
import { Navigate, Outlet, useParams } from '@modern-js/runtime/router';
import { usePrincipalAccess } from '@/hooks/usePrincipalAccess';
import { PrincipalSidenav } from '@/components/principal/PrincipalSidenav';

export interface PrincipalOutletContext {
  principalId: string;
  level: 'admin' | 'agent';
}

function AccessDenied() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <p className="text-xl font-semibold">Access Denied</p>
      <p className="text-default-500 text-sm">
        You do not have permission to access this principal's helpdesk console.
      </p>
    </div>
  );
}

function PrincipalLayoutContent() {
  const { principalId } = useParams<{ principalId: string }>();
  const { isAuthenticated } = useAuth();
  const { isLoading, level } = usePrincipalAccess(principalId!);

  const context = useMemo<PrincipalOutletContext | null>(
    () => (level ? { principalId: principalId!, level } : null),
    [principalId, level],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <PageSpinner title="Validating access..." />
      </div>
    );
  }

  if (isAuthenticated && !level) {
    return <AccessDenied />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1">
      {isAuthenticated && level && (
        <PrincipalSidenav principalId={principalId!} level={level} />
      )}
      <div className="flex flex-1">
        <div className="flex w-0 min-w-full flex-col p-5 md:py-5">
          <ErrorBoundary>
            <Outlet context={context} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function PrincipalLayout() {
  return <PrincipalLayoutContent />;
}
