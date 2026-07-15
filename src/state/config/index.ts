import { type RuntimeConfig, defaultConfig } from '@brainforgeau/security';
import { atom } from 'jotai';

declare const __HELPDESK_CONFIG__: string;

export interface AppConfig extends RuntimeConfig {
  identityBaseUrl?: string;
  hideAppSwitcher?: boolean;
  hideContextSwitcher?: boolean;
  version?: string;
  packageVersions?: Record<string, string>;
  api: RuntimeConfig['api'] & {
    signalRHubUrl?: string;
  };
  observability?: {
    enabled: boolean;
    /**
     * Telemetry gateway base URL (v2). The SDK appends
     * /v1/{sessions,logs,traces}. Empty string => derive from `api.baseUrl`
     * origin + /backend/telemetry at runtime.
     */
    telemetryGatewayUrl?: string;
    tracing: { enabled: boolean; ignoreUrlsPattern?: string };
    metrics: { enabled: boolean; webVitals: boolean };
  };
  [key: string]: any;
}

let _cachedConfig: AppConfig | null = null;

/** Parses helpdesk-mf's own baked build-time config (`__HELPDESK_CONFIG__`), if present. */
function getBakedConfig(): AppConfig | null {
  if (typeof __HELPDESK_CONFIG__ === 'undefined') return null;
  try {
    return JSON.parse(__HELPDESK_CONFIG__) as AppConfig;
  } catch (error) {
    console.error('Failed to parse __HELPDESK_CONFIG__:', error);
    return null;
  }
}

export function getAppConfig(): AppConfig {
  if (_cachedConfig) return _cachedConfig;

  // pilot(shell-host): when embedded in the app shell, resolve config HERE,
  // independent of window.__RUNTIME_CONFIG__ presence. Two facts drive this:
  //
  //  1. The host's runtime config (when present) belongs to the SHELL (app),
  //     not helpdesk-mf — its `api.baseUrl` points at the shell's OWN
  //     backend, so adopting it verbatim would break every helpdesk-backend
  //     API call (a nested remote must never trust the host's api.baseUrl
  //     for ITS OWN backend calls). Platform-level keys (oidc,
  //     identityBaseUrl, branding, etc.) genuinely describe the shared
  //     tenant/platform and ARE safe to adopt.
  //  2. In the DEV shell there is NO runtime config at all (config.js 404s,
  //     window.__RUNTIME_CONFIG__ is undefined). An embedded override nested
  //     inside an `if (window.__RUNTIME_CONFIG__)` branch therefore never
  //     ran in dev — the baked standalone config won wholesale, and its
  //     ABSOLUTE cloud api.baseUrl made every helpdesk-backend call
  //     cross-origin from localhost → CORS → "AxiosError: Network Error".
  //     That is why this check is hoisted ABOVE all rc/baked branching.
  //
  // Base object: host runtime config when valid (deployed shell), else the
  // baked config, else defaultConfig — platform keys come from the best
  // available source. `api` is always rebuilt from the BAKED api block
  // (notificationUrl etc.) with `baseUrl` forced to the path-relative
  // `/backend/helpdesk` ingress route — same-origin through the shell's
  // dev-server proxy AND the shell's nginx/ingress in prod (mirrors
  // onboard-mf's `DEFAULT_API_BASE_URL = '/backend/onboard'` precedent).
  if (
    typeof window !== 'undefined' &&
    (window as any).__BF_SHELL_HOST__ === true
  ) {
    const rc = (window as any).__RUNTIME_CONFIG__; // may be undefined (dev shell)
    const baked = getBakedConfig();
    const base = rc?.oidc?.authority ? rc : (baked ?? defaultConfig);
    _cachedConfig = {
      ...base,
      api: {
        ...(baked?.api ?? {}),
        baseUrl: '/backend/helpdesk',
      },
    } as AppConfig;
    return _cachedConfig;
  }

  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    const rc = (window as any).__RUNTIME_CONFIG__;
    if (rc.oidc?.authority) {
      _cachedConfig = rc as AppConfig;
      return _cachedConfig;
    }
  }

  const baked = getBakedConfig();
  if (baked) {
    _cachedConfig = baked;
    return _cachedConfig;
  }

  _cachedConfig = defaultConfig as AppConfig;
  return _cachedConfig;
}

export const configAtom = atom<AppConfig>(getAppConfig());
export const hubConnectedAtom = atom<boolean>(false);
