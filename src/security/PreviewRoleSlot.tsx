import type { FC } from 'react';
import { devPreview } from './dev-preview';

/**
 * Where the layout places the "Preview as role" banner and picker. Renders
 * nothing at all in a production build, where `devPreview` is null.
 */
export const PreviewRoleSlot: FC = () => {
  if (!devPreview) return null;
  const { PreviewRoleBanner } = devPreview;
  return <PreviewRoleBanner />;
};
