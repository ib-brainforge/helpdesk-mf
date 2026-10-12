import {
  type AppPermission,
  filterGuardedItems,
  usePermissions as usePackagePermissions,
} from '@brainforgeau/security';
import { useMemo, useSyncExternalStore } from 'react';
import {
  type PreviewRole,
  getPreviewSnapshot,
  subscribePreview,
} from './store';

type Permissions = ReturnType<typeof usePackagePermissions>;

/** The tab's preview, resolved against the loaded role list. */
export const usePreviewState = () => {
  const snapshot = useSyncExternalStore(subscribePreview, getPreviewSnapshot);
  const role: PreviewRole | undefined = snapshot.roleKey
    ? snapshot.roles.find(r => r.key === snapshot.roleKey)
    : undefined;
  return { ...snapshot, role };
};

/**
 * The package's checks, answered as `role` would answer them.
 *
 * Every check the package bypasses for elevated users is redefined here with
 * no bypass at all: while previewing, `hasElevatedAccess` and its read, write
 * and scopes variants are false, so the "User has elevated access" short
 * circuit never applies. Licences, features and feature flags are tenant-level
 * and are not role-based, so they keep the real answers.
 */
const previewChecks = (
  role: PreviewRole,
  hasLicensedApp: Permissions['hasLicensedApp'],
  hasFeatureFlag: Permissions['hasFeatureFlag'],
) => {
  const roles = [role.key];
  // As the package does: role strings count as permissions too.
  const permissions = [...role.permissions, ...roles];
  const hasRole = (r: string) => roles.includes(r);
  const hasAnyRole = (rs: string[]) => rs.some(hasRole);
  const hasAllRoles = (rs: string[]) => rs.every(hasRole);
  const hasPermission = (p: string) => permissions.includes(p);
  const hasAnyPermission = (ps: string[]) => ps.some(hasPermission);
  const hasAllPermissions = (ps: string[]) => ps.every(hasPermission);
  const appPermissions: AppPermission[] = [
    {
      app: 'helpdesk',
      role: role.key,
      permissions: role.permissions,
      scopes: {},
    },
  ];
  const getAppPermissions = (appName: string) =>
    appPermissions.find(a => a.app === appName);
  const hasAppPermission = (appName: string, permission: string) =>
    getAppPermissions(appName)?.permissions.includes(permission) ?? false;

  return {
    roles,
    permissions,
    appPermissions,
    hasElevatedAccess: false,
    hasElevatedReadAccess: false,
    hasElevatedWriteAccess: false,
    hasScopesAccess: false,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasStrictRole: hasRole,
    hasAnyStrictRole: hasAnyRole,
    getAppPermissions,
    getAppRole: (appName: string) => getAppPermissions(appName)?.role,
    hasAppPermission,
    hasAnyAppPermission: (appName: string, ps: string[]) =>
      ps.some(p => hasAppPermission(appName, p)),
    hasAllAppPermissions: (appName: string, ps: string[]) =>
      ps.every(p => hasAppPermission(appName, p)),
    hasAppRole: (appName: string, r: string) =>
      getAppPermissions(appName)?.role === r,
    hasPlatformPermission: () => false,
    filterNavItems: ((items: Parameters<Permissions['filterNavItems']>[0]) =>
      filterGuardedItems(items, {
        hasElevatedAccess: false,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasAnyPermission,
        hasStrictRole: hasRole,
        hasLicensedApp,
        hasFeatureFlag,
      })) as Permissions['filterNavItems'],
  } satisfies Partial<Permissions>;
};

/**
 * `usePermissions` for development builds: the package's answer, or the
 * previewed role's answer while this tab is previewing one.
 *
 * Nothing about the session changes. The tokens, the requests and what the
 * server returns are exactly the admin's; only what the screens decide to
 * show is answered for the role.
 */
export const usePreviewPermissions = (): Permissions => {
  const real = usePackagePermissions();
  const { roleKey, rolesStatus, role } = usePreviewState();

  // Stable per role, so hooks that list these checks as dependencies (such as
  // useHelpdeskAccess) do not recompute on every render.
  const { hasLicensedApp, hasFeatureFlag } = real;
  const overrides = useMemo(
    () => (role ? previewChecks(role, hasLicensedApp, hasFeatureFlag) : null),
    [role, hasLicensedApp, hasFeatureFlag],
  );

  if (!roleKey) return real;
  // Asked to preview but the role list is still on its way: report loading,
  // so guards render nothing rather than briefly showing the admin's view or
  // redirecting away from a page the role can see.
  if (rolesStatus === 'idle' || rolesStatus === 'loading') {
    return { ...real, isLoading: true };
  }
  // An unknown role, or the list failed to load: nothing to apply. The banner
  // says so, so the admin view is never mistaken for the preview.
  if (!overrides) return real;
  return { ...real, ...overrides };
};
