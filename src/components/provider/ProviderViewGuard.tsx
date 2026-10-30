import { requireIdentityApiBaseUrl } from '@/state/config';
import { TENANT_VIEW_HOME } from '@/views';
import {
  AccessDenied,
  ViewGuard,
  usePermissions,
} from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';
import { type FC, type ReactNode, useMemo } from 'react';

interface ProviderViewGuardProps {
  /** Any one of these opens the page, checked once the view check has passed. */
  requiredPermissions?: string[];
  children: ReactNode;
}

/**
 * Wraps every page of the Provider view.
 *
 *  - Not holding the view at all (no `P` entry in the context token's `pos`
 *    claim): the standard access-denied message.
 *  - Holding it, but working in another tenant: the "View needs another
 *    context" page, which only switches when the person chooses to. A deep
 *    link behaves the same way.
 *  - In the provider's office: the page, provided the person holds the page's
 *    permission. That check sits here, after the view check, because the
 *    permissions in a tenant's context token say nothing about the office.
 */
export const ProviderViewGuard: FC<ProviderViewGuardProps> = ({
  requiredPermissions,
  children,
}) => {
  const navigate = useNavigate();
  const { hasAnyPermission, isLoading } = usePermissions();
  const contextOptions = useMemo(
    () => ({
      identityBaseUrl: requireIdentityApiBaseUrl(),
      app: 'helpdesk',
      appName: 'Helpdesk',
    }),
    [],
  );

  const permitted =
    !requiredPermissions || hasAnyPermission(requiredPermissions);

  return (
    <ViewGuard
      view="provider"
      contextOptions={contextOptions}
      // The guard re-renders its children in place once the context has
      // switched, so the page the person asked for opens as it is.
      onSwitched={() => undefined}
      onStay={() => navigate(TENANT_VIEW_HOME)}
    >
      {isLoading ? null : permitted ? (
        children
      ) : (
        <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
          <AccessDenied
            title="You don't have access to this page"
            message="Your role doesn't include the permission this page needs. Ask a Helpdesk admin if you think you should have it."
          />
        </div>
      )}
    </ViewGuard>
  );
};
