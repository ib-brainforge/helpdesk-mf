import {
  AccessDenied,
  type PermissionGuard as PackagePermissionGuard,
  type WithAuthorizationRequiredProps,
  type withAuthorizationRequired as packageWithAuthorizationRequired,
  withAuthenticationRequired,
} from '@brainforgeau/security';
import type { ComponentProps, ComponentType, FC } from 'react';
import { usePreviewPermissions } from './usePreviewPermissions';

/**
 * The package's PermissionGuard and withAuthorizationRequired, with the same
 * behaviour, reading `usePreviewPermissions` instead of the package's own
 * `usePermissions`. The package's versions call its hook internally, so they
 * would keep answering as the admin while a role is being previewed.
 */

type PermissionGuardProps = ComponentProps<typeof PackagePermissionGuard>;

export const PreviewPermissionGuard: FC<PermissionGuardProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  requireAllRoles = false,
  fallback = null,
  showFallbackWhileLoading = true,
}) => {
  const {
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    hasAllRoles,
    isLoading,
  } = usePreviewPermissions();

  if (isLoading && showFallbackWhileLoading) return <>{fallback}</>;

  const permissionsOk =
    requiredPermissions.length === 0 ||
    (requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions));
  const rolesOk =
    requiredRoles.length === 0 ||
    (requireAllRoles ? hasAllRoles(requiredRoles) : hasAnyRole(requiredRoles));

  return <>{permissionsOk && rolesOk ? children : fallback}</>;
};

const DefaultUnauthorized: FC = () => <AccessDenied />;

export const previewWithAuthorizationRequired: typeof packageWithAuthorizationRequired =
  <P extends object>(
    Component: ComponentType<P>,
    options: WithAuthorizationRequiredProps = {},
  ) => {
    const {
      requiredRoles,
      requiredPermissions,
      requiredFeatureFlags,
      requireAllRoles = false,
      requireAllPermissions = false,
      UnauthorizedComponent = DefaultUnauthorized,
      ...authOptions
    } = options;

    const Guard: FC<P> = props => {
      const {
        hasAnyRole,
        hasAllRoles,
        hasAnyPermission,
        hasPermission,
        hasFeatureFlag,
        isLoading,
      } = usePreviewPermissions();
      if (isLoading) return null;

      const flagsOk = !requiredFeatureFlags?.length
        ? true
        : requiredFeatureFlags.every(hasFeatureFlag);
      const rolesOk = !requiredRoles?.length
        ? true
        : requireAllRoles
          ? hasAllRoles(requiredRoles)
          : hasAnyRole(requiredRoles);
      const permissionsOk = !requiredPermissions?.length
        ? true
        : requireAllPermissions
          ? requiredPermissions.every(hasPermission)
          : hasAnyPermission(requiredPermissions);

      if (!flagsOk || !rolesOk || !permissionsOk) {
        return <UnauthorizedComponent />;
      }
      return <Component {...props} />;
    };
    Guard.displayName = `withAuthorizationRequired(${
      Component.displayName || Component.name
    })`;
    return withAuthenticationRequired(Guard, authOptions);
  };
