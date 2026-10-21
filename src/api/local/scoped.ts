/*
 * Requests answered for another company (tenant) or organisation rather than
 * the app's own context. The one way Helpdesk does this.
 *
 * The backend reads the scope from the X-Context-Token header. authorizedAxios
 * cannot carry a scope-specific token, because its request interceptor always
 * overwrites X-Context-Token with the app's own. So a scoped call goes through
 * a plain axios instance that adds the same session's Authorization and the
 * scope's own context token. Without a scope it is an ordinary
 * authorizedAxios call in the app's context, exactly as before.
 *
 * Two entry points share that path:
 * - helpdeskAxios(scope) for a company, used by the generated client
 *   (createHelpdeskApiClient) and the local clients. Its Helpdesk token is
 *   issued once per company, cached until shortly before it expires, and
 *   re-issued once if the backend says it has expired.
 * - scopedRequest({ token }) for callers that already hold a token (New
 *   Request, asset and tracking lookups).
 *
 * Helpdesk tokens respect the company's licence: identity refuses one where
 * Helpdesk is not licensed (CTX_APP_NOT_LICENSED), and the API refuses a
 * token for such a company with 403. isNotLicensedError recognises both.
 */
import {
  type AxiosInstance,
  type AxiosRequestConfig,
  authorizedAxios,
  createScopedAxios,
} from '@/state/authorizedAxios';
import { createIdentityApiClient } from '@/utils/identityApiClient';
import { ContextsApi } from '@brainforgeau/identity-management-client';

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * A company other than the app's own, by tenant id.
 *
 * With `principalId` the company has no Helpdesk licence, so no token can be
 * issued there, and principal staff work its tickets through the principal
 * routes instead (see principalAxios): the ticket itself, and its status,
 * assignee, priority and category. Nothing else has a principal route.
 */
export interface HelpdeskScope {
  tenantId: string;
  principalId?: string;
}

/** A call with no principal route, refused before it is sent. */
export class PrincipalRouteMissingError extends Error {
  constructor(url: string) {
    super(`No principal route for ${url}`);
    this.name = 'PrincipalRouteMissingError';
  }
}

/** Where a context token is issued for: a tenant, optionally one organisation. */
export interface TokenScope {
  tenantId?: string | null;
  organisationId?: string | null;
}

/**
 * Asks identity for a context token for one tenant (and organisation). Calls
 * made with it are answered for that scope rather than the app's own context.
 */
export const issueScopeToken = async (
  scope: TokenScope,
  app: 'asset' | 'tracking' | 'helpdesk',
): Promise<string> => {
  // A licence refusal is explained by the page that asked (the ticket
  // page's not-enabled state, New Request's notice), so it must not also
  // raise the app-wide "Access Denied" banner. Other failures still do.
  const client = await createIdentityApiClient(ContextsApi, {
    isExpectedError: isNotLicensedError,
  });
  const { data } = await client.v1ContextsIssuePost({
    tenantId: scope.tenantId as string,
    organisationId: scope.organisationId ?? null,
    app,
  });
  if (!data?.token) throw new Error('No context token issued');
  return data.token;
};

/**
 * True when identity refused a Helpdesk token for the company, or the API
 * refused the company's token, because Helpdesk is not licensed there.
 */
export const isNotLicensedError = (error: unknown): boolean => {
  const response = (error as { response?: { status?: number; data?: unknown } })
    ?.response;
  const status = response?.status ?? 0;
  if (status < 400 || status >= 500) return false;
  let body = '';
  try {
    body = JSON.stringify(response?.data ?? '');
  } catch {
    return false;
  }
  // The API's RequireLicensedApp refusal: 403 ProblemDetails with no code,
  // detail "Tenant is not licensed for app 'helpdesk'." A plain permission
  // 403 says nothing about a licence, so it never matches.
  if (status === 403 && /not licensed for app/i.test(body)) return true;
  // Identity's refusal to issue the token (CTX_APP_NOT_LICENSED). Not a
  // feature licence (ENT_FEATURE_NOT_LICENSED), which is about one feature,
  // not the app.
  return /APP_NOT_LICENSED/.test(body);
};

/** For callers that hold a token: it goes in each request's headers. */
const tokenAxios = createScopedAxios();

// ---------------------------------------------------------------------------
// Helpdesk tokens per company
// ---------------------------------------------------------------------------

/** Re-issued this long before expiry rather than on a failed call. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
/** A licence refusal is remembered this long, so pages do not keep asking. */
const REFUSAL_TTL_MS = 5 * 60 * 1000;

interface CachedToken {
  token?: string;
  expiresAt?: number;
  pending?: Promise<string>;
  error?: unknown;
  failedAt?: number;
}

const tokens = new Map<string, CachedToken>();

const expiryOf = (token: string): number => {
  try {
    const payload = token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded)) as { exp?: number };
    if (exp) return exp * 1000;
  } catch {
    // Unreadable: treat as short lived.
  }
  return Date.now() + 15 * 60 * 1000;
};

/**
 * The company's Helpdesk token, issued at most once at a time and cached
 * until shortly before it expires. Throws identity's refusal, which
 * isNotLicensedError recognises when Helpdesk is not licensed there.
 */
export const getHelpdeskScopeToken = (
  scope: HelpdeskScope,
): Promise<string> => {
  const now = Date.now();
  const cached = tokens.get(scope.tenantId);
  if (cached?.token && (cached.expiresAt ?? 0) - REFRESH_MARGIN_MS > now) {
    return Promise.resolve(cached.token);
  }
  if (cached?.pending) return cached.pending;
  if (cached?.error && now - (cached.failedAt ?? 0) < REFUSAL_TTL_MS) {
    return Promise.reject(cached.error);
  }
  const pending = issueScopeToken(
    { tenantId: scope.tenantId, organisationId: null },
    'helpdesk',
  ).then(
    token => {
      tokens.set(scope.tenantId, { token, expiresAt: expiryOf(token) });
      return token;
    },
    error => {
      // Only a licence refusal is remembered; anything else is retried.
      if (isNotLicensedError(error)) {
        tokens.set(scope.tenantId, { error, failedAt: Date.now() });
      } else {
        tokens.delete(scope.tenantId);
      }
      throw error;
    },
  );
  tokens.set(scope.tenantId, { pending });
  return pending;
};

/**
 * Whether the token issuer has already refused Helpdesk for this company in
 * this session (a remembered licence refusal), without asking again.
 */
export const isKnownUnlicensed = (tenantId: string): boolean => {
  const cached = tokens.get(tenantId);
  return (
    !!cached?.error && Date.now() - (cached.failedAt ?? 0) < REFUSAL_TTL_MS
  );
};

const scopeInstances = new Map<string, AxiosInstance>();

type RetriableConfig = AxiosRequestConfig & { _scopeRetried?: boolean };

/** One instance per company, kept for the session. */
const companyAxios = (scope: HelpdeskScope): AxiosInstance => {
  const existing = scopeInstances.get(scope.tenantId);
  if (existing) return existing;
  const instance = createScopedAxios(() => getHelpdeskScopeToken(scope));
  // An expired context token (419, or 401 from the context check) is
  // re-issued once and the request repeated.
  instance.interceptors.response.use(undefined, async error => {
    const config = error?.config as RetriableConfig | undefined;
    const status = error?.response?.status;
    if (config && !config._scopeRetried && (status === 419 || status === 401)) {
      config._scopeRetried = true;
      tokens.delete(scope.tenantId);
      return instance.request(config);
    }
    throw error;
  });
  scopeInstances.set(scope.tenantId, instance);
  return instance;
};

/**
 * The ticket calls that have a principal route, rewritten onto it:
 * GET /v1/tickets/{id} and PATCH /v1/tickets/{id}/status|assign|priority|
 * category become /v1/principals/{principalId}/tickets/... with the same
 * body. The commands are the same ones the tenant routes send.
 */
const TICKET_ROUTE =
  /^(.*)\/v1\/tickets\/([0-9a-fA-F-]{36})(\/(status|assign|priority|category))?$/;

const toPrincipalUrl = (
  url: string,
  method: string,
  principalId: string,
): string | null => {
  const m = TICKET_ROUTE.exec(url);
  if (!m) return null;
  const [, base, id, suffix] = m;
  const verb = method.toUpperCase();
  if ((!suffix && verb === 'GET') || (suffix && verb === 'PATCH')) {
    return `${base}/v1/principals/${principalId}/tickets/${id}${suffix ?? ''}`;
  }
  return null;
};

const principalInstances = new Map<string, AxiosInstance>();

/**
 * Helpdesk calls for a company without Helpdesk, by principal staff: the
 * app's own context (no company token exists), with the supported ticket
 * routes rewritten onto the principal routes and everything else refused
 * with PrincipalRouteMissingError rather than sent.
 *
 * Generated clients and the local api modules only use `request`, the HTTP
 * verbs and `defaults` on an instance, so that is the surface given here.
 */
const principalAxios = (principalId: string): AxiosInstance => {
  const existing = principalInstances.get(principalId);
  if (existing) return existing;
  const request = <T>(config: AxiosRequestConfig) => {
    const url = toPrincipalUrl(
      config.url ?? '',
      config.method ?? 'GET',
      principalId,
    );
    if (!url)
      return Promise.reject(new PrincipalRouteMissingError(config.url ?? ''));
    return authorizedAxios.request<T>({ ...config, url });
  };
  const verb =
    (method: string) =>
    (url: string, ...rest: unknown[]) => {
      const withBody = ['post', 'put', 'patch'].includes(method);
      const config = (withBody ? rest[1] : rest[0]) as
        | AxiosRequestConfig
        | undefined;
      return request({
        ...config,
        method,
        url,
        ...(withBody ? { data: rest[0] } : {}),
      });
    };
  const instance = {
    defaults: authorizedAxios.defaults,
    request,
    get: verb('get'),
    delete: verb('delete'),
    post: verb('post'),
    put: verb('put'),
    patch: verb('patch'),
  } as unknown as AxiosInstance;
  principalInstances.set(principalId, instance);
  return instance;
};

/**
 * The axios instance for Helpdesk calls in `scope`: the company's own token,
 * the principal routes for a company without Helpdesk, or the app's context
 * when there is no scope (the viewer's own company).
 */
export const helpdeskAxios = (scope?: HelpdeskScope | null): AxiosInstance =>
  scope?.principalId
    ? principalAxios(scope.principalId)
    : scope
      ? companyAxios(scope)
      : authorizedAxios;

// ---------------------------------------------------------------------------
// Calls with a token the caller already holds
// ---------------------------------------------------------------------------

export interface ScopedRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Absolute URL, base included. */
  url: string;
  /** A context token issued for the scope; omit for the app's own context. */
  token?: string;
  params?: Params;
  body?: unknown;
}

/** Empty values are left out of the query string. */
const cleanParams = (params?: Params): Params | undefined => {
  if (!params) return undefined;
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
};

/**
 * A request in the app's own context, or, with `token`, in the scope that
 * token was issued for. A failure is an axios error ({ response: { status,
 * data } }) either way.
 */
export const scopedRequest = async <T>({
  method = 'GET',
  url,
  token,
  params,
  body,
}: ScopedRequest): Promise<T> => {
  const config: AxiosRequestConfig = {
    method,
    url,
    params: cleanParams(params),
    data: body,
  };
  if (!token) {
    const { data } = await authorizedAxios.request<T>(config);
    return data;
  }
  const { data } = await tokenAxios.request<T>({
    ...config,
    headers: { 'X-Context-Token': token },
  });
  return data;
};
