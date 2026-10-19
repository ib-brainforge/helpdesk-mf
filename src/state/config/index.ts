import { type RuntimeConfig, defaultConfig } from '@brainforgeau/security';
import { atom } from 'jotai';

declare const __HELPDESK_CONFIG__: string;

/**
 * Runtime-config contract (infra `docs/runtime-config/README.md`).
 *
 * Every backend URL helpdesk-mf talks to is its OWN explicitly named key.
 * Nothing is derived from anything else: no `new URL(...).origin` sniffing, no
 * `window.location.origin`, no path-relative forcing, no `|| ''` that turns a
 * missing variable into an empty string.
 *
 * `<SERVICE>_API_BASE_URL` (env)  <->  `<service>ApiBaseUrl` (runtime-config key)
 *
 * helpdesk-mf's own backend is NOT special: it reads `helpdeskApiBaseUrl`
 * exactly the way it reads `identityApiBaseUrl` for identity.
 */
// `api` is intentionally Omit-ted from the shared RuntimeConfig. There is no
// generic `api.baseUrl` — "base URL of what" is the ambiguity this contract
// retires. Every backend URL is its own named key below.
export interface AppConfig extends Omit<RuntimeConfig, 'api'> {
  // ── Runtime-config contract: named per-service URLs ──────────────────────
  /** helpdesk-backend. `HELPDESK_API_BASE_URL`. */
  helpdeskApiBaseUrl?: string;
  /** notification-backend. `NOTIFICATION_API_BASE_URL`. */
  notificationApiBaseUrl?: string;
  /** identity-management (AUTH host, not the app host). `IDENTITY_API_BASE_URL`. */
  identityApiBaseUrl?: string;
  /** telemetry-gateway. `TELEMETRY_API_BASE_URL`. */
  telemetryApiBaseUrl?: string;
  /**
   * asset-backend, for the vehicle picker on a new request and a ticket's
   * linked assets. `ASSET_API_BASE_URL`. The shell already publishes this key
   * for the Asset app, so deployed helpdesk reads the same value.
   */
  assetApiBaseUrl?: string;
  /**
   * tracking-backend, to show whether an asset exists in Tracking.
   * `TRACKING_API_BASE_URL`. Published by the shell, like assetApiBaseUrl.
   */
  trackingApiBaseUrl?: string;
  /** notification-backend's bell hub. `NOTIFICATION_SIGNALR_HUB_URL`. */
  notificationSignalRHubUrl?: string;

  hideAppSwitcher?: boolean;
  hideContextSwitcher?: boolean;
  version?: string;
  packageVersions?: Record<string, string>;
  observability?: {
    enabled: boolean;
    tracing: { enabled: boolean; ignoreUrlsPattern?: string };
    metrics: { enabled: boolean; webVitals: boolean };
  };
  [key: string]: any;
}

let _cachedConfig: AppConfig | null = null;

/** Parses helpdesk-mf's own baked build-time config (`__HELPDESK_CONFIG__`). */
function getBakedConfig(): AppConfig | null {
  if (typeof __HELPDESK_CONFIG__ === 'undefined') return null;
  try {
    return JSON.parse(__HELPDESK_CONFIG__) as AppConfig;
  } catch (error) {
    console.error('Failed to parse __HELPDESK_CONFIG__:', error);
    return null;
  }
}

/**
 * The two config mechanisms, and why the order is `rc ?? baked`:
 *
 * - DEPLOYED (dev cluster, prod): `app.yaml` env -> the shell's
 *   `generate-config.sh` -> `window.__RUNTIME_CONFIG__`. rc ALWAYS exists.
 *   Every app is now shell + module federation, so `/helpdesk` is served by the
 *   SHELL's pod: helpdesk-mf's OWN `generate-config.sh` never runs in a browser
 *   and every browser-facing env var in `helpdesk-mf.yaml` is dead. The shell's
 *   rc is the only browser-facing config there is.
 * - LOCAL (`modern dev`): `.env` -> `modern.config.ts` `globalVars` -> baked
 *   `__HELPDESK_CONFIG__`. There is no committed `public/config.js`, so rc is
 *   UNDEFINED and `.env` is authoritative.
 *
 * They never overlap, so rc wins when deployed and baked wins locally.
 */
function resolveNamedUrl(
  rc: Record<string, any> | undefined,
  baked: AppConfig | null,
  key: keyof AppConfig & string,
  envVar: string,
): string | undefined {
  const value =
    (rc?.[key] as string | undefined) ?? (baked?.[key] as string | undefined);
  if (!value) {
    // Stage 1 of failing loudly: name the exact variable and the app that needs
    // it. NEVER substitute '' — that is what made every missing URL invisible.
    //
    // This must NOT throw. getAppConfig() runs at import time (the configAtom
    // initializer, observability/config.ts's top-level call), and throwing at
    // module load takes down the WHOLE SHELL — every app embedded in it —
    // because one remote lacks one variable. identity-mf hit exactly this.
    // Stage 2 (the throw) belongs at API-client construction, where the failure
    // is actionable and localised to the feature that needs the service.
    console.error(
      `helpdesk-mf: ${envVar} is not configured. Set it on app.yaml (embedded, ` +
        `the only browser-facing config) or in helpdesk-mf's .env (local dev). ` +
        `Calls to this service will fail.`,
    );
    return undefined;
  }
  return value;
}

export function getAppConfig(): AppConfig {
  if (_cachedConfig) return _cachedConfig;

  const rc =
    typeof window !== 'undefined'
      ? ((window as any).__RUNTIME_CONFIG__ as Record<string, any> | undefined)
      : undefined;
  const baked = getBakedConfig();

  // Platform-level keys (oidc, branding, environment, version...) genuinely
  // describe the shared tenant/platform, so the deployed shell's rc is the best
  // source when it has one. Locally rc is absent and the baked `.env` config is.
  //
  // `api` is stripped off here and never carried forward. When embedded, the
  // spread source is the shell's rc, whose `api.baseUrl` is the SHELL's own
  // backend root (`/backend`) — not helpdesk's backend. Dropping it guarantees
  // nothing downstream can read a wrong-service base URL off `config.api`. Every
  // service helpdesk talks to is resolved as its own named key below instead.
  const { api: _discardedHostApi, ...base } = (
    rc?.oidc?.authority ? rc : (baked ?? defaultConfig)
  ) as Record<string, unknown>;

  const helpdeskApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'helpdeskApiBaseUrl',
    'HELPDESK_API_BASE_URL',
  );
  const notificationApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'notificationApiBaseUrl',
    'NOTIFICATION_API_BASE_URL',
  );
  const identityApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'identityApiBaseUrl',
    'IDENTITY_API_BASE_URL',
  );
  const telemetryApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'telemetryApiBaseUrl',
    'TELEMETRY_API_BASE_URL',
  );
  const assetApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'assetApiBaseUrl',
    'ASSET_API_BASE_URL',
  );
  const trackingApiBaseUrl = resolveNamedUrl(
    rc,
    baked,
    'trackingApiBaseUrl',
    'TRACKING_API_BASE_URL',
  );
  const notificationSignalRHubUrl = resolveNamedUrl(
    rc,
    baked,
    'notificationSignalRHubUrl',
    'NOTIFICATION_SIGNALR_HUB_URL',
  );

  _cachedConfig = {
    ...base,

    helpdeskApiBaseUrl,
    notificationApiBaseUrl,
    identityApiBaseUrl,
    telemetryApiBaseUrl,
    assetApiBaseUrl,
    trackingApiBaseUrl,
    notificationSignalRHubUrl,
  } as AppConfig;

  return _cachedConfig;
}

/**
 * Stage 2 of failing loudly: throw at the point a client is constructed for a
 * service whose URL was never configured. Localised to the feature that needs
 * the service — never at module load, which would crash the whole shell.
 */
function requireUrl(
  value: string | undefined,
  envVar: string,
  service: string,
): string {
  if (!value) {
    throw new Error(
      `helpdesk-mf: ${envVar} is not configured; cannot call ${service}. ` +
        `Set it on app.yaml (embedded) or in helpdesk-mf's .env (local dev).`,
    );
  }
  return value;
}

export const requireHelpdeskApiBaseUrl = (): string =>
  requireUrl(
    getAppConfig().helpdeskApiBaseUrl,
    'HELPDESK_API_BASE_URL',
    'helpdesk-backend',
  );

export const requireIdentityApiBaseUrl = (): string =>
  requireUrl(
    getAppConfig().identityApiBaseUrl,
    'IDENTITY_API_BASE_URL',
    'identity-management',
  );

export const requireAssetApiBaseUrl = (): string =>
  requireUrl(
    getAppConfig().assetApiBaseUrl,
    'ASSET_API_BASE_URL',
    'asset-backend',
  );

export const requireTrackingApiBaseUrl = (): string =>
  requireUrl(
    getAppConfig().trackingApiBaseUrl,
    'TRACKING_API_BASE_URL',
    'tracking-backend',
  );

export const requireNotificationSignalRHubUrl = (): string =>
  requireUrl(
    getAppConfig().notificationSignalRHubUrl,
    'NOTIFICATION_SIGNALR_HUB_URL',
    "notification-backend's bell hub",
  );

/**
 * helpdesk-backend's OWN SignalR hub (tickets + comments).
 *
 * TWO HUBS, TWO SERVICES. The old single `SIGNALR_HUB_URL` was pointed at
 * helpdesk's own hub (`/backend/helpdesk/hubs/helpdesk`) and then ALSO handed to
 * the navbar as `notificationHubUrl` — so the notification bell was subscribing
 * to helpdesk-backend's ticket hub instead of notification-backend's bell hub.
 * The bell now reads `notificationSignalRHubUrl` (its own key, published by the
 * shell); the ticket hub is resolved here.
 *
 * The shell publishes `notificationSignalRHubUrl` and `trackingSignalRHubUrl`
 * but NOT a helpdesk hub key, so this joins helpdesk-backend's OWN base
 * (`helpdeskApiBaseUrl`) to the hub path that helpdesk-backend itself maps
 * (`app.MapHub<HelpdeskHub>("/hubs/helpdesk")` in Helpdesk.Api/Program.cs).
 * That is a path join WITHIN one service — the hub is served by the very
 * backend whose base URL this is — not a derivation of one service's URL from
 * another's, and not origin-sniffing: no `new URL`, no `.origin`, no
 * `window.location`. It reproduces exactly today's
 * `/backend/helpdesk/hubs/helpdesk`, now absolute and explicitly named.
 */
export const requireHelpdeskHubUrl = (hubPath: string): string =>
  `${requireHelpdeskApiBaseUrl().replace(/\/+$/, '')}${hubPath}`;

export const configAtom = atom<AppConfig>(getAppConfig());
export const hubConnectedAtom = atom<boolean>(false);
