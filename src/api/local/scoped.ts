/*
 * Requests answered for another tenant or organisation rather than the app's
 * own context.
 *
 * The backend reads the scope from the X-Context-Token header. authorizedAxios
 * cannot carry a scope-specific token, because its request interceptor always
 * overwrites X-Context-Token with the app's own. So a scoped call goes through
 * a plain axios instance that adds the same session's Authorization and the
 * scope's own context token. Without a token it is an ordinary authorizedAxios
 * call in the app's context.
 *
 * - issueScopeToken asks identity for a Helpdesk token for a tenant and
 *   organisation (New Request raises a ticket in the chosen one).
 * - scopedRequest({ token }) sends a call with a token the caller already holds.
 *
 * Identity refuses a Helpdesk token where Helpdesk is not licensed
 * (CTX_APP_NOT_LICENSED), and the API refuses a token for such a tenant with
 * 403. isNotLicensedError recognises both.
 */
import {
  type AxiosRequestConfig,
  authorizedAxios,
  createScopedAxios,
} from '@/state/authorizedAxios';
import { getOrIssueContextToken } from '@brainforgeau/security';

type Params = Record<string, string | number | boolean | undefined | null>;

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

// ---------------------------------------------------------------------------
// Calls with a token the caller already holds
// ---------------------------------------------------------------------------

/** For callers that hold a token: it goes in each request's headers. */
const tokenAxios = createScopedAxios();

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
