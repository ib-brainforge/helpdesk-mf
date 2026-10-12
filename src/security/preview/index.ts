/**
 * "Preview as role", DEVELOPMENT ONLY.
 *
 * Do not import this module directly. It is loaded in exactly one place,
 * src/security/dev-preview.ts, behind `process.env.NODE_ENV === 'development'`,
 * which is what keeps it out of production builds.
 */
export { PreviewRoleBanner } from './PreviewRoleBanner';
export {
  PreviewPermissionGuard,
  previewWithAuthorizationRequired,
} from './guards';
export { usePreviewPermissions } from './usePreviewPermissions';
