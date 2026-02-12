import { getSessionId } from '@brainforgeau/observability';

export {
  authorizedAxios,
  createAuthorizedAxios,
  getAccessToken,
  NAVBAR_NOTIFICATION_EVENT,
  CONTEXT_TOKEN_REFRESH_EVENT,
  configureContextTokenRefresh,
  type CreateAuthorizedAxiosOptions,
} from '@brainforgeau/security';

// Re-import to attach interceptor
import { authorizedAxios } from '@brainforgeau/security';

/**
 * Generates a unique request ID (UUID v4) for each HTTP request.
 * Used for correlating logs, tracking request flow, and debugging.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Add observability headers interceptor
// - X-Session-Id: Persists across requests in a browser session (from sessionStorage)
// - request-id: Unique UUID for each HTTP request (for distributed tracing)
authorizedAxios.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['X-Session-Id'] = getSessionId();
  config.headers['request-id'] = generateRequestId();
  return config;
});
