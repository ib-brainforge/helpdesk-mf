/*
 * A request answered for one tenant or organisation rather than the app's own
 * context.
 *
 * The backend reads the scope from the X-Context-Token header. authorizedAxios
 * cannot carry a scope-specific token, because its request interceptor always
 * overwrites X-Context-Token with the app's own, so a scoped call goes out with
 * fetch. Authorization still comes from the same session. Without a token it
 * is an ordinary authorizedAxios call in the app's context.
 *
 * A failure is thrown in the shape of an axios error ({ response: { status,
 * data } }), so callers explain it the same way whichever path was taken.
 */
import { authorizedAxios, getAccessToken } from '@/state/authorizedAxios';

type Params = Record<string, string | number | boolean | undefined | null>;

export interface ScopedRequest {
  method?: 'GET' | 'POST';
  /** Absolute URL, base included. */
  url: string;
  /** A context token issued for the scope; omit for the app's own context. */
  token?: string;
  params?: Params;
  body?: unknown;
}

const withParams = (url: string, params?: Params): string => {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') {
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
};

export const scopedRequest = async <T>({
  method = 'GET',
  url,
  token,
  params,
  body,
}: ScopedRequest): Promise<T> => {
  const fullUrl = withParams(url, params);
  if (!token) {
    const { data } = await authorizedAxios.request<T>({
      method,
      url: fullUrl,
      data: body,
    });
    return data;
  }
  // biome-ignore lint/style/noRestrictedGlobals: authorizedAxios cannot send a scope-specific context token (see above)
  const res = await fetch(fullUrl, {
    method,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'X-Context-Token': token,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = text || undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Not JSON; keep the text.
  }
  if (!res.ok) {
    throw Object.assign(new Error(`${res.status} for ${url}`), {
      response: { status: res.status, data },
    });
  }
  return data as T;
};
