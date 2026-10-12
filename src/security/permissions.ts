import {
  PermissionGuard as PackagePermissionGuard,
  withAuthorizationRequired as packageWithAuthorizationRequired,
  usePermissions as usePackagePermissions,
} from '@brainforgeau/security';
import { devPreview } from './dev-preview';

/**
 * The package's permission checks, or (development builds only) the same
 * checks answered for the role this tab is previewing. Chosen once, when the
 * module loads, so hook order never changes between renders.
 */
export const usePermissions: typeof usePackagePermissions = devPreview
  ? devPreview.usePreviewPermissions
  : usePackagePermissions;

export const PermissionGuard: typeof PackagePermissionGuard = devPreview
  ? devPreview.PreviewPermissionGuard
  : PackagePermissionGuard;

export const withAuthorizationRequired: typeof packageWithAuthorizationRequired =
  devPreview
    ? devPreview.previewWithAuthorizationRequired
    : packageWithAuthorizationRequired;
