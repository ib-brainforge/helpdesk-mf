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
import { getOrIssueContextToken } from '@brainforgeau/security';

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * A company other than the app's own, by tenant id.
 *
 * With `principalId` the company has no Helpdesk licence, so no token can be
 * issued there, and principal staff work its tickets through the principal
 * routes instead (see principalAxios and PRINCIPAL_ROUTES for what they
 * cover).
 */
export interface HelpdeskScope {
  tenantId: string;
  principalId?: string;
  /** In principal mode, the page's ticket, for routes that carry no id. */
  ticketId?: string;
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
 * `force` skips the shared token cache. A refusal rejects with the axios
 * error, which isNotLicensedError reads.
 */
export const issueScopeToken = async (
  scope: TokenScope,
  app: 'asset' | 'tracking' | 'helpdesk',
  force = false,
): Promise<string> => {
  const issued = await getOrIssueContextToken({
    tenantId: scope.tenantId as string,
    organisationId: scope.organisationId ?? null,
    app,
    force,
  });
  if (issued.status !== 'issued') throw new Error('No context token issued');
  return issued.token;
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
  force = false,
): Promise<string> => {
  const now = Date.now();
  const cached = force ? undefined : tokens.get(scope.tenantId);
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
    force,
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
      // Forced, because the shared cache may still hold the rejected token.
      await getHelpdeskScopeToken(scope, true);
      return instance.request(config);
    }
    throw error;
  });
  scopeInstances.set(scope.tenantId, instance);
  return instance;
};

/**
 * The calls that have a principal route, rewritten onto
 * /v1/principals/{principalId}/tickets/{ticketId}/... with the same body
 * (the commands are the ones the tenant routes send):
 *
 *   GET   /v1/tickets/{id}                          the ticket
 *   PATCH /v1/tickets/{id}/status|assign|priority|category
 *   GET   /v1/tickets/{id}/comments                 the conversation
 *   POST  /v1/tickets/{id}/comments                 a reply
 *   POST  /v1/tickets/{id}/comments/internal-notes  a note
 *   GET   /v1/tickets/{id}/history
 *   GET   /v1/attachments/ticket/{id}               the ticket's attachments
 *   POST  /v1/attachments/upload                    multipart, to this ticket
 *   GET   /v1/attachments/{attachmentId}            its file, streamed (/file)
 *
 * The last two carry no ticket id, so they use the page's ticket. Anything
 * else (delete an attachment, retry an email, tags, subscribe...) has no
 * principal route and is refused.
 */
const GUID = '[0-9a-fA-F-]{36}';
const PRINCIPAL_ROUTES: Array<{
  method: string;
  path: RegExp;
  to: (m: RegExpExecArray, ticketId: string | undefined) => string | null;
}> = [
  {
    method: 'GET',
    path: new RegExp(`^/v1/tickets/(${GUID})$`),
    to: m => `/tickets/${m[1]}`,
  },
  {
    method: 'PATCH',
    path: new RegExp(
      `^/v1/tickets/(${GUID})/(status|assign|priority|category)$`,
    ),
    to: m => `/tickets/${m[1]}/${m[2]}`,
  },
  {
    method: 'GET',
    path: new RegExp(`^/v1/tickets/(${GUID})/(comments|history)$`),
    to: m => `/tickets/${m[1]}/${m[2]}`,
  },
  {
    method: 'POST',
    path: new RegExp(`^/v1/tickets/(${GUID})/comments(/internal-notes)?$`),
    to: m => `/tickets/${m[1]}/comments${m[2] ?? ''}`,
  },
  {
    method: 'GET',
    path: new RegExp(`^/v1/attachments/ticket/(${GUID})$`),
    to: m => `/tickets/${m[1]}/attachments`,
  },
  {
    method: 'POST',
    path: /^\/v1\/attachments\/upload$/,
    to: (_m, ticketId) =>
      ticketId ? `/tickets/${ticketId}/attachments` : null,
  },
  {
    method: 'GET',
    path: new RegExp(`^/v1/attachments/(${GUID})$`),
    to: (m, ticketId) =>
      ticketId ? `/tickets/${ticketId}/attachments/${m[1]}/file` : null,
  },
];

const toPrincipalUrl = (
  url: string,
  method: string,
  principalId: string,
  ticketId: string | undefined,
): string | null => {
  const [beforeQuery, query] = url.split('?');
  const at = beforeQuery.indexOf('/v1/');
  if (at < 0) return null;
  const base = beforeQuery.slice(0, at);
  const path = beforeQuery.slice(at);
  const verb = method.toUpperCase();
  for (const route of PRINCIPAL_ROUTES) {
    if (route.method !== verb) continue;
    const m = route.path.exec(path);
    if (!m) continue;
    const rest = route.to(m, ticketId);
    if (!rest) return null;
    return `${base}/v1/principals/${principalId}${rest}${query ? `?${query}` : ''}`;
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
const principalAxios = (
  principalId: string,
  ticketId: string | undefined,
): AxiosInstance => {
  const key = `${principalId}|${ticketId ?? ''}`;
  const existing = principalInstances.get(key);
  if (existing) return existing;
  const request = <T>(config: AxiosRequestConfig) => {
    const url = toPrincipalUrl(
      config.url ?? '',
      config.method ?? 'GET',
      principalId,
      ticketId,
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
  principalInstances.set(key, instance);
  return instance;
};

/**
 * The axios instance for Helpdesk calls in `scope`: the company's own token,
 * the principal routes for a company without Helpdesk, or the app's context
 * when there is no scope (the viewer's own company).
 */
export const helpdeskAxios = (scope?: HelpdeskScope | null): AxiosInstance =>
  scope?.principalId
    ? principalAxios(scope.principalId, scope.ticketId)
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
