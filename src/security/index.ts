/**
 * The app's single entry to `@brainforgeau/security`.
 *
 * Everything the package exports is re-exported unchanged, except the
 * permission checks: `usePermissions`, `PermissionGuard` and
 * `withAuthorizationRequired`. In a production build those ARE the package's
 * own (see ./dev-preview.ts, which is null there). In a development build
 * they also honour the per-tab "Preview as role" switch, so every menu,
 * button, page guard, `useHelpdeskAccess` and `canX` check answers as the
 * previewed role, including for an elevated account whose checks the package
 * would otherwise bypass.
 *
 * Import from '@/security', never from '@brainforgeau/security' directly
 * (Biome enforces it). A direct import would quietly skip the preview.
 */
export * from '@brainforgeau/security';
export {
  PermissionGuard,
  usePermissions,
  withAuthorizationRequired,
} from './permissions';
export { PreviewRoleSlot } from './PreviewRoleSlot';
