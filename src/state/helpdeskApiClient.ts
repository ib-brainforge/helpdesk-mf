import { type HelpdeskScope, helpdeskAxios } from '@/api/local/scoped';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import { Configuration } from '@brainforgeau/helpdesk-client';

/**
 * helpdesk-backend's own named key (`HELPDESK_API_BASE_URL` ->
 * `helpdeskApiBaseUrl`). Throws (stage 2 of failing loudly) when it was never
 * configured — never silently falls back to '' and issues origin-relative calls.
 */
export const createHelpdeskApiConfiguration = () =>
  new Configuration({
    basePath: requireHelpdeskApiBaseUrl(),
  });

type HelpdeskApiConstructor<TClient> = new (...args: any[]) => TClient;

/**
 * The generated client, answering in the app's own context, or with `scope`
 * in that company's (see api/local/scoped.ts, the one scoping mechanism).
 * Pass the scope from useHelpdeskScope() on the ticket page.
 */
export const createHelpdeskApiClient = async <TClient>(
  ClientCtor: HelpdeskApiConstructor<TClient>,
  scope?: HelpdeskScope | null,
): Promise<TClient> => {
  return new ClientCtor(
    createHelpdeskApiConfiguration(),
    undefined,
    helpdeskAxios(scope),
  );
};
