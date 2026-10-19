import { authorizedAxios } from '@/state/authorizedAxios';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createCrossAppAxios } from '@brainforgeau/security';

/** The apps a scoped call can be issued for; the `app` the context token names. */
export type ScopeApp = 'asset' | 'tracking' | 'helpdesk';

export interface ScopeTarget {
  tenantId?: string | null;
  organisationId?: string | null;
}

type AxiosInstance = typeof authorizedAxios;

/**
 * A generated client whose calls are answered for the tenant and organisation
 * in `scope`, without switching the app's own context.
 *
 * The context token is issued, cached and refreshed by the security package
 * (`createCrossAppAxios` with a `context` override). It rejects when a token
 * cannot be issued, e.g. the app is not licensed for that tenant, so a
 * failure surfaces here as an axios error rather than on the first request.
 *
 * A scope with no tenant is a ticket that carries none: its calls use the
 * app's own context.
 */
export const createScopedApiClient = async <TClient, TConfiguration>(
  ClientCtor: new (
    configuration: TConfiguration,
    basePath?: string,
    axios?: AxiosInstance,
  ) => TClient,
  configuration: TConfiguration,
  app: ScopeApp,
  scope: ScopeTarget,
): Promise<TClient> => {
  const axios = scope.tenantId
    ? await createCrossAppAxios({
        contextIssuerBaseUrl: requireIdentityApiBaseUrl(),
        targetApp: app,
        context: {
          tenantId: scope.tenantId,
          organisationId: scope.organisationId ?? null,
        },
      })
    : authorizedAxios;
  return new ClientCtor(configuration, undefined, axios);
};
