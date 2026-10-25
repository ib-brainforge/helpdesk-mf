import { requireIdentityApiBaseUrl } from '@/state/config';
import { getSessionId } from '@brainforgeau/observability';
import {
  createCrossAppAxios,
  getAccessToken,
  parseAppPermissions,
  authorizedAxios as sharedAuthorizedAxios,
} from '@brainforgeau/security';
import axios, { type AxiosInstance } from 'axios';

export type { AxiosInstance, AxiosRequestConfig } from 'axios';

export {
  createAuthorizedAxios,
  getAccessToken,
  getContextToken,
  NAVBAR_NOTIFICATION_EVENT,
  CONTEXT_TOKEN_REFRESH_EVENT,
  configureContextTokenRefresh,
  type CreateAuthorizedAxiosOptions,
} from '@brainforgeau/security';

const HELPDESK_APP_ID = 'helpdesk';
const SHARED_CONTEXT_TOKEN_STORAGE_KEY = 'X-Context-Token';

/**
 * Generates a unique request ID (UUID v4) for each HTTP request.
 * Used for correlating logs, tracking request flow, and debugging.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Attaches the observability headers interceptor to a given axios instance.
 * - X-Session-Id: Persists across requests in a browser session (from sessionStorage)
 * - request-id: Unique UUID for each HTTP request (for distributed tracing)
 */
function attachObservabilityHeaders(instance: AxiosInstance): void {
  instance.interceptors.request.use(config => {
    config.headers = config.headers || {};
    config.headers['X-Session-Id'] = getSessionId();
    config.headers['request-id'] = generateRequestId();
    return config;
  });
}

// pilot(shell-host): P2 of the single-app-shell POC — per-app context tokens
// while embedded.
//
// PRIMARY MECHANISM (lives in the shell, not here): the shell runs an
// ActiveAppTokenManager that re-mints the SHARED context token
// (sessionStorage 'X-Context-Token') for whichever app is currently active —
// on /helpdesk routes the shared token's `app` claim is 'helpdesk'. The
// shared `authorizedAxios` singleton attaches that token and already handles
// its refresh, so for the overwhelming majority of calls the shared instance
// is exactly right while embedded.
//
// THIS FILE is the per-request SAFETY NET for the windows where the shared
// token is NOT scoped to this app (the brief re-scope window right after a
// shell-level route change, or future genuine cross-app calls). Decision
// tree, evaluated per facade method call:
//
//   1. FAST PATH (same-app): decode the shared token's app claim
//      (memoized by token string — one base64 decode per token rotation).
//      If it equals 'helpdesk', delegate directly to the shared
//      `authorizedAxios` singleton. No cross-app machinery involved.
//   2. SLOW PATH (claims mismatch): delegate to a lazily-created, memoized
//      `createCrossAppAxios({ contextIssuerBaseUrl, targetApp: 'helpdesk' })`
//      instance (the EXISTING @brainforgeau/security API — 'helpdesk'-scoped
//      token cached under sessionStorage 'bf:cross-app-token:helpdesk',
//      419-refreshing, invalidated on bf:context-token-changed).
//      `contextIssuerBaseUrl` is `getAppConfig().identityApiBaseUrl` —
//      identity-management's own named runtime-config key
//      (`IDENTITY_API_BASE_URL`), already resolved `rc ?? baked` in
//      src/state/config. The old three-way chain (host rc → app config →
//      baked __IDENTITY_BASE_URL__ define) existed only because there was no
//      single key that meant "the identity service": rc and baked were
//      DIFFERENT keys holding different values, so they had to be raced
//      host-first. Under the contract they are the same key resolved in the
//      one place, so the chain collapses. Note identity lives on the AUTH
//      host — it is precisely the URL that cannot be derived from the app
//      origin.
//   3. DEGRADED PATH (slow-path issuance fails, e.g. identity unreachable):
//      fall back to the shared `authorizedAxios` with a single console.warn.
//      A wrong-app-scoped 403 is a recoverable, diagnosable failure; a dead
//      request is not.
//
// Standalone (non-embedded) behavior is untouched: the module exports the
// shared `authorizedAxios` singleton with the observability interceptor
// attached at module load, exactly as before the pilot.
//
// The `window.__BF_SHELL_HOST__` flag is read ONCE, at module evaluation:
// the shell's Document sets it before any remote's module graph is
// evaluated, so there is no ordering hazard in reading it at module scope.
const IS_SHELL_EMBEDDED =
  typeof window !== 'undefined' &&
  (window as unknown as { __BF_SHELL_HOST__?: boolean }).__BF_SHELL_HOST__ ===
    true;

const CROSS_APP_AXIOS_METHODS = [
  'request',
  'get',
  'delete',
  'head',
  'options',
  'post',
  'put',
  'patch',
  'postForm',
  'putForm',
  'patchForm',
] as const;

type CrossAppAxiosMethod = (typeof CROSS_APP_AXIOS_METHODS)[number];

// Memoized shared-token app-claim decode: one JSON/base64 decode per token
// ROTATION, not per request — the shell re-mints the shared token on app
// switches, so the string only changes a handful of times per session.
let memoizedTokenString: string | null = null;
let memoizedTokenApp: string | null = null;

/**
 * Reads the app the SHARED context token is currently scoped to, or null if
 * there is no token / it cannot be decoded. The shell's
 * ActiveAppTokenManager keeps this claim pointed at the active app.
 */
function getSharedContextTokenApp(): string | null {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(SHARED_CONTEXT_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!token) {
    return null;
  }
  if (token === memoizedTokenString) {
    return memoizedTokenApp;
  }
  memoizedTokenString = token;
  memoizedTokenApp = null;
  try {
    const [, payload] = token.split('.');
    if (payload) {
      // base64url → base64, re-pad, decode — gets us to the raw claims
      // object, which is what parseAppPermissions expects (it reads
      // `claims.app_permissions` itself, v1 array/string or v2 compact).
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const claims = JSON.parse(atob(padded)) as Record<string, unknown>;
      // There is no top-level `app` claim on v1 or v2 tokens — the app id
      // only ever lives inside app_permissions (v1 `app`, v2 compact `a`).
      // parseAppPermissions handles both shapes (array or JSON-string claim)
      // and normalizes v2's `a` to `app` on the returned AppPermission.
      const [first] = parseAppPermissions(claims);
      if (first?.app) {
        memoizedTokenApp = first.app;
      }
    }
  } catch {
    // Undecodable token — treat as unknown scope (slow path will handle it).
  }
  return memoizedTokenApp;
}

/**
 * Builds a lazy, AxiosInstance-shaped facade implementing the decision tree
 * documented above (fast path → cross-app slow path → degraded shared path).
 *
 * Synchronous surface beyond the request methods: the generated OpenAPI
 * clients (@brainforgeau/*-client, dist/common.js `createRequestFunction`)
 * read `axios.defaults.baseURL` SYNCHRONOUSLY while composing the request
 * URL, BEFORE invoking `axios.request(...)`:
 *
 *   url = (axios.defaults.baseURL ? '' : configuration?.basePath ?? basePath)
 *         + relativeUrl
 *
 * i.e. a FALSY `defaults.baseURL` makes the client prepend its own explicit
 * `configuration.basePath` (every client in this repo is constructed with
 * one, e.g. '/backend/helpdesk' via helpdeskBaseUrl in providers/index.tsx).
 * Both delegation targets (the shared singleton and the bare `axios.create()`
 * cross-app instance) have an undefined `defaults.baseURL`, so the facade
 * exposes a canonical `defaults` object with `baseURL: undefined` from
 * construction — URL composition is identical no matter which path a
 * request takes, and the object is never swapped, so semantics cannot shift
 * mid-session.
 *
 * Audit of the remaining AxiosInstance surface (this repo's src/ and the
 * generated clients' dist): `defaults.baseURL` (read-only) and
 * `request`/HTTP methods are the ONLY things touched on the exported
 * binding; nothing calls it as a function, mutates `defaults`, or touches
 * `interceptors`/`getUri` (the seam's observability interceptor is attached
 * to the underlying instances directly). Those two are exposed as loud
 * stubs that throw with an actionable message rather than silently
 * accepting registrations that would never fire.
 */
function buildCrossAppFacade(targetApp: string): AxiosInstance {
  let readyPromise: Promise<AxiosInstance> | null = null;
  let degradedWarned = false;

  // Canonical synchronous defaults — present from construction, never
  // replaced. `baseURL: undefined` (falsy) matches both delegation targets,
  // steering generated clients to their explicit configuration.basePath.
  const facadeDefaults: {
    baseURL?: string;
    headers: Record<string, unknown>;
  } = {
    baseURL: undefined,
    headers: {},
  };

  const ensureReady = (): Promise<AxiosInstance> => {
    if (!readyPromise) {
      readyPromise = (async () => {
        // identity-management's own named key: one key, resolved once
        // (`rc ?? baked`) in src/state/config. Throws by name when
        // IDENTITY_API_BASE_URL was never configured — inside `ensureReady`,
        // so the DEGRADED PATH below still catches it and rides the shared
        // token rather than killing the request.
        const contextIssuerBaseUrl = requireIdentityApiBaseUrl();
        const instance = await createCrossAppAxios({
          contextIssuerBaseUrl,
          targetApp,
        });
        attachObservabilityHeaders(instance);
        // Reconcile check: generated clients composed URLs against the
        // facade's `defaults.baseURL === undefined`. The real instance has
        // no baseURL today; if @brainforgeau/security ever starts setting
        // one, URL composition semantics would silently diverge — surface
        // that loudly instead of letting requests double-prefix.
        if (instance.defaults?.baseURL) {
          console.warn(
            `[authorizedAxios pilot(shell-host)] cross-app instance for '${targetApp}' unexpectedly has defaults.baseURL='${instance.defaults.baseURL}'; ` +
              'the synchronous facade advertised an empty baseURL, so generated-client URL composition may be inconsistent.',
          );
        }
        return instance;
      })();
      // Allow a later call to retry issuance (e.g. transient network blip)
      // instead of memoizing the rejection forever.
      readyPromise.catch(() => {
        readyPromise = null;
      });
    }
    return readyPromise;
  };

  const callShared = (
    method: CrossAppAxiosMethod,
    args: unknown[],
  ): Promise<unknown> =>
    (sharedAuthorizedAxios[method] as (...a: unknown[]) => Promise<unknown>)(
      ...args,
    );

  const unsupported = (surface: string) => (): never => {
    throw new Error(
      `authorizedAxios (shell-embedded cross-app facade for '${targetApp}'): '${surface}' is not supported on the facade. ` +
        'Attach interceptors to the underlying cross-app instance inside src/state/authorizedAxios.ts (see attachObservabilityHeaders), not to the exported binding.',
    );
  };

  const facade: Record<string, unknown> = {
    defaults: facadeDefaults,
    interceptors: {
      request: {
        use: unsupported('interceptors.request.use'),
        eject: unsupported('interceptors.request.eject'),
        clear: unsupported('interceptors.request.clear'),
      },
      response: {
        use: unsupported('interceptors.response.use'),
        eject: unsupported('interceptors.response.eject'),
        clear: unsupported('interceptors.response.clear'),
      },
    },
    getUri: unsupported('getUri'),
  };
  for (const method of CROSS_APP_AXIOS_METHODS) {
    facade[method] = async (...args: unknown[]) => {
      // 1. FAST PATH: the shell's ActiveAppTokenManager has the shared
      // token scoped to this app already — the shared singleton attaches
      // it and owns its refresh. This is the ~100% case for same-app calls.
      if (getSharedContextTokenApp() === targetApp) {
        return callShared(method, args);
      }
      // 2. SLOW PATH: mint/reuse a targetApp-scoped cross-app token.
      let instance: AxiosInstance;
      try {
        instance = await ensureReady();
      } catch (err) {
        // 3. DEGRADED PATH: issuance unreachable — ride the shared token.
        if (!degradedWarned) {
          degradedWarned = true;
          console.warn(
            `[authorizedAxios pilot(shell-host)] cross-app token issuance for '${targetApp}' failed; ` +
              'degrading to the SHARED context token (requests may 403 with wrong-app scope until the shell re-scopes it).',
            err,
          );
        }
        return callShared(method, args);
      }
      return (instance[method] as (...a: unknown[]) => Promise<unknown>)(
        ...args,
      );
    };
  }
  return facade as unknown as AxiosInstance;
}

const authorizedAxios: AxiosInstance = IS_SHELL_EMBEDDED
  ? buildCrossAppFacade(HELPDESK_APP_ID)
  : sharedAuthorizedAxios;

// Attach the observability interceptor to the shared singleton at module
// load, exactly as before the pilot (standalone path is byte-identical).
// While embedded this also covers the facade's fast/degraded paths, which
// delegate to the shared singleton; the cross-app slow-path instance gets
// the same interceptor inside `ensureReady`.
attachObservabilityHeaders(sharedAuthorizedAxios);

export { authorizedAxios };

/**
 * A plain instance for calls answered in a scope other than the app's own:
 * the same session's Authorization, and the context token `contextToken`
 * returns (or one set on the request itself). The shared instance cannot do
 * this, because its interceptor always overwrites X-Context-Token with the
 * app's own. Used only by api/local/scoped.ts, the one scoping mechanism.
 */
export const createScopedAxios = (
  contextToken?: () => Promise<string>,
): AxiosInstance => {
  const instance = axios.create();
  attachObservabilityHeaders(instance);
  instance.interceptors.request.use(async config => {
    config.headers.set('Authorization', `Bearer ${await getAccessToken()}`);
    config.headers.set('Accept', 'application/json');
    if (contextToken) {
      config.headers.set('X-Context-Token', await contextToken());
    }
    return config;
  });
  return instance;
};
