/**
 * Singleton Logger for Non-React Contexts
 *
 * Use this for logging outside of React components.
 * For React components, prefer useLogger() hook.
 */

import { createLogger } from '@brainforgeau/observability';
import { observabilityConfig } from './config';

export const logger = createLogger(observabilityConfig);
