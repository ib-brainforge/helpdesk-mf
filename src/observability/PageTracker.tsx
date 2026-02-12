/**
 * PageTracker Component
 *
 * Add this to layouts to automatically track page views.
 */

import { usePageTracking } from './hooks';

interface PageTrackerProps {
  category: string;
}

export function PageTracker({ category }: PageTrackerProps) {
  usePageTracking({ category });
  return null;
}
