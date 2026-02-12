/**
 * Helpdesk MF Observability
 *
 * This folder contains all observability setup for the helpdesk-mf application.
 *
 * Usage:
 *
 * 1. Wrap your app with ObservabilityProvider (already done in providers/index.tsx)
 *
 * 2. Add PageTracker to layouts for automatic page view tracking:
 *    import { PageTracker } from '@/observability';
 *    <PageTracker category="settings" />
 *
 * 3. Use useActionTracking for user action tracking:
 *    import { useActionTracking } from '@/observability';
 *    const { trackAction, trackError } = useActionTracking('feature-name');
 *
 * 4. Use logger for non-React contexts:
 *    import { logger } from '@/observability';
 *    logger.info('Something happened');
 *
 * 5. Use hooks from @brainforgeau/observability in components:
 *    import { useLogger, useTracker, useMetrics } from '@brainforgeau/observability';
 */

// Provider
export { ObservabilityProvider } from './ObservabilityProvider';

// Config
export { observabilityConfig, parseHelpdeskConfig, type HelpdeskConfig } from './config';

// Hooks
export { usePageTracking, useActionTracking, type UserActionType } from './hooks';

// Components
export { PageTracker } from './PageTracker';

// Singleton logger for non-React contexts
export { logger } from './logger';
