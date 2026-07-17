/**
 * Helpdesk MF Observability Configuration
 *
 * Builds the observability configuration for this microfrontend against the
 * v2 telemetry-gateway (`@brainforgeau/observability` >= 2.1).
 *
 * Logs, traces and the session mint all flow through the telemetry-gateway:
 *   - POST <base>/v1/sessions  — mints an HMAC session token
 *                                (needs Keycloak bearer + BrainForge context token)
 *   - POST <base>/v1/logs      — ships log lines     (carries X-Telemetry-Session)
 *   - POST <base>/v1/traces    — ships OTLP spans     (carries X-Telemetry-Session)
 *
 * The SDK manages the `X-Telemetry-Session` header itself; the host app only
 * supplies credentials via `getCredentials`.
 *
 * Tenant-switch invalidation: the context fields (tenantId etc.) must be
 * threaded in as *resolved string values*, not getter functions — the provider
 * re-mints the session token only when those values change. See
 * `ObservabilityProvider.tsx`, which subscribes to the security context atom
 * and rebuilds the config per-render via `buildObservabilityConfig`.
 *
 * Helpdesk supports cross-tenant platform-support staff. The context token is
 * still scoped to the *currently selected* tenant / organization / division, so
 * threading the selected-context string values (and re-minting on switch) keeps
 * telemetry correctly attributed even as a support agent moves between tenants.
 */

import { getAppConfig } from '@/state/config';
import type { ObservabilityConfig } from '@brainforgeau/observability';
import { getAccessToken, getAuthState } from '@brainforgeau/security';

const appConfig = getAppConfig();

/**
 * Context fields threaded into the observability config. Resolved string
 * values (never getter functions) so the provider can detect a tenant switch.
 */
export interface ObservabilityContextValues {
  userId?: string;
  userFullName?: string;
  tenantId?: string;
  tenantName?: string;
  organizationId?: string;
  divisionId?: string;
}

/**
 * The telemetry-gateway base URL is READ, never derived.
 *
 * It used to be derived as `new URL(appConfig.api.baseUrl).origin +
 * '/backend/telemetry'`. When embedded, `api.baseUrl` was forced to the
 * relative `/backend/helpdesk`, so `new URL` threw, a bare `catch` swallowed
 * it, the base came back undefined, `endpoints` became undefined and the SDK
 * silently ran with no destination. That is why helpdesk has shipped zero
 * logs, traces, metrics and sessions.
 *
 * `telemetryApiBaseUrl` is its own named key, published by the shell
 * (`TELEMETRY_API_BASE_URL`), resolved `rc ?? baked` in src/state/config, which
 * console.errors by name when it is missing. There is nothing left to throw and
 * nothing left to swallow.
 */
const telemetryGatewayBase = appConfig?.telemetryApiBaseUrl?.replace(
  /\/+$/,
  '',
);

/**
 * Telemetry-gateway endpoints (v2). Undefined when no base URL can be
 * resolved — the provider then runs without session-backed telemetry.
 */
const endpoints = telemetryGatewayBase
  ? {
      sessions: `${telemetryGatewayBase}/v1/sessions`,
      logs: `${telemetryGatewayBase}/v1/logs`,
      traces: `${telemetryGatewayBase}/v1/traces`,
    }
  : undefined;

/**
 * Credentials callback invoked by the SDK whenever it needs to mint (or
 * re-mint) a telemetry session token.
 *
 * - `bearer`       — the current Keycloak access token.
 * - `contextToken` — the BrainForge context token for the active tenant /
 *   organization / division, exposed by `@brainforgeau/security` on
 *   `getAuthState().contextToken`.
 *
 * Read fresh on every mint so a re-mint after a tenant switch picks up the
 * new tenant's context token.
 */
const getCredentials = async (): Promise<{
  bearer: string;
  contextToken: string;
}> => {
  const bearer = await getAccessToken();
  let contextToken = '';
  try {
    contextToken = getAuthState().contextToken ?? '';
  } catch {
    contextToken = '';
  }
  return { bearer: bearer ?? '', contextToken };
};

/**
 * Build the observability configuration for helpdesk-mf.
 *
 * Context fields are accepted as arguments so the local `ObservabilityProvider`
 * can rebuild the config reactively from the security context atom — passing
 * *resolved string values* (not getter functions) lets the provider detect a
 * tenant switch and re-mint the telemetry session token.
 */
export function buildObservabilityConfig(
  context?: ObservabilityContextValues,
): ObservabilityConfig {
  return {
    app: 'helpdesk-mf',
    env: appConfig?.environment || 'development',
    version: appConfig?.version || 'unknown',
    packageVersions: appConfig?.packageVersions,
    enabled: appConfig?.observability?.enabled ?? false,
    debug: appConfig?.environment === 'development',

    // v2 telemetry-gateway endpoints (sessions / logs / traces).
    endpoints,

    // v2: SDK calls this to mint a session token. Keycloak bearer + BrainForge
    // context token are read fresh on every mint.
    getCredentials: endpoints ? getCredentials : undefined,

    // Tracing through the gateway. `endpoints.traces` supersedes the old
    // BFF `tracing.endpoint`; the SDK injects `X-Telemetry-Session` itself.
    tracing: appConfig?.observability?.tracing?.enabled
      ? {
          enabled: true,
          serviceName: 'helpdesk-mf',
          // Exclude URLs matching this pattern from trace header propagation to
          // avoid CORS issues (e.g. "auth\\.brainforge\\.com\\.au").
          ignoreUrls: appConfig.observability.tracing.ignoreUrlsPattern
            ? [new RegExp(appConfig.observability.tracing.ignoreUrlsPattern)]
            : [],
        }
      : undefined,

    // Metrics - logged to Loki as structured data via the gateway.
    metrics: {
      enabled: appConfig?.observability?.metrics?.enabled ?? false,
      webVitals: appConfig?.observability?.metrics?.webVitals ?? true,
    },

    // Context fields - resolved string values threaded in reactively by the
    // local ObservabilityProvider so tenant switches trigger a session re-mint.
    userId: context?.userId,
    userFullName: context?.userFullName,
    tenantId: context?.tenantId,
    tenantName: context?.tenantName,
    organizationId: context?.organizationId,
    divisionId: context?.divisionId,
  };
}

/**
 * Default observability configuration (no context threaded in).
 *
 * Used by non-React consumers such as the singleton `logger`. React code goes
 * through the local `ObservabilityProvider`, which calls
 * `buildObservabilityConfig` with live context values on every render.
 */
export const observabilityConfig: ObservabilityConfig =
  buildObservabilityConfig();
