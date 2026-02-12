/**
 * Helpdesk MF Observability Hooks
 *
 * Page tracking and action tracking hooks for observability.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from '@modern-js/runtime/router';
import { useTracker, useLogger, useMetrics } from '@brainforgeau/observability';

/**
 * Hook that automatically tracks page views when the route changes.
 * Should be used in a layout component that wraps all pages.
 *
 * @param options.category - Category for the page (e.g., 'helpdesk', 'settings')
 */
export function usePageTracking(options?: { category?: string }) {
  const location = useLocation();
  const tracker = useTracker();
  const logger = useLogger('PageTracking');
  const metrics = useMetrics();
  const previousPathRef = useRef<string | null>(null);
  const pageLoadTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const currentPath = location.pathname;

    // Skip if same path (e.g., query string changes)
    if (previousPathRef.current === currentPath) {
      return;
    }

    // Calculate time spent on previous page
    if (previousPathRef.current !== null) {
      const timeSpent = Date.now() - pageLoadTimeRef.current;
      metrics.histogram('page_time_spent_ms', timeSpent, {
        path: previousPathRef.current,
        category: options?.category || 'unknown',
      });
      logger.debug('Page time tracked', {
        path: previousPathRef.current,
        timeSpentMs: timeSpent,
      });
    }

    // Track the page view
    tracker.trackPageView({
      path: currentPath,
      title: document.title,
      referrer: previousPathRef.current || document.referrer,
      query: Object.fromEntries(new URLSearchParams(location.search)),
    });

    logger.info('Page view', {
      path: currentPath,
      category: options?.category,
      referrer: previousPathRef.current,
    });

    // Increment page view counter
    metrics.increment('page_views', 1, {
      path: currentPath,
      category: options?.category || 'unknown',
    });

    // Update refs for next navigation
    previousPathRef.current = currentPath;
    pageLoadTimeRef.current = Date.now();
  }, [location.pathname, location.search, tracker, logger, metrics, options?.category]);
}

export type UserActionType =
  | 'click'
  | 'submit'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'search'
  | 'filter'
  | 'export'
  | 'navigate'
  | 'custom';

/**
 * Hook to track user actions within a component.
 * Returns a function to track specific actions.
 *
 * @param category - The feature category (e.g., 'settings', 'configuration')
 */
export function useActionTracking(category: string) {
  const tracker = useTracker();
  const logger = useLogger(`ActionTracking:${category}`);
  const metrics = useMetrics();

  return {
    /**
     * Track a user action
     */
    trackAction: (
      action: UserActionType,
      label: string,
      metadata?: Record<string, unknown>
    ) => {
      tracker.trackAction({
        action,
        category,
        label,
        metadata,
      });

      logger.info(`User action: ${action}`, {
        label,
        ...metadata,
      });

      metrics.increment('user_actions', 1, {
        category,
        action,
        label,
      });
    },

    /**
     * Track an error that occurred during user interaction
     */
    trackError: (error: Error, action?: string, metadata?: Record<string, unknown>) => {
      tracker.trackError(error, {
        category,
        action,
        metadata,
      });

      logger.error(`Error during ${action || 'unknown action'}`, {
        errorName: error.name,
        errorMessage: error.message,
        ...metadata,
      });

      metrics.increment('user_errors', 1, {
        category,
        action: action || 'unknown',
        errorName: error.name,
      });
    },
  };
}
