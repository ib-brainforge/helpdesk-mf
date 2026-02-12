/**
 * Helpdesk MF Observability Configuration
 *
 * Parses the build-time config from globalVars and creates
 * the observability configuration for this microfrontend.
 *
 * URLs are configured in modern.config.ts - either direct endpoints or BFF proxy URLs.
 * When using BFF proxies, credentials are handled server-side.
 *
 * Context fields (userId, tenantId, organizationId, divisionId) are populated
 * from the security atoms using lazy-evaluated functions.
 */

import type { ObservabilityConfig, LokiConfig, TracingConfig } from '@brainforgeau/observability';
import { getAuthState, getAccessToken } from '@brainforgeau/security';

// Extended config types with headers support
// TODO: Remove after @brainforgeau/observability is updated with headers support
interface LokiConfigWithHeaders extends LokiConfig {
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
}

interface TracingConfigWithHeaders extends TracingConfig {
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
}

/**
 * Get authorization headers for BFF proxy requests
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

// Access build-time config from globalVars defined in modern.config.ts
// Note: __HELPDESK_CONFIG__ is JSON.stringify'd in modern.config.ts, so it's a string
declare const __HELPDESK_CONFIG__: string | undefined;

export interface HelpdeskConfig {
  oidc: { authority: string; client_id: string; redirect_uri: string; scope: string };
  api: { baseUrl: string };
  version: string;
  packageVersions: Record<string, string>;
  observability: {
    enabled: boolean;
    loki: { url: string };
    tracing: { enabled: boolean; endpoint: string; ignoreUrlsPattern?: string };
    metrics: { enabled: boolean; webVitals: boolean };
  };
  environment: string;
}

/**
 * Parse the stringified app config from globalVars
 */
export function parseHelpdeskConfig(): HelpdeskConfig | null {
  if (typeof __HELPDESK_CONFIG__ === 'undefined') {
    return null;
  }
  try {
    return JSON.parse(__HELPDESK_CONFIG__) as HelpdeskConfig;
  } catch {
    console.error('[helpdesk-mf] Failed to parse __HELPDESK_CONFIG__');
    return null;
  }
}

// Parse config once at module load
const helpdeskConfig = parseHelpdeskConfig();

/**
 * Lazy getter for userId from the auth user's profile (JWT sub claim)
 */
const getUserId = (): string | undefined => {
  try {
    const user = getAuthState().user;
    return user?.profile?.sub;
  } catch {
    return undefined;
  }
};

/**
 * Lazy getter for user's full name from the auth user's profile (JWT name claim)
 */
const getUserFullName = (): string | undefined => {
  try {
    const user = getAuthState().user;
    return user?.profile?.name;
  } catch {
    return undefined;
  }
};

/**
 * Lazy getter for tenantId from the selected context
 */
const getTenantId = (): string | undefined => {
  try {
    const context = getAuthState().selectedContext;
    return context?.tenantId ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Lazy getter for tenant name from the selected context
 */
const getTenantName = (): string | undefined => {
  try {
    const context = getAuthState().selectedContext;
    return context?.tenantName ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Lazy getter for organizationId from the selected context
 */
const getOrganizationId = (): string | undefined => {
  try {
    const context = getAuthState().selectedContext;
    return context?.organisationId ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Lazy getter for divisionId from the selected context
 */
const getDivisionId = (): string | undefined => {
  try {
    const context = getAuthState().selectedContext;
    return context?.divisionId ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Observability configuration for helpdesk-mf
 *
 * - Logs go to Loki (via BFF proxy at /edge/logs)
 * - Traces go to Tempo (via BFF proxy at /edge/traces)
 * - Metrics are logged to Loki as structured data (no separate Prometheus push)
 * - Context fields are lazily evaluated from security atoms
 */
export const observabilityConfig: ObservabilityConfig = {
  app: 'helpdesk-mf',
  env: helpdeskConfig?.environment || 'development',
  version: helpdeskConfig?.version || 'unknown',
  packageVersions: helpdeskConfig?.packageVersions,
  enabled: helpdeskConfig?.observability?.enabled ?? false,
  debug: helpdeskConfig?.environment === 'development',

  // Loki logging - URL from config (BFF proxy)
  // Authentication is required for the BFF proxy endpoints
  loki: helpdeskConfig?.observability?.loki?.url
    ? {
      url: helpdeskConfig.observability.loki.url,
      batchSize: 10,
      flushInterval: 5000,
      headers: getAuthHeaders,
    } as LokiConfigWithHeaders
    : undefined,

  // Tracing (Tempo) - endpoint from config (BFF proxy)
  // Authentication is required for the BFF proxy endpoints
  tracing: helpdeskConfig?.observability?.tracing?.enabled
    ? {
      enabled: true,
      endpoint: helpdeskConfig.observability.tracing.endpoint,
      serviceName: 'helpdesk-mf',
      headers: getAuthHeaders,
      // Exclude URLs matching this pattern from trace header propagation to avoid CORS issues
      // Pattern comes from TRACING_IGNORE_URLS_PATTERN env var (e.g., "auth\\.brainforge\\.com\\.au")
      ignoreUrls: helpdeskConfig.observability.tracing.ignoreUrlsPattern
        ? [new RegExp(helpdeskConfig.observability.tracing.ignoreUrlsPattern)]
        : [],
    } as TracingConfigWithHeaders
    : undefined,

  // Metrics - logged to Loki as structured data
  metrics: {
    enabled: helpdeskConfig?.observability?.metrics?.enabled ?? false,
    webVitals: helpdeskConfig?.observability?.metrics?.webVitals ?? true,
  },

  // Context fields - lazily evaluated from security atoms
  // These are called each time a log/metric is created to get the current values
  userId: getUserId,
  userFullName: getUserFullName,
  tenantId: getTenantId,
  tenantName: getTenantName,
  organizationId: getOrganizationId,
  divisionId: getDivisionId,
};
