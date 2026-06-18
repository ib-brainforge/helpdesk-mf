/**
 * PageTracker Component
 *
 * Add this to layout components to enable automatic page view tracking.
 */

import { usePageTracking } from './hooks';

interface PageTrackerProps {
  category?: string;
}

/**
 * Component that tracks page views automatically.
 * Add this to layout components to enable page view tracking for all child routes.
 *
 * @example
 * ```tsx
 * function ConfigurationLayout() {
 *   return (
 *     <>
 *       <PageTracker category="configuration" />
 *       <Outlet />
 *     </>
 *   );
 * }
 * ```
 */
export function PageTracker({ category }: PageTrackerProps) {
  usePageTracking({ category });
  return null;
}
